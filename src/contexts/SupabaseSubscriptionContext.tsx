import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useMemo,
} from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./AuthContext";
import { createCustomerPortal } from "@/lib/stripe-direct";

interface SubscriptionData {
  id: string;
  subscription_status: string;
  plan_name?: string;
  subscription_price?: number;
  trial_start?: string;
  trial_end?: string;
  subscription_start?: string;
  subscription_end?: string;
  next_billing_date?: string;
  // ✅ ADD: Database fields
  current_period_start?: string;
  current_period_end?: string;
  stripe_customer_id?: string;
  stripe_subscription_id?: string;
  role?: string;
}

// Add this method to the context
const checkExistingActiveSubscription = async (): Promise<boolean> => {
  if (!user?.id) return false;

  try {
    const { data, error } = await supabase.rpc(
      "check_existing_active_subscription",
      { p_user_id: user.id }
    );

    if (error) {
      // console.error("Error checking existing subscription:", error);
      return false;
    }

    return data || false;
  } catch (error) {
    //console.error("Error checking existing subscription:", error);
    return false;
  }
};

// Add to context interface and provider
interface SupabaseSubscriptionContextType {
  subscription: SubscriptionData | null;
  paymentHistory: PaymentHistoryItem[];
  loading: boolean;
  isActive: boolean;
  isTrialing: boolean;
  isExpired: boolean;
  isAdmin: boolean; // Add isAdmin property
  canAccessApp: boolean;
  daysUntilExpiry: number;
  getSubscriptionStatus: () => "Active" | "Trial" | "Ended" | "Expired";
  getAccessMessage: () => string;
  createCustomerPortalSession: () => Promise<string>;
  refreshSubscription: () => Promise<void>;
}

interface PaymentHistoryItem {
  id: string;
  amount: number;
  currency: string;
  status: string;
  created_at: string;
  stripe_payment_intent_id?: string;
}

const SupabaseSubscriptionContext = createContext<
  SupabaseSubscriptionContextType | undefined
>(undefined);

