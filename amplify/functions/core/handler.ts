import {
  AdminAddUserToGroupCommand,
  AdminCreateUserCommand,
  AdminDeleteUserCommand,
  AdminDisableUserCommand,
  AdminEnableUserCommand,
  AdminGetUserCommand,
  AdminRemoveUserFromGroupCommand,
  CognitoIdentityProviderClient,
} from '@aws-sdk/client-cognito-identity-provider';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DeleteCommand,
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  ScanCommand,
  UpdateCommand,
} from '@aws-sdk/lib-dynamodb';

type Role = 'RESIDENT'|'COLLECTOR'|'ADMIN';
type UserStatus = 'PENDING'|'ACTIVE'|'DEACTIVATED';
type Profile = { id:string; societyId:string; role:Role; name:string; email:string; flatId?:string; status:UserStatus };
type Identity = { sub?:string; claims?:Record<string,unknown> };
type ResolverEvent = { info:{fieldName:string}; identity?:unknown; arguments:Record<string,unknown> };
type Item = Record<string,unknown>;

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const cognito = new CognitoIdentityProviderClient({});
const profileTable = process.env.USER_PROFILE_TABLE!;
const societyTable = process.env.SOCIETY_TABLE!;
const flatTable = process.env.FLAT_TABLE!;
const userPoolId = process.env.COGNITO_USER_POOL_ID!;
const points:Record<string,number> = { GREEN:10, YELLOW:3, RED:0, NO_BIN:0 };

