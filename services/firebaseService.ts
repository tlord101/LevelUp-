import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  UserCredential,
  User,
  OAuthProvider,
  sendPasswordResetEmail,
} from 'firebase/auth';
import { doc, setDoc, serverTimestamp, getDoc, collection, addDoc, query, where, orderBy, getDocs, Timestamp, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { auth, firestore, storage, messaging } from '../config/firebase';
import { UserGoal, UserProfile, NutritionScan, BodyScan, FaceScan, Post, Group } from '../types';
import { getToken, onMessage, Unsubscribe } from 'firebase/messaging';

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
      onboardingCompleted: false,
      createdAt: serverTimestamp(),
      level: 1,
      xp: 0,
      stats: {
        strength: 10,
        glow: 10,
        energy: 10,
        willpower: 10,
      },
      notificationToken: null,
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

// Send Password Reset Email
export const sendPasswordReset = async (email: string): Promise<void> => {
  return sendPasswordResetEmail(auth, email);
};

// --- PUSH NOTIFICATION SERVICE FUNCTIONS ---

/**
 * Requests permission for push notifications and saves the token to Firestore.
 * @param userId The current user's ID.
 * @returns A boolean indicating if permission was successfully granted and the token saved.
 * @throws An error if notifications are not supported or if token retrieval fails.
 */
export const requestNotificationPermissionAndSaveToken = async (userId: string): Promise<boolean> => {
  if (!('Notification' in window) || !('serviceWorker' in navigator) || !('PushManager' in window)) {
    throw new Error("This browser does not support push notifications.");
  }

  const permission = await Notification.requestPermission();
  if (permission === 'granted') {
    console.log('Notification permission granted.');
    try {
      // VAPID key from Firebase Console > Project Settings > Cloud Messaging > Web Push certificates
      const vapidKey = "BPhg-eH05LSAj_1O8C8U9_Y3z1K-qBv3O1Q6s7p9g_4Z8J2R0wF_v_l6H3a1j4k5s_N9O7l2G8X1Y0c";
      const currentToken = await getToken(messaging, { vapidKey });

      if (currentToken) {
        console.log('FCM Token:', currentToken);
        const userRef = doc(firestore, 'users', userId);
        await updateDoc(userRef, { notificationToken: currentToken });
        return true;
      } else {
        throw new Error('Failed to generate notification token. Please try again.');
      }
    } catch (err: any) {
      console.error('An error occurred while retrieving token.', err);
      if (err.code === 'messaging/invalid-vapid-key') {
         throw new Error('Configuration error: The notification VAPID key is invalid.');
      }
      throw new Error(`An error occurred while setting up notifications. Please check the console for details.`);
    }
  } else {
    console.log('Unable to get permission to notify.');
    return false;
  }
};

/**
 * Listens for messages that arrive while the app is in the foreground.
 * @param callback A function to be called with the message payload.
 * @returns An unsubscribe function to stop listening.
 */
export const listenForForegroundMessages = (callback: (payload: any) => void): Unsubscribe => {
  return onMessage(messaging, (payload) => {
    console.log('Foreground message received. ', payload);
    callback(payload);
  });
};


// Upload image to Firebase Storage (for AI scans)
export const uploadImage = async (blob: Blob, userId: string): Promise<string> => {
    const timestamp = new Date().getTime();
    const storageRef = ref(storage, `scans/${userId}/${timestamp}.jpeg`);
    await uploadBytes(storageRef, blob);
    const downloadURL = await getDownloadURL(storageRef);
    return downloadURL;
};

// Upload image for a post to Firebase Storage
export const uploadPostImage = async (blob: Blob, userId: string): Promise<string> => {
    const timestamp = new Date().getTime();
    const storageRef = ref(storage, `posts/${userId}/${timestamp}.jpeg`);
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

// Save body scan to Firestore
export const saveBodyScan = async (userId: string, imageURL: string, results: any) => {
    await addDoc(collection(firestore, 'bodyScans'), {
        userId,
        imageURL,
        results,
        createdAt: serverTimestamp(),
    });
};

// Get body scan history from Firestore
export const getBodyScans = async (userId: string): Promise<BodyScan[]> => {
    const q = query(
        collection(firestore, 'bodyScans'),
        where('userId', '==', userId)
    );
    const querySnapshot = await getDocs(q);
    const scans: BodyScan[] = [];
    querySnapshot.forEach((doc) => {
        scans.push({ id: doc.id, ...doc.data() } as BodyScan);
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

// Save face scan to Firestore
export const saveFaceScan = async (userId: string, imageURL: string, results: any) => {
    await addDoc(collection(firestore, 'faceScans'), {
        userId,
        imageURL,
        results,
        createdAt: serverTimestamp(),
    });
};

// Get face scan history from Firestore
export const getFaceScans = async (userId: string): Promise<FaceScan[]> => {
    const q = query(
        collection(firestore, 'faceScans'),
        where('userId', '==', userId)
    );
    const querySnapshot = await getDocs(q);
    const scans: FaceScan[] = [];
    querySnapshot.forEach((doc) => {
        scans.push({ id: doc.id, ...doc.data() } as FaceScan);
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

// Create a new post in Firestore
export const createPost = async (userId: string, authorDisplayName: string, content: string, imageUrl?: string) => {
    await addDoc(collection(firestore, 'posts'), {
        userId,
        authorDisplayName,
        content,
        imageUrl: imageUrl || null,
        createdAt: serverTimestamp(),
        likes: [],
        commentCount: 0,
    });
};

// Get all posts for the activity feed
export const getPosts = async (): Promise<Post[]> => {
    const postsCollection = collection(firestore, 'posts');
    const q = query(postsCollection, orderBy('createdAt', 'desc'));
    const querySnapshot = await getDocs(q);
    const posts: Post[] = [];
    querySnapshot.forEach((doc) => {
        posts.push({ id: doc.id, ...doc.data() } as Post);
    });
    return posts;
};

// --- GROUP SERVICE FUNCTIONS ---

// Create a new group
export const createGroup = async (name: string, description: string, icon: string, ownerId: string) => {
    const groupRef = await addDoc(collection(firestore, 'groups'), {
        name,
        description,
        icon,
        ownerId,
        members: [ownerId], // Owner is the first member
        createdAt: serverTimestamp(),
    });
    return groupRef.id;
};

// Get groups for a specific user
export const getUserGroups = async (userId: string): Promise<Group[]> => {
    const q = query(
        collection(firestore, 'groups'),
        where('members', 'array-contains', userId)
        // Note: orderBy('createdAt', 'desc') was removed to fix a missing composite index error.
        // Sorting is now handled on the client-side after fetching the data.
    );
    const querySnapshot = await getDocs(q);
    const groups: Group[] = [];
    querySnapshot.forEach((doc) => {
        groups.push({ id: doc.id, ...doc.data() } as Group);
    });
    
    // Sort groups by date in descending order on the client
    groups.sort((a, b) => {
        const timeA = a.createdAt && typeof (a.createdAt as Timestamp).toDate === 'function'
            ? (a.createdAt as Timestamp).toDate().getTime()
            : 0;
        const timeB = b.createdAt && typeof (b.createdAt as Timestamp).toDate === 'function'
            ? (b.createdAt as Timestamp).toDate().getTime()
            : 0;
        return timeB - timeA;
    });

    return groups;
};

// Get all groups for discovery
export const getAllGroups = async (): Promise<Group[]> => {
    const q = query(collection(firestore, 'groups'), orderBy('createdAt', 'desc'));
    const querySnapshot = await getDocs(q);
    const groups: Group[] = [];
    querySnapshot.forEach((doc) => {
        groups.push({ id: doc.id, ...doc.data() } as Group);
    });
    return groups;
};

// Get details for a single group
export const getGroupDetails = async (groupId: string): Promise<Group | null> => {
    const groupRef = doc(firestore, 'groups', groupId);
    const docSnap = await getDoc(groupRef);
    if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() } as Group;
    }
    return null;
};

// Join a group
export const joinGroup = async (groupId: string, userId: string): Promise<void> => {
    const groupRef = doc(firestore, 'groups', groupId);
    await updateDoc(groupRef, {
        members: arrayUnion(userId)
    });
};

// Leave a group
export const leaveGroup = async (groupId: string, userId: string): Promise<void> => {
    const groupRef = doc(firestore, 'groups', groupId);
    await updateDoc(groupRef, {
        members: arrayRemove(userId)
    });
};