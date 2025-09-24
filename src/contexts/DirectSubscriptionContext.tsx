import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { PricingPlan, getPlanById } from "../lib/stripe-direct";
import { supabase } from "../integrations/supabase/client";
import { useAuth } from "./AuthContext";

export interface SubscriptionState {
  plan: "free" | "basic" | "pro" | "enterprise";
  status: "active" | "canceled" | "past_due" | "trial" | "incomplete"; // Changed 'trialing' to 'trial'
  currentPeriodEnd: Date | null;
  customerId?: string;
  subscriptionId?: string;
  isLoading: boolean;
}

interface SubscriptionContextType {
  subscription: SubscriptionState;
  updateSubscription: (data: Partial<SubscriptionState>) => void;
  hasAccess: (feature: string) => boolean;
  isPaidPlan: () => boolean;
  getCurrentPlan: () => PricingPlan | null;
  resetSubscription: () => void;
}

const SubscriptionContext = createContext<SubscriptionContextType | null>(null);

const STORAGE_KEY = "review_spark_subscription";

const defaultSubscription: SubscriptionState = {
  plan: "free",
  status: "active",
  currentPeriodEnd: null,
  isLoading: false,
};

export const DirectSubscriptionProvider: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  const { user } = useAuth();
  const [subscription, setSubscription] =
    useState<SubscriptionState>(defaultSubscription);

  // Load subscription from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        // Convert date string back to Date object
        if (parsed.currentPeriodEnd) {
          parsed.currentPeriodEnd = new Date(parsed.currentPeriodEnd);
        }
        setSubscription({ ...defaultSubscription, ...parsed });
      }
    } catch (error) {
      console.error("Failed to load subscription from localStorage:", error);
    }
  }, []);

  // Add sync function
  const syncWithSupabase = async (subscriptionData: SubscriptionState) => {
    if (user) {
      try {
        await supabase
          .from("profiles")
          .update({
            subscription_status: subscriptionData.status,
            subscription_plan: subscriptionData.plan,
            stripe_customer_id: subscriptionData.customerId,
          })
          .eq("id", user.id);

        //console.log('Subscription data synced with Supabase');
      } catch (error) {
        console.error("Failed to sync with Supabase:", error);
      }
    }
  };

  // Update subscription function with sync
  const updateSubscription = (newState: Partial<SubscriptionState>) => {
    const updatedState = { ...subscription, ...newState };
    setSubscription(updatedState);
    localStorage.setItem("subscription_state", JSON.stringify(updatedState));

    // Sync with Supabase
    syncWithSupabase(updatedState);
  };

  // Load subscription data from Supabase on user login
  useEffect(() => {
    const loadSubscriptionFromSupabase = async () => {
      if (user) {
        try {
          const { data, error } = await supabase
            .from("profiles")
            .select(
              "subscription_status, subscription_plan, stripe_customer_id"
            )
            .eq("id", user.id)
            .single();

          if (data && !error) {
            const supabaseState: SubscriptionState = {
              status: data.subscription_status || "inactive",
              plan: data.subscription_plan || null,
              customerId: data.stripe_customer_id || null,
            };

            // Merge with localStorage data, prioritizing Supabase
            const localState = JSON.parse(
              localStorage.getItem("subscription_state") || "{}"
            );
            const mergedState = { ...localState, ...supabaseState };

            setSubscription(mergedState);
            localStorage.setItem(
              "subscription_state",
              JSON.stringify(mergedState)
            );
          }
        } catch (error) {
          console.error("Failed to load subscription from Supabase:", error);
        }
      }
    };

    loadSubscriptionFromSupabase();
  }, [user]);

  const resetSubscription = () => {
    setSubscription(defaultSubscription);
    localStorage.removeItem(STORAGE_KEY);
  };

  const hasAccess = (feature: string): boolean => {
    // Check if subscription is active and not expired
    if (subscription.status !== "active" && subscription.status !== "trial") {
      // Changed 'trialing' to 'trial'
      return false;
    }

    if (
      subscription.currentPeriodEnd &&
      new Date() > subscription.currentPeriodEnd
    ) {
      return false;
    }

    const planFeatures: Record<string, string[]> = {
      free: ["basic_reviews"],
      basic: ["basic_reviews", "analytics", "email_support"],
      pro: [
        "basic_reviews",
        "analytics",
        "email_support",
        "advanced_analytics",
        "priority_support",
        "custom_branding",
      ],
      enterprise: [
        "basic_reviews",
        "analytics",
        "email_support",
        "advanced_analytics",
        "priority_support",
        "custom_branding",
        "api_access",
        "dedicated_support",
      ],
    };

    return planFeatures[subscription.plan]?.includes(feature) || false;
  };

  const isPaidPlan = (): boolean => {
    return subscription.plan !== "free" && subscription.status === "active";
  };

  const getCurrentPlan = (): PricingPlan | null => {
    if (subscription.plan === "free") return null;
    return getPlanById(subscription.plan) || null;
  };

  return (
    <SubscriptionContext.Provider
      value={{
        subscription,
        updateSubscription,
        hasAccess,
        isPaidPlan,
        getCurrentPlan,
        resetSubscription,
      }}
    >
      {children}
    </SubscriptionContext.Provider>
  );
};

export const useDirectSubscription = () => {
  const context = useContext(SubscriptionContext);
  if (!context) {
    throw new Error(
      "useDirectSubscription must be used within DirectSubscriptionProvider"
    );
  }
  return context;
};
