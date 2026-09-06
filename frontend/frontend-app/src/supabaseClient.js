import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

// Keep the UI previewable before production secrets are configured. Demo mode
// is read by AuthGate; no requests are sent to this placeholder client.
export const isDemoMode = !supabaseUrl || !supabaseAnonKey;
export const supabase = createClient(
  supabaseUrl || 'https://local-preview.invalid',
  supabaseAnonKey || 'local-preview-anon-key'
);
