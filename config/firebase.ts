import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getMessaging } from 'firebase/messaging';

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyBbvjDDFf7kb5tdvv5iOR2v29HFcb-vBhU",
  authDomain: "tick-c20ac.firebaseapp.com",
  projectId: "tick-c20ac",
  storageBucket: "tick-c20ac.firebasestorage.app",
  messagingSenderId: "717973440095",
  appId: "1:717973440095:web:3e388dc407554ddd15bdea",
  measurementId: "G-B5MQ1LETCL"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const firestore = getFirestore(app);
const storage = getStorage(app);
const messaging = getMessaging(app);

export { auth, firestore, storage, messaging };