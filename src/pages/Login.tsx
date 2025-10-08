import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Link, useNavigate } from "react-router-dom";
import { Star, Eye, EyeOff, AlertCircle } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { supabase } from "@/integrations/supabase/client";
import { useSubscription } from "@/contexts/SubscriptionContext";

// Enhanced error handling utility for login
const getLoginErrorMessage = (error) => {
  if (!error) return "An unexpected error occurred. Please try again.";

  const errorMessage = error.message || "";
  const errorCode = error.error_code || error.code || "";
  const lowerMessage = errorMessage.toLowerCase();

  // Handle specific error codes first
  switch (errorCode) {
    case "invalid_credentials":
    case "invalid_grant":
      return "Invalid email or password. Please check your credentials and try again.";
    case "email_not_confirmed":
      return "Please check your email and click the confirmation link before signing in.";
    case "too_many_requests":
    case "rate_limit_exceeded":
      return "Too many login attempts. Please wait a few minutes before trying again.";
    case "account_locked":
    case "user_locked":
      return "Your account has been temporarily locked for security. Please try again later or reset your password.";
    case "captcha_required":
      return "Security verification required. Please refresh the page and try again.";
    case "signup_disabled":
      return "Account access is temporarily disabled. Please contact support for assistance.";
    case "weak_password":
      return "Your password needs to be updated for security. Please use the 'Forgot Password' link.";
  }

  // Handle message-based error detection

  // Network/connectivity issues
  if (
    errorMessage.includes("Failed to fetch") ||
    errorMessage.includes("NetworkError") ||
    errorMessage.includes("TypeError: fetch") ||
    lowerMessage.includes("network") ||
    lowerMessage.includes("connection") ||
    lowerMessage.includes("timeout")
  ) {
    return "Unable to connect to our servers. Please check your internet connection and try again.";
  }

  // Invalid credentials (comprehensive checking)
  if (
    lowerMessage.includes("invalid login credentials") ||
    lowerMessage.includes("invalid credentials") ||
    lowerMessage.includes("wrong password") ||
    lowerMessage.includes("incorrect password") ||
    lowerMessage.includes("authentication failed") ||
    lowerMessage.includes("login failed") ||
    lowerMessage.includes("invalid email") ||
    lowerMessage.includes("user not found")
  ) {
    return "Invalid email or password. Please check your credentials and try again.";
  }

  // Email confirmation issues
  if (
    lowerMessage.includes("email not confirmed") ||
    lowerMessage.includes("confirm your email") ||
    lowerMessage.includes("verification required") ||
    lowerMessage.includes("account not verified")
  ) {
    return "Please check your email and click the confirmation link before signing in. Check your spam folder if needed.";
  }

  // Rate limiting and security
  if (
    lowerMessage.includes("too many requests") ||
    lowerMessage.includes("rate limit") ||
    lowerMessage.includes("rate_limit") ||
    lowerMessage.includes("many attempts") ||
    lowerMessage.includes("try again later")
  ) {
    return "Too many login attempts detected. Please wait 10-15 minutes before trying again, or use 'Forgot Password' to reset your credentials.";
  }

  // Account locked/suspended
  if (
    lowerMessage.includes("account locked") ||
    lowerMessage.includes("account suspended") ||
    lowerMessage.includes("account disabled") ||
    lowerMessage.includes("user locked") ||
    lowerMessage.includes("temporarily locked")
  ) {
    return "Your account has been temporarily locked for security reasons. Please reset your password or contact support.";
  }

  // CAPTCHA or security verification
  if (
    lowerMessage.includes("captcha") ||
    lowerMessage.includes("security") ||
    lowerMessage.includes("verification") ||
    lowerMessage.includes("suspicious activity")
  ) {
    return "Security verification required due to unusual activity. Please refresh the page and try again.";
  }

  // Server errors
  if (
    lowerMessage.includes("500") ||
    lowerMessage.includes("502") ||
    lowerMessage.includes("503") ||
    lowerMessage.includes("server error") ||
    lowerMessage.includes("internal error") ||
    lowerMessage.includes("service unavailable")
  ) {
    return "Our authentication service is temporarily unavailable. Please try again in a few minutes.";
  }

  // Session/token issues
  if (
    lowerMessage.includes("session") ||
    lowerMessage.includes("token") ||
    lowerMessage.includes("expired") ||
    lowerMessage.includes("invalid session")
  ) {
    return "Your session has expired. Please refresh the page and try signing in again.";
  }

  // Two-factor authentication
  if (
    lowerMessage.includes("2fa") ||
    lowerMessage.includes("two factor") ||
    lowerMessage.includes("mfa") ||
    lowerMessage.includes("multi-factor")
  ) {
    return "Two-factor authentication required. Please enter your verification code.";
  }

  // Password reset required
  if (
    lowerMessage.includes("password reset") ||
    lowerMessage.includes("reset required") ||
    lowerMessage.includes("password expired")
  ) {
    return "Your password needs to be reset for security. Please use the 'Forgot Password' link below.";
  }

  // Return original message if it's user-friendly, otherwise provide generic fallback
  if (
    errorMessage.length > 0 &&
    errorMessage.length < 150 &&
    !errorMessage.includes("Error:")
  ) {
    return errorMessage;
  }

  // Enhanced fallback with actionable guidance
  return "Unable to sign in. Please verify your email and password are correct, or use 'Forgot Password' if you need help accessing your account.";
};

