import { defineAuth } from '@aws-amplify/backend';

/** Public registration creates an unprivileged Cognito account. The post-confirmation
 * function provisions only a PENDING RESIDENT profile; elevated roles are invited server-side. */
export const auth = defineAuth({
  loginWith: { email: true },
  groups: ['RESIDENT', 'COLLECTOR', 'ADMIN'],
  userAttributes: { givenName: { required: false, mutable: true }, familyName: { required: false, mutable: true }, phoneNumber: { required: false, mutable: true } },
});
