
import { Timestamp, FieldValue } from 'firebase/firestore';

export enum UserGoal {
  FITNESS = 'fitness',
  BEAUTY = 'beauty',
  NUTRITION = 'nutrition',
  ALL = 'all',
}

export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  age: number | null;
  gender: string | null;
  height: number | null; // in cm
  weight: number | null; // in kg
  skinType: string | null;
  allergies: string[] | null;
  goal: UserGoal;
  onboardingCompleted?: boolean;
  createdAt: Timestamp | FieldValue;
  level: number;
  xp: number;
  stats: {
    strength: number;
    glow: number;
    energy: number;
    willpower: number;
  };
  fitnessGoals?: string[];
  bodyType?: string;
  activityLevel?: string;
  healthConditions?: string[];
}

export interface NutritionScanResult {
  foodName: string;
  calories: number;
  macros: {
    protein: number;
    carbs: number;
    fat: number;
  };
  confidence?: number;
}

export interface NutritionScan {
  id: string;
  userId: string;
  imageURL: string;
  results: NutritionScanResult;
  createdAt: Timestamp | FieldValue;
}
