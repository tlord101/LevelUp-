export enum UserGoal {
  FITNESS = 'fitness',
  BEAUTY = 'beauty',
  NUTRITION = 'nutrition',
  ALL = 'all',
}

export interface UserProfile {
  id: string;
  email: string | null;
  display_name: string | null;
  age: number | null;
  gender: string | null;
  height: number | null; // in cm
  weight: number | null; // in kg
  skin_type: string | null;
  allergies: string[] | null;
  goal: UserGoal;
  onboarding_completed?: boolean;
  created_at: string;
  level: number;
  xp: number;
  stats: {
    strength: number;
    glow: number;
    energy: number;
    willpower: number;
  };
  fitness_goals?: string[];
  body_type?: string;
  activity_level?: string;
  health_conditions?: string[];
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
  user_id: string;
  image_url: string;
  results: NutritionScanResult;
  created_at: string;
}

export interface BodyScanResult {
  postureAnalysis: string;
  bodyFatPercentage: number;
  recommendations: string[];
}

export interface BodyScan {
  id:string;
  user_id: string;
  image_url: string;
  results: BodyScanResult;
  created_at: string;
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
  user_id: string;
  image_url: string;
  results: FaceScanResult;
  created_at: string;
}

export interface Post {
  id: string;
  user_id: string;
  author_display_name: string;
  content: string;
  image_url?: string;
  created_at: string;
  likes: string[]; // Array of user IDs who liked the post
  comment_count: number;
}

export interface Comment {
  id: string;
  post_id: string;
  user_id: string;
  author_display_name: string;
  content: string;
  created_at: string;
}

export interface Group {
  id: string;
  name: string;
  description: string;
  icon: string; // emoji
  owner_id: string;
  members: string[]; // array of user uids
  created_at: string;
}