import { createClient } from '@supabase/supabase-js';

const defaultSupabaseUrl = 'https://mvdilpzoeaslrhmhplyd.supabase.co';
const defaultSupabaseAnonKey = 'sb_publishable_DOxuHFXJ9X16ZsNmue8ewg_gYEaBliB';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || defaultSupabaseUrl;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || defaultSupabaseAnonKey;

export const hasSupabaseConfig = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase = hasSupabaseConfig ? createClient(supabaseUrl, supabaseAnonKey) : null;
