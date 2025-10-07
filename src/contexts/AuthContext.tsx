import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useRef,
  useCallback,
} from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  signUp: (
    email: string,
    password: string,
    companyName: string
  ) => Promise<{ error: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: any }>;
  updatePassword: (password: string) => Promise<{ error: any }>;
  extendSession: () => Promise<void>;
  verifySession: () => Promise<boolean>;
  loading: boolean;
  sessionTimeoutWarning: boolean;
  isSessionValid: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [sessionTimeoutWarning, setSessionTimeoutWarning] = useState(false);
  const [isSessionValid, setIsSessionValid] = useState(false);
  const [initialAuthCheckComplete, setInitialAuthCheckComplete] =
    useState(false);

  // Enhanced session timeout configuration
  const SESSION_TIMEOUT = 4 * 60 * 60 * 1000; // 4 hours
  const WARNING_TIME = 10 * 60 * 1000; // 10 minutes warning
  const ACTIVITY_CHECK_INTERVAL = 5 * 60 * 1000; // Check every 5 minutes

  // Use refs to avoid stale closure issues
  const sessionTimerRef = useRef<NodeJS.Timeout | null>(null);
  const warningTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastActivityRef = useRef<number>(Date.now());
  const activityCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const MAX_IDLE_TIME = 30 * 60 * 1000; // 30 minutes max idle

  // Define clearAllTimers first
  const clearAllTimers = useCallback(() => {
    if (sessionTimerRef.current) {
      clearTimeout(sessionTimerRef.current);
      sessionTimerRef.current = null;
    }
    if (warningTimerRef.current) {
      clearTimeout(warningTimerRef.current);
      warningTimerRef.current = null;
    }
    if (activityCheckIntervalRef.current) {
      clearInterval(activityCheckIntervalRef.current);
      activityCheckIntervalRef.current = null;
    }
    setSessionTimeoutWarning(false);
  }, []);

  // Enhanced sign out with cleanup
  const signOut = useCallback(async () => {
    try {
      clearAllTimers();

      // Clear all stored session data
      localStorage.removeItem("lastActivity");
      localStorage.removeItem("sessionId");

      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error("Sign out error:", error);
      }

      setIsSessionValid(false);
    } catch (error) {
      console.error("Sign out error:", error);
    }
  }, [clearAllTimers]);

  // Verify session function
  const verifySession = useCallback(async (): Promise<boolean> => {
    try {
      const { data, error } = await supabase.auth.getSession();

      if (error || !data.session) {
        setIsSessionValid(false);
        return false;
      }

      // Check if session is expired
      const now = Math.floor(Date.now() / 1000);
      if (data.session.expires_at && data.session.expires_at < now) {
        setIsSessionValid(false);
        await signOut();
        return false;
      }

      setIsSessionValid(true);
      return true;
    } catch (error) {
      console.error("Session verification failed:", error);
      setIsSessionValid(false);
      return false;
    }
  }, [signOut]);

  // Enhanced activity tracking with security checks
  const updateActivity = useCallback(() => {
    const now = Date.now();
    lastActivityRef.current = now;

    // Check if we're in an OAuth flow - if so, don't enforce timeouts
    const isOAuthCallback = window.location.pathname.includes("callback");

    localStorage.setItem("lastActivity", now.toString());
    localStorage.setItem(
      "sessionId",
      session?.access_token?.substring(0, 10) || ""
    );

    // Store OAuth flag
    if (isOAuthCallback) {
      localStorage.setItem("inOAuthFlow", "true");
    }

    if (sessionTimeoutWarning) {
      setSessionTimeoutWarning(false);
    }
  }, [sessionTimeoutWarning, session]);

  // const updateActivity = useCallback(() => {
  //   const now = Date.now();
  //   lastActivityRef.current = now;

  //   // Store activity timestamp securely
  //   localStorage.setItem("lastActivity", now.toString());
  //   localStorage.setItem(
  //     "sessionId",
  //     session?.access_token?.substring(0, 10) || ""
  //   );

  //   // Clear warning if user becomes active
  //   if (sessionTimeoutWarning) {
  //     setSessionTimeoutWarning(false);
  //   }
  // }, [sessionTimeoutWarning, session]);

  // Enhanced session timeout check with idle detection
  const checkSessionTimeout = useCallback(async () => {
    // Don't check session if offline
    if (!navigator.onLine) return;

    // Don't timeout during OAuth callback
    if (localStorage.getItem("inOAuthFlow") === "true") {
      return;
    }

    // Don't timeout during OAuth callback - add more paths if needed
    const oAuthPaths = ["/google-business-callback", "/auth/callback"];
    if (oAuthPaths.some((path) => window.location.pathname.includes(path))) {
      // console.log("OAuth callback in progress, skipping session timeout");
      return;
    }

    // Don't timeout if OAuth flow flag is set
    if (localStorage.getItem("inOAuthFlow") === "true") {
      return;
    }

    const timeSinceLastActivity = Date.now() - lastActivityRef.current;
    const storedSessionId = localStorage.getItem("sessionId");

    // Detect session hijacking attempts - with more tolerance for reconnections
    const currentSessionId = session?.access_token?.substring(0, 10) || "";
    if (storedSessionId && storedSessionId !== currentSessionId && session) {
      // Only consider it hijacking if we have a valid session and IDs don't match
      // Update the session ID instead of immediately signing out
      console.warn("Session ID mismatch - updating session ID");
      localStorage.setItem("sessionId", currentSessionId);
      updateActivity(); // Refresh activity timestamp
      return;
    }

    // Check for excessive idle time
    if (timeSinceLastActivity >= MAX_IDLE_TIME) {
      console.warn("Maximum idle time exceeded");
      await signOut();
      return;
    }

    // Regular timeout check
    if (timeSinceLastActivity >= SESSION_TIMEOUT) {
      await signOut();
    } else if (
      timeSinceLastActivity >= SESSION_TIMEOUT - WARNING_TIME &&
      !sessionTimeoutWarning
    ) {
      setSessionTimeoutWarning(true);
    }

    // Verify session periodically
    await verifySession();
  }, [sessionTimeoutWarning, session, signOut, verifySession, updateActivity]);

  // Define startSessionManagement
  const startSessionManagement = useCallback(() => {
    // Clear any existing timers first
    clearAllTimers();

    // Update activity timestamp
    updateActivity();

    // Set up periodic session checks
    activityCheckIntervalRef.current = setInterval(() => {
      checkSessionTimeout();
    }, ACTIVITY_CHECK_INTERVAL);
  }, [clearAllTimers, updateActivity, checkSessionTimeout]);

  // Enhanced sign in with security logging
  const signIn = async (email: string, password: string) => {
    try {
      // Clear any existing session data
      localStorage.removeItem("lastActivity");
      localStorage.removeItem("sessionId");

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (!error && data.session) {
        // Log successful sign in
        // console.log("User signed in successfully");
        updateActivity();

        // Set initial session validity
        setIsSessionValid(true);
      }

      return { error };
    } catch (error) {
      console.error("Sign in error:", error);
      return { error };
    }
  };

  const extendSession = useCallback(async () => {
    try {
      const { error } = await supabase.auth.refreshSession();
      if (!error) {
        setSessionTimeoutWarning(false);
        updateActivity();
      } else {
        console.error("Failed to extend session:", error);
      }
    } catch (error) {
      console.error("Failed to extend session:", error);
    }
  }, [updateActivity]);

  // Throttled activity update to prevent excessive state updates
  const throttledActivityUpdate = useCallback(() => {
    const now = Date.now();
    const timeSinceLastUpdate = now - lastActivityRef.current;

    // Only update if it's been more than 30 seconds since last activity
    if (timeSinceLastUpdate > 30000) {
      updateActivity();
    } else {
      // Still update the ref for accurate tracking
      lastActivityRef.current = now;
    }
  }, [updateActivity]);

  // Add this effect to check for stored session immediately on mount
  useEffect(() => {
    const checkStoredSession = async () => {
      try {
        // Check for session in localStorage first (synchronous)
        const storedSession = localStorage.getItem("supabase.auth.token");
        if (storedSession) {
          // We have a stored session, set a preliminary valid state
          // This prevents the login page flash
          setIsSessionValid(true);
        }

        // Then verify with Supabase (asynchronous)
        const { data } = await supabase.auth.getSession();
        if (data.session) {
          setSession(data.session);
          setUser(data.session.user);
          setIsSessionValid(true);

          // Update session ID in localStorage
          const currentSessionId =
            data.session.access_token?.substring(0, 10) || "";
          localStorage.setItem("sessionId", currentSessionId);
        } else {
          // No valid session found
          setIsSessionValid(false);
        }
      } catch (error) {
        console.error("Error checking stored session:", error);
      } finally {
        setLoading(false);
        setInitialAuthCheckComplete(true);
      }
    };

    checkStoredSession();
  }, []);

  // Track user activity with throttling
  useEffect(() => {
    const events = ["mousedown", "keypress", "scroll", "touchstart", "click"];

    // Add event listeners for user activity
    events.forEach((event) => {
      document.addEventListener(event, throttledActivityUpdate, {
        passive: true,
      });
    });

    return () => {
      events.forEach((event) => {
        document.removeEventListener(event, throttledActivityUpdate);
      });
    };
  }, [throttledActivityUpdate]);

  // Add page visibility change handler
  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (!document.hidden && user && session) {
        // Page became visible again and we have a user session
        // Verify the session is still valid
        try {
          await verifySession();
          // Update last activity timestamp
          updateActivity();
        } catch (error) {
          console.error(
            "Session verification failed on visibility change:",
            error
          );
        }
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [user, session, verifySession, updateActivity]);

  // Move handleAuthStateChange outside useEffect and define it at component level
  const handleAuthStateChange = useCallback(
    (event: string, session: Session | null) => {
      //console.log(`Auth state change: ${event}, session: ${!!session}`);

      // Update session
      setSession((prevSession) => {
        if (prevSession?.access_token !== session?.access_token) {
          return session;
        }
        return prevSession;
      });

      // Update user
      setUser((prevUser) => {
        const newUser = session?.user ?? null;
        if (prevUser?.id !== newUser?.id) {
          return newUser;
        }
        return prevUser;
      });

      // Set loading to false AFTER updating user and session
      if (!initialAuthCheckComplete) {
        //console.log("Initial auth check complete, setting loading to false");
        setInitialAuthCheckComplete(true);
        setLoading(false); // This should be LAST
      }

      if (session && (event === "SIGNED_IN" || event === "INITIAL_SESSION")) {
        setIsSessionValid(true);
        startSessionManagement();
      } else if (!session) {
        setIsSessionValid(false);
        clearAllTimers();
      }
    },
    [initialAuthCheckComplete, startSessionManagement, clearAllTimers]
  );

  // Single consolidated auth initialization effect
  useEffect(() => {
    let mounted = true;
    //console.log("AuthContext: Starting authentication initialization");

    const initializeAuth = async () => {
      try {
        // Check for session in localStorage first (synchronous)
        const storedSession = localStorage.getItem("supabase.auth.token");
        if (storedSession) {
          // console.log("Found stored session token");
          setIsSessionValid(true);
        }

        // Set up auth state listener first
        const {
          data: { subscription },
        } = supabase.auth.onAuthStateChange((event, session) => {
          if (!mounted) return;
          // console.log(`Auth state listener triggered: ${event}`);
          handleAuthStateChange(event, session);
        });

        // Then check for existing session
        // console.log("Checking for existing session...");
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();

        if (error) {
          console.error("Error getting session:", error);
        }

        if (mounted) {
          //console.log("Processing initial session:", !!session);
          handleAuthStateChange("INITIAL_SESSION", session);

          if (session) {
            // Update session ID in localStorage
            const currentSessionId =
              session.access_token?.substring(0, 10) || "";
            localStorage.setItem("sessionId", currentSessionId);
          }
        }

        return () => {
          subscription.unsubscribe();
        };
      } catch (error) {
        console.error("Auth initialization error:", error);
        if (mounted) {
          setLoading(false);
          setInitialAuthCheckComplete(true);
        }
      }
    };

    let cleanup: (() => void) | undefined;

    initializeAuth().then((cleanupFn) => {
      cleanup = cleanupFn;
    });

    return () => {
      mounted = false;
      if (cleanup) {
        cleanup();
      }
      clearAllTimers();
    };
  }, []); // Empty dependency array - only run once on mount

  // Remove the separate checkStoredSession useEffect - it's now integrated above

  const signUp = async (
    email: string,
    password: string,
    companyName: string
  ) => {
    const redirectUrl = `${window.location.origin}/`;

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          company_name: companyName,
        },
      },
    });

    return { error };
  };

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    return { error };
  };

  const updatePassword = async (password: string) => {
    const { error } = await supabase.auth.updateUser({
      password: password,
    });

    return { error };
  };

  const value = {
    user,
    session,
    signUp,
    signIn,
    signOut,
    resetPassword,
    updatePassword,
    extendSession,
    verifySession,
    loading,
    sessionTimeoutWarning,
    isSessionValid,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
