import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_PUBLIC_SUPABASE_URL as string;
const anonKey = import.meta.env.VITE_PUBLIC_SUPABASE_ANON_KEY as string;

export const supabase = createClient(url, anonKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

export const FUNCTIONS_BASE =
  (import.meta.env.VITE_ADMIN_FUNCTIONS_BASE as string) || `${url}/functions/v1`;
