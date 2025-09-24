import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@14.21.0";

const corsHeaders = (origin) => ({
  "Access-Control-Allow-Origin": origin || "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Credentials": "true",
});

// Support both request formats
interface DetailedCheckoutRequest {
  priceId: string;
  userId: string;
  userEmail: string;
  successUrl: string;
  cancelUrl: string;
}

interface PlanTypeCheckoutRequest {
  planType: "starter" | "professional" | "enterprise";
}

type CheckoutRequest = DetailedCheckoutRequest | PlanTypeCheckoutRequest;

// Price ID mappings
const PRICE_ID_MAP = {
  starter:
    Deno.env.get("STRIPE_TEST_STARTER_PRICE_ID") ||
    "price_1S3FIlGwtmV8ojqhRDPQZop9",
  professional:
    Deno.env.get("STRIPE_TEST_PROFESSIONAL_PRICE_ID") ||
    "price_1S3FJrGwtmV8ojqhLXwYwoXL",
  enterprise:
    Deno.env.get("STRIPE_TEST_ENTERPRISE_PRICE_ID") ||
    "price_1S3FKPGwtmV8ojqhuKKrrHd4",
};

// Add helper function to map price ID to plan type (after PRICE_ID_MAP)
function getPlanTypeFromPriceId(priceId: string): string {
  const priceToTypeMap: Record<string, string> = {
    [PRICE_ID_MAP.starter]: "starter",
    [PRICE_ID_MAP.professional]: "professional",
    [PRICE_ID_MAP.enterprise]: "enterprise",
  };
  return priceToTypeMap[priceId] || "unknown";
}

// Rate limiting implementation
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT = 5; // 5 requests per minute
const RATE_WINDOW = 60 * 1000; // 1 minute

function checkRateLimit(identifier: string): boolean {
  const now = Date.now();
  const userLimit = rateLimitMap.get(identifier);

  if (!userLimit || now > userLimit.resetTime) {
    rateLimitMap.set(identifier, { count: 1, resetTime: now + RATE_WINDOW });
    return true;
  }

  if (userLimit.count >= RATE_LIMIT) {
    return false;
  }

  userLimit.count++;
  return true;
}

