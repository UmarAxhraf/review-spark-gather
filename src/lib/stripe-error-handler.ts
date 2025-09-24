import { toast } from "@/hooks/use-toast";

type StripeErrorCode =
  | "card_declined"
  | "expired_card"
  | "incorrect_cvc"
  | "processing_error"
  | "rate_limit"
  | "invalid_request_error"
  | "api_error"
  | "authentication_error"
  | "idempotency_error"
  | "invalid_grant"
  | string;

interface StripeError {
  type: string;
  code?: StripeErrorCode;
  message: string;
  param?: string;
  detail?: string;
}

// Improved error handling for Stripe API calls
export const handleStripeError = (error: any): string => {
  console.error("Stripe error:", error);

  // Handle Stripe API errors
  if (error?.type && error?.message) {
    const stripeError = error as StripeError;

    // Handle specific error codes with user-friendly messages
    switch (stripeError.code) {
      case "card_declined":
        return "Your card was declined. Please try a different payment method.";
      case "expired_card":
        return "Your card has expired. Please update your payment information.";
      case "incorrect_cvc":
        return "The security code (CVC) is incorrect. Please check and try again.";
      case "processing_error":
        return "An error occurred while processing your card. Please try again later.";
      case "rate_limit":
        return "Too many requests. Please try again later.";
      default:
        return (
          stripeError.message ||
          "An error occurred with your payment. Please try again."
        );
    }
  }

  // Handle network errors
  if (error instanceof Error) {
    if (
      error.message.includes("network") ||
      error.message.includes("connect")
    ) {
      return "Network error. Please check your internet connection and try again.";
    }
    return error.message;
  }

  // Generic error fallback
  return "An unexpected error occurred. Please try again later.";
};

// Helper to display Stripe errors in UI
export const showStripeError = (error: any) => {
  const errorMessage = handleStripeError(error);
  toast({
    title: "Payment Error",
    description: errorMessage,
    variant: "destructive",
  });
  return errorMessage;
};

// Log detailed error information for debugging
export const logStripeError = (context: string, error: any) => {
  console.error(`Stripe error in ${context}:`, {
    error,
    message: error?.message,
    type: error?.type,
    code: error?.code,
    requestId: error?.requestId,
    stack: error?.stack,
  });
};
