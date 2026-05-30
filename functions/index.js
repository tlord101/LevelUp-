const functions = require('firebase-functions');
const admin = require('firebase-admin');

// Initialize the admin SDK. In Cloud Functions runtime this will use the default service account.
admin.initializeApp();
const firestore = admin.firestore();
const messaging = admin.messaging();

// Helper to create a userNotification document
async function createInAppNotification(userId, payload) {
  const note = {
    userId: userId,
    title: payload.title || 'Notification',
    body: payload.body || '',
    data: payload.data || {},
    read: false,
    created_at: admin.firestore.FieldValue.serverTimestamp(),
  };
  await firestore.collection('userNotifications').add(note);
}

// HTTPS function to send notification to a single user
exports.sendToUser = functions.https.onRequest(async (req, res) => {
  if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');
  try {
    const { userId, title, body, data } = req.body || {};
    if (!userId || !title || !body) return res.status(400).send('Missing parameters');

    // Write in-app notification (so it appears in the app feed)
    await createInAppNotification(userId, { title, body, data });

    // Fetch token and send FCM if available
    const userRef = firestore.collection('users').doc(userId);
    const userSnap = await userRef.get();
    if (!userSnap.exists) return res.status(404).send('User not found');
    const user = userSnap.data();
    const token = user?.notificationToken;

    if (!token) return res.status(200).send({ sent: false, reason: 'no-token' });

    const message = {
      token,
      notification: { title, body },
      webpush: { headers: { Urgency: 'high' }, fcmOptions: { link: data?.link || '/' } },
      data: data || {}
    };

    const resp = await messaging.send(message);
    return res.status(200).send({ sent: true, resp });
  } catch (err) {
    console.error('sendToUser error', err);
    return res.status(500).send({ error: String(err) });
  }
});

// HTTPS function to broadcast to many users (writes a public in-app note and attempts multicast sends)
exports.broadcast = functions.https.onRequest(async (req, res) => {
  if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');
  try {
    const { title, body, data } = req.body || {};
    if (!title || !body) return res.status(400).send('Missing parameters');

    // Save an ALL_USERS in-app notification
    await createInAppNotification('ALL_USERS', { title, body, data });

    // Collect tokens (careful with large collections; paginate or use topics for huge audiences)
    const q = await firestore.collection('users').where('notificationToken', '!=', null).get();
    const tokens = q.docs.map(d => d.data()?.notificationToken).filter(Boolean);
    if (tokens.length === 0) return res.status(200).send({ sent: false, reason: 'no-tokens' });

    // Firebase Admin supports up to ~500 tokens per multicast, so batch
    const BATCH_SIZE = 450;
    const results = [];
    for (let i = 0; i < tokens.length; i += BATCH_SIZE) {
      const chunk = tokens.slice(i, i + BATCH_SIZE);
      const message = {
        tokens: chunk,
        notification: { title, body },
        webpush: { headers: { Urgency: 'high' } },
        data: data || {}
      };
      const resp = await messaging.sendEachForMulticast(message);
      results.push(resp);
    }

    return res.status(200).send({ sent: true, chunks: results.length });
  } catch (err) {
    console.error('broadcast error', err);
    return res.status(500).send({ error: String(err) });
  }
});
