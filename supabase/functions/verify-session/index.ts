import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@14.21.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Plan mapping function to ensure consistency with webhook
function mapPlanType(
  productName: string | null,
  priceNickname: string | null
): string {
  // First try to map by product name (consistent with webhook)
  const productMapping: Record<string, string> = {
    basic: "starter",
    premium: "professional",
    pro: "professional", // Fixed: Pro should map to professional
    enterprise: "enterprise",
  };

  if (productName) {
    const mapped = productMapping[productName.toLowerCase()];
    if (mapped) return mapped;
  }

  // Fallback to price nickname mapping
  const nicknameMapping: Record<string, string> = {
    basic: "starter",
    premium: "professional",
    pro: "professional",
    enterprise: "enterprise",
  };

  if (priceNickname) {
    const mapped = nicknameMapping[priceNickname.toLowerCase()];
    if (mapped) return mapped;
  }

  return "starter"; // Default fallback
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  let sessionId: string | undefined;
  let user: any;

  try {
    // Initialize Stripe
    const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeSecretKey) {
      console.error("Missing Stripe secret key");
      return new Response(
        JSON.stringify({
          success: false,
          message: "Server configuration error: Missing Stripe key",
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: "2023-10-16",
    });

    // Initialize Supabase
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get user from JWT token
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "Missing authorization header",
        }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const {
      data: { user: authUser },
      error: authError,
    } = await supabase.auth.getUser(token);

    if (authError || !authUser) {
      console.error("Authentication error:", authError);
      return new Response(
        JSON.stringify({
          success: false,
          message: "Invalid authentication token",
        }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    user = authUser;

    // Parse request body
    const requestBody = await req.json();
    sessionId = requestBody.sessionId;

    if (!sessionId) {
      return new Response(
        JSON.stringify({ success: false, message: "Session ID is required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log("Verifying session:", sessionId, "for user:", user.id);

    // Retrieve the checkout session from Stripe
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    console.log("Session retrieved:", {
      id: session.id,
      payment_status: session.payment_status,
      mode: session.mode,
      subscription: session.subscription,
      customer_email: session.customer_email,
    });

    // Check if payment was successful
    if (session.payment_status !== "paid") {
      return new Response(
        JSON.stringify({
          success: false,
          message: `Payment not completed. Status: ${session.payment_status}`,
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Handle subscription mode
    if (session.mode === "subscription" && session.subscription) {
      // Get subscription details with expanded product information
      const subscription = await stripe.subscriptions.retrieve(
        session.subscription as string,
        {
          expand: ["items.data.price.product"],
        }
      );

      const userId = session.metadata?.userId || user.id;
      const userEmail = session.customer_email;

      console.log("Processing subscription for user:", userId);

      if (userId) {
        // Verify the user ID matches the authenticated user
        if (userId !== user.id && session.metadata?.userId) {
          console.error("User ID mismatch:", {
            sessionUserId: userId,
            authUserId: user.id,
          });
          return new Response(
            JSON.stringify({
              success: false,
              message: "User ID mismatch - security violation",
            }),
            {
              status: 403,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
          );
        }

        // Check if user already has an active subscription for a DIFFERENT plan
        const { data: existingSubscription, error: checkError } = await supabase
          .from("subscriptions")
          .select("id, status, stripe_subscription_id, plan_type")
          .eq("user_id", user.id)
          .in("status", ["active", "trial"])
          .single();

        if (checkError && checkError.code !== "PGRST116") {
          console.error("Error checking existing subscription:", checkError);
          return new Response(
            JSON.stringify({
              success: false,
              message: "Database error checking existing subscription",
            }),
            {
              status: 500,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
          );
        }

        // Get the plan type from the new subscription
        const priceItem = subscription.items.data[0];
        const product = priceItem.price.product as Stripe.Product;
        const newPlanType = mapPlanType(product.name, priceItem.price.nickname);

        // Only block if user has existing subscription with SAME plan type and DIFFERENT subscription ID
        if (
          existingSubscription &&
          existingSubscription.stripe_subscription_id !== subscription.id &&
          existingSubscription.plan_type === newPlanType
        ) {
          console.log("User attempting to purchase same plan:", {
            existing: existingSubscription.plan_type,
            new: newPlanType,
            existingSubId: existingSubscription.stripe_subscription_id,
            newSubId: subscription.id,
          });

          // Return error for duplicate SAME-PLAN subscription attempt
          return new Response(
            JSON.stringify({
              success: false,
              message: `You already have an active ${existingSubscription.plan_type} subscription. You cannot purchase the same plan again.`,
              errorCode: "DUPLICATE_SUBSCRIPTION",
              currentPlan: existingSubscription.plan_type,
            }),
            {
              status: 409, // Conflict status code
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
          );
        }

        // For different plan types, allow the upgrade/downgrade to proceed
        // Stripe will handle canceling the old subscription automatically
        console.log("Allowing plan change:", {
          from: existingSubscription?.plan_type || "none",
          to: newPlanType,
          subscriptionId: subscription.id,
        });

        // If it's the same subscription ID, allow update (renewal/reactivation)
        // Or if no existing subscription, create new one
        const subscriptionData = {
          user_id: user.id,
          stripe_customer_id: subscription.customer,
          stripe_subscription_id: subscription.id,
          stripe_price_id: priceItem.price.id,
          plan_type: newPlanType,
          status: subscription.status,
          current_period_start: new Date(
            subscription.current_period_start * 1000
          ).toISOString(),
          current_period_end: new Date(
            subscription.current_period_end * 1000
          ).toISOString(),
          cancel_at_period_end: subscription.cancel_at_period_end || false,
          updated_at: new Date().toISOString(),
        };

        // Remove the manual profile update - let trigger handle it
        console.log("Processing subscription verification for upgrade/downgrade");
        
        // ✅ FIXED: Only update subscriptions table, let trigger sync to profiles
        const { error: subscriptionError } = await supabase
          .from("subscriptions")
          .upsert(subscriptionData, {
            onConflict: "stripe_subscription_id",
          });
        
        if (subscriptionError) {
          console.error("Subscription upsert error:", subscriptionError);
          return new Response(
            JSON.stringify({
              success: false,
              message: "Failed to update subscription",
            }),
            {
              status: 500,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
          );
        }
        
        console.log("✅ Subscription updated successfully - trigger will sync to profile");

        return new Response(
          JSON.stringify({
            success: true,
            message: "Payment verified and subscription updated successfully",
            subscription: {
              id: subscription.id,
              status: subscription.status,
              plan_type: newPlanType,
              current_period_start: subscription.current_period_start,
              current_period_end: subscription.current_period_end,
            },
          }),
          {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      } else {
        return new Response(
          JSON.stringify({
            success: false,
            message:
              "User ID not found in session metadata and no authenticated user",
          }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
    }

    return new Response(
      JSON.stringify({
        success: false,
        message: `Invalid session mode: ${session.mode}. Expected 'subscription'`,
      }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Session verification error:", {
      message: error.message,
      stack: error.stack,
      sessionId: sessionId || "unknown",
      userId: user?.id || "unknown",
      timestamp: new Date().toISOString(),
    });

    return new Response(
      JSON.stringify({
        success: false,
        message: `Internal server error: ${error.message}`,
        errorCode: "VERIFICATION_ERROR",
        timestamp: new Date().toISOString(),
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
