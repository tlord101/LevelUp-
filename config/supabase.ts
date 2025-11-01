import { createClient } from '@supabase/supabase-js';
import { UserProfile, NutritionScan, BodyScan, FaceScan, Post, Group, Comment } from '../types';

// IMPORTANT: Replace with your project's URL and anon key.
// You can find these in your Supabase project's API settings.
const supabaseUrl = 'https://wetowhugkuluthtfyrhf.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndldG93aHVna3VsdXRodGZ5cmhmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE5NTI3MTEsImV4cCI6MjA3NzUyODcxMX0.jxNx7B3XeeCL15U6zdB4fnhkcSRv4O-y2XR6imi253M';

// FIX: Removed obsolete check for placeholder credentials, which caused a TypeScript error
// because the constants above have been assigned their actual values.

interface Database {
  public: {
    Tables: {
      profiles: {
        Row: UserProfile;
        Insert: Partial<UserProfile>;
        Update: Partial<UserProfile>;
      };
      nutrition_scans: {
        Row: NutritionScan;
        Insert: Omit<NutritionScan, 'id' | 'created_at'>;
      };
      body_scans: {
        Row: BodyScan;
        Insert: Omit<BodyScan, 'id' | 'created_at'>;
      };
      face_scans: {
        Row: FaceScan;
        Insert: Omit<FaceScan, 'id' | 'created_at'>;
      };
      posts: {
        Row: Post;
        Insert: Omit<Post, 'id' | 'created_at' | 'likes' | 'comment_count'>;
      };
      comments: {
        Row: Comment;
        Insert: Omit<Comment, 'id' | 'created_at'>;
      };
      groups: {
        Row: Group;
        Insert: Omit<Group, 'id' | 'created_at' | 'members'>;
      }
    };
    Functions: {
      join_group: {
        Args: { group_id_to_join: string };
        Returns: void;
      };
      leave_group: {
        Args: { group_id_to_leave: string };
        Returns: void;
      };
      like_post: {
        Args: { post_id_to_like: string };
        Returns: void;
      };
      unlike_post: {
        Args: { post_id_to_unlike: string };
        Returns: void;
      };
      increment_comment_count: {
        Args: { post_id_to_update: string };
        Returns: void;
      };
    };
  };
}


export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);