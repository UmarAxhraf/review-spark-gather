import React, { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useSupabaseSubscription } from "../contexts/SupabaseSubscriptionContext";
import { useDirectSubscription } from "../contexts/DirectSubscriptionContext";
import { getPlanByPriceId } from "../lib/stripe-direct";

const PaymentSuccess: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { refreshSubscription } = useSupabaseSubscription();
  const [isProcessing, setIsProcessing] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [verificationResult, setVerificationResult] = useState<any>(null);

  useEffect(() => {
    const verifyPayment = async () => {
      const sessionId = searchParams.get("session_id");

      if (!sessionId) {
        setError("No session ID found");
        setIsProcessing(false);
        return;
      }

      if (!user) {
        setError("User not authenticated");
        setIsProcessing(false);
        return;
      }

      try {
        // SECURE: Server-side verification
        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/verify-session`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${user.access_token}`,
            },
            body: JSON.stringify({ sessionId }),
          }
        );

        const result = await response.json();

        if (!response.ok || !result.success) {
          throw new Error(result.message || "Payment verification failed");
        }

        setVerificationResult(result);

        // Refresh subscription data from server
        await refreshSubscription();

        // Add a small delay to ensure subscription data is updated
        await new Promise((resolve) => setTimeout(resolve, 1000));

        // Refresh subscription data again to ensure it's up to date
        await refreshSubscription();

        setIsProcessing(false);

        // Redirect after successful verification
        setTimeout(() => {
          navigate("/dashboard?success=true");
        }, 1500); // Reduced from 3000ms to 1500ms for better UX
      } catch (error) {
        console.error("Payment verification error:", error);
        setError(
          error instanceof Error ? error.message : "Payment verification failed"
        );
        setIsProcessing(false);
      }
    };

    verifyPayment();
  }, [searchParams, user, refreshSubscription, navigate]);

  const { updateSubscription } = useDirectSubscription();

  useEffect(() => {
    const processPayment = async () => {
      const sessionId = searchParams.get("session_id");

      if (!sessionId) {
        setError("No session ID found");
        setIsProcessing(false);
        return;
      }

      try {
        // Get pending plan from localStorage
        const pendingPlan = localStorage.getItem("pending_plan");

        if (pendingPlan) {
          const { priceId, planName } = JSON.parse(pendingPlan);
          const plan = getPlanByPriceId(priceId);

          // Update subscription state
          updateSubscription({
            status: "active",
            plan: plan?.id || planName,
            customerId: sessionId, // Temporary - in real implementation, you'd get this from Stripe
          });

          // Clear pending plan
          localStorage.removeItem("pending_plan");
        }

        setIsProcessing(false);

        // Redirect to profile after 3 seconds
        setTimeout(() => {
          navigate("/profile");
        }, 3000);
      } catch (error) {
        console.error("Payment processing error:", error);
        setError("Failed to process payment");
        setIsProcessing(false);
      }
    };

    processPayment();
  }, [searchParams, updateSubscription, navigate]);

  if (isProcessing) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-green-500 mx-auto"></div>
          <h2 className="text-2xl font-bold mt-4">
            Processing your payment...
          </h2>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-red-600">Payment Error</h2>
          <p className="mt-2">{error}</p>
          <button
            onClick={() => navigate("/profile")}
            className="mt-4 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
          >
            Go to Profile
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="text-green-500 text-6xl mb-4">✓</div>
        <h2 className="text-2xl font-bold text-green-600">
          Payment Successful!
        </h2>
        <p className="mt-2">Your subscription has been activated.</p>
        <p className="text-sm text-gray-600 mt-2">
          Redirecting to your profile...
        </p>
      </div>
    </div>
  );
};

// Add a named export alongside the default export
export { PaymentSuccess };
export default PaymentSuccess;
