
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  UserCredential,
  User,
  OAuthProvider,
} from 'firebase/auth';
import { doc, setDoc, serverTimestamp, getDoc, collection, addDoc, query, where, orderBy, getDocs, Timestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { auth, firestore, storage } from '../config/firebase';
import { UserGoal, UserProfile, NutritionScan } from '../types';

// Helper to create or update user profile in Firestore
export const createOrUpdateUserProfile = async (user: User, additionalData: Partial<UserProfile> = {}) => {
  const userRef = doc(firestore, 'users', user.uid);
  const docSnap = await getDoc(userRef);

  // If user is new (document doesn't exist), create it
  if (!docSnap.exists()) {
    const profileData = {
      uid: user.uid,
      email: user.email,
      displayName: additionalData.displayName || user.displayName || 'New User',
      age: additionalData.age || null,
      gender: additionalData.gender || null,
      height: null,
      weight: null,
      skinType: null,
      allergies: null,
      goal: additionalData.goal || UserGoal.FITNESS,
      onboardingCompleted: true,
      createdAt: serverTimestamp(),
      level: 1,
      xp: 0,
      stats: {
        strength: 10,
        glow: 10,
        energy: 10,
        willpower: 10,
      },
    };
    await setDoc(userRef, profileData);
  }
};


// Sign Up with Email and Password
export const signUpWithEmail = async (
  email: string,
  password: string
): Promise<UserCredential> => {
  const userCredential = await createUserWithEmailAndPassword(auth, email, password);
  // Profile creation is now handled by the AuthProvider listener
  return userCredential;
};

// Sign In with Email and Password
export const signInWithEmail = async (email: string, password: string): Promise<UserCredential> => {
  return signInWithEmailAndPassword(auth, email, password);
};

// Sign In with Google
export const signInWithGoogle = async (): Promise<UserCredential> => {
  const provider = new GoogleAuthProvider();
  const userCredential = await signInWithPopup(auth, provider);
  // Profile creation is now handled by the AuthProvider listener
  return userCredential;
};

// Sign In with Apple
export const signInWithApple = async (): Promise<UserCredential> => {
  const provider = new OAuthProvider('apple.com');
  try {
    const userCredential = await signInWithPopup(auth, provider);
    // Profile creation is now handled by the AuthProvider listener
    return userCredential;
  } catch (error: any) {
    if (error.code === 'auth/account-exists-with-different-credential') {
      alert('An account already exists with the same email address but different sign-in credentials. Try signing in with a different method.');
    }
    throw error;
  }
};


// Sign Out
export const signOutUser = async (): Promise<void> => {
  return signOut(auth);
};

// Upload image to Firebase Storage
export const uploadImage = async (blob: Blob, userId: string): Promise<string> => {
    const timestamp = new Date().getTime();
    const storageRef = ref(storage, `scans/${userId}/${timestamp}.jpeg`);
    await uploadBytes(storageRef, blob);
    const downloadURL = await getDownloadURL(storageRef);
    return downloadURL;
};

// Save nutrition scan to Firestore
export const saveNutritionScan = async (userId: string, imageURL: string, results: any) => {
    await addDoc(collection(firestore, 'nutritionScans'), {
        userId,
        imageURL,
        results,
        createdAt: serverTimestamp(),
    });
};

// Get nutrition scan history from Firestore
export const getNutritionScans = async (userId: string): Promise<NutritionScan[]> => {
    const q = query(
        collection(firestore, 'nutritionScans'),
        where('userId', '==', userId)
        // Note: orderBy('createdAt', 'desc') was removed to fix a missing composite index error.
        // Sorting is now handled on the client-side after fetching the data.
    );
    const querySnapshot = await getDocs(q);
    const scans: NutritionScan[] = [];
    querySnapshot.forEach((doc) => {
        scans.push({ id: doc.id, ...doc.data() } as NutritionScan);
    });

    // Sort scans by date in descending order on the client
    scans.sort((a, b) => {
        const timeA = a.createdAt && typeof (a.createdAt as Timestamp).toDate === 'function'
            ? (a.createdAt as Timestamp).toDate().getTime()
            : 0;
        const timeB = b.createdAt && typeof (b.createdAt as Timestamp).toDate === 'function'
            ? (b.createdAt as Timestamp).toDate().getTime()
            : 0;
        return timeB - timeA;
    });

    return scans;
};