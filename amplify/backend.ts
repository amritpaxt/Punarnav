import { defineBackend } from '@aws-amplify/backend';
import { auth } from './auth/resource';
import { data } from './data/resource';
import { storage } from './storage/resource';
import { core } from './functions/core/resource';
import { PolicyStatement } from 'aws-cdk-lib/aws-iam';

const backend = defineBackend({ auth, data, storage, core });

const userProfileTable = backend.data.resources.tables.UserProfile;
const societyTable = backend.data.resources.tables.Society;
const flatTable = backend.data.resources.tables.Flat;
const coreLambda = backend.core.resources.lambda;
userProfileTable.grantReadWriteData(coreLambda);
societyTable.grantReadData(coreLambda);
flatTable.grantReadData(coreLambda);

backend.core.addEnvironment('USER_PROFILE_TABLE', userProfileTable.tableName);
backend.core.addEnvironment('SOCIETY_TABLE', societyTable.tableName);
backend.core.addEnvironment('FLAT_TABLE', flatTable.tableName);
backend.core.addEnvironment('COGNITO_USER_POOL_ID', backend.auth.resources.userPool.userPoolId);
coreLambda.addToRolePolicy(new PolicyStatement({
  actions: [
    'cognito-idp:AdminCreateUser', 'cognito-idp:AdminAddUserToGroup',
    'cognito-idp:AdminRemoveUserFromGroup', 'cognito-idp:AdminGetUser',
    'cognito-idp:AdminDisableUser', 'cognito-idp:AdminEnableUser',
    'cognito-idp:AdminDeleteUser',
  ],
  resources: [backend.auth.resources.userPool.userPoolArn],
}));
