// firebase-messaging-sw.js

// 1. Load Firebase SDKs using importScripts() for global access.
// Ensure these versions match what you use in your main application.
importScripts('https://www.gstatic.com/firebasejs/10.1.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.1.0/firebase-messaging-compat.js');

// Optional: If you need Analytics/other features, you would include them here too.
// importScripts('https://www.gstatic.com/firebasejs/10.1.0/firebase-analytics-compat.js');


// Your web app's Firebase configuration
// NOTE: This must be hard-coded here or injected by a build tool.
const firebaseConfig = {
  apiKey: "AIzaSyBE3KrZbhU-CXxEO_Clz6L2V9AqgdoQ1x4",
  authDomain: "levelup-87509.firebaseapp.com",
  projectId: "levelup-87509",
  storageBucket: "levelup-87509.firebasestorage.app",
  messagingSenderId: "495294111203",
  appId: "1:495294111203:web:73f82542f7d1265f5c54d6",
  measurementId: "G-7VMVCJ7WS1" // Measurement ID is generally not needed in the SW
};

// 2. Initialize Firebase using the global 'firebase' object (compat API)
const app = firebase.initializeApp(firebaseConfig);

// 3. Get Messaging using the global 'firebase' object (compat API)
// The service worker listens globally, so we don't need 'onBackgroundMessage' 
// from the modern SDK. The messaging object handles it automatically.
const messaging = firebase.messaging();

// 4. Handle background messages using the compat API method
messaging.onBackgroundMessage((payload) => {
  console.log(
    "[firebase-messaging-sw.js] Received background message ",
    payload
  );

  const notificationTitle = payload.notification?.title || 'LevelUp';
  const notificationOptions = {
    body: payload.notification?.body || 'You have a new notification.',
    icon: "/vite.svg",
  };

  // self.registration is available in the Service Worker context
  self.registration.showNotification(notificationTitle, notificationOptions);
});
