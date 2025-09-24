import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useRef,
} from "react";
import { useAuth } from "./AuthContext";
import { supabase } from "../integrations/supabase/client";
import { createCheckoutSession, redirectToCheckout } from "../lib/stripe";
import { config } from "../lib/config";
import { toast } from "sonner";
import { retryWithBackoff } from "../utils/networkUtils"; // Add this import

// Add this constant
const REFRESH_COOLDOWN = 10000; // 10 seconds cooldown between refreshes

interface Subscription {
  id: string;
  user_id: string;
  stripe_customer_id: string;
  stripe_subscription_id: string;
  stripe_price_id: string;
  plan_type: string;
  status: string;
  current_period_start: string;
  current_period_end: string;
  cancel_at_period_end?: boolean;
  created_at: string;
  updated_at: string;
}

interface Profile {
  trial_end: string | null;
  subscription_status: string;
}

interface SubscriptionError {
  message: string;
  errorCode?: string;
  currentPlan?: string;
  showDialog?: boolean;
}

interface SubscriptionContextType {
  subscription: Subscription | null;
  profile: Profile | null;
  loading: boolean;
  isActive: boolean;
  isTrialActive: boolean;
  trialDaysLeft: number;
  subscriptionError: SubscriptionError | null;
  clearError: () => void;
  refreshSubscription: () => Promise<void>;
  createSubscription: (
    planType: "starter" | "professional" | "enterprise"
  ) => Promise<void>;
  createPortalSession: () => Promise<void>;
  handlePlanSelection: (
    planType: "starter" | "professional" | "enterprise"
  ) => Promise<void>; // Add this new method
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(
  undefined
);

// Add debounce utility function
const debounce = (fn: Function, ms = 300) => {
  let timeoutId: ReturnType<typeof setTimeout>;
  return function (...args: any[]) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn.apply(this, args), ms);
  };
};

