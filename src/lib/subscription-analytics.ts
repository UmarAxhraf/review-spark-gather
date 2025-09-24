import { supabase } from "@/integrations/supabase/client";

// Types for subscription analytics
export interface SubscriptionMetrics {
  totalSubscribers: number;
  activeSubscribers: number;
  trialUsers: number;
  churnRate: number;
  conversionRate: number;
  mrr: number; // Monthly Recurring Revenue in cents
  averageRevenue: number; // Average revenue per user in cents
}

export interface SubscriptionTrend {
  date: string;
  newSubscribers: number;
  canceledSubscribers: number;
  revenue: number;
}

// Function to get current subscription metrics
export const getSubscriptionMetrics = async (
  role?: "user" | "admin"
): Promise<SubscriptionMetrics> => {
  try {
    const { data, error } = await supabase.rpc("get_subscription_metrics", {
      p_role: role,
    });

    if (error) throw error;

    return data as SubscriptionMetrics;
  } catch (error) {
    console.error("Error fetching subscription metrics:", error);
    return {
      totalSubscribers: 0,
      activeSubscribers: 0,
      trialUsers: 0,
      churnRate: 0,
      conversionRate: 0,
      mrr: 0,
      averageRevenue: 0,
    };
  }
};

// Function to get subscription trends over time
export const getSubscriptionTrends = async (
  period: "week" | "month" | "year" = "month",
  role?: "user" | "admin"
): Promise<SubscriptionTrend[]> => {
  try {
    const { data, error } = await supabase.rpc("get_subscription_trends", {
      p_period: period,
      p_role: role,
    });

    if (error) throw error;

    return data as SubscriptionTrend[];
  } catch (error) {
    console.error("Error fetching subscription trends:", error);
    return [];
  }
};

// Track subscription events for analytics
export const trackSubscriptionEvent = async (
  eventType: "new" | "canceled" | "converted" | "renewed",
  userId: string,
  planType: string,
  amount?: number
) => {
  try {
    await supabase.from("subscription_events").insert({
      user_id: userId,
      event_type: eventType,
      plan_type: planType,
      amount: amount,
      created_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error tracking subscription event:", error);
  }
};
