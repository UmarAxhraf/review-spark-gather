// // Simplified version of subscription-analytics.ts for the webhook

// // Track subscription events for analytics
// export const trackSubscriptionEvent = async (
//   eventType: "new" | "canceled" | "converted" | "renewed",
//   userId: string,
//   planType: string,
//   amount?: number
// ) => {
//   // This will be handled by the Supabase client in the webhook function
//   return { eventType, userId, planType, amount };
// };

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
  supabaseUrl: string,
  supabaseServiceKey: string,
  role?: "user" | "admin"
): Promise<SubscriptionMetrics> => {
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

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
  supabaseUrl: string,
  supabaseServiceKey: string,
  period: "week" | "month" | "year" = "month",
  role?: "user" | "admin"
): Promise<SubscriptionTrend[]> => {
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

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
  supabaseUrl: string,
  supabaseServiceKey: string,
  eventType: "new" | "canceled" | "converted" | "renewed",
  userId: string,
  planType: string,
  amount?: number
) => {
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

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
