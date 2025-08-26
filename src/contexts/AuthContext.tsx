// import React, { createContext, useContext, useEffect, useState } from "react";
// import { User, Session } from "@supabase/supabase-js";
// import { supabase } from "@/integrations/supabase/client";

// interface AuthContextType {
//   user: User | null;
//   session: Session | null;
//   signUp: (
//     email: string,
//     password: string,
//     companyName: string
//   ) => Promise<{ error: any }>;
//   signIn: (email: string, password: string) => Promise<{ error: any }>;
//   signOut: () => Promise<void>;
//   loading: boolean;
// }

// const AuthContext = createContext<AuthContextType | undefined>(undefined);

// export const useAuth = () => {
//   const context = useContext(AuthContext);
//   if (context === undefined) {
//     throw new Error("useAuth must be used within an AuthProvider");
//   }
//   return context;
// };

// export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
//   const [user, setUser] = useState<User | null>(null);
//   const [session, setSession] = useState<Session | null>(null);
//   const [loading, setLoading] = useState(true);

//   useEffect(() => {
//     // Set up auth state listener
//     const {
//       data: { subscription },
//     } = supabase.auth.onAuthStateChange((event, session) => {
//       //console.log('Auth state changed:', event, session);
//       setSession(session);
//       setUser(session?.user ?? null);
//       setLoading(false);
//     });

//     // Check for existing session
//     supabase.auth.getSession().then(({ data: { session } }) => {
//       setSession(session);
//       setUser(session?.user ?? null);
//       setLoading(false);
//     });

//     return () => subscription.unsubscribe();
//   }, []);

//   const signUp = async (
//     email: string,
//     password: string,
//     companyName: string
//   ) => {
//     const redirectUrl = `${window.location.origin}/`;

//     const { error } = await supabase.auth.signUp({
//       email,
//       password,
//       options: {
//         emailRedirectTo: redirectUrl,
//         data: {
//           company_name: companyName,
//         },
//       },
//     });

//     return { error };
//   };

//   const signIn = async (email: string, password: string) => {
//     const { error } = await supabase.auth.signInWithPassword({
//       email,
//       password,
//     });

//     return { error };
//   };

//   const signOut = async () => {
//     await supabase.auth.signOut();
//   };

//   const value = {
//     user,
//     session,
//     signUp,
//     signIn,
//     signOut,
//     loading,
//   };

//   return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
// };

//====================================>>>>>>>>>>>>>>>>>>===========================================

import React, { createContext, useContext, useEffect, useState } from "react";
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
  const [sessionTimer, setSessionTimer] = useState<NodeJS.Timeout | null>(null);
  const [warningTimer, setWarningTimer] = useState<NodeJS.Timeout | null>(null);

  // Session timeout configuration (30 minutes)
  const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes
  const WARNING_TIME = 5 * 60 * 1000; // 5 minutes before timeout

  const clearTimers = () => {
    if (sessionTimer) clearTimeout(sessionTimer);
    if (warningTimer) clearTimeout(warningTimer);
    setSessionTimer(null);
    setWarningTimer(null);
    setSessionTimeoutWarning(false);
  };

  const startSessionTimer = () => {
    clearTimers();

    // Set warning timer
    const warning = setTimeout(() => {
      setSessionTimeoutWarning(true);
    }, SESSION_TIMEOUT - WARNING_TIME);

    // Set session timeout timer
    const timeout = setTimeout(async () => {
      await signOut();
      setSessionTimeoutWarning(false);
    }, SESSION_TIMEOUT);

    setWarningTimer(warning);
    setSessionTimer(timeout);
  };

  const extendSession = async () => {
    try {
      const { error } = await supabase.auth.refreshSession();
      if (!error) {
        setSessionTimeoutWarning(false);
        startSessionTimer();
      }
    } catch (error) {
      console.error("Failed to extend session:", error);
    }
  };

  useEffect(() => {
    // Set up auth state listener
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);

      if (session) {
        startSessionTimer();
      } else {
        clearTimers();
      }
    });

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);

      if (session) {
        startSessionTimer();
      }
    });

    return () => {
      subscription.unsubscribe();
      clearTimers();
    };
  }, []);

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
    clearTimers();
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
