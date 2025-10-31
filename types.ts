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
  notificationToken?: string | null;
  notificationPreferences?: {
    dailyReminders: boolean;
    communityUpdates: boolean;
  };
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

export interface BodyScanResult {
  postureAnalysis: string;
  bodyFatPercentage: number;
  recommendations: string[];
}

export interface BodyScan {
  id:string;
  userId: string;
  imageURL: string;
  results: BodyScanResult;
  createdAt: Timestamp | FieldValue;
}

export interface FaceScanResult {
  skinAnalysis: {
    hydration: string;
    clarity: string;
    radiance: string;
  };
  recommendations: string[];
}

export interface FaceScan {
  id: string;
  userId: string;
  imageURL: string;
  results: FaceScanResult;
  createdAt: Timestamp | FieldValue;
}

export interface Post {
  id: string;
  userId: string;
  authorDisplayName: string;
  content: string;
  imageUrl?: string;
  createdAt: Timestamp | FieldValue;
  likes: string[]; // Array of user IDs who liked the post
  commentCount: number;
}

export interface Group {
  id: string;
  name: string;
  description: string;
  icon: string; // emoji
  ownerId: string;
  members: string[]; // array of user uids
  createdAt: Timestamp | FieldValue;
}