import { initializeApp } from "firebase/app";
import { getMessaging, onBackgroundMessage } from "firebase/messaging/sw";

// NOTE: This config is duplicated from 'config/firebase.ts' because service workers run in a separate thread.
const firebaseConfig = {
  apiKey: "AIzaSyBE3KrZbhU-CXxEO_Clz6L2V9AqgdoQ1x4",
  authDomain: "levelup-87509.firebaseapp.com",
  projectId: "levelup-87509",
  storageBucket: "levelup-87509.appspot.com",
  messagingSenderId: "495294111203",
  appId: "1:495294111203:web:73f82542f7d1265f5c54d6",
  measurementId: "G-7VMVCJ7WS1"
};

const app = initializeApp(firebaseConfig);
const messaging = getMessaging(app);

onBackgroundMessage(messaging, (payload) => {
  console.log(
    "[firebase-messaging-sw.js] Received background message ",
    payload
  );

  const notificationTitle = payload.notification?.title || 'LevelUp';
  const notificationOptions = {
    body: payload.notification?.body || 'You have a new notification.',
    icon: "/vite.svg",
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});