function fail(code:string):never { throw new Error(code); }
function text(value:unknown, max:number, label:string):string {
  if(typeof value!=='string'||!value.trim()||value.trim().length>max) fail(`INVALID_${label}`);
  return (value as string).trim();
}
function identityOf(event:ResolverEvent):Identity { return event.identity as Identity; }
function subject(identity:Identity):string { return text(identity.sub,128,'IDENTITY'); }
function groups(identity:Identity):string[] {
  const value=identity.claims?.['cognito:groups'];
  if(Array.isArray(value)) return value.filter((item):item is string=>typeof item==='string');
  if(typeof value==='string') return value.split(',').map(item=>item.trim()).filter(Boolean);
  return [];
}
async function profile(id:string):Promise<Profile|null> {
  const result=await ddb.send(new GetCommand({TableName:profileTable,Key:{id},ConsistentRead:true}));
  return result.Item as Profile|undefined ?? null;
}
async function requireActive(identity:Identity, role:Role):Promise<Profile> {
  const id=subject(identity);
  if(!groups(identity).includes(role)) fail('UNAUTHORIZED');
  const caller=await profile(id);
  if(!caller||caller.status!=='ACTIVE'||caller.role!==role) fail('PROFILE_NOT_ACTIVE');
  return caller;
}
function payloadOf(event:ResolverEvent):Item {
  const value=event.arguments.payload;
  if(!value||typeof value!=='object'||Array.isArray(value)) fail('INVALID_PAYLOAD');
  return value as Item;
}
function profileId(payload:Item):string { return text(payload.profileId,128,'PROFILE_ID'); }
function now():string { return new Date().toISOString(); }
async function getSocietyFlat(societyId:string, flatId:string):Promise<Item> {
  const [society,flat]=await Promise.all([
    ddb.send(new GetCommand({TableName:societyTable,Key:{id:societyId},ConsistentRead:true})),
    ddb.send(new GetCommand({TableName:flatTable,Key:{id:flatId},ConsistentRead:true})),
  ]);
  if(!society.Item) fail('SOCIETY_NOT_FOUND');
  if(!flat.Item||flat.Item.societyId!==societyId||flat.Item.status!=='ACTIVE') fail('FLAT_NOT_AVAILABLE');
  return flat.Item;
}
async function getTarget(admin:Profile,id:string):Promise<Profile> {
  const target=await profile(id);
  if(!target||target.societyId!==admin.societyId) fail('USER_NOT_FOUND_IN_SOCIETY');
  return target;
}
async function cognitoUsername(target:Profile):Promise<string> {
  const user=await cognito.send(new AdminGetUserCommand({UserPoolId:userPoolId,Username:target.email}));
  return user.Username??target.email;
}
async function updateProfileStatus(target:Profile,status:UserStatus):Promise<void> {
  await ddb.send(new UpdateCommand({
    TableName:profileTable,Key:{id:target.id},
    UpdateExpression:'SET #status = :status, updatedAt = :updatedAt',
    ConditionExpression:'societyId = :societyId AND #status = :expected',
    ExpressionAttributeNames:{'#status':'status'},
    ExpressionAttributeValues:{':status':status,':updatedAt':now(),':societyId':target.societyId,':expected':target.status},
  }));
}
async function adminAction(event:ResolverEvent,identity:Identity):Promise<Item> {
  const admin=await requireActive(identity,'ADMIN');
  const action=text(event.arguments.action,64,'ACTION');
  const payload=payloadOf(event);

  if(action==='approveResident'||action==='rejectResident') {
    const target=await getTarget(admin,profileId(payload));
    if(target.role!=='RESIDENT'||target.status!=='PENDING') fail('RESIDENT_NOT_PENDING');
    const username=await cognitoUsername(target);
    if(action==='approveResident') {
      await cognito.send(new AdminAddUserToGroupCommand({UserPoolId:userPoolId,Username:username,GroupName:'RESIDENT'}));
      try { await updateProfileStatus(target,'ACTIVE'); }
      catch(error) { await cognito.send(new AdminRemoveUserFromGroupCommand({UserPoolId:userPoolId,Username:username,GroupName:'RESIDENT'})); throw error; }
      return {ok:true,profileId:target.id,status:'ACTIVE'};
    }
    await cognito.send(new AdminDisableUserCommand({UserPoolId:userPoolId,Username:username}));
    await ddb.send(new DeleteCommand({TableName:profileTable,Key:{id:target.id},ConditionExpression:'societyId = :societyId AND #status = :pending',ExpressionAttributeNames:{'#status':'status'},ExpressionAttributeValues:{':societyId':admin.societyId,':pending':'PENDING'}}));
    return {ok:true,profileId:target.id,status:'REJECTED'};
  }

  if(action==='inviteUser') {
    const role=text(payload.role,16,'ROLE') as Role;
    if(role!=='COLLECTOR'&&role!=='ADMIN') fail('INVALID_INVITE_ROLE');
    const email=text(payload.email,254,'EMAIL').toLowerCase();
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) fail('INVALID_EMAIL');
    const name=text(payload.name,120,'NAME');
    const created=await cognito.send(new AdminCreateUserCommand({
      UserPoolId:userPoolId,Username:email,DesiredDeliveryMediums:['EMAIL'],
      UserAttributes:[{Name:'email',Value:email},{Name:'email_verified',Value:'true'}],
    }));
    const username=created.User?.Username;
    const sub=created.User?.Attributes?.find(attribute=>attribute.Name==='sub')?.Value;
    if(!username||!sub) fail('COGNITO_USER_CREATE_FAILED');
    try {
      await cognito.send(new AdminAddUserToGroupCommand({UserPoolId:userPoolId,Username:username,GroupName:role}));
      const timestamp=now();
      await ddb.send(new PutCommand({TableName:profileTable,Item:{id:sub,societyId:admin.societyId,role,name,email,status:'ACTIVE',createdAt:timestamp,updatedAt:timestamp,__typename:'UserProfile'},ConditionExpression:'attribute_not_exists(id)'}));
    } catch(error) {
      await cognito.send(new AdminDisableUserCommand({UserPoolId:userPoolId,Username:username}));
      await cognito.send(new AdminDeleteUserCommand({UserPoolId:userPoolId,Username:username}));
      throw error;
    }
    return {ok:true,profileId:sub,email,role,temporaryPasswordChangeRequired:true};
  }

  if(action==='deactivateUser'||action==='reactivateUser') {
    const target=await getTarget(admin,profileId(payload));
    if(target.id===admin.id) fail('CANNOT_CHANGE_OWN_STATUS');
    if(target.status!=='ACTIVE'&&target.status!=='DEACTIVATED') fail('USER_NOT_ACTIVE');
    const username=await cognitoUsername(target);
    const next:UserStatus=action==='deactivateUser'?'DEACTIVATED':'ACTIVE';
    if(target.status===next) return {ok:true,profileId:target.id,status:next};
    if(next==='DEACTIVATED') await cognito.send(new AdminDisableUserCommand({UserPoolId:userPoolId,Username:username}));
    else await cognito.send(new AdminEnableUserCommand({UserPoolId:userPoolId,Username:username}));
    try { await updateProfileStatus(target,next); }
    catch(error) {
      if(next==='DEACTIVATED') await cognito.send(new AdminEnableUserCommand({UserPoolId:userPoolId,Username:username}));
      else await cognito.send(new AdminDisableUserCommand({UserPoolId:userPoolId,Username:username}));
      throw error;
    }
    return {ok:true,profileId:target.id,status:next};
  }
  fail('UNKNOWN_ADMIN_ACTION');
}