serve(async (req) => {
  const origin = req.headers.get("origin");

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders(origin) });
  }

  try {
    // CSRF Protection - Validate origin
    const allowedOrigins = [
      "http://localhost:8080",
      "http://localhost:3000", // Add common development port
      "http://localhost:5173", // Add Vite's default port
      "http://127.0.0.1:8080", // Add localhost IP equivalent
      "http://127.0.0.1:3000",
      "http://127.0.0.1:5173",
      "https://review-spark-gather.vercel.app", // Production domain
    ];

    // More permissive origin check for development
    if (
      !origin ||
      (!allowedOrigins.includes(origin) &&
        !origin.startsWith("http://localhost:") &&
        !origin.startsWith("http://127.0.0.1:"))
    ) {
      console.error(`Invalid origin: ${origin}`);
      return new Response("Invalid origin", {
        status: 403,
        headers: corsHeaders(origin),
      });
    }

    // Validate Content-Type
    const contentType = req.headers.get("content-type");

    // Fix all instances of corsHeaders to use the origin parameter
    if (!contentType || !contentType.includes("application/json")) {
      return new Response("Invalid content type", {
        status: 400,
        headers: corsHeaders(origin), // Fixed: Call with origin parameter
      });
    }

    // Initialize Stripe
    const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeSecretKey) {
      throw new Error("STRIPE_SECRET_KEY not found");
    }

    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: "2023-10-16",
    });

    // Initialize Supabase
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse request body
    const requestBody = await req.json();

    let priceId: string;
    let userId: string;
    let userEmail: string;
    let successUrl: string;
    let cancelUrl: string;

    // Check if this is a planType request or detailed request
    if ("planType" in requestBody) {
      // Handle planType format (from Signup/Login pages)
      const { planType } = requestBody as PlanTypeCheckoutRequest;

      // Get user info from JWT token
      const authHeader = req.headers.get("authorization");
      if (!authHeader) {
        throw new Error("Authorization header required for planType requests");
      }

      const token = authHeader.replace("Bearer ", "");
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser(token);

      if (authError || !user) {
        throw new Error("Invalid or expired token");
      }

      // Map planType to priceId
      priceId = PRICE_ID_MAP[planType];
      if (!priceId) {
        throw new Error(`Invalid plan type: ${planType}`);
      }

      userId = user.id;
      userEmail = user.email!;
      successUrl = `${
        req.headers.get("origin") || "http://localhost:8080"
      }/dashboard?success=true`;
      cancelUrl = `${
        req.headers.get("origin") || "http://localhost:8080"
      }/?canceled=true`;

      console.log("Processing planType request:", {
        planType,
        priceId,
        userId,
        userEmail,
      });
    } else {
      // Handle detailed format (from SubscriptionContext)
      const detailedRequest = requestBody as DetailedCheckoutRequest;
      priceId = detailedRequest.priceId;
      userId = detailedRequest.userId;
      userEmail = detailedRequest.userEmail;
      successUrl = detailedRequest.successUrl;
      cancelUrl = detailedRequest.cancelUrl;

      console.log("Processing detailed request:", {
        priceId,
        userId,
        userEmail,
      });
    }

    // First, create or retrieve Stripe customer with the authenticated user's email
    // Fixed customer creation with proper error handling
    let customer;
    try {
      // Use atomic operation to prevent race conditions
      const existingCustomers = await stripe.customers.list({
        email: userEmail,
        limit: 1,
      });

      if (existingCustomers.data.length > 0) {
        customer = existingCustomers.data[0];
        console.log("Found existing customer:", customer.id);
      } else {
        // Create new customer with idempotency key
        const idempotencyKey = `customer_${userId}_${Date.now()}`;

        customer = await stripe.customers.create(
          {
            email: userEmail,
            metadata: {
              supabase_user_id: userId,
            },
          },
          {
            idempotencyKey, // Prevents duplicate creation
          }
        );

        // Atomically update profile with customer ID
        const { error: profileError } = await supabase
          .from("profiles")
          .update({ stripe_customer_id: customer.id })
          .eq("id", userId)
          .is("stripe_customer_id", null); // Only update if not already set

        if (profileError) {
          console.error(
            "Failed to update profile with customer ID:",
            profileError
          );
          // Don't fail the request, but log for monitoring
        }

        console.log("Created new customer:", customer.id);
      }
    } catch (error) {
      console.error("Error handling customer:", error);
      throw new Error("Failed to create or retrieve customer");
    }

    // Add this after getting userId and before creating the checkout session (around line 120)

    // Check for existing active subscriptions - only block same-plan purchases
    try {
      const { data: existingSubscriptions, error: checkError } = await supabase
        .from("subscriptions")
        .select("*")
        .eq("user_id", userId)
        .in("status", ["active", "trial"])
        .single();

      if (checkError && checkError.code !== "PGRST116") {
        // PGRST116 is "no rows returned" which is what we want
        console.error("Error checking existing subscriptions:", checkError);
        throw new Error("Failed to check existing subscriptions");
      }

      if (existingSubscriptions) {
        // Get the plan type for the new subscription
        const newPlanType =
          "planType" in requestBody
            ? requestBody.planType
            : getPlanTypeFromPriceId(priceId);

        // Get existing plan type
        const existingPlanType = existingSubscriptions.plan_type;

        // Only block if trying to purchase the SAME plan
        if (existingPlanType === newPlanType) {
          console.log("User attempting to purchase same plan:", {
            existing: existingPlanType,
            new: newPlanType,
          });

          return new Response(
            JSON.stringify({
              error: `You already have an active ${existingPlanType} subscription. You cannot purchase the same plan again.`,
              errorCode: "DUPLICATE_SUBSCRIPTION",
              currentPlan: existingPlanType,
              existingSubscription: {
                planName: existingSubscriptions.plan_name,
                status: existingSubscriptions.status,
              },
            }),
            {
              headers: { ...corsHeaders, "Content-Type": "application/json" },
              status: 409, // Conflict status
            }
          );
        } else {
          // Different plan - allow upgrade/downgrade
          console.log("Allowing plan change:", {
            from: existingPlanType,
            to: newPlanType,
          });
          // Stripe will handle canceling the old subscription automatically
        }
      }
    } catch (error) {
      if (error.message.includes("already have an active subscription")) {
        throw error; // Re-throw our custom error
      }
      console.error("Unexpected error checking subscriptions:", error);
      throw new Error("Failed to validate subscription status");
    }

    // Create Stripe checkout session with the customer (no manual email entry)
    const session = await stripe.checkout.sessions.create({
      customer: customer.id, // Use customer ID instead of customer_email
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: "subscription",
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        userId: userId,
        userEmail: userEmail,
      },
      subscription_data: {
        metadata: {
          userId: userId,
          userEmail: userEmail,
        },
      },
      // Disable customer email collection since we already have it
      customer_update: {
        name: "auto",
      },
    });

    console.log("Checkout session created:", session.id);

    // Update all other Response objects to use corsHeaders(origin) instead of corsHeaders
    // For example:
    return new Response(
      JSON.stringify({
        sessionId: session.id,
        url: session.url,
      }),
      {
        headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Error creating checkout session:", error);
    return new Response(
      JSON.stringify({
        error: error.message || "Failed to create checkout session",
      }),
      {
        headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});

// Validate price IDs against allowed values
const ALLOWED_PRICE_IDS = {
  starter: Deno.env.get("STRIPE_TEST_STARTER_PRICE_ID"),
  professional: Deno.env.get("STRIPE_TEST_PROFESSIONAL_PRICE_ID"),
  enterprise: Deno.env.get("STRIPE_TEST_ENTERPRISE_PRICE_ID"),
};

function validatePriceId(priceId: string): boolean {
  return Object.values(ALLOWED_PRICE_IDS).includes(priceId);
}

// Remove these lines that are causing the error:
// if (!validatePriceId(priceId)) {
//   console.error(`Invalid price ID: ${priceId}`);
//   return new Response("Invalid price ID", {
//     status: 400,
//     headers: corsHeaders(origin),
//   });
// }
