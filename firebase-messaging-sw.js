import { initializeApp } from "firebase/app";
import { getMessaging, onBackgroundMessage } from "firebase/messaging/sw";

// NOTE: This config is duplicated from 'config/firebase.ts' because service workers run in a separate thread.
const firebaseConfig = {
  apiKey: "AIzaSyBuQojzHThQrFvHRd5Jx73RRymBLu8LeYk",
  authDomain: "levelupai-65a36.firebaseapp.com",
  databaseURL: "https://levelupai-65a36-default-rtdb.firebaseio.com",
  projectId: "levelupai-65a36",
  storageBucket: "levelupai-65a36.firebasestorage.app",
  messagingSenderId: "257177627874",
  appId: "1:257177627874:web:515851c7c2db6ad32082bb",
  measurementId: "G-FGK5SLSDF9"
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