export function SubscriptionProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = useAuth();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [subscriptionError, setSubscriptionError] =
    useState<SubscriptionError | null>(null);
  // Add this state variable
  const [lastRefreshTime, setLastRefreshTime] = useState(0);

  const clearError = () => {
    setSubscriptionError(null);
  };

  const createSubscription = async (
    planType: "starter" | "professional" | "enterprise"
  ) => {
    if (!user) throw new Error("User not authenticated");

    //console.log("🔍 Creating subscription for planType:", planType);

    // Get fresh subscription data AND profile data for accurate same-plan detection
    const { data: currentSub, error } = await supabase
      .from("subscriptions")
      .select("plan_type, status, plan_name")
      .eq("user_id", user.id)
      .in("status", ["active", "trial"])
      .maybeSingle(); // Changed from .single() to .maybeSingle()

    // Get profile data to check trial expiry
    const { data: profileData, error: profileError } = await supabase
      .from("profiles")
      .select("trial_end, subscription_status")
      .eq("id", user.id)
      .single();

    //console.log("📊 Current subscription data:", currentSub);
    //console.log("📊 Profile data:", profileData);
    //if (error) console.log("❌ Query error:", error);

    // Check if trial has expired
    const now = new Date();
    const trialEnd = profileData?.trial_end
      ? new Date(profileData.trial_end)
      : null;
    const isTrialExpired = trialEnd && now >= trialEnd;

    // Only block if user has ACTIVE subscription or ACTIVE (non-expired) trial with same plan
    const hasActiveSubscription = currentSub?.status === "active";
    const hasActiveTrial = currentSub?.status === "trial" && !isTrialExpired;

    // If no current subscription found or trial expired, allow purchase
    if (!currentSub || isTrialExpired) {
      // console.log(
      //   "✅ No active subscription or trial expired, allowing new subscription purchase..."
      // );
    } else if (
      currentSub?.plan_type === planType &&
      (hasActiveSubscription || hasActiveTrial)
    ) {
      // console.log(
      //   "🚫 Same plan detected! Showing error dialog instead of redirecting."
      // );
      const currentPlanName = getPlanDisplayName(currentSub.plan_type);
      const statusText = hasActiveTrial ? "trial" : "active";

      setSubscriptionError({
        message: `You already have this plan (${currentPlanName}) ${statusText}. You can downgrade or upgrade to a different plan.`,
        errorCode: "SAME_PLAN_SELECTED",
        currentPlan: currentPlanName,
        showDialog: true,
      });
      return; // Don't redirect to checkout
    }

    //console.log("✅ Proceeding to checkout...");
    // If trial is expired, allow purchase of any plan (including same plan)
    // if (isTrialExpired) {
    //   console.log("✅ Trial expired, allowing new subscription purchase...");
    // } else {
    //   console.log("✅ Different plan detected, proceeding to checkout...");
    // }

    try {
      // Show upgrade/downgrade message for different plans
      if (currentSub?.plan_type) {
        const isUpgrade =
          getPlanLevel(planType) > getPlanLevel(currentSub.plan_type);
        const action = isUpgrade ? "upgrading" : "downgrading";
        const planName = getPlanDisplayName(planType);

        //console.log(`You are ${action} to ${planName}.`);
        // You can show this in a toast or modal
      }

      // Get the current session for authentication
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        throw new Error("No active session");
      }

      const response = await fetch(
        `${config.supabase.url}/functions/v1/stripe-checkout`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            planType,
          }),
        }
      );

      // Handle different response status codes
      if (response.status === 409) {
        // Duplicate subscription error
        const errorData = await response.json();
        setSubscriptionError({
          message:
            errorData.error ||
            "You already have an active subscription. Please cancel your current plan before purchasing a new one.",
          errorCode: "DUPLICATE_SUBSCRIPTION",
          currentPlan: errorData.existingSubscription?.planName,
          showDialog: true,
        });
        return;
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to create checkout session");
      }

      const { sessionId, url } = await response.json();

      // Store session ID for verification
      localStorage.setItem("stripe_session_id", sessionId);

      // Redirect to checkout
      window.location.href = url;
    } catch (error) {
      //console.error("Error creating subscription:", error);
      setSubscriptionError({
        message: error.message || "Failed to create subscription",
        errorCode: "SUBSCRIPTION_ERROR",
        showDialog: true,
      });
    }
  };

  const refreshSubscription = async () => {
    if (!user) return;

    // Add cache check to prevent excessive refreshes
    const now = Date.now();
    if (now - lastRefreshTime < REFRESH_COOLDOWN && !loading) {
      return; // Skip refresh if we refreshed recently and not in loading state
    }

    setLoading(true);

    try {
      // Use retryWithBackoff from networkUtils
      await retryWithBackoff(
        async () => {
          // Check network status first
          if (!navigator.onLine) {
            throw new Error("Network offline");
          }

          // Get subscription data
          // Around line 255-265, enhance the query logic
          const { data: subData, error: subError } = await supabase
            .from("subscriptions")
            .select("*")
            .eq("user_id", user.id)
            .in("status", ["active"]) // Only get active subscriptions, not trials
            .order("created_at", { ascending: false })
            .limit(1);

          // Separate query for trial status from profile
          const { data: profileData, error: profileError } = await supabase
            .from("profiles")
            .select(
              "trial_end, trial_start, trial_used, subscription_status, next_billing_date, subscription_start, subscription_end, plan_name"
            )
            .eq("id", user.id)
            .single();

          // Logic to determine final status
          const now = new Date();
          const hasActiveSubscription = subData && subData.length > 0;
          const trialEnd = profileData?.trial_end
            ? new Date(profileData.trial_end)
            : null;
          const isTrialActive =
            trialEnd &&
            now < trialEnd &&
            !profileData?.trial_used &&
            !hasActiveSubscription;

          if (hasActiveSubscription) {
            setSubscription(subData[0]);
            // Clear any trial state since we have active subscription
            setProfile({
              ...profileData,
              trial_start: null,
              trial_end: null,
              trial_used: true,
            });
          } else if (isTrialActive) {
            setSubscription(null);
            setProfile(profileData);
          } else {
            setSubscription(null);
            setProfile({
              ...profileData,
              subscription_status: "ended",
            });
          }

          // if (subError && subError.code !== "PGRST116") {
          //   console.error("Error fetching subscription:", subError);
          // } else {
          //   setSubscription(subData && subData.length > 0 ? subData[0] : null);
          // }

          // if (profileError && profileError.code !== "PGRST116") {
          //   console.error("Error fetching profile:", profileError);
          // } else {
          //   setProfile(profileData);
          // }

          // Update last refresh time
          setLastRefreshTime(Date.now());
        },
        3,
        2000
      ); // 3 retries with 2s base delay
    } catch (error) {
      //console.error("Error refreshing subscription after retries:", error);
      // Only show toast if we're online - no need to show errors when offline
      if (navigator.onLine) {
        toast.error(
          "Failed to load subscription data. Please check your connection."
        );
      }
    } finally {
      setLoading(false);
    }
  };

  // Debounce the refresh function for the useEffect
  const debouncedRefresh = debounce(refreshSubscription, 500);

  useEffect(() => {
    if (user) {
      debouncedRefresh();
    }
  }, [user]);

  // Add the periodic refresh and network monitoring useEffect
  useEffect(() => {
    if (user) {
      // Immediate first load
      refreshSubscription();

      // Set up periodic refresh
      const refreshInterval = setInterval(() => {
        refreshSubscription();
      }, 30000); // Refresh every 30 seconds

      // Refresh on network status change
      const handleOnline = () => {
        toast.success("Connection restored. Refreshing data...");
        refreshSubscription();
      };

      // Refresh on visibility change (tab becomes active)
      const handleVisibilityChange = () => {
        if (document.visibilityState === "visible") {
          refreshSubscription();
        }
      };

      window.addEventListener("online", handleOnline);
      document.addEventListener("visibilitychange", handleVisibilityChange);

      return () => {
        clearInterval(refreshInterval);
        window.removeEventListener("online", handleOnline);
        document.removeEventListener(
          "visibilitychange",
          handleVisibilityChange
        );
      };
    }
  }, [user]);

  // Add refs to track channel instances
  const subscriptionChannelRef = useRef<any>(null);
  const profileChannelRef = useRef<any>(null);
  const reviewsChannelRef = useRef<any>(null);
  
  useEffect(() => {
    if (!user) return;
  
    // Clean up existing channels first
    const cleanupExistingChannels = () => {
      if (subscriptionChannelRef.current) {
        supabase.removeChannel(subscriptionChannelRef.current);
        subscriptionChannelRef.current = null;
      }
      if (profileChannelRef.current) {
        supabase.removeChannel(profileChannelRef.current);
        profileChannelRef.current = null;
      }
      if (reviewsChannelRef.current) {
        supabase.removeChannel(reviewsChannelRef.current);
        reviewsChannelRef.current = null;
      }
    };
  
    cleanupExistingChannels();
  
    // Create new channels with unique names and timestamp
    const timestamp = Date.now();
    
    subscriptionChannelRef.current = supabase
      .channel(`subscription-changes-${user.id}-${timestamp}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "subscriptions",
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          refreshSubscription();
        }
      )
      .subscribe();
  
    profileChannelRef.current = supabase
      .channel(`profile-changes-${user.id}-${timestamp}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "profiles",
          filter: `id=eq.${user.id}`,
        },
        () => {
          refreshSubscription();
        }
      )
      .subscribe();
  
    reviewsChannelRef.current = supabase
      .channel(`reviews-changes-${user.id}-${timestamp}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "reviews",
          filter: `company_id=eq.${user.id}`,
        },
        (payload) => {
          // Handle reviews changes if needed
        }
      )
      .subscribe();
  
    return () => {
      cleanupExistingChannels();
    };
  }, [user]);

  // Calculate subscription status
  const isActive = subscription?.status === "active";

  // Calculate trial status using correct column name
  const isTrialActive = profile?.trial_end
    ? new Date(profile.trial_end) > new Date()
    : false;

  const trialDaysLeft = profile?.trial_end
    ? Math.max(
        0,
        Math.ceil(
          (new Date(profile.trial_end).getTime() - new Date().getTime()) /
            (1000 * 60 * 60 * 24)
        )
      )
    : 0;

  const createPortalSession = async () => {
    if (!user) {
      throw new Error("User not authenticated");
    }

    try {
      // Get the current session first
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError || !session) {
        throw new Error("No active session");
      }

      const { data, error } = await supabase.functions.invoke(
        "create-portal-session",
        {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      );

      if (error) {
        throw error;
      }

      // Redirect to Stripe Customer Portal
      window.location.href = data.url;
    } catch (error) {
      // console.error("Error creating portal session:", error);
      throw error;
    }
  };

  // Add this new method to the SubscriptionProvider component
  const handlePlanSelection = async (
    planType: "starter" | "professional" | "enterprise"
  ) => {
    if (!user) {
      throw new Error("User not authenticated");
    }

    // Check if user has an active subscription
    const hasActiveSubscription = isActive;

    if (hasActiveSubscription) {
      // If user has an active PAID subscription, redirect to Customer Portal
      await createPortalSession();
    } else {
      // If user has no paid subscription (including trial users), create a new subscription
      await createSubscription(planType);
    }
  };

  // Update the provider value to include the new method
  return (
    <SubscriptionContext.Provider
      value={{
        subscription,
        profile,
        loading,
        isActive,
        isTrialActive,
        trialDaysLeft,
        subscriptionError,
        clearError,
        refreshSubscription,
        createSubscription,
        createPortalSession,
        handlePlanSelection, // Add this new method
      }}
    >
      {children}
    </SubscriptionContext.Provider>
  );
}

export function useSubscription() {
  const context = useContext(SubscriptionContext);
  if (context === undefined) {
    throw new Error(
      "useSubscription must be used within a SubscriptionProvider"
    );
  }
  return context;
}

// Helper functions
function getPlanLevel(planType: string): number {
  const levels = { starter: 1, professional: 2, enterprise: 3 };
  return levels[planType] || 0;
}

function getPlanDisplayName(planType: string): string {
  const names = {
    starter: "Review Starter",
    professional: "Review Pro",
    enterprise: "Review Enterprise",
  };
  return names[planType] || planType;
}
