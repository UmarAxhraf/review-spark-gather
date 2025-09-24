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
    realtime: {
      params: {
        eventsPerSecond: 0.5, // Reduced from 1 to 0.5
      },
      heartbeatIntervalMs: 180000, // Increased from 120000 to 180000
      reconnectAfterMs: (tries) => {
        // More gradual backoff with higher max delay
        const baseDelay = 2000; // Start with 2 seconds (increased from 1000)
        const maxDelay = 120000; // Max 2 minutes delay (increased from 60000)
        return Math.min(baseDelay * Math.pow(1.3, tries), maxDelay);
      },
      maxReconnectAttempts: 30, // Increased from 20 to 30
    },
    global: {
      headers: {
        Accept: "application/json",
      },
      // Add fetch options with timeout
      fetch: (url, options) => {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
        
        return fetch(url, {
          ...options,
          signal: controller.signal,
        }).finally(() => {
          clearTimeout(timeoutId);
        });
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
