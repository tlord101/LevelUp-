import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getMessaging } from 'firebase/messaging';

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
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

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const firestore = getFirestore(app);
const storage = getStorage(app);
const messaging = getMessaging(app);

export { auth, firestore, storage, messaging };
