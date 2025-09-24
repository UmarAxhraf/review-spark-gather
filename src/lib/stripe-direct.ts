import { loadStripe } from "@stripe/stripe-js";

// Initialize Stripe with your publishable key
const publishableKey = import.meta.env.VITE_STRIPE_TEST_PUBLISHABLE_KEY;

if (!publishableKey) {
  console.error(
    "VITE_STRIPE_TEST_PUBLISHABLE_KEY is not defined in environment variables"
  );
  throw new Error(
    "Stripe publishable key is required. Please add VITE_STRIPE_TEST_PUBLISHABLE_KEY to your .env file."
  );
}

const stripePromise = loadStripe(publishableKey);

export interface PricingPlan {
  id: string;
  name: string;
  price: number;
  priceId: string;
  features: string[];
}

// Your Stripe price IDs (replace with your actual price IDs)
export const PRICING_PLANS: PricingPlan[] = [
  {
    id: "basic",
    name: "Basic",
    price: 29,
    priceId: "price_1S3FIlGwtmV8ojqhRDPQZop9",
    features: ["Up to 100 reviews", "Basic analytics", "Email support"],
  },
  {
    id: "pro",
    name: "Pro",
    price: 79,
    priceId: "price_1S3FJrGwtmV8ojqhLXwYwoXL",
    features: [
      "Unlimited reviews",
      "Advanced analytics",
      "Priority support",
      "Custom branding",
    ],
  },
  {
    id: "enterprise",
    name: "Enterprise",
    price: 199,
    priceId: "price_1S3FKPGwtmV8ojqhuKKrrHd4",
    features: [
      "Everything in Pro",
      "API access",
      "Dedicated support",
      "Custom integrations",
    ],
  },
];

export const createDirectCheckout = async (
  priceId: string,
  planName: string
) => {
  try {
    const stripe = await stripePromise;

    if (!stripe) {
      throw new Error("Stripe failed to initialize");
    }

    // Store the plan info for later use
    localStorage.setItem("pending_plan", JSON.stringify({ priceId, planName }));

    // Redirect to Stripe Checkout
    const { error } = await stripe.redirectToCheckout({
      lineItems: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: "subscription",
      successUrl: `${window.location.origin}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${window.location.origin}/pricing`,
      // Removed allowPromotionCodes - not supported by redirectToCheckout
    });

    if (error) {
      console.error("Stripe checkout error:", error);
      throw error;
    }
  } catch (error) {
    console.error("Failed to create checkout session:", error);
    throw error;
  }
};

// Helper function to get plan by price ID
export const getPlanByPriceId = (priceId: string): PricingPlan | undefined => {
  return PRICING_PLANS.find((plan) => plan.priceId === priceId);
};

// Helper function to get plan by ID
export const getPlanById = (id: string): PricingPlan | undefined => {
  return PRICING_PLANS.find((plan) => plan.id === id);
};

// Add Stripe Customer Portal functionality
// Replace the createCustomerPortal function with:
export const createCustomerPortal = async (customerId: string) => {
  try {
    const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-portal-session`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
      },
      body: JSON.stringify({ customerId })
    });

    if (!response.ok) {
      throw new Error('Failed to create portal session');
    }

    const { url } = await response.json();
    window.location.href = url;
  } catch (error) {
    console.error("Failed to create customer portal session:", error);
    throw error;
  }
};

// Function to get Stripe instance (for other uses)
export const getStripe = async () => {
  return await stripePromise;
};

export const createCheckoutSession = async (
  priceId: string,
  userId: string,
  userEmail: string
) => {
  // Check for existing active subscription first
  const { data: hasActiveSubscription, error: checkError } = await supabase
    .rpc('check_existing_active_subscription', { p_user_id: userId });

  if (checkError) {
    throw new Error('Failed to check existing subscription');
  }

  if (hasActiveSubscription) {
    throw new Error('You already have an active subscription. Please manage your subscription through the customer portal.');
  }

  try {
    const stripe = await stripePromise;

    if (!stripe) {
      throw new Error("Stripe failed to initialize");
    }

    // Store the plan info for later use
    localStorage.setItem("pending_plan", JSON.stringify({ priceId, planName }));

    // Redirect to Stripe Checkout
    const { error } = await stripe.redirectToCheckout({
      lineItems: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: "subscription",
      successUrl: `${window.location.origin}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${window.location.origin}/pricing`,
      // Removed allowPromotionCodes - not supported by redirectToCheckout
    });

    if (error) {
      console.error("Stripe checkout error:", error);
      throw error;
    }
  } catch (error) {
    console.error("Failed to create checkout session:", error);
    throw error;
  }
};