// Helper function to determine if error suggests account issues
const suggestPasswordReset = (error) => {
  if (!error) return false;

  const message = error.message?.toLowerCase() || "";
  return (
    message.includes("invalid login credentials") ||
    message.includes("invalid credentials") ||
    message.includes("authentication failed") ||
    message.includes("account locked") ||
    message.includes("too many attempts")
  );
};

// Helper function to suggest email confirmation
const suggestEmailConfirmation = (error) => {
  if (!error) return false;

  const message = error.message?.toLowerCase() || "";
  return (
    message.includes("email not confirmed") ||
    message.includes("confirm your email") ||
    message.includes("verification required")
  );
};

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loginAttempts, setLoginAttempts] = useState(0);
  const [lastAttemptTime, setLastAttemptTime] = useState(null);
  const [helpToastShown, setHelpToastShown] = useState(false);

  const { signIn, user } = useAuth();
  const { createSubscription } = useSubscription();
  const navigate = useNavigate();

  // Rate limiting protection
  const isRateLimited = () => {
    if (loginAttempts >= 5 && lastAttemptTime) {
      const timeDiff = Date.now() - lastAttemptTime;
      return timeDiff < 300000; // 5 minutes
    }
    return false;
  };

  // Updated Stripe checkout handler
  const handleStripeCheckout = async (
    planType: "starter" | "professional" | "enterprise"
  ) => {
    try {
      if (!user) {
        toast.error("Please log in first to continue with your subscription.");
        return;
      }

      await createSubscription(planType);
    } catch (error) {
      console.error("Error creating checkout session:", error);
      toast.error(
        "Failed to start checkout process. Please try again or contact support.",
        {
          duration: 6000,
        }
      );
    }
  };

  useEffect(() => {
    if (user) {
      // Reset login attempts on successful login
      setLoginAttempts(0);
      setLastAttemptTime(null);

      // Check for stored plan after successful login
      const selectedPlan = sessionStorage.getItem("selectedPlan");
      if (selectedPlan) {
        sessionStorage.removeItem("selectedPlan");

        toast.info(
          `Redirecting you to complete your ${selectedPlan} subscription...`,
          {
            duration: 4000,
          }
        );

        // Small delay to let the user see the message
        setTimeout(() => {
          handleStripeCheckout(
            selectedPlan as "starter" | "professional" | "enterprise"
          );
        }, 1000);
      } else {
        // Get the intended destination from location state or default to dashboard
        const location = window.location;
        const from = location.state?.from?.pathname || "/dashboard";
        navigate(from);
      }
    }
  }, [user, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Check for rate limiting
    if (isRateLimited()) {
      const remainingTime = Math.ceil(
        (300000 - (Date.now() - lastAttemptTime)) / 60000
      );
      toast.error(
        `Too many login attempts. Please wait ${remainingTime} more minute(s) before trying again.`,
        {
          duration: 6000,
        }
      );
      return;
    }

    // Check network connectivity
    if (!navigator.onLine) {
      toast.error(
        "You appear to be offline. Please check your internet connection and try again."
      );
      return;
    }

    // Basic validation
    if (!email || !password) {
      toast.error("Please enter both email and password.");
      return;
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast.error("Please enter a valid email address.");
      return;
    }

    setIsLoading(true);

    try {
      const { error } = await signIn(email, password);

      if (error) {
        // Track failed attempts
        setLoginAttempts((prev) => prev + 1);
        setLastAttemptTime(Date.now());

        const errorMessage = getLoginErrorMessage(error);

        // Show main error message
        toast.error(errorMessage, {
          duration: 7000,
        });

        // Provide helpful follow-up actions based on error type
        if (suggestPasswordReset(error)) {
          setTimeout(() => {
            toast.info(
              "Having trouble? Try resetting your password or contact support for help.",
              {
                duration: 6000,
                dismissible: true,
                closeButton: true,
                action: {
                  label: "Reset Password",
                  onClick: () => navigate("/forgot-password"),
                },
              }
            );
          }, 2000);
        } else if (suggestEmailConfirmation(error)) {
          setTimeout(() => {
            toast.info(
              "Need to resend confirmation email? Contact support for assistance.",
              {
                duration: 6000,
                dismissible: true,
                closeButton: true,
              }
            );
          }, 2000);
        }

        // Show rate limiting warning after multiple attempts
        if (loginAttempts >= 3) {
          setTimeout(() => {
            toast.warning(
              "Multiple failed attempts detected. Your account will be temporarily locked after too many tries for security.",
              {
                duration: 8000,
                dismissible: true,
                closeButton: true,
              }
            );
          }, 3000);
        }
      } else {
        // Successful login
        setLoginAttempts(0);
        setLastAttemptTime(null);

        toast.success("Welcome back! Successfully signed in.", {
          duration: 4000,
        });

        // Navigation will be handled by useEffect after user state updates
      }
    } catch (error) {
      console.error("Login error:", error);

      // Handle different types of unexpected errors
      if (!navigator.onLine) {
        toast.error(
          "Connection lost during sign in. Please check your internet and try again."
        );
      } else if (
        error.name === "TypeError" &&
        error.message.includes("fetch")
      ) {
        toast.error(
          "Network error occurred. Please check your connection and try again."
        );
      } else {
        toast.error(
          "An unexpected error occurred during sign in. Please try again or contact support if the issue continues.",
          {
            duration: 7000,
          }
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  // Helper function to show account help with proper dismissal
  const showAccountHelp = () => {
    // Prevent multiple help toasts
    if (helpToastShown) {
      return;
    }

    setHelpToastShown(true);

    // Dismiss any existing help toasts first
    toast.dismiss();

    toast.info(
      "Account issues? Try: 1) Check email confirmation, 2) Reset password, 3) Clear browser cache, 4) Contact support",
      {
        duration: 8000,
        dismissible: true,
        closeButton: true,
        action: {
          label: "Got it",
          onClick: () => {
            toast.dismiss();
            setHelpToastShown(false);
          },
        },
        onDismiss: () => {
          setHelpToastShown(false);
        },
      }
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex items-center justify-center space-x-2 mb-4">
            <div className="h-8 w-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
              <Star className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-bold text-gray-900">Syncreviews</span>
          </div>
          <CardTitle className="text-2xl">Welcome Back</CardTitle>
          <CardDescription className="flex items-center justify-center gap-2">
            Sign in to your account to continue
            <button
              type="button"
              onClick={showAccountHelp}
              className="text-blue-600 hover:text-blue-800 p-1 rounded-full hover:bg-blue-50"
              title="Need help with your account?"
            >
              <AlertCircle className="h-4 w-4" />
            </button>
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Rate limiting warning */}
          {loginAttempts >= 3 && (
            <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-md">
              <div className="flex items-center gap-2 text-amber-700">
                <AlertCircle className="h-4 w-4" />
                <span className="text-sm">
                  Multiple login attempts detected. Account will be temporarily
                  locked after too many failed tries.
                </span>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value.trim())}
                required
                disabled={isLoading || isRateLimited()}
                className="transition-colors"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={isLoading || isRateLimited()}
                  className="pr-10 transition-colors"
                />
                <button
                  type="button"
                  onClick={togglePasswordVisibility}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none focus:text-gray-700 disabled:opacity-50"
                  disabled={isLoading || isRateLimited()}
                  tabIndex={-1}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:opacity-50"
              disabled={isLoading || isRateLimited()}
            >
              {isLoading ? (
                <div className="flex items-center justify-center gap-2">
                  <LoadingSpinner size="sm" className="text-white" />
                  <span>Signing in...</span>
                </div>
              ) : isRateLimited() ? (
                "Please Wait..."
              ) : (
                "Sign In"
              )}
            </Button>
          </form>

          <div className="mt-4 text-center">
            <Link
              to="/forgot-password"
              className="text-blue-600 hover:underline text-sm hover:text-blue-800 transition-colors"
            >
              Forgot your password?
            </Link>
          </div>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              Don't have an account?{" "}
              <Link
                to="/signup"
                className="text-blue-600 hover:underline hover:text-blue-800 transition-colors"
              >
                Sign up
              </Link>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Login;
