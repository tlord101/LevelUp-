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

const getDateKeyInTimeZone = (date, timeZone) => {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return formatter.format(date);
};

const getHourInTimeZone = (date, timeZone) => {
  const formatter = new Intl.DateTimeFormat('en-GB', {
    timeZone,
    hour: '2-digit',
    hour12: false,
  });
  return Number(formatter.format(date));
};

const toDate = (value) => {
  if (!value) return null;
  if (value.toDate && typeof value.toDate === 'function') return value.toDate();
  if (value.seconds) return new Date(value.seconds * 1000);
  if (typeof value === 'string') return new Date(value);
  return null;
};

const getMinReminderIntervalHours = (frequency) => {
  if (frequency === 'low') return 20;
  if (frequency === 'high') return 6;
  return 10;
};

// Scheduled function: smart reminders (runs every 3 hours)
exports.dailyReminderJob = functions.pubsub.schedule('0 */3 * * *').timeZone('UTC').onRun(async () => {
  try {
    const usersSnap = await firestore.collection('users').where('notificationPreferences.dailyReminders', '==', true).get();
    const now = new Date();
    const ops = [];

    for (const userDoc of usersSnap.docs) {
      const uid = userDoc.id;
      const userData = userDoc.data() || {};
      const prefs = userData.notificationPreferences || {};
      const timeZone = prefs.timezone || 'UTC';
      const reminderFrequency = prefs.reminderFrequency || 'normal';
      const minIntervalHours = getMinReminderIntervalHours(reminderFrequency);
      const lastReminderAt = toDate(userData.lastEngagementReminderAt);
      const hoursSinceLastReminder = lastReminderAt ? (now.getTime() - lastReminderAt.getTime()) / (1000 * 60 * 60) : Number.POSITIVE_INFINITY;
      if (hoursSinceLastReminder < minIntervalHours) continue;

      const localToday = getDateKeyInTimeZone(now, timeZone);
      const localHour = getHourInTimeZone(now, timeZone);

      const [bodySnap, faceSnap, foodSnap] = await Promise.all([
        firestore.collection('bodyScans').where('userId', '==', uid).orderBy('created_at', 'desc').limit(10).get(),
        firestore.collection('faceScans').where('userId', '==', uid).orderBy('created_at', 'desc').limit(20).get(),
        firestore.collection('nutritionScans').where('userId', '==', uid).orderBy('created_at', 'desc').limit(20).get(),
      ]);

      const bodyToday = bodySnap.docs.some((docSnap) => {
        const created = toDate(docSnap.data().created_at);
        return created && getDateKeyInTimeZone(created, timeZone) === localToday;
      });

      let faceMorning = false;
      let faceEvening = false;
      faceSnap.docs.forEach((docSnap) => {
        const created = toDate(docSnap.data().created_at);
        if (!created || getDateKeyInTimeZone(created, timeZone) !== localToday) return;
        const h = getHourInTimeZone(created, timeZone);
        if (h >= 4 && h < 12) faceMorning = true;
        if (h >= 18 || h < 2) faceEvening = true;
      });

      const seenMeals = { breakfast: false, lunch: false, dinner: false };
      foodSnap.docs.forEach((docSnap) => {
        const created = toDate(docSnap.data().created_at);
        if (!created || getDateKeyInTimeZone(created, timeZone) !== localToday) return;
        const h = getHourInTimeZone(created, timeZone);
        if (h >= 5 && h <= 10) seenMeals.breakfast = true;
        if (h >= 11 && h <= 15) seenMeals.lunch = true;
        if (h >= 17 && h <= 22) seenMeals.dinner = true;
      });
      const mealsCompleted = Object.values(seenMeals).filter(Boolean).length;

      let reminder = null;
      if (!bodyToday && localHour >= 10) {
        reminder = {
          category: 'body',
          title: 'Your body ring is still open',
          body: 'You have not completed your body scan today. A quick scan keeps your streak alive.',
        };
      } else if (!faceMorning && localHour >= 13 && localHour < 18) {
        reminder = {
          category: 'face-morning',
          title: 'Morning face scan missing',
          body: 'Complete your morning face scan to stay on track with your daily ring.',
        };
      } else if (!faceEvening && localHour >= 20) {
        reminder = {
          category: 'face-evening',
          title: 'Evening face scan pending',
          body: 'Close your face ring tonight with a quick evening scan.',
        };
      } else if (mealsCompleted < 2 && localHour >= 15 && localHour < 20) {
        reminder = {
          category: 'nutrition-afternoon',
          title: 'Nutrition ring check-in',
          body: `You are at ${mealsCompleted}/3 meals today. Log your next meal to keep momentum.`,
        };
      } else if (mealsCompleted < 3 && localHour >= 20) {
        reminder = {
          category: 'nutrition-evening',
          title: 'Final nutrition ring push',
          body: `You are at ${mealsCompleted}/3 meals. One more meal log can complete your ring today.`,
        };
      }

      if (!reminder) continue;

      ops.push(createInAppNotification(uid, {
        title: reminder.title,
        body: reminder.body,
        data: { type: 'reminder', category: reminder.category },
      }));

      if (userData.notificationToken) {
        ops.push(
          messaging.send({
            token: userData.notificationToken,
            notification: { title: reminder.title, body: reminder.body },
            data: { type: 'reminder', category: reminder.category },
          }).catch(() => null)
        );
      }

      ops.push(
        firestore.collection('users').doc(uid).set(
          {
            lastEngagementReminderAt: admin.firestore.FieldValue.serverTimestamp(),
            lastEngagementReminderCategory: reminder.category,
          },
          { merge: true }
        )
      );
    }

    await Promise.all(ops);
    return null;
  } catch (err) {
    console.error('dailyReminderJob error', err);
    return null;
  }
});