export const SupabaseSubscriptionProvider: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  const { user } = useAuth();
  const [subscription, setSubscription] = useState<SubscriptionData | null>(
    null
  );
  const [paymentHistory, setPaymentHistory] = useState<PaymentHistoryItem[]>(
    []
  );
  const [loading, setLoading] = useState(true);

  // Calculate derived states - FIX: Use subscription_status instead of status
  const isActive = subscription?.subscription_status === "active";
  const isTrialing =
    subscription?.subscription_status === "trial" ||
    (!subscription?.subscription_status && subscription?.trial_end);
  const isAdmin = subscription?.role === "admin";

  // Remove the debug logs first (lines 109-132)
  const isExpired = React.useMemo(() => {
    if (!subscription) return false;

    // Check for explicit expired status
    if (subscription.subscription_status === "expired") return true;

    const now = new Date();

    // Check if trial is expired
    if (isTrialing && subscription.trial_end) {
      return new Date(subscription.trial_end) <= now;
    }

    // Check if subscription is expired
    if (isActive && subscription.subscription_end) {
      return new Date(subscription.subscription_end) <= now;
    }

    return false;
  }, [subscription, isTrialing, isActive]);

  // Update canAccessApp logic
  const canAccessApp = useMemo(() => {
    // Admin users always have access
    if (isAdmin) {
      return true;
    }

    // Canceled subscriptions should not have access, even if they're within the paid period
    if (subscription?.subscription_status === "canceled") return false;

    // Active subscription (not expired)
    if (isActive && !isExpired) return true;

    // Active trial (not expired)
    if (isTrialing && !isExpired) return true;

    // All other cases: no access
    return false;
  }, [subscription, isActive, isTrialing, isExpired, isAdmin]);

  const daysUntilExpiry = React.useMemo(() => {
    if (!subscription) return 0;

    const expiryDate = isTrialing
      ? subscription.trial_end
      : subscription.subscription_end;

    if (!expiryDate) return 0;

    const now = new Date();
    const expiry = new Date(expiryDate);
    const diffTime = expiry.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    return Math.max(0, diffDays);
  }, [subscription, isTrialing]);

  const getSubscriptionStatus = ():
    | "Active"
    | "Trial"
    | "Ended"
    | "Expired" => {
    if (!subscription) return "Ended";
    // FIX: Use subscription_status instead of status
    if (subscription.subscription_status === "expired" || isExpired)
      return "Expired";
    if (isActive && !isExpired) return "Active";
    if (isTrialing && !isExpired) return "Trial";
    return "Ended";
  };

  const getAccessMessage = (): string => {
    if (isExpired && isTrialing) {
      return "Your 7-day trial has expired. Please purchase a plan to continue using this app.";
    }
    if (isExpired && isActive) {
      return "Your subscription has expired. Please renew your plan to continue using this app.";
    }
    // FIX: Use subscription_status instead of status
    if (subscription?.subscription_status === "expired") {
      return "Your subscription has expired. Please renew your plan to continue using this app.";
    }
    return "Please purchase a plan to access this app.";
  };

  // Add caching to fetchSubscriptionData
  const [lastFetchTime, setLastFetchTime] = useState(0);

  const fetchSubscriptionData = async () => {
    // Prevent rapid successive calls
    const now = Date.now();
    if (now - lastFetchTime < 2000) return; // 2 second cooldown

    setLastFetchTime(now);
    setLoading(true);

    if (!user?.id) return;

    try {
      setLoading(true);

      // First try to get an active subscription
      const [profilesResult, subscriptionsResult, paymentHistoryResult] =
        await Promise.all([
          supabase.from("profiles").select("*").eq("id", user.id).single(),
          supabase
            .from("subscriptions")
            .select("*")
            .eq("user_id", user.id)
            .eq("status", "active")
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle(),
          supabase
            .from("payment_history")
            .select("*")
            .eq("user_id", user.id)
            .order("created_at", { ascending: false })
            .limit(5),
        ]);

      // If no active subscription found, fall back to the most recent one
      let subscriptionData = subscriptionsResult.data;
      if (!subscriptionData) {
        const fallbackResult = await supabase
          .from("subscriptions")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        subscriptionData = fallbackResult.data;
      }

      // Also update the logic to handle when no active subscription is found
      const profileData = profilesResult.data;
      const paymentData = paymentHistoryResult.data || [];

      // ✅ ENHANCED DEBUG: More detailed logging
      // console.log("=== SUBSCRIPTION DEBUG ===");
      // console.log("User ID:", user.id);
      // console.log("Profile data:", profileData);
      // console.log("Subscription data:", subscriptionData);
      // console.log("Payment data:", paymentData);
      // console.log("Profile subscription fields:", {
      //   subscription_start: profileData?.subscription_start,
      //   subscription_end: profileData?.subscription_end,
      //   next_billing_date: profileData?.next_billing_date,
      //   trial_start: profileData?.trial_start,
      //   trial_end: profileData?.trial_end,
      // });
      if (subscriptionData) {
        // console.log("Subscription fields:", {
        //   current_period_start: subscriptionData.current_period_start,
        //   current_period_end: subscriptionData.current_period_end,
        //   status: subscriptionData.status,
        //   plan_name: subscriptionData.plan_name,
        // });
      }
      // console.log("=========================");

      setPaymentHistory(paymentData);

      // Smart status determination logic
      let finalData;

      // Check if we have a subscription (active or canceled but still valid)
      if (subscriptionData) {
        const now = new Date();
        const periodEnd = subscriptionData.current_period_end
          ? new Date(subscriptionData.current_period_end)
          : null;

        // Check if subscription is active OR canceled but still within paid period
        const isValidSubscription =
          subscriptionData.status === "active" ||
          (subscriptionData.status === "canceled" &&
            periodEnd &&
            now < periodEnd);

        if (isValidSubscription) {
          finalData = {
            ...profileData,
            ...subscriptionData,
            // Map status correctly - keep 'canceled' status for canceled subscriptions
            subscription_status:
              subscriptionData.status === "active" ? "active" : "canceled", // Changed from 'active' to 'canceled'
            plan_name: subscriptionData.plan_name,
            subscription_price: subscriptionData.subscription_price,
            subscription_start:
              subscriptionData.current_period_start ||
              profileData?.subscription_start,
            subscription_end:
              subscriptionData.current_period_end ||
              profileData?.subscription_end,
            next_billing_date:
              subscriptionData.current_period_end ||
              profileData?.next_billing_date,
            trial_start:
              profileData?.trial_start || subscriptionData.trial_start,
            trial_end: profileData?.trial_end || subscriptionData.trial_end,
            trial_used: profileData?.trial_used,
          };
        } else {
          // Subscription exists but is expired/invalid - fall back to trial logic
          // No active subscription - check trial status from profile
          const now = new Date();
          const trialEnd = profileData?.trial_end
            ? new Date(profileData.trial_end)
            : null;

          // Fix: Check if trial has expired and update status accordingly
          const isTrialExpired = trialEnd && now >= trialEnd;
          const isTrialActive =
            trialEnd && now < trialEnd && !profileData?.trial_used;

          // If trial is expired but status is still 'trial', update it
          if (isTrialExpired && profileData?.subscription_status === "trial") {
            // Update the database to reflect expired trial
            const { error: updateError } = await supabase
              .from("profiles")
              .update({
                subscription_status: "ended",
                trial_used: true,
                updated_at: new Date().toISOString(),
              })
              .eq("id", profileData.id);

            if (updateError) {
              // console.error(
              //   "Failed to update expired trial status:",
              //   updateError
              // );
            }
          }

          finalData = {
            ...profileData,
            subscription_status: isTrialActive ? "trial" : "ended",
            plan_name: isTrialActive ? "trial" : "free",
            subscription_price: 0,
            subscription_start: profileData?.subscription_start,
            subscription_end: profileData?.subscription_end,
            next_billing_date: profileData?.next_billing_date,
            trial_start: profileData?.trial_start,
            trial_end: profileData?.trial_end,
            trial_used: isTrialExpired ? true : profileData?.trial_used,
          };
        }
      } else {
        // No subscription - check trial status from profile
        const now = new Date();
        const trialEnd = profileData?.trial_end
          ? new Date(profileData.trial_end)
          : null;

        // Fix: Check if trial has expired and update status accordingly
        const isTrialExpired = trialEnd && now >= trialEnd;
        const isTrialActive =
          trialEnd && now < trialEnd && !profileData?.trial_used;

        // If trial is expired but status is still 'trial', update it
        if (isTrialExpired && profileData?.subscription_status === "trial") {
          // Update the database to reflect expired trial
          const { error: updateError } = await supabase
            .from("profiles")
            .update({
              subscription_status: "ended",
              trial_used: true,
              updated_at: new Date().toISOString(),
            })
            .eq("id", profileData.id);

          if (updateError) {
            // console.error(
            //   "Failed to update expired trial status:",
            //   updateError
            // );
          }
        }

        finalData = {
          ...profileData,
          subscription_status: isTrialActive ? "trial" : "ended",
          plan_name: isTrialActive ? "trial" : "free",
          subscription_price: 0,
          subscription_start: profileData?.subscription_start,
          subscription_end: profileData?.subscription_end,
          next_billing_date: profileData?.next_billing_date,
          trial_start: profileData?.trial_start,
          trial_end: profileData?.trial_end,
          trial_used: isTrialExpired ? true : profileData?.trial_used,
        };
      }

      // ✅ ADD: Debug the final mapped data
      // console.log("Final mapped data:", finalData);
      // console.log("Subscription dates:", {
      //   subscription_start: finalData.subscription_start,
      //   subscription_end: finalData.subscription_end,
      //   next_billing_date: finalData.next_billing_date,
      // });

      setSubscription(finalData);
    } catch (error) {
      //console.error("Error fetching subscription data:", error);
      // Error fallback
      setSubscription({
        subscription_status: "trial",
        trial_end: null,
      });
    } finally {
      setLoading(false);
    }
  };

  const refreshSubscription = async () => {
    await fetchSubscriptionData();
  };

  const createCustomerPortalSession = async (): Promise<string> => {
    if (!subscription?.stripe_customer_id) {
      throw new Error("No customer ID found");
    }
    return await createCustomerPortal(subscription.stripe_customer_id);
  };

  // Set up real-time subscriptions
  // Around line 380, improve the subscription management
  const [realtimeSubscriptions, setRealtimeSubscriptions] = useState<any[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<
    "DISCONNECTED" | "CONNECTING" | "CONNECTED"
  >("DISCONNECTED");

  useEffect(() => {
    if (!user?.id) return;

    fetchSubscriptionData();

    // Clear any existing subscriptions with proper cleanup
    const cleanup = async () => {
      setConnectionStatus("DISCONNECTED");

      // Wait a bit before cleaning up to ensure proper disconnection
      await new Promise((resolve) => setTimeout(resolve, 100));

      realtimeSubscriptions.forEach((sub) => {
        try {
          supabase.removeChannel(sub);
        } catch (e) {
          console.warn("Error removing channel:", e);
        }
      });
      setRealtimeSubscriptions([]);
    };

    cleanup().then(() => {
      // Wait before creating new connections
      setTimeout(() => {
        setConnectionStatus("CONNECTING");

        const timestamp = Date.now();
        const randomId = Math.random().toString(36).substring(7);
        const subscriptions = [];

        // Create a single multiplexed channel instead of multiple channels
        const multiChannel = supabase
          .channel(`user-changes-${user.id}-${timestamp}-${randomId}`)
          .on(
            "postgres_changes",
            {
              event: "UPDATE", // Only listen for updates, not all events (*)
              schema: "public",
              table: "profiles",
              filter: `id=eq.${user.id}`,
            },
            (payload) => {
              // Only refresh if specific fields changed
              const relevantFields = [
                "subscription_status",
                "plan_name",
                "trial_end",
              ];
              const hasRelevantChanges = relevantFields.some(
                (field) => payload.new[field] !== payload.old[field]
              );

              if (hasRelevantChanges) {
                //console.log("Relevant profile changes detected, refreshing data");
                setTimeout(() => fetchSubscriptionData(), 1500);
              }
            }
          ) // Close the first .on() call properly with a parenthesis
          .on(
            // Then chain the next .on() call
            "postgres_changes",
            {
              event: "UPDATE", // Only listen for updates
              schema: "public",
              table: "subscriptions",
              filter: `user_id=eq.${user.id}`,
            },
            (payload) => {
              // Only refresh if specific fields changed
              const relevantFields = [
                "subscription_status",
                "plan_name",
                "subscription_end",
              ];
              const hasRelevantChanges = relevantFields.some(
                (field) => payload.new[field] !== payload.old[field]
              );

              if (hasRelevantChanges) {
                //console.log("Relevant subscription changes detected, refreshing data");
                setTimeout(() => fetchSubscriptionData(), 1500);
              }
            }
          )
          .on(
            "postgres_changes",
            {
              event: "*",
              schema: "public",
              table: "payment_history",
              filter: `user_id=eq.${user.id}`,
            },
            () => {
              setTimeout(() => fetchSubscriptionData(), 1500);
            }
          )
          // Around line 450, update the subscription setup:

          .subscribe((status) => {
            // console.log("Realtime subscription status:", status);
            if (status === "SUBSCRIBED") {
              setConnectionStatus("CONNECTED");
            } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
              setConnectionStatus("DISCONNECTED");
              //console.error("Realtime subscription error:", status);

              // Retry connection after timeout
              if (status === "TIMED_OUT") {
                setTimeout(() => {
                  // console.log("Retrying realtime connection...");
                  // Trigger a reconnection by updating the dependency
                  fetchSubscriptionData();
                }, 5000);
              }
            }
          });

        subscriptions.push(multiChannel);
        setRealtimeSubscriptions(subscriptions);
      }, 500); // Wait 500ms before creating new connections
    });

    return () => {
      cleanup();
    };
  }, [user?.id]);

  // Add to the context value
  const value: SupabaseSubscriptionContextType = {
    subscription,
    paymentHistory,
    loading,
    isActive,
    fetchSubscriptionData,
    connectionStatus, // Add this
    isTrialing,
    isExpired,
    isAdmin,
    canAccessApp,
    daysUntilExpiry,
    getSubscriptionStatus,
    getAccessMessage,
    createCustomerPortalSession,
    refreshSubscription,
  };

  return (
    <SupabaseSubscriptionContext.Provider value={value}>
      {children}
    </SupabaseSubscriptionContext.Provider>
  );
};

export const useSupabaseSubscription = (): SupabaseSubscriptionContextType => {
  const context = useContext(SupabaseSubscriptionContext);
  if (context === undefined) {
    throw new Error(
      "useSupabaseSubscription must be used within a SupabaseSubscriptionProvider"
    );
  }
  return context;
};
