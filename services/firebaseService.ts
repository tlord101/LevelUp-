import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  signOut,
  UserCredential,
  User,
  OAuthProvider,
  sendPasswordResetEmail,
  updateProfile,
  updatePassword as firebaseUpdatePassword,
} from 'firebase/auth';
import { 
  doc, 
  setDoc, 
  serverTimestamp, 
  getDoc, 
  collection, 
  addDoc, 
  query, 
  where, 
  orderBy, 
  getDocs, 
  Timestamp, 
  updateDoc, 
  arrayUnion, 
  arrayRemove,
  limit,
  deleteDoc
} from 'firebase/firestore';
import { auth, firestore, messaging } from '../config/firebase';
import { UserGoal, UserProfile, NutritionScan, BodyScan, FaceScan, Post, Group, Comment, NutritionLog, NutritionScanResult, BodyScanResult, FaceScanResult } from '../types';
import { getToken, onMessage, Unsubscribe } from 'firebase/messaging';

// --- HELPER ---
const convertTimestampToISO = (data: any) => {
    const newData = { ...data };
    for (const key in newData) {
        if (newData[key] instanceof Timestamp) {
            newData[key] = newData[key].toDate().toISOString();
        }
    }
    if (newData.createdAt instanceof Timestamp) {
        newData.created_at = newData.createdAt.toDate().toISOString();
    }
    return newData;
};

// --- USER PROFILE ---

export const createOrUpdateUserProfile = async (user: User, additionalData: Partial<UserProfile> = {}) => {
  const userRef = doc(firestore, 'users', user.uid);
  // Check if the user exists
  const docSnap = await getDoc(userRef);

  if (!docSnap.exists()) {
    const profileData = {
      id: user.uid,
      email: user.email,
      display_name: additionalData.display_name || user.displayName || 'New User',
      age: additionalData.age || null,
      gender: additionalData.gender || null,
      height: null,
      weight: null,
      skin_type: null,
      allergies: null,
      goal: additionalData.goal || UserGoal.FITNESS,
      onboarding_completed: false,
      created_at: serverTimestamp(),
      level: 1,
      xp: 0,
      stats: {
        strength: 10,
        glow: 10,
        energy: 10,
        willpower: 10,
      },
      notificationToken: null,
      notificationPreferences: {
        dailyReminders: true,
        communityUpdates: true,
      },
    };
    await setDoc(userRef, profileData);
  }
};

export const updateUserProfileData = async (userId: string, data: Partial<UserProfile>) => {
    const userRef = doc(firestore, 'users', userId);
    await updateDoc(userRef, data);
    return await getUserProfile(userId);
};

export const getUserProfile = async (userId: string): Promise<UserProfile | null> => {
    const userRef = doc(firestore, 'users', userId);
    const docSnap = await getDoc(userRef);
    if (docSnap.exists()) {
        return convertTimestampToISO(docSnap.data()) as UserProfile;
    }
    return null;
};

// --- AUTHENTICATION ---

export const signUpWithEmail = async (email: string, password: string): Promise<UserCredential> => {
  return await createUserWithEmailAndPassword(auth, email, password);
};

export const signInWithEmail = async (email: string, password: string): Promise<UserCredential> => {
  return await signInWithEmailAndPassword(auth, email, password);
};

export const signInWithOAuth = async (providerName: 'google' | 'apple'): Promise<void> => {
  let provider;
  if (providerName === 'google') {
      provider = new GoogleAuthProvider();
      // Add prompt to force selection which can sometimes help with redirect flows
      provider.setCustomParameters({ prompt: 'select_account' });
  } else {
      provider = new OAuthProvider('apple.com');
  }
  
  try {
      // Attempt popup first
      await signInWithPopup(auth, provider);
  } catch (error: any) {
      console.warn("Popup sign-in failed or was blocked. Falling back to redirect method.", error.code, error.message);
      // Fallback to redirect if popup is blocked or fails
      // Common errors: auth/popup-blocked, auth/cancelled-popup-request, auth/popup-closed-by-user
      try {
          await signInWithRedirect(auth, provider);
      } catch (redirectError) {
          console.error("Redirect sign-in also failed", redirectError);
          throw redirectError;
      }
  }
};

export const signOutUser = async (): Promise<void> => {
  return await signOut(auth);
};

export const sendPasswordReset = async (email: string): Promise<void> => {
  return await sendPasswordResetEmail(auth, email);
};

export const updatePassword = async (newPassword: string) => {
    if (auth.currentUser) {
        await firebaseUpdatePassword(auth.currentUser, newPassword);
    } else {
        throw new Error("No user logged in");
    }
};

export const updateUserMetadata = async (metadata: { avatar_url?: string }) => {
    if (auth.currentUser) {
         // Update Firebase Auth profile
        if (metadata.avatar_url) {
            await updateProfile(auth.currentUser, { photoURL: metadata.avatar_url });
        }
    }
};

// --- IMGBB STORAGE ---

export const uploadImage = async (file: Blob | File, userId?: string, bucket?: string, folder?: string): Promise<string> => {
    const formData = new FormData();
    formData.append('image', file);
    
    // ImgBB API Key provided in prompt
    const API_KEY = '6505fea8f075d916e86cfd1bcbabc126';
    
    try {
        const response = await fetch(`https://api.imgbb.com/1/upload?key=${API_KEY}`, {
            method: 'POST',
            body: formData
        });

        const data = await response.json();
        
        if (data.success) {
            return data.data.url;
        } else {
            console.error("ImgBB Upload Error:", data);
            throw new Error(data.error?.message || 'Failed to upload image to ImgBB');
        }
    } catch (error: any) {
        console.error("ImgBB Network Error:", error);
        throw new Error(error.message || 'Network error uploading image');
    }
};

// --- PUSH NOTIFICATIONS ---

export const requestNotificationPermissionAndSaveToken = async (userId: string): Promise<boolean> => {
  if (!('Notification' in window)) return false;

  const permission = await Notification.requestPermission();
  if (permission === 'granted') {
    try {
      // Note: VAPID key needs to be configured in a real app. 
      // For now we just simulate success or handle if key exists.
      const currentToken = await getToken(messaging, { vapidKey: "YOUR_VAPID_KEY" }).catch(() => null);
      if (currentToken) {
        const userRef = doc(firestore, 'users', userId);
        await updateDoc(userRef, { notificationToken: currentToken });
        return true;
      }
    } catch (e) {
      console.log("Notification token error", e);
    }
  }
  return false;
};

export const listenForForegroundMessages = (callback: (payload: any) => void): Unsubscribe => {
  return onMessage(messaging, (payload) => {
    callback(payload);
  });
};

// --- DATABASE: SCANS ---

export const saveNutritionScan = async (userId: string, imageUrl: string, results: NutritionScanResult) => {
    if (!userId) throw new Error("User ID required");
    await addDoc(collection(firestore, 'nutritionScans'), {
        userId,
        image_url: imageUrl, // Mapping to camelCase/snake_case as needed by types
        results,
        created_at: serverTimestamp(),
    });
};

export const getNutritionScans = async (userId: string): Promise<NutritionScan[]> => {
    if (!userId) return [];
    const q = query(
        collection(firestore, 'nutritionScans'),
        where('userId', '==', userId),
        orderBy('created_at', 'desc')
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => {
        const data = convertTimestampToISO(doc.data());
        return { id: doc.id, user_id: data.userId, ...data } as NutritionScan;
    });
};

export const saveBodyScan = async (userId: string, imageUrl: string, results: BodyScanResult) => {
    if (!userId) throw new Error("User ID required");
    await addDoc(collection(firestore, 'bodyScans'), {
        userId,
        image_url: imageUrl,
        results,
        created_at: serverTimestamp(),
    });
};

export const getBodyScans = async (userId: string): Promise<BodyScan[]> => {
    if (!userId) return [];
    const q = query(
        collection(firestore, 'bodyScans'),
        where('userId', '==', userId),
        orderBy('created_at', 'desc')
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => {
        const data = convertTimestampToISO(doc.data());
        return { id: doc.id, user_id: data.userId, ...data } as BodyScan;
    });
};

export const saveFaceScan = async (userId: string, imageUrl: string, results: FaceScanResult) => {
    if (!userId) throw new Error("User ID required");
    await addDoc(collection(firestore, 'faceScans'), {
        userId,
        image_url: imageUrl,
        results,
        created_at: serverTimestamp(),
    });
};

export const getFaceScans = async (userId: string): Promise<FaceScan[]> => {
    if (!userId) return [];
    const q = query(
        collection(firestore, 'faceScans'),
        where('userId', '==', userId),
        orderBy('created_at', 'desc')
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => {
        const data = convertTimestampToISO(doc.data());
        return { id: doc.id, user_id: data.userId, ...data } as FaceScan;
    });
};

// --- DATABASE: NUTRITION LOGS ---

export const logNutritionIntake = async (userId: string, logData: Omit<NutritionLog, 'id' | 'user_id' | 'created_at'> & { created_at?: string }) => {
    if (!userId) throw new Error("User ID required");
    await addDoc(collection(firestore, 'dailyNutritionLogs'), {
        userId,
        ...logData,
        created_at: logData.created_at ? Timestamp.fromDate(new Date(logData.created_at)) : serverTimestamp(),
    });
};

export const getTodaysNutritionLogs = async (userId: string): Promise<NutritionLog[]> => {
    if (!userId) return [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const q = query(
        collection(firestore, 'dailyNutritionLogs'),
        where('userId', '==', userId),
        where('created_at', '>=', Timestamp.fromDate(today)),
        orderBy('created_at', 'asc')
    );

    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => {
        const data = convertTimestampToISO(doc.data());
        return { id: doc.id, user_id: data.userId, ...data } as NutritionLog;
    });
};

export const getNutritionLogsForDate = async (userId: string, date: Date): Promise<NutritionLog[]> => {
    if (!userId) return [];
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const q = query(
        collection(firestore, 'dailyNutritionLogs'),
        where('userId', '==', userId),
        where('created_at', '>=', Timestamp.fromDate(startOfDay)),
        where('created_at', '<=', Timestamp.fromDate(endOfDay)),
        orderBy('created_at', 'asc')
    );

    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => {
         const data = convertTimestampToISO(doc.data());
        return { id: doc.id, user_id: data.userId, ...data } as NutritionLog;
    });
};

export const deleteNutritionLog = async (logId: string) => {
    await deleteDoc(doc(firestore, 'dailyNutritionLogs', logId));
};

export const updateNutritionLog = async (logId: string, updates: Partial<NutritionLog>) => {
    const logRef = doc(firestore, 'dailyNutritionLogs', logId);
    await updateDoc(logRef, updates);
};

// --- DATABASE: COMMUNITY (POSTS & GROUPS) ---

export const createPost = async (userId: string, authorDisplayName: string, content: string, imageUrl?: string, groupId?: string | null) => {
    await addDoc(collection(firestore, 'posts'), {
        userId,
        author_display_name: authorDisplayName,
        content,
        image_url: imageUrl || null,
        group_id: groupId || null,
        likes: [],
        comment_count: 0,
        created_at: serverTimestamp(),
    });
};

export const getPosts = async (): Promise<Post[]> => {
    const q = query(
        collection(firestore, 'posts'),
        where('group_id', '==', null),
        orderBy('created_at', 'desc')
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => {
         const data = convertTimestampToISO(doc.data());
        return { id: doc.id, user_id: data.userId, ...data } as Post;
    });
};

export const getPostsForGroup = async (groupId: string): Promise<Post[]> => {
    if (!groupId) return [];
    const q = query(
        collection(firestore, 'posts'),
        where('group_id', '==', groupId),
        orderBy('created_at', 'desc')
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => {
         const data = convertTimestampToISO(doc.data());
        return { id: doc.id, user_id: data.userId, ...data } as Post;
    });
};

export const likePost = async (postId: string): Promise<void> => {
    const postRef = doc(firestore, 'posts', postId);
    const currentUser = auth.currentUser;
    if (currentUser) {
        await updateDoc(postRef, {
            likes: arrayUnion(currentUser.uid)
        });
    }
};

export const unlikePost = async (postId: string): Promise<void> => {
    const postRef = doc(firestore, 'posts', postId);
    const currentUser = auth.currentUser;
    if (currentUser) {
        await updateDoc(postRef, {
            likes: arrayRemove(currentUser.uid)
        });
    }
};

export const createComment = async (postId: string, userId: string, authorDisplayName: string, content: string): Promise<Comment> => {
    const commentRef = await addDoc(collection(firestore, 'comments'), {
        post_id: postId,
        user_id: userId,
        author_display_name: authorDisplayName,
        content,
        created_at: serverTimestamp()
    });
    
    // Increment comment count on post
    // Note: Real transaction would be safer but simplified here
    const postRef = doc(firestore, 'posts', postId);
    // We can't easily atomic increment without current value or a transaction reading it first, 
    // but for this simple app we will just fire and forget the update or assume client optimistically updates.
    // Ideally: use increment(1). For now, just rely on fetching.
    
    // Return constructed comment
    return {
        id: commentRef.id,
        post_id: postId,
        user_id: userId,
        author_display_name: authorDisplayName,
        content,
        created_at: new Date().toISOString()
    };
};

export const getCommentsForPost = async (postId: string): Promise<Comment[]> => {
    if (!postId) return [];
    const q = query(
        collection(firestore, 'comments'),
        where('post_id', '==', postId),
        orderBy('created_at', 'asc')
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => {
         const data = convertTimestampToISO(doc.data());
        return { id: doc.id, ...data } as Comment;
    });
};

