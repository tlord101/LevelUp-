Production Push & In-App Notifications

Overview
- Client: saves an FCM token to the user's Firestore document at `users/{uid}.notificationToken` and listens to `userNotifications` for in-app messages.
- Service worker: `public/firebase-messaging-sw.js` handles background notifications.
- Server: must send push messages via Firebase Admin SDK (sample in `functions/sendNotificationExample.js`) and/or write docs to `userNotifications` so clients see them in-app.

Client setup
1. Set `VITE_FIREBASE_VAPID_KEY` in your deployment environment to your Web Push VAPID key.
2. Ensure `public/firebase-messaging-sw.js` is deployed at the app root (it exists in this repo).
3. The app auto-requests permission and registers the token on sign-in (see `requestNotificationPermissionAndSaveToken` in `services/firebaseService.ts` called from `context/AuthContext.tsx`).
4. Foreground notifications are shown via `components/ForegroundNotificationHandler.tsx` which listens for messages using Firebase Messaging's `onMessage` API.

Server / Cloud Function example
- `functions/sendNotificationExample.js` is a Node script / Cloud Function example that demonstrates:
  - Writing a `userNotifications` document for in-app viewers.
  - Sending an FCM push to the user's saved `notificationToken` using the Admin SDK.

Deploying server code
- Option A (recommended): Deploy to Firebase Cloud Functions
  - Initialize Cloud Functions in the same Firebase project and include the `sendNotificationExample.js` logic.
  - The Admin SDK will use the runtime service account automatically.

- Option B: Run from your own server
  - Install `firebase-admin` and authenticate via a service account JSON (set `GOOGLE_APPLICATION_CREDENTIALS`).
  - Run `node functions/sendNotificationExample.js <USER_ID> "Title" "Body"` to test.

Security and best-practices
- Only send push to tokens you trust and don't store long-lived sensitive data in messages.
- Rotate tokens when they fail; the Admin SDK responses include feedback when tokens are invalid.
- Use `userNotifications` writes for reliable in-app delivery (clients subscribed with Firestore listeners will get them immediately).

Notes
- The client already writes tokens to the user's Firestore doc; you must run an Admin server to call FCM or add documents to `userNotifications` when you want notifications to be delivered.
- For marketing or periodic engagement messages, consider using Firebase Cloud Messaging topics or a scheduled Cloud Function.
