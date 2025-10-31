import { initializeApp } from "firebase/app";
import { getMessaging, onBackgroundMessage } from "firebase/messaging/sw";

// NOTE: This config is duplicated from 'config/firebase.ts' because service workers run in a separate thread.
const firebaseConfig = {
  apiKey: "AIzaSyBbvjDDFf7kb5tdvv5iOR2v29HFcb-vBhU",
  authDomain: "tick-c20ac.firebaseapp.com",
  projectId: "tick-c20ac",
  storageBucket: "tick-c20ac.firebasestorage.app",
  messagingSenderId: "717973440095",
  appId: "1:717973440095:web:3e388dc407554ddd15bdea",
  measurementId: "G-B5MQ1LETCL"
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