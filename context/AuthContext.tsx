
import React, { createContext, useState, useEffect, useContext } from 'react';
import { User, onAuthStateChanged, getRedirectResult } from 'firebase/auth';
import { auth, firestore } from '../config/firebase';
import { doc, getDoc, updateDoc, onSnapshot, Unsubscribe } from 'firebase/firestore';
import { UserProfile } from '../types';
import { hapticSuccess } from '../utils/haptics';
import { createOrUpdateUserProfile, getUserProfile } from '../services/firebaseService';

interface AuthContextType {
  user: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  updateUserProfileData: (data: Partial<UserProfile>) => Promise<void>;
  addXP: (amount: number) => void;
  rewardUser: (xpAmount: number, statIncrements?: Partial<UserProfile['stats']>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({ 
    user: null, 
    userProfile: null, 
    loading: true, 
    updateUserProfileData: async () => {}, 
    addXP: () => {},
    rewardUser: async () => {}
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
        let profileUnsubscribe: Unsubscribe | null = null;

    // Function to handle auth state change
    const handleAuthChange = async (currentUser: User | null) => {
        if (!isMounted) return;

        if (currentUser) {
            setUser(currentUser);
            // Only set loading true if we actually have work to do
            // to prevent flashes if profile is already loaded (unlikely here, but good practice)
            setLoading(true);
            
            try {
                // Optimize: createOrUpdateUserProfile now returns the profile
                const profile = await createOrUpdateUserProfile(currentUser);

                if (isMounted) {
                    setUserProfile(profile);
                }

                // Set up a real-time listener to the user's profile document so stats update live
                try {
                    const userRef = doc(firestore, 'users', currentUser.uid);
                    profileUnsubscribe = onSnapshot(userRef, (snap) => {
                        if (!snap.exists()) return;
                        const data = snap.data();
                        if (isMounted) {
                            // convert any Timestamp fields if necessary (createOrUpdateUserProfile does this on read)
                            setUserProfile({ ...(data as any) } as any);
                        }
                    }, (err) => {
                        console.error('User profile onSnapshot error:', err);
                    });
                } catch (subErr) {
                    console.warn('Failed to subscribe to user profile updates:', subErr);
                }
            } catch (error) {
                console.error("Error fetching/creating user profile:", error);
                // In case of error, we might want to retry or show error state, 
                // but for now we ensure loading is turned off so app doesn't hang.
            } finally {
                if (isMounted) setLoading(false);
            }
        } else {
            // If signed out, cleanup profile listener and clear profile state
            if (profileUnsubscribe) {
                try { profileUnsubscribe(); } catch (e) { /* ignore */ }
                profileUnsubscribe = null;
            }
            if (isMounted) {
                setUser(null);
                setUserProfile(null);
                setLoading(false);
            }
        }
    };

    // Check for redirect result first to catch any pending sign-in operations
    // This is crucial for the "app not responding after redirect" issue.
    const checkRedirect = async () => {
        try {
            const result = await getRedirectResult(auth);
            if (result?.user) {
                console.log("Redirect sign-in successful for:", result.user.email);
                // We don't strictly need to do anything here because onAuthStateChanged
                // will fire with the user, but catching errors here is important.
            }
        } catch (error) {
            console.error("Redirect sign-in error:", error);
            if (isMounted) setLoading(false); // Ensure we don't hang on error
        }
    };

    // Run redirect check then setup listener
    // Run redirect check then setup listener and ensure proper cleanup
    let authUnsubscribe: Unsubscribe | null = null;
    checkRedirect().then(() => {
        authUnsubscribe = onAuthStateChanged(auth, handleAuthChange);
    }).catch(err => {
        console.error('Redirect check failed:', err);
    });

    return () => {
        isMounted = false;
        if (authUnsubscribe) try { authUnsubscribe(); } catch (e) { /* ignore */ }
        if (profileUnsubscribe) try { profileUnsubscribe(); } catch (e) { /* ignore */ }
    };
  }, []);

  const updateUserProfileData = async (data: Partial<UserProfile>) => {
      if (user) {
        try {
            const userRef = doc(firestore, 'users', user.uid);
            await updateDoc(userRef, data);
            // Optimistically update local state or fetch fresh
            const updated = await getUserProfile(user.uid);
            setUserProfile(updated);
        } catch (error) {
            console.error("Error updating user profile:", error);
            throw error;
        }
    }
  };

  const addXP = async (amount: number) => {
      await rewardUser(amount);
  };

  const rewardUser = async (xpAmount: number, statIncrements?: Partial<UserProfile['stats']>) => {
    if (!user) return;

    try {
        const userRef = doc(firestore, 'users', user.uid);
        const profileSnap = await getDoc(userRef);

        if (!profileSnap.exists()) return;

        const currentProfile = profileSnap.data() as UserProfile;
        
        let newXp = (currentProfile.xp || 0) + xpAmount;
        let newLevel = currentProfile.level || 1;
        const newStats = { ...currentProfile.stats };

        if (statIncrements) {
            (Object.keys(statIncrements) as Array<keyof typeof statIncrements>).forEach(key => {
                if (statIncrements[key]) {
                    newStats[key] = (newStats[key] || 0) + statIncrements[key]!;
                }
            });
        }

        const xpPerLevel = 100;
        let didLevelUp = false;
        while (newXp >= xpPerLevel) {
            didLevelUp = true;
            newLevel += 1;
            newXp -= xpPerLevel;
            
            const statsKeys = Object.keys(newStats) as (keyof typeof newStats)[];
            const randomStat = statsKeys[Math.floor(Math.random() * statsKeys.length)];
            if(newStats[randomStat] !== undefined) {
                newStats[randomStat] += 2; 
            }
        }

        await updateDoc(userRef, {
            xp: newXp,
            level: newLevel,
            stats: newStats
        });

        // Update local state
        const updated = await getUserProfile(user.uid);
        setUserProfile(updated);

        if (didLevelUp) {
            hapticSuccess();
        }
    } catch (err) {
        console.error("Unexpected error in rewardUser:", err);
    }
  };

  return (
    <AuthContext.Provider value={{ user, userProfile, loading, updateUserProfileData, addXP, rewardUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);