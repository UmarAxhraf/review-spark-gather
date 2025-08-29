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
  loading: boolean;
  sessionTimeoutWarning: boolean;
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

  // Use refs to avoid stale closure issues
  const sessionTimerRef = useRef<NodeJS.Timeout | null>(null);
  const warningTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastActivityRef = useRef<number>(Date.now());
  const activityCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Session timeout configuration
  const SESSION_TIMEOUT = 2 * 60 * 60 * 1000; // 2 hours
  const WARNING_TIME = 5 * 60 * 1000; // 5 minutes before timeout
  const ACTIVITY_CHECK_INTERVAL = 60 * 1000; // Check every minute

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

  const updateActivity = useCallback(() => {
    lastActivityRef.current = Date.now();
    // Clear warning if user becomes active
    if (sessionTimeoutWarning) {
      setSessionTimeoutWarning(false);
    }
  }, [sessionTimeoutWarning]);

  const checkSessionTimeout = useCallback(async () => {
    const timeSinceLastActivity = Date.now() - lastActivityRef.current;

    if (timeSinceLastActivity >= SESSION_TIMEOUT) {
      await signOut();
    } else if (
      timeSinceLastActivity >= SESSION_TIMEOUT - WARNING_TIME &&
      !sessionTimeoutWarning
    ) {
      setSessionTimeoutWarning(true);
    }
  }, [sessionTimeoutWarning, SESSION_TIMEOUT, WARNING_TIME]);

  const startSessionManagement = useCallback(() => {
    clearAllTimers();
    updateActivity();

    // Check for timeout periodically instead of using a single timeout
    activityCheckIntervalRef.current = setInterval(
      checkSessionTimeout,
      ACTIVITY_CHECK_INTERVAL
    );
  }, [
    clearAllTimers,
    updateActivity,
    checkSessionTimeout,
    ACTIVITY_CHECK_INTERVAL,
  ]);

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

  // Auth state management
  useEffect(() => {
    let mounted = true;

    const handleAuthStateChange = (event: string, session: Session | null) => {
      if (!mounted) return;

      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);

      if (session && (event === "SIGNED_IN" || event === "INITIAL_SESSION")) {
        startSessionManagement();
      } else if (!session) {
        clearAllTimers();
      }
    };

    // Set up auth state listener
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(handleAuthStateChange);

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (mounted) {
        handleAuthStateChange("INITIAL_SESSION", session);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
      clearAllTimers();
    };
  }, [startSessionManagement, clearAllTimers]);

  const signUp = async (
    email: string,
    password: string,
    companyName: string
  ) => {
    const redirectUrl = `${window.location.origin}/`;

    const { error } = await supabase.auth.signUp({
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

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    return { error };
  };

  const signOut = async () => {
    clearAllTimers();
    await supabase.auth.signOut();
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
    loading,
    sessionTimeoutWarning,
    extendSession,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