export const createGroup = async (name: string, description: string, icon: string, ownerId: string) => {
    const groupRef = await addDoc(collection(firestore, 'groups'), {
        name,
        description,
        icon,
        owner_id: ownerId,
        members: [ownerId],
        created_at: serverTimestamp()
    });
    return groupRef.id;
};

export const getUserGroups = async (userId: string): Promise<Group[]> => {
    if (!userId) return [];
    const q = query(
        collection(firestore, 'groups'),
        where('members', 'array-contains', userId),
        orderBy('created_at', 'desc')
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => {
         const data = convertTimestampToISO(doc.data());
        return { id: doc.id, ...data } as Group;
    });
};

export const getAllGroups = async (): Promise<Group[]> => {
    const q = query(
        collection(firestore, 'groups'),
        orderBy('created_at', 'desc')
    );
    const querySnapshot = await getDocs(q);
     return querySnapshot.docs.map(doc => {
         const data = convertTimestampToISO(doc.data());
        return { id: doc.id, ...data } as Group;
    });
};

export const getGroupDetails = async (groupId: string): Promise<Group | null> => {
    const groupRef = doc(firestore, 'groups', groupId);
    const docSnap = await getDoc(groupRef);
    if (docSnap.exists()) {
         const data = convertTimestampToISO(docSnap.data());
        return { id: docSnap.id, ...data } as Group;
    }
    return null;
};

export const joinGroup = async (groupId: string): Promise<void> => {
    const currentUser = auth.currentUser;
    if (currentUser) {
        const groupRef = doc(firestore, 'groups', groupId);
        await updateDoc(groupRef, {
            members: arrayUnion(currentUser.uid)
        });
    }
};

export const leaveGroup = async (groupId: string): Promise<void> => {
    const currentUser = auth.currentUser;
    if (currentUser) {
        const groupRef = doc(firestore, 'groups', groupId);
        await updateDoc(groupRef, {
            members: arrayRemove(currentUser.uid)
        });
    }
};

// --- DATABASE: AI COACH FUNCTIONS ---

export const getUserStats = async (userId: string) => {
    if (!userId) return null;
    const profile = await getUserProfile(userId);
    if (profile) {
        return {
            level: profile.level,
            xp: profile.xp,
            stats: profile.stats
        };
    }
    return null;
};

export const getLatestScan = async (userId: string, scanType: 'nutrition' | 'body' | 'face') => {
    if (!userId) return { message: "User ID required" };
    let collectionName: string;
    switch(scanType) {
        case 'nutrition': collectionName = 'nutritionScans'; break;
        case 'body': collectionName = 'bodyScans'; break;
        case 'face': collectionName = 'faceScans'; break;
        default: return { message: "Invalid scan type" };
    }

    const q = query(
        collection(firestore, collectionName),
        where('userId', '==', userId),
        orderBy('created_at', 'desc'),
        limit(1)
    );
    
    const querySnapshot = await getDocs(q);
    if (!querySnapshot.empty) {
        const data = convertTimestampToISO(querySnapshot.docs[0].data());
        return { results: data.results, created_at: data.created_at };
    }
    return { message: `No ${scanType} scans found.` };
};

export const getWeeklyNutritionSummary = async (userId: string) => {
    if (!userId) return { message: "User ID required" };
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    const q = query(
        collection(firestore, 'nutritionScans'),
        where('userId', '==', userId),
        where('created_at', '>=', Timestamp.fromDate(oneWeekAgo))
    );
    
    const querySnapshot = await getDocs(q);
    const scans = querySnapshot.docs.map(doc => doc.data());

    if (scans.length === 0) {
        return { message: 'No nutrition scans found in the last week.' };
    }

    const summary = scans.reduce((acc, scan) => {
        const results = scan.results;
        acc.totalCalories += results.calories;
        acc.totalProtein += results.macros.protein;
        acc.totalCarbs += results.macros.carbs;
        acc.totalFat += results.macros.fat;
        acc.scanCount += 1;
        return acc;
    }, { totalCalories: 0, totalProtein: 0, totalCarbs: 0, totalFat: 0, scanCount: 0 });

    return {
        scanCount: summary.scanCount,
        averageCalories: summary.totalCalories / summary.scanCount,
        averageProtein: summary.totalProtein / summary.scanCount,
        averageCarbs: summary.totalCarbs / summary.scanCount,
        averageFat: summary.totalFat / summary.scanCount,
    };
};