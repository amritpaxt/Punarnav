# Punarnav

Punarnav is a mobile-first housing-society waste segregation app. Residents see verified pickups, points, streaks, tower rankings, rewards, and issue reports. Collectors record a flat's wet/dry segregation with a QR scan or manual selection and photo evidence. Society admins review trends, resident approvals, reports, collector flags, flat QR codes, and packaging returns.

## Run the working local demo

Requirements: Node.js 20 or newer.

```bash
npm install
npm run dev
```

The browser app starts in local demo mode. Sample accounts (PIN `1234`):

| Role | Email |
| --- | --- |
| Resident | `resident@punarnav.demo` |
| Collector | `collector@punarnav.demo` |
| Admin | `admin@punarnav.demo` |

Demo society activity and photos are stored in browser local storage. Sign-in state lasts for the browser session. Use the admin's **People** tab to approve resident signup requests. The admin **Flats** tab can generate and print QR codes; the collector can scan these on a camera-enabled device or select a flat manually. Use a fresh browser profile or clear site storage to restore the initial demo fixture.

## Working demo flows

- Resident email/PIN sign-in and pending resident registration.
- Collector route list, camera QR scan, manual flat selection, Hindi/English labels, photo evidence, one rating per flat per society-local day, and uniform pickup points.
- Resident pickup history, GREEN/YELLOW/RED feedback, points, streak display, tower leaderboard, rewards with a 10-pickup unlock, and a single issue report per pickup.
- Admin overview with tower segregation rates and estimated landfill diversion, collector pattern flags, resident approval, photo/report review, flat QR generation, and packaging-return logging.
- State is saved in the current browser and seeded with sample society activity for a populated demo.

## Cloud backend status

An AWS Amplify backend scaffold is included under `amplify/` with Cognito groups, read models, S3 storage, and custom mutation entry points. The browser currently runs the local demo and does not connect those screens to AWS. The Lambda mutation handler is a validation stub: DynamoDB transactional persistence, ledger corrections, fully enforced society authorization, live photo uploads, Cognito provisioning, and output configuration still need implementation before cloud deployment. Do not use the local demo PINs or browser storage for real resident data.

To begin the AWS setup after completing those backend pieces:

```bash
npx ampx sandbox
```

Then connect Amplify outputs and the authenticated data/storage clients in the app entrypoint before deploying a live environment.

## Points and verification rules shown in the demo

- GREEN resident pickup: 10 points; YELLOW: 3; RED: 0.
- Collector: 2 points per completed pickup regardless of rating.
- Packaging return: 5 points per logged return (stretch flow).
- Rewards require at least 10 verified pickups and enough points.
- Collectors must attach a photo to GREEN, YELLOW, or RED ratings; NO BIN does not require a photo.
- The demo prevents a second pickup entry for the same flat on the same IST date.

The concept's image classification, external voucher fulfilment, recycler bookings, compost integrations, and energy features are not part of the working local MVP.
