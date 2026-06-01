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

// HTTPS function to create an announcement (admin UI can call this)
exports.createAnnouncement = functions.https.onRequest(async (req, res) => {
  if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');
  try {
    const { title, body, targetUsers, startsAt, endsAt, data } = req.body || {};
    if (!title || !body) return res.status(400).send('Missing title/body');

    const note = {
      title,
      body,
      data: data || {},
      targetUsers: Array.isArray(targetUsers) ? targetUsers : null,
      startsAt: startsAt ? admin.firestore.Timestamp.fromDate(new Date(startsAt)) : admin.firestore.FieldValue.serverTimestamp(),
      endsAt: endsAt ? admin.firestore.Timestamp.fromDate(new Date(endsAt)) : null,
      read: false,
      created_at: admin.firestore.FieldValue.serverTimestamp(),
    };

    const docRef = await firestore.collection('announcements').add(note);

    // If the announcement is immediate and global, also create a userNotifications entry for ALL_USERS
    if (!targetUsers) {
      await createInAppNotification('ALL_USERS', { title, body, data });
      // Optionally broadcast push to tokens (careful with scale)
      const q = await firestore.collection('users').where('notificationToken', '!=', null).limit(500).get();
      const tokens = q.docs.map(d => d.data()?.notificationToken).filter(Boolean);
      if (tokens.length > 0) {
        await messaging.sendEachForMulticast({
          tokens,
          notification: { title, body },
          webpush: { headers: { Urgency: 'high' } },
          data: data || {}
        }).catch((e) => console.warn('broadcast partial send error', e));
      }
    } else {
      // Targeted: write per-user and send direct push where token exists
      for (const uid of targetUsers) {
        await createInAppNotification(uid, { title, body, data });
        const userSnap = await firestore.collection('users').doc(uid).get();
        const token = userSnap.exists ? userSnap.data()?.notificationToken : null;
        if (token) {
          await messaging.send({ token, notification: { title, body }, data: data || {} }).catch(() => null);
        }
      }
    }

    return res.status(200).send({ id: docRef.id });
  } catch (err) {
    console.error('createAnnouncement error', err);
    return res.status(500).send({ error: String(err) });
  }
});

// Scheduled function: daily reminders (runs every day at 12:00 UTC)
exports.dailyReminderJob = functions.pubsub.schedule('0 12 * * *').timeZone('UTC').onRun(async (context) => {
  try {
    // Simple example: find users who have notifications enabled and who did not complete today's body scan
    const usersSnap = await firestore.collection('users').where('notificationPreferences.dailyReminders', '==', true).get();
    const today = new Date();
    const startOfDay = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate(), 0, 0, 0));
    const endOfDay = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate(), 23, 59, 59));

    const promises = [];
    for (const userDoc of usersSnap.docs) {
      const uid = userDoc.id;
      // Check if user has a body scan today
      const scansQ = await firestore.collection('bodyScans')
        .where('userId', '==', uid)
        .where('created_at', '>=', admin.firestore.Timestamp.fromDate(startOfDay))
        .where('created_at', '<=', admin.firestore.Timestamp.fromDate(endOfDay))
        .limit(1)
        .get();

      const hasBodyScan = !scansQ.empty;
      if (!hasBodyScan) {
        // send reminder
        const title = 'Don\'t forget your Body Scan';
        const body = 'You haven\'t completed your body scan today. Open the app to finish your ring.';
        promises.push(createInAppNotification(uid, { title, body, data: { type: 'reminder', category: 'body' } }));
        const token = userDoc.data()?.notificationToken;
        if (token) {
          promises.push(messaging.send({ token, notification: { title, body }, data: { type: 'reminder', category: 'body' } }).catch(() => null));
        }
      }
    }

    await Promise.all(promises);
    return null;
  } catch (err) {
    console.error('dailyReminderJob error', err);
    return null;
  }
});