async function registerResident(event:ResolverEvent,identity:Identity):Promise<Item> {
  const id=subject(identity);
  if(groups(identity).some(group=>group==='ADMIN'||group==='COLLECTOR'||group==='RESIDENT')) fail('ALREADY_HAS_ROLE');
  if(await profile(id)) fail('PROFILE_ALREADY_EXISTS');
  const societyId=text(event.arguments.societyId,128,'SOCIETY_ID');
  const inviteCode=text(event.arguments.inviteCode,128,'INVITE_CODE');
  const flatId=text(event.arguments.flatId,128,'FLAT_ID');
  const name=text(event.arguments.name,120,'NAME');
  const flat=await getSocietyFlat(societyId,flatId);
  const societyResult=await ddb.send(new GetCommand({TableName:societyTable,Key:{id:societyId},ConsistentRead:true}));
  if(societyResult.Item?.inviteCode!==inviteCode) fail('INVALID_INVITE_CODE');
  const claims=identity.claims??{};
  const email=text(claims.email,254,'EMAIL').toLowerCase();
  const timestamp=now();
  await ddb.send(new PutCommand({TableName:profileTable,Item:{id,societyId,role:'RESIDENT',name,email,flatId:flat.id,status:'PENDING',createdAt:timestamp,updatedAt:timestamp,__typename:'UserProfile'},ConditionExpression:'attribute_not_exists(id)'}));
  return {ok:true,status:'PENDING'};
}

async function myProfile(identity:Identity):Promise<Item> {
  const id=subject(identity);
  const result=await profile(id);
  if(!result) return {profile:null};
  if(result.status==='ACTIVE'&&!groups(identity).includes(result.role)) fail('UNAUTHORIZED');
  if(result.status==='DEACTIVATED'&&!groups(identity).includes(result.role)) fail('UNAUTHORIZED');
  return {profile:result};
}

async function listSocietyPeople(identity:Identity):Promise<Item> {
  const admin=await requireActive(identity,'ADMIN');
  const people:Profile[]=[];
  let lastKey:Record<string,unknown>|undefined;
  do {
    const result=await ddb.send(new ScanCommand({
      TableName:profileTable,
      FilterExpression:'societyId = :societyId',
      ExpressionAttributeValues:{':societyId':admin.societyId},
      ExclusiveStartKey:lastKey,
      ProjectionExpression:'id, societyId, #role, #name, email, flatId, #status',
      ExpressionAttributeNames:{'#role':'role','#name':'name','#status':'status'},
    }));
    people.push(...(result.Items??[]) as Profile[]);
    lastKey=result.LastEvaluatedKey as Record<string,unknown>|undefined;
  } while(lastKey);
  return {people};
}

export const handler = async (event:ResolverEvent):Promise<Item> => {
  const identity=identityOf(event);
  if(event.info.fieldName==='registerResident') return registerResident(event,identity);
  if(event.info.fieldName==='myProfile') return myProfile(identity);
  if(event.info.fieldName==='listSocietyPeople') return listSocietyPeople(identity);
  if(event.info.fieldName==='adminAction') return adminAction(event,identity);

  const requiredRole:Role=event.info.fieldName==='ratePickup'?'COLLECTOR':'RESIDENT';
  const caller=await requireActive(identity,requiredRole);
  if(event.info.fieldName==='ratePickup') {
    const rating=text(event.arguments.rating,16,'RATING');
    if(!(rating in points)) fail('INVALID_RATING');
    const flatId=text(event.arguments.flatId,128,'FLAT_ID');
    await getSocietyFlat(caller.societyId,flatId);
    return {ok:false,code:'NOT_IMPLEMENTED_IN_THIS_STEP',rating};
  }
  return {ok:false,code:'NOT_IMPLEMENTED_IN_THIS_STEP'};
};
