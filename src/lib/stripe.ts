import { loadStripe } from "@stripe/stripe-js";
import { config } from "./config";
import { secureApiCall } from "./csrf";

// Initialize Stripe
export const stripePromise = loadStripe(config.stripe.publishableKey!);

// Stripe checkout function
export const createCheckoutSession = async (priceId: string) => {
  try {
    const response = await secureApiCall(
      `${config.supabase.url}/functions/v1/stripe-checkout`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${config.supabase.anonKey}`,
        },
        body: JSON.stringify({ priceId }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Failed to create checkout session");
    }

    const { url } = await response.json();
    return url;
  } catch (error) {
    console.error("Error creating checkout session:", error);
    throw error;
  }
};

// Redirect to Stripe Checkout
export const redirectToCheckout = async (sessionId: string) => {
  const stripe = await stripePromise;
  if (!stripe) {
    throw new Error("Stripe failed to load");
  }

  const { error } = await stripe.redirectToCheckout({ sessionId });
  if (error) {
    throw error;
  }
};
