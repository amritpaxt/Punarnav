import { a, defineData, type ClientSchema } from '@aws-amplify/backend';
import { core } from '../functions/core/resource';

const schema = a.schema({
  Rating: a.enum(['GREEN','YELLOW','RED','NO_BIN']), Role: a.enum(['RESIDENT','COLLECTOR','ADMIN']),
  UserStatus: a.enum(['PENDING','ACTIVE','DEACTIVATED']), FlatStatus: a.enum(['ACTIVE','VACANT']),
  PickupMethod: a.enum(['SCAN','MANUAL']), DisputeStatus: a.enum(['OPEN','UPHELD','REJECTED']),
  Society: a.model({ name:a.string().required(), inviteCode:a.string().required(), kgPerGreenBin:a.float().required() }).authorization(allow=>[allow.authenticated().to(['read'])]),
  Tower: a.model({ societyId:a.id().required(), name:a.string().required() }).authorization(allow=>[allow.authenticated().to(['read'])]),
  Flat: a.model({ societyId:a.id().required(), towerId:a.id().required(), number:a.string().required(), qrToken:a.string().required(), status:a.ref('FlatStatus').required() }).authorization(allow=>[allow.authenticated().to(['read'])]),
  UserProfile: a.model({ societyId:a.id().required(), role:a.ref('Role').required(), name:a.string().required(), phone:a.string(), flatId:a.id(), status:a.ref('UserStatus').required(), preferredLanguage:a.enum(['en','hi']) }).authorization(allow=>[allow.authenticated().to(['read'])]),
  Pickup: a.model({ societyId:a.id().required(), flatId:a.id().required(), collectorId:a.id().required(), date:a.date().required(), rating:a.ref('Rating').required(), photoKey:a.string(), photoHash:a.string(), method:a.ref('PickupMethod').required(), flagged:a.boolean().required(), flagReason:a.string(), createdAt:a.datetime().required() }).authorization(allow=>[allow.authenticated().to(['read'])]),
  LedgerEntry: a.model({ societyId:a.id().required(), ownerType:a.enum(['FLAT','COLLECTOR']), ownerId:a.id().required(), points:a.integer().required(), reason:a.enum(['PICKUP_GREEN','PICKUP_YELLOW','COLLECTOR_PICKUP','STREAK_BONUS','REDEMPTION','REVERSAL','PACKAGING']), refId:a.id(), createdAt:a.datetime().required() }).authorization(allow=>[allow.authenticated().to(['read'])]),
  Dispute: a.model({ societyId:a.id().required(), pickupId:a.id().required(), flatId:a.id().required(), raisedBy:a.id().required(), reason:a.string().required(), status:a.ref('DisputeStatus').required(), resolvedBy:a.id(), resolutionNote:a.string(), createdAt:a.datetime().required() }).authorization(allow=>[allow.authenticated().to(['read'])]),
  Reward: a.model({ societyId:a.id().required(), title:a.string().required(), description:a.string().required(), cost:a.integer().required(), active:a.boolean().required() }).authorization(allow=>[allow.authenticated().to(['read'])]),
  Redemption: a.model({ societyId:a.id().required(), flatId:a.id().required(), rewardId:a.id().required(), cost:a.integer().required(), voucherCode:a.string().required(), createdAt:a.datetime().required() }).authorization(allow=>[allow.authenticated().to(['read'])]),
  AuditLog: a.model({ societyId:a.id().required(), actorId:a.id().required(), action:a.string().required(), targetType:a.string().required(), targetId:a.id().required(), before:a.json(), after:a.json(), createdAt:a.datetime().required() }).authorization(allow=>[allow.group('ADMIN').to(['read'])]),
  ratePickup: a.mutation().arguments({ flatId:a.id().required(), qrToken:a.string(), rating:a.ref('Rating').required(), photoKey:a.string(), photoHash:a.string(), method:a.ref('PickupMethod').required() }).returns(a.json()).authorization(allow=>[allow.authenticated()]).handler(a.handler.function(core)),
  redeemReward: a.mutation().arguments({ rewardId:a.id().required() }).returns(a.json()).authorization(allow=>[allow.authenticated()]).handler(a.handler.function(core)),
  raiseDispute: a.mutation().arguments({ pickupId:a.id().required(), reason:a.string().required() }).returns(a.json()).authorization(allow=>[allow.authenticated()]).handler(a.handler.function(core)),
  adminAction: a.mutation().arguments({ action:a.string().required(), payload:a.json().required() }).returns(a.json()).authorization(allow=>[allow.group('ADMIN')]).handler(a.handler.function(core)),
});
export type Schema = ClientSchema<typeof schema>;
export const data = defineData({ schema, authorizationModes: { defaultAuthorizationMode: 'userPool' } });
