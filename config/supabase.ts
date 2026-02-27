import { createClient } from '@supabase/supabase-js';

// IMPORTANT: Replace with your project's URL and anon key.
// You can find these in your Supabase project's API settings.
const supabaseUrl = 'https://wetowhugkuluthtfyrhf.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndldG93aHVna3VsdXRodGZ5cmhmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE5NTI3MTEsImV4cCI6MjA3NzUyODcxMX0.jxNx7B3XeeCL15U6zdB4fnhkcSRv4O-y2XR6imi253M';

// FIX: Removed obsolete check for placeholder credentials, which caused a TypeScript error
// because the constants above have been assigned their actual values.

export const supabase = createClient(supabaseUrl, supabaseAnonKey);