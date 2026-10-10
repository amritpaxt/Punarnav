# Punarnav

Punarnav is a local prototype for waste pickup verification, resident points, rewards, and society administration. It uses Cedar, AWS's open-source authorization policy language, through the official Cedar WASM package for local permission decisions. Demo data is stored in the browser (`localStorage`); no AWS account or deployed backend is used by the app. The checked-in Amplify backend files are a designed future step and are not deployed or connected to the local demo.

## Run the local demo

Use Node.js 20 or newer:

```powershell
npm install
npm run dev
```

Open the local URL printed by Vite. Use the sample accounts shown on the sign-in screen (PIN `1234`). Local activity stays in this browser. Clear the site's storage to restore the original demo fixture.

## Cedar authorization

- The policies are in [`src/policies/punarnav.cedar`](src/policies/punarnav.cedar) and the entity/action schema is in [`src/policies/punarnav.schema.json`](src/policies/punarnav.schema.json).
- The local UI calls `authorize(principal, action, resource)` before protected changes. Cedar denies actions by default and explicitly forbids non-ACTIVE users.
- Sign in as the admin and open **Permissions** to read the policy source and see recent ALLOW/DENY decisions with the deciding policy.
- Run the policy suite with `npm test`. A passing run reports all policy tests passing.
- Check TypeScript and the production bundle with `npm run build`. Success ends with Vite reporting the generated bundle under `dist/`.

## Demo accounts and click path

The local sign-in screen displays the current demo email addresses. Enter PIN `1234` for each account.

- **Resident:** Home, History, Rewards, and Learn. Dispute a pickup from Home and redeem a reward from Rewards.
- **Collector:** Scan a flat QR or choose a flat manually, take or attach a pickup photo, select a rating, and save.
- **Admin:** Overview, People, Disputes, Flats, Packaging, and Permissions. Approve/reject residents, resolve reports, inspect flat QRs, log a packaging return, and review Cedar decisions.

The Permissions log is local browser data and is capped at the latest 100 decisions. Policy tests use Cedar's Node WASM binding against the same `.cedar` policy source and schema.

## Future: AWS backend

The Amplify files are scaffolding for a possible later deployment. They are not required for the local prototype and have not been deployed or verified against an AWS account. AWS-specific scripts are retained for future work:

```powershell
npm run sandbox
npm run copy:outputs
npm run bootstrap
npm run seed:demo
```

For a future deployment, configure the AWS profile, deploy the Amplify sandbox, provide the generated outputs, and finish the remaining backend mutations and role flows before connecting the frontend. Do not treat these commands as part of local setup.
