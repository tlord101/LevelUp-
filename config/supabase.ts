import { createClient } from '@supabase/supabase-js';

// IMPORTANT: Replace with your project's URL and anon key.
// These can now also be configured via the Admin Panel API settings.
const DEFAULT_SUPABASE_URL = 'https://wetowhugkuluthtfyrhf.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndldG93aHVna3VsdXRodGZ5cmhmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE5NTI3MTEsImV4cCI6MjA3NzUyODcxMX0.jxNx7B3XeeCL15U6zdB4fnhkcSRv4O-y2XR6imi253M';

// Note: For advanced dynamic switching, you might want to wrap this in a provider.
// For now, we use the compiled defaults.
export const supabase = createClient(DEFAULT_SUPABASE_URL, DEFAULT_SUPABASE_ANON_KEY);