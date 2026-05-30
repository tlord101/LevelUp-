# Firebase Functions for LevelUp

This folder contains HTTPS Cloud Functions to send push notifications and write in-app notifications into Firestore.

Functions:
- `sendToUser` (POST): send to specific user
  - body: { userId: string, title: string, body: string, data?: object }

- `broadcast` (POST): write public in-app notification and attempt to send push to all tokens
  - body: { title: string, body: string, data?: object }

Deployment
1. Install Firebase CLI: `npm install -g firebase-tools`
2. Login: `firebase login`
3. Initialize/functions (if not already): `firebase init functions` — choose JavaScript and existing project.
4. From repo root, deploy functions:

```bash
cd functions
npm install
firebase deploy --only functions --project YOUR_FIREBASE_PROJECT_ID
```

Local testing
- Use the emulator:
```bash
cd functions
npm install
firebase emulators:start --only functions
```
- Then POST to the local endpoint, e.g. `http://localhost:5001/<project>/us-central1/sendToUser`

Notes
- Admin SDK uses default credentials in Cloud Functions. If running locally, set `GOOGLE_APPLICATION_CREDENTIALS` to your service account JSON.
- Avoid broadcasting to extremely large user sets in one request; use topics or scheduled batching.
