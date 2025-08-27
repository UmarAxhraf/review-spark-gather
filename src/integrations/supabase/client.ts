import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Main authenticated client for dashboard/admin operations
export const supabase = createClient<Database>(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      storage: window.localStorage,
      storageKey: "supabase.auth.token",
    },
    global: {
      headers: {
        // Removed Content-Type to allow storage uploads to set their own MIME types
        Accept: "application/json",
      },
    },
  }
);

// Anonymous public client for review submissions
export const publicSupabase = createClient<Database>(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
      // Completely remove storage configurations to prevent conflicts
    },
    global: {
      headers: {
        // Removed Content-Type to allow storage uploads to set their own MIME types
        Accept: "application/json",
        Prefer: "return=representation",
      },
    },
  }
);

// Ensure the public client starts with no session
publicSupabase.auth.signOut({ scope: "local" });
