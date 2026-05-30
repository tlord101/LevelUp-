/*
Example Node.js Cloud Function / script to send push notifications using Firebase Admin SDK.
- Deploy as a Cloud Function or run from a trusted server.
- Reads user tokens from Firestore `users` collection and sends FCM messages.
- Also writes a copy into `userNotifications` for in-app display.

Setup:
- Install firebase-admin: npm install firebase-admin
- Provide service account credentials via GOOGLE_APPLICATION_CREDENTIALS or deploy to Firebase Cloud Functions with proper service account.
*/

const admin = require('firebase-admin');

// Initialize admin SDK (if running in Cloud Functions this is automatic)
if (!admin.apps.length) {
  admin.initializeApp();
}

const firestore = admin.firestore();
const messaging = admin.messaging();

// Send notification to a specific user by UID
async function sendNotificationToUser(userId, payload) {
  // payload: { title: string, body: string, data?: { ... } }
  const userRef = firestore.collection('users').doc(userId);
  const userSnap = await userRef.get();
  if (!userSnap.exists) throw new Error('User not found');
  const user = userSnap.data();
  const token = user?.notificationToken;

  // Create in-app notification document for the user
  const note = {
    userId: userId,
    title: payload.title,
    body: payload.body,
    data: payload.data || {},
    read: false,
    created_at: admin.firestore.FieldValue.serverTimestamp(),
  };

  await firestore.collection('userNotifications').add(note);

  if (!token) {
    console.log('User has no push token, in-app notification saved only.');
    return { sent: false, reason: 'no-token' };
  }

  // Prepare FCM message
  const message = {
    token,
    notification: {
      title: payload.title,
      body: payload.body,
    },
    webpush: {
      headers: {
        Urgency: 'high'
      },
      fcmOptions: {
        link: payload.data?.link || '/' // deep link
      }
    },
    data: payload.data || {},
  };

  try {
    const resp = await messaging.send(message);
    console.log('FCM send response:', resp);
    return { sent: true };
  } catch (err) {
    console.error('FCM send error:', err);
    return { sent: false, error: err };
  }
}

// Example: broadcast to all users with tokens (careful — this may hit quotas)
async function broadcast(payload) {
  const q = await firestore.collection('users').where('notificationToken', '!=', null).get();
  const tokens = q.docs.map(d => d.data()?.notificationToken).filter(Boolean);
  if (tokens.length === 0) return { sent: false, reason: 'no-tokens' };

  // Save a broadcast in-app note for ALL_USERS so devices listening will pick it up
  const note = {
    userId: 'ALL_USERS',
    title: payload.title,
    body: payload.body,
    data: payload.data || {},
    read: false,
    created_at: admin.firestore.FieldValue.serverTimestamp(),
  };
  await firestore.collection('userNotifications').add(note);

  const message = {
    tokens,
    notification: {
      title: payload.title,
      body: payload.body
    },
    webpush: {
      headers: { Urgency: 'high' }
    },
    data: payload.data || {}
  };

  try {
    const resp = await messaging.sendEachForMulticast(message);
    console.log('Multicast result:', resp);
    return { sent: true, result: resp }; 
  } catch (err) {
    console.error('Broadcast error:', err);
    return { sent: false, error: err };
  }
}

module.exports = { sendNotificationToUser, broadcast };

// If run directly for testing
if (require.main === module) {
  (async () => {
    const userId = process.argv[2];
    const title = process.argv[3] || 'Hello from LevelUp';
    const body = process.argv[4] || 'This is a test notification.';
    try {
      if (userId === 'BROADCAST') {
        const res = await broadcast({ title, body });
        console.log(res);
      } else {
        const res = await sendNotificationToUser(userId, { title, body });
        console.log(res);
      }
    } catch (err) {
      console.error(err);
      process.exit(1);
    }
  })();
}
