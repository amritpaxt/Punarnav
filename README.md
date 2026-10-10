# Punarnav

Punarnav is a mobile-first housing society waste segregation app. The local demo remains the default. Set `VITE_BACKEND=aws` to use the Amplify/Cognito account flow currently implemented for Step 1.

## Local mode

```powershell
$env:VITE_BACKEND = "local"
npm run dev
```

Use the sample accounts shown on the local sign-in screen. Activity is saved in this browser. Clear site storage to restore the original fixture.

## AWS mode setup

Use Node.js 20 or newer and an AWS profile with permission to deploy the Amplify sandbox. In terminal 1, start the backend and leave it running:

```powershell
npm run sandbox
```

In terminal 2, copy the generated client configuration:

```powershell
npm run copy:outputs
```

In terminal 3, start the frontend in AWS mode:

```powershell
$env:VITE_BACKEND = "aws"
npm run dev
```

The frontend loads `public/amplify_outputs.json`; that generated file is ignored by Git. To return to the local demo, set `$env:VITE_BACKEND = "local"` or remove that environment variable.

## AWS account flow in this step

- Resident registration uses Cognito email confirmation, then a Lambda creates a PENDING resident profile after validating the society invite code and active flat.
- Pending accounts see a waiting screen with refresh and sign-out controls.
- An active ADMIN can approve/reject pending residents, invite COLLECTOR or ADMIN accounts, and deactivate/reactivate other users in the same society.
- Cognito assigns groups on the server. Invited accounts use Cognito's temporary-password challenge at first sign-in.
- Business mutations check the caller's role group and ACTIVE profile in the Lambda. Admin target profiles are checked against the admin's society before account changes.
- Model writes are not exposed to browser clients. Account writes in this step use the `adminAction` or `registerResident` custom mutation.

Resident signup requires the society ID, society invite code, and flat ID supplied by the society. UserProfile IDs are Cognito `sub` values. An initial active ADMIN profile and group membership must already exist before the admin screens can be reached; the current `bootstrap` script is still a placeholder.

## Remaining work

Only Step 1 (accounts and people) is implemented in AWS mode. The checked-in `ratePickup`, `redeemReward`, and `raiseDispute` Lambda paths still return `NOT_IMPLEMENTED_IN_THIS_STEP`; the local demo is a separate browser-only implementation. AWS screens for flat management, disputes, rewards, packaging, flags, audit history, and the remaining dashboard flows are not connected yet. The demo seed and bootstrap scripts also remain placeholders. Do not use local demo credentials or browser storage for real resident data.

## Step 1 verification

After deploying the sandbox and creating or using an existing ACTIVE admin profile in the ADMIN Cognito group:

1. Sign in at the frontend with that admin account and open **People and access**.
2. Sign up a resident with the matching society ID, invite code, and active flat ID; confirm the Cognito email code.
3. The resident should land on **Waiting for approval**. Refresh keeps the page pending until approval; sign-out returns to Cognito sign-in.
4. As admin, approve that resident. Refresh the resident page; it should leave the pending screen. Cognito should list the user in RESIDENT.
5. Repeat with a second resident and reject them. The profile should be gone and Cognito should show the user disabled.
6. Invite a collector and an admin. Cognito should send temporary credentials and show the assigned group; first sign-in should require a new password.
7. Deactivate a different active account. Cognito should show it disabled and its UserProfile should be DEACTIVATED. Reactivate it and confirm both return to enabled/ACTIVE.
8. With an already-issued token for a deactivated account, call `adminAction`; it should be rejected by the Lambda's ACTIVE-profile check.

The build can be checked locally with `npm run build`. This does not deploy AWS resources or verify Cognito email delivery, IAM permissions, or runtime mutations.
