
import React, { createContext, useState, useEffect, useContext } from 'react';
import { User, onAuthStateChanged, getRedirectResult } from 'firebase/auth';
import { auth, firestore } from '../config/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
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
    // Handle redirect login result (crucial for mobile/redirect flows)
    getRedirectResult(auth).then((result) => {
        if (result) {
            console.log("Redirect sign-in completed for user:", result.user.uid);
        }
    }).catch((error) => {
        console.error("Redirect sign-in error:", error);
    });

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      // Note: We only set loading to true if we actually have a user to fetch profile for.
      // Otherwise, if currentUser is null, we stop loading immediately.
      
      if (currentUser) {
        setLoading(true);
        try {
            // Ensure profile exists (handled in service usually, but safe to check/create here)
            await createOrUpdateUserProfile(currentUser);
            const profile = await getUserProfile(currentUser.uid);
            setUserProfile(profile);
        } catch (error) {
            console.error("Error fetching user profile:", error);
        } finally {
            setLoading(false);
        }
      } else {
        setUserProfile(null);
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const updateUserProfileData = async (data: Partial<UserProfile>) => {
      if (user) {
        try {
            const userRef = doc(firestore, 'users', user.uid);
            await updateDoc(userRef, data);
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
        // Re-fetch to ensure consistency with Firestore timestamp conversions if needed
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
