
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyBE3KrZbhU-CXxEO_Clz6L2V9AqgdoQ1x4",
  authDomain: "levelup-87509.firebaseapp.com",
  projectId: "levelup-87509",
  storageBucket: "levelup-87509.appspot.com",
  messagingSenderId: "495294111203",
  appId: "1:495294111203:web:73f82542f7d1265f5c54d6",
  measurementId: "G-7VMVCJ7WS1"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const firestore = getFirestore(app);
const storage = getStorage(app);

export { auth, firestore, storage };