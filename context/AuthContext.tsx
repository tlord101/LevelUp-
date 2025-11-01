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
}

const AuthContext = createContext<AuthContextType>({ user: null, userProfile: null, loading: true, updateUserProfileData: async () => {}, addXP: () => {} });

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user ?? null);

      if (session?.user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();
        setUserProfile(profile);
      }
      setLoading(false);
    };

    fetchSession();

    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
         const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();
        setUserProfile(profile);
      } else {
        setUserProfile(null);
      }
      setLoading(false);
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

  const addXP = async (amount: number) => {
    if (!userProfile || !user) return;

    const xpPerLevel = 100;
    let newXp = userProfile.xp + amount;
    let newLevel = userProfile.level;
    let newStats = { ...userProfile.stats };
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

    const { data: updatedProfile, error } = await supabase
      .from('profiles')
      .update(updatedData)
      .eq('id', user.id)
      .select()
      .single();

    if (error) {
      console.error("Failed to update XP in Supabase", error);
    } else {
      setUserProfile(updatedProfile);
    }
  };


  return (
    <AuthContext.Provider value={{ user, userProfile, loading, updateUserProfileData, addXP }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);