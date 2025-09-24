import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { trackSubscriptionEvent } from "./subscription-analytics.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, stripe-signature",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Helper function to safely convert Unix timestamp to ISO string
function safeTimestampToISO(
  timestamp: number | null | undefined
): string | null {
  if (!timestamp || timestamp === null || timestamp === undefined) {
    console.log("Timestamp is null/undefined:", timestamp);
    return null;
  }

  try {
    // Stripe timestamps are in seconds, JavaScript Date expects milliseconds
    const date = new Date(timestamp * 1000);
    if (isNaN(date.getTime())) {
      console.error("Invalid timestamp conversion:", timestamp);
      return null;
    }
    return date.toISOString();
  } catch (error) {
    console.error("Error converting timestamp:", timestamp, error);
    return null;
  }
}

// Helper function to get plan name from price ID
async function getPlanNameFromStripe(
  stripe: Stripe,
  priceId: string
): Promise<string> {
  try {
    const price = await stripe.prices.retrieve(priceId);
    const product = await stripe.products.retrieve(price.product as string);
    return product.name || "Unknown";
  } catch (error) {
    console.error("Error fetching plan name from Stripe:", error);
    // Fallback to price ID mapping
    const priceIdMap: { [key: string]: string } = {
      price_1S3FIlGwtmV8ojqhRDPQZop9: "Review Starter",
      price_1S3FJrGwtmV8ojqhLXwYwoXL: "Review Pro",
      price_1S3FKPGwtmV8ojqhuKKrrHd4: "Review Enterprise",
    };
    return priceIdMap[priceId] || "Unknown";
  }
}

// Add this function after getPlanNameFromStripe (around line 55)
function mapPlanNameToType(planName: string): string {
  const mapping: Record<string, string> = {
    "Review Starter": "starter",
    "Review Pro": "professional",
    "Review Enterprise": "enterprise",
  };
  return mapping[planName] || "starter";
}

// Add this function to log webhook errors to a database table
const logWebhookError = async (
  supabase: SupabaseClient,
  eventType: string,
  error: any,
  eventId?: string
) => {
  try {
    await supabase.from("webhook_errors").insert({
      event_type: eventType,
      event_id: eventId,
      error_message: error.message || String(error),
      error_stack: error.stack,
      error_data: JSON.stringify(error),
      created_at: new Date().toISOString(),
    });
  } catch (logError) {
    // If we can't log to the database, at least log to console
    console.error("Failed to log webhook error to database:", logError);
    console.error("Original error:", error);
  }
};

serve(async (req) => {
  // Add request size limit to prevent DoS
  const MAX_BODY_SIZE = 1024 * 1024; // 1MB limit

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Enhanced environment validation
    const requiredEnvVars = {
      stripeSecretKey: Deno.env.get("STRIPE_SECRET_KEY"),
      webhookSecret: Deno.env.get("STRIPE_WEBHOOK_SECRET"),
      supabaseUrl: Deno.env.get("SUPABASE_URL"),
      supabaseServiceKey: Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"),
    };

    // Validate all required environment variables
    for (const [key, value] of Object.entries(requiredEnvVars)) {
      if (!value) {
        console.error(`Missing required environment variable: ${key}`);
        return new Response("Server configuration error", {
          status: 500,
          headers: corsHeaders,
        });
      }
    }

    // Get request body with size limit
    const body = await req.text();
    if (body.length > MAX_BODY_SIZE) {
      console.error(`Request body too large: ${body.length} bytes`);
      return new Response("Request too large", {
        status: 413,
        headers: corsHeaders,
      });
    }

    // Enhanced signature validation
    const signature = req.headers.get("stripe-signature");
    if (!signature) {
      console.error("Missing Stripe signature");
      return new Response("Missing signature", {
        status: 400,
        headers: corsHeaders,
      });
    }

    // Validate signature format
    if (!signature.includes("t=") || !signature.includes("v1=")) {
      console.error("Invalid signature format");
      return new Response("Invalid signature format", {
        status: 400,
        headers: corsHeaders,
      });
    }

    // Environment variables validation
    const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");
    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    console.log("Environment check:", {
      hasStripeKey: !!stripeSecretKey,
      hasWebhookSecret: !!webhookSecret,
      hasSupabaseUrl: !!supabaseUrl,
      hasServiceKey: !!supabaseServiceKey,
    });

    if (
      !stripeSecretKey ||
      !webhookSecret ||
      !supabaseUrl ||
      !supabaseServiceKey
    ) {
      console.error("Missing required environment variables");
      return new Response("Server configuration error", {
        status: 500,
        headers: corsHeaders,
      });
    }

    // Initialize clients
    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: "2023-10-16",
      httpClient: Stripe.createFetchHttpClient(),
    });

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Test database connection
    console.log("Testing database connection...");
    const { data: testData, error: testError } = await supabase
      .from("subscriptions")
      .select("id")
      .limit(1);

    if (testError) {
      console.error("Database connection test failed:", testError);
      return new Response("Database connection error", {
        status: 500,
        headers: corsHeaders,
      });
    }
    console.log("✅ Database connection successful");

    // Use the existing body and signature variables instead of redeclaring them
    console.log("Request details:", {
      method: req.method,
      hasBody: !!body,
      bodyLength: body.length,
      hasSignature: !!signature,
      headers: Object.fromEntries(req.headers.entries()),
    });

    if (!signature) {
      console.error("No stripe signature found in headers");
      return new Response("No signature", {
        status: 400,
        headers: corsHeaders,
      });
    }

    // Enhanced signature verification
    let event: Stripe.Event;
    try {
      console.log("Attempting signature verification...");
      event = await stripe.webhooks.constructEventAsync(
        body,
        signature,
        webhookSecret
      );
      console.log("✅ Webhook signature verified successfully!");
      console.log("Event type:", event.type);
      console.log("Event ID:", event.id);
    } catch (err) {
      console.error("❌ Webhook signature verification failed:", err);
      return new Response(`Invalid signature: ${err.message}`, {
        status: 401,
        headers: corsHeaders,
      });
    }

    console.log("=== PROCESSING EVENT ===", event.type);

    // Handle the event
    switch (event.type) {
      case "checkout.session.completed": {
        console.log("=== PROCESSING CHECKOUT SESSION COMPLETED ===");
        const session = event.data.object as Stripe.Checkout.Session;

        console.log("Session details:", {
          id: session.id,
          mode: session.mode,
          status: session.status,
          payment_status: session.payment_status,
          subscription: session.subscription,
          customer_email: session.customer_email,
          metadata: session.metadata,
        });

        // Fix for checkout.session.completed (around line 250)
        if (session.mode === "subscription" && session.subscription) {
          console.log("Retrieving subscription:", session.subscription);
          const subscription = await stripe.subscriptions.retrieve(
            session.subscription as string,
            {
              expand: ["items.data.price.product"],
            }
          );

          let userId = session.metadata?.userId;
          console.log("Session metadata:", session.metadata);
          console.log("User ID from metadata:", userId);

          if (!userId) {
            console.error(
              "No userId found in session metadata. Available metadata:",
              session.metadata
            );
            // Try to get userId from subscription metadata as fallback
            const subscriptionWithMetadata =
              await stripe.subscriptions.retrieve(
                session.subscription as string
              );
            const fallbackUserId = subscriptionWithMetadata.metadata?.userId;

            if (!fallbackUserId) {
              return new Response("No user ID in metadata", {
                status: 400,
                headers: corsHeaders,
              });
            }

            console.log(
              "Using fallback userId from subscription:",
              fallbackUserId
            );
            userId = fallbackUserId;
          }

          if (userId) {
            const priceId = subscription.items.data[0].price.id;
            const planName = await getPlanNameFromStripe(stripe, priceId);
            const subscriptionPrice =
              subscription.items.data[0].price.unit_amount || 0;

            // ✅ FIRST: Cancel any existing active subscriptions for this user (EXCEPT the current one)
            const { error: cancelError } = await supabase
              .from("subscriptions")
              .update({
                status: "canceled",
                updated_at: new Date().toISOString(),
              })
              .eq("user_id", userId)
              .in("status", ["active", "trial"])
              .neq("stripe_subscription_id", subscription.id); // ✅ ADD THIS LINE - Don't cancel the current subscription

            if (cancelError) {
              console.error(
                "Error canceling existing subscriptions:",
                cancelError
              );
            }

            // ✅ THEN: Insert the new subscription
            const subscriptionData = {
              user_id: userId,
              stripe_subscription_id: subscription.id,
              stripe_customer_id: subscription.customer as string,
              status: subscription.status,
              stripe_price_id: priceId,
              plan_name: planName,
              plan_type: mapPlanNameToType(planName), // This is already correct
              subscription_price: subscriptionPrice,
              current_period_start: safeTimestampToISO(
                subscription.current_period_start
              ),
              current_period_end: safeTimestampToISO(
                subscription.current_period_end
              ),
              trial_start: safeTimestampToISO(subscription.trial_start),
              trial_end: safeTimestampToISO(subscription.trial_end),
              cancel_at_period_end: subscription.cancel_at_period_end,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            };

            // Use INSERT instead of UPSERT to avoid constraint conflicts
            const { data, error } = await supabase
              .from("subscriptions")
              .insert(subscriptionData)
              .select();

            if (error) {
              console.error("Database insert error:", error);
              return new Response("Database error", {
                status: 500,
                headers: corsHeaders,
              });
            }

            console.log("✅ Subscription data inserted successfully:", data);
          }
        }
        break;
      }

      // Around line 305-320, enhance the cancellation logic
      case "customer.subscription.created": {
        console.log("=== PROCESSING SUBSCRIPTION CREATED ===");
        const subscription = event.data.object as Stripe.Subscription;

        // Skip incomplete subscriptions to avoid NULL timestamp issues
        if (
          subscription.status === "incomplete" ||
          subscription.status === "incomplete_expired"
        ) {
          console.log(
            `Skipping ${subscription.status} subscription:`,
            subscription.id
          );
          return new Response("OK - Skipped incomplete subscription", {
            status: 200,
            headers: corsHeaders,
          });
        }

        // Extract userId from subscription metadata
        let userId = subscription.metadata?.userId;

        if (!userId) {
          console.error(
            "No userId found in subscription metadata. Available metadata:",
            subscription.metadata
          );
          // Try to get userId from customer metadata as fallback
          const customer = await stripe.customers.retrieve(
            subscription.customer as string
          );
          const fallbackUserId = (customer as Stripe.Customer).metadata?.userId;

          if (!fallbackUserId) {
            console.error("No userId found in customer metadata either");
            return new Response("No user ID in metadata", {
              status: 400,
              headers: corsHeaders,
            });
          }

          console.log("Using fallback userId from customer:", fallbackUserId);
          userId = fallbackUserId;
        }

        const priceId = subscription.items.data[0]?.price?.id;
        const planName = priceId
          ? await getPlanNameFromStripe(stripe, priceId)
          : "Unknown";
        const subscriptionPrice =
          subscription.items.data[0]?.price?.unit_amount || 0;

        const subscriptionData = {
          user_id: userId,
          stripe_subscription_id: subscription.id,
          stripe_customer_id: subscription.customer as string,
          status: subscription.status,
          stripe_price_id: priceId,
          plan_name: planName,
          plan_type: mapPlanNameToType(planName), // ✅ ADD THIS LINE
          subscription_price: subscriptionPrice,
          // Add fallback for NULL timestamps
          current_period_start:
            safeTimestampToISO(subscription.current_period_start) ||
            new Date().toISOString(),
          current_period_end:
            safeTimestampToISO(subscription.current_period_end) ||
            new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from now as fallback
          trial_start: safeTimestampToISO(subscription.trial_start),
          trial_end: safeTimestampToISO(subscription.trial_end),
          cancel_at_period_end: subscription.cancel_at_period_end,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        // Use upsert to handle both new subscriptions and updates
        // Fix for customer.subscription.created (around line 350)
        // ✅ FIXED: Only cancel subscriptions that are different from the new one
        const { error: cancelError } = await supabase
          .from("subscriptions")
          .update({
            status: "canceled",
            updated_at: new Date().toISOString(),
          })
          .eq("user_id", userId)
          .in("status", ["active", "trial"])
          .neq("stripe_subscription_id", subscription.id); // Don't cancel the current subscription
      
        if (cancelError) {
          console.error("Error canceling existing subscriptions:", cancelError);
        }
      
        // ✅ NEW: Clear trial data from profile when paid subscription starts
        if (subscription.status === "active") {
          const { error: profileUpdateError } = await supabase
            .from("profiles")
            .update({
              trial_start: null,
              trial_end: null,
              trial_used: true,
              updated_at: new Date().toISOString(),
            })
            .eq("id", userId);
      
          if (profileUpdateError) {
            console.error("Error clearing trial data:", profileUpdateError);
          }
        }
      
        // ✅ THEN: Insert the new subscription (change upsert to insert)
        const { data, error } = await supabase
          .from("subscriptions")
          .insert(subscriptionData) // Changed from upsert to insert
          .select();

        if (error) {
          console.error("Database upsert error:", error);
          return new Response("Database error", {
            status: 500,
            headers: corsHeaders,
          });
        }

        console.log("✅ Subscription data upserted successfully:", data);

        // Track the new subscription event
        if (!error) {
          await trackSubscriptionEvent(
            supabaseUrl,
            supabaseServiceKey,
            "new",
            userId,
            subscriptionData.plan_type,
            subscriptionPrice
          );
          console.log("✅ Subscription event tracked successfully");
        }

        // ✅ REMOVED: Manual profile updates - let trigger handle it
        // The database trigger will automatically sync subscription data to profiles

        return new Response("OK", {
          status: 200,
          headers: corsHeaders,
        });
        break;
      }

      case "customer.subscription.updated": {
        console.log("=== PROCESSING SUBSCRIPTION UPDATED ===");
        const subscription = event.data.object as Stripe.Subscription;

        let userId = subscription.metadata?.userId;
        if (!userId) {
          const customer = await stripe.customers.retrieve(
            subscription.customer as string
          );
          userId = (customer as Stripe.Customer).metadata?.userId;
        }

        if (!userId) {
          console.error("No userId found for subscription update");
          break;
        }

        const priceId = subscription.items.data[0]?.price?.id;
        const planName = priceId
          ? await getPlanNameFromStripe(stripe, priceId)
          : "Unknown";
        const subscriptionPrice =
          subscription.items.data[0]?.price?.unit_amount || 0;

        // ONLY update subscriptions table - trigger will sync to profiles
        // Fix 2: Add missing fields to subscription.updated handler (around line 410)
        const updateData = {
          status: subscription.status,
          stripe_price_id: priceId,
          plan_name: planName,
          plan_type: mapPlanNameToType(planName),
          subscription_price: subscriptionPrice,
          // Only update timestamps if they're not NULL from Stripe
          ...(subscription.current_period_start && {
            current_period_start: safeTimestampToISO(
              subscription.current_period_start
            ),
          }),
          ...(subscription.current_period_end && {
            current_period_end: safeTimestampToISO(
              subscription.current_period_end
            ),
          }),
          updated_at: new Date().toISOString(),
        };

        const { error: subError } = await supabase
          .from("subscriptions")
          .update(updateData)
          .eq("stripe_subscription_id", subscription.id);

        if (subError) {
          console.error("Failed to update subscription:", subError);
        } else {
          // Track subscription renewal if applicable
          if (subscription.status === "active") {
            await trackSubscriptionEvent(
              supabaseUrl,
              supabaseServiceKey,
              "renewed",
              userId,
              updateData.plan_type,
              subscriptionPrice
            );
            console.log("✅ Subscription renewal event tracked successfully");
          }
          console.log("Subscription updated - trigger will sync to profile");
        }

        break;
      }

      case "customer.subscription.deleted": {
        console.log("=== PROCESSING SUBSCRIPTION DELETED ===");
        const subscription = event.data.object as Stripe.Subscription;

        let userId = subscription.metadata?.userId;
        if (!userId) {
          const customer = await stripe.customers.retrieve(
            subscription.customer as string
          );
          userId = (customer as Stripe.Customer).metadata?.userId;
        }

        if (!userId) {
          console.error("No userId found for subscription deletion");
          break;
        }

        // Update subscription status to canceled
        const { error: subError } = await supabase
          .from("subscriptions")
          .update({
            status: "canceled",
            updated_at: new Date().toISOString(),
          })
          .eq("stripe_subscription_id", subscription.id);

        if (subError) {
          console.error("Failed to update canceled subscription:", subError);
        } else {
          // Track the canceled subscription event
          const priceId = subscription.items.data[0]?.price?.id;
          const planType = priceId
            ? mapPlanNameToType(await getPlanNameFromStripe(stripe, priceId))
            : "unknown";

          await trackSubscriptionEvent(
            supabaseUrl,
            supabaseServiceKey,
            "canceled",
            userId,
            planType,
            0
          );
          console.log(
            "✅ Subscription cancellation event tracked successfully"
          );
          console.log("Subscription canceled - trigger will sync to profile");
        }

        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("=== WEBHOOK ERROR ===", error);
    return new Response(
      JSON.stringify({
        error: "Internal server error",
        message: error.message,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
