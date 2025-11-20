import React, { createContext, useState, useEffect, useContext } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '../config/supabase';
import { UserProfile, UserGoal } from '../types';
import { hapticSuccess } from '../utils/haptics';

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
    const fetchSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        setUser(session?.user ?? null);

        if (session?.user) {
          const { data: profile, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();
          
          if (error) {
            console.error('Error fetching user profile:', error);
          } else {
            setUserProfile(profile);
          }
        }
      } catch (error) {
        console.error('Unexpected error during session fetch:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchSession();

    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      try {
        setUser(session?.user ?? null);
        if (session?.user) {
           const { data: profile, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();
            
           if (error) {
             console.error('Error fetching profile in auth listener:', error);
           } else {
             setUserProfile(profile);
           }
        } else {
          setUserProfile(null);
        }
      } catch (error) {
        console.error('Unexpected error in auth listener:', error);
      } finally {
        setLoading(false);
      }
    });

    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, []);

  const updateUserProfileData = async (data: Partial<UserProfile>) => {
      if (user) {
        try {
            const { data: updatedProfile, error } = await supabase
              .from('profiles')
              .update(data)
              .eq('id', user.id)
              .select()
              .single();

            if (error) throw error;
            
            setUserProfile(updatedProfile);
        } catch (error) {
            console.error("Error updating user profile:", error);
            throw error;
        }
    }
  };

  // Deprecated: Use rewardUser instead for robust updates
  const addXP = async (amount: number) => {
      await rewardUser(amount);
  };

  const rewardUser = async (xpAmount: number, statIncrements?: Partial<UserProfile['stats']>) => {
    if (!user) return;

    try {
        // 1. Fetch the latest profile to ensure we are updating based on current server state
        // This prevents race conditions between local state and DB
        const { data: currentProfile, error: fetchError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();

        if (fetchError || !currentProfile) {
            console.error("Error fetching profile for reward:", fetchError);
            return;
        }

        let newXp = currentProfile.xp + xpAmount;
        let newLevel = currentProfile.level;
        const newStats = { ...currentProfile.stats };

        // 2. Apply manual stat increments (e.g. from scans)
        if (statIncrements) {
            (Object.keys(statIncrements) as Array<keyof typeof statIncrements>).forEach(key => {
                if (statIncrements[key]) {
                    newStats[key] = (newStats[key] || 0) + statIncrements[key]!;
                }
            });
        }

        // 3. Handle Level Up Logic
        const xpPerLevel = 100;
        let didLevelUp = false;
        while (newXp >= xpPerLevel) {
            didLevelUp = true;
            newLevel += 1;
            newXp -= xpPerLevel;
            
            // Give a small random stat boost on level up
            const statsKeys = Object.keys(newStats) as (keyof typeof newStats)[];
            const randomStat = statsKeys[Math.floor(Math.random() * statsKeys.length)];
            newStats[randomStat] += 2; 
            console.log(`Leveled up to level ${newLevel}! Boosted ${String(randomStat)}`);
        }

        // 4. Update Database
        const { data: updatedProfile, error: updateError } = await supabase
            .from('profiles')
            .update({ 
                xp: newXp, 
                level: newLevel, 
                stats: newStats 
            })
            .eq('id', user.id)
            .select()
            .single();

        if (updateError) {
            console.error("Failed to update XP in Supabase", updateError);
        } else {
            // 5. Update Local State
            setUserProfile(updatedProfile);
            if (didLevelUp) {
                hapticSuccess();
            }
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