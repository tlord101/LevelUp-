import React, { createContext, useState, useEffect, useContext } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth, firestore } from '../config/firebase';
import { doc, getDoc, Timestamp, setDoc } from 'firebase/firestore';
import { UserProfile, UserGoal } from '../types';
import { createOrUpdateUserProfile } from '../services/firebaseService';
import { hapticSuccess } from '../utils/haptics';

interface AuthContextType {
  user: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  updateUserProfileData: (data: Partial<UserProfile>) => Promise<void>;
  addXP: (amount: number) => void;
}

const AuthContext = createContext<AuthContextType>({ user: null, userProfile: null, loading: true, updateUserProfileData: async () => {}, addXP: () => {} });

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        const userDocRef = doc(firestore, 'users', firebaseUser.uid);
        let userDoc = await getDoc(userDocRef);

        // If the user document doesn't exist, it's a new user. Create their profile.
        if (!userDoc.exists()) {
          await createOrUpdateUserProfile(firebaseUser);
          userDoc = await getDoc(userDocRef); // Re-fetch the document after creation
        }
        
        if (userDoc.exists()) {
          const profile = userDoc.data() as UserProfile;
          setUserProfile(profile);
        } else {
            // This case is now much less likely but kept as a fallback.
            setUserProfile(null);
        }
      } else {
        setUser(null);
        setUserProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const updateUserProfileData = async (data: Partial<UserProfile>) => {
      if (user) {
        try {
            const userDocRef = doc(firestore, 'users', user.uid);
            await setDoc(userDocRef, data, { merge: true });

            setUserProfile(prevProfile => {
                if (!prevProfile) {
                    // It's possible the profile was null before this update (e.g. first login)
                    // We'll create a new profile object locally.
                    const newProfile: UserProfile = {
                        uid: user.uid,
                        email: user.email,
                        displayName: null,
                        age: null,
                        gender: null,
                        height: null,
                        weight: null,
                        skinType: null,
                        allergies: null,
                        goal: UserGoal.FITNESS,
                        createdAt: Timestamp.now(),
                        level: 1,
                        xp: 0,
                        stats: { strength: 10, glow: 10, energy: 10, willpower: 10 },
                        ...data,
                    };
                    return newProfile;
                }
                return { ...prevProfile, ...data };
            });
        } catch (error) {
            console.error("Error updating user profile:", error);
            throw error;
        }
    }
  };

  const addXP = (amount: number) => {
    setUserProfile(prevProfile => {
      if (!prevProfile || !user) return null;

      const xpPerLevel = 100;
      let newXp = prevProfile.xp + amount;
      let newLevel = prevProfile.level;
      let newStats = { ...prevProfile.stats };
      let didLevelUp = false;

      while (newXp >= xpPerLevel) {
        didLevelUp = true;
        newLevel += 1;
        newXp -= xpPerLevel;
        // Give a small random stat boost on level up
        const statsKeys = Object.keys(newStats) as (keyof typeof newStats)[];
        const randomStat = statsKeys[Math.floor(Math.random() * statsKeys.length)];
        newStats[randomStat] += 2; // Increase a random stat
        console.log(`Leveled up to level ${newLevel}!`);
      }

      if (didLevelUp) {
        hapticSuccess();
      }
      
      const updatedData = { xp: newXp, level: newLevel, stats: newStats };

      const userDocRef = doc(firestore, 'users', user.uid);
      setDoc(userDocRef, updatedData, { merge: true }).catch(err => {
          console.error("Failed to update XP in Firestore", err);
      });
      
      return { ...prevProfile, ...updatedData };
    });
  };


  return (
    <AuthContext.Provider value={{ user, userProfile, loading, updateUserProfileData, addXP }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
