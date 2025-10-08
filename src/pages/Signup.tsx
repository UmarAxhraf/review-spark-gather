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
import { Star, Eye, EyeOff } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { validateAndSanitize, validationRules } from "../lib/validation";

// Enhanced error handling utility
const getSignupErrorMessage = (error) => {
  if (!error) return "An unexpected error occurred. Please try again.";

  const errorMessage = error.message || "";
  const errorCode = error.error_code || error.code || "";

  // Handle specific error codes first
  switch (errorCode) {
    case "email_address_invalid":
      return "Please enter a valid email address.";
    case "weak_password":
      return "Password must be at least 6 characters long with a mix of letters and numbers.";
    case "signup_disabled":
      return "Account creation is temporarily disabled. Please try again later.";
    case "email_rate_limit_exceeded":
      return "Too many signup attempts. Please wait a few minutes before trying again.";
    case "captcha_failed":
      return "Security verification failed. Please refresh the page and try again.";
  }

  // Handle message-based error detection
  const lowerMessage = errorMessage.toLowerCase();

  // Network/connectivity issues
  if (
    errorMessage.includes("Failed to fetch") ||
    errorMessage.includes("NetworkError") ||
    errorMessage.includes("TypeError: fetch") ||
    lowerMessage.includes("network") ||
    lowerMessage.includes("connection")
  ) {
    return "Unable to connect to our servers. Please check your internet connection and try again.";
  }

  // Rate limiting
  if (
    lowerMessage.includes("rate limit") ||
    lowerMessage.includes("too many requests") ||
    lowerMessage.includes("rate_limit_exceeded")
  ) {
    return "Too many signup attempts. Please wait a few minutes before trying again.";
  }

  // Email already exists (comprehensive checking)
  if (
    lowerMessage.includes("already registered") ||
    lowerMessage.includes("user already exists") ||
    lowerMessage.includes("email already taken") ||
    lowerMessage.includes("email already in use") ||
    lowerMessage.includes("duplicate") ||
    errorCode === "email_address_not_available"
  ) {
    return "An account with this email already exists. Please sign in instead or use a different email address.";
  }

  // Email validation issues
  if (
    lowerMessage.includes("invalid email") ||
    lowerMessage.includes("email format") ||
    lowerMessage.includes("invalid_email") ||
    lowerMessage.includes("malformed email")
  ) {
    return "Please enter a valid email address in the correct format (example@domain.com).";
  }

  // Password issues
  if (lowerMessage.includes("password")) {
    if (
      lowerMessage.includes("weak") ||
      lowerMessage.includes("short") ||
      lowerMessage.includes("simple") ||
      lowerMessage.includes("common")
    ) {
      return "Password must be at least 6 characters long and contain a mix of letters, numbers, and symbols for better security.";
    }
    if (lowerMessage.includes("long")) {
      return "Password is too long. Please use a password with fewer than 72 characters.";
    }
  }

  // Email confirmation issues
  if (
    lowerMessage.includes("email confirmation") ||
    lowerMessage.includes("confirmation disabled") ||
    lowerMessage.includes("email_confirmation_required")
  ) {
    return "Email confirmation is required but currently unavailable. Please try again later or contact support.";
  }

  // CAPTCHA or security issues
  if (
    lowerMessage.includes("captcha") ||
    lowerMessage.includes("security") ||
    lowerMessage.includes("verification") ||
    lowerMessage.includes("suspicious")
  ) {
    return "Security verification failed. Please refresh the page and try again.";
  }

  // Server errors (5xx)
  if (
    lowerMessage.includes("500") ||
    lowerMessage.includes("502") ||
    lowerMessage.includes("503") ||
    lowerMessage.includes("server error") ||
    lowerMessage.includes("internal error")
  ) {
    return "Our servers are temporarily unavailable. Please try again in a few minutes.";
  }

  // Service unavailable
  if (
    lowerMessage.includes("503") ||
    lowerMessage.includes("service unavailable") ||
    lowerMessage.includes("maintenance")
  ) {
    return "Service is temporarily unavailable for maintenance. Please try again shortly.";
  }

  // Domain or email provider issues
  if (
    lowerMessage.includes("domain") ||
    lowerMessage.includes("email provider") ||
    lowerMessage.includes("blocked")
  ) {
    return "There's an issue with your email domain. Please try a different email address or contact support.";
  }

  // Return original error message if it's user-friendly, otherwise provide generic fallback
  if (
    errorMessage.length > 0 &&
    errorMessage.length < 200 &&
    !errorMessage.includes("Error:")
  ) {
    return errorMessage;
  }

  // Enhanced fallback with more helpful information
  return "Unable to create account. Please verify your information is correct and try again. If the problem continues, please contact our support team.";
};

// Enhanced success message logic
const getSuccessMessage = (selectedPlan) => {
  const baseMessage =
    "Account created successfully! Please check your email to confirm your account";

  if (selectedPlan) {
    return `${baseMessage}, then you'll be redirected to complete your ${getPlanDisplayName(
      selectedPlan
    )} subscription.`;
  }

  return `${baseMessage} before signing in.`;
};

// Helper function for plan display names
const getPlanDisplayName = (planType) => {
  const names = {
    starter: "Review Starter",
    professional: "Review Pro",
    enterprise: "Review Enterprise",
  };
  return names[planType] || planType;
};

// Enhanced validation error formatter
const formatValidationError = (field, error) => {
  const fieldNames = {
    email: "Email",
    password: "Password",
    confirmPassword: "Confirm Password",
    companyName: "Company Name",
  };

  const fieldName =
    fieldNames[field] || field.charAt(0).toUpperCase() + field.slice(1);
  return `${fieldName}: ${error}`;
};

const Signup = () => {
  const [formData, setFormData] = useState({
    companyName: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});

  const { signUp, user } = useAuth();
  const { createSubscription } = useSubscription();
  const navigate = useNavigate();

  // Updated Stripe checkout handler using SubscriptionContext
  const handleStripeCheckout = async (
    planType: "starter" | "professional" | "enterprise"
  ) => {
    try {
      if (!user) {
        toast.error("Please complete signup first");
        return;
      }

      await createSubscription(planType);
    } catch (error) {
      console.error("Error creating checkout session:", error);
      toast.error("Failed to start checkout process. Please try again.");
    }
  };

  useEffect(() => {
    if (user) {
      // Check for stored plan after successful signup/login
      const selectedPlan = sessionStorage.getItem("selectedPlan");
      if (selectedPlan) {
        sessionStorage.removeItem("selectedPlan");
        // Trigger checkout for the stored plan using SubscriptionContext
        handleStripeCheckout(
          selectedPlan as "starter" | "professional" | "enterprise"
        );
      } else {
        navigate("/dashboard");
      }
    }
  }, [user, navigate]);

  // Enhanced form validation with real-time feedback
  const validateField = (field, value) => {
    const rules = {
      email: validationRules.email,
      password: validationRules.password,
      confirmPassword: { required: true },
      companyName: validationRules.companyName,
    };

    if (rules[field]) {
      const validation = validateAndSanitize(
        { [field]: value },
        { [field]: rules[field] }
      );
      return validation.errors[field] || null;
    }
    return null;
  };

  // Real-time validation on blur
  const handleBlur = (field) => {
    const error = validateField(field, formData[field]);
    setValidationErrors((prev) => ({
      ...prev,
      [field]: error,
    }));

    // Special case for confirm password
    if (
      field === "confirmPassword" &&
      formData.password &&
      formData.confirmPassword
    ) {
      if (formData.password !== formData.confirmPassword) {
        setValidationErrors((prev) => ({
          ...prev,
          confirmPassword: "Passwords don't match",
        }));
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const rules = {
      email: validationRules.email,
      password: validationRules.password,
      confirmPassword: { required: true },
      companyName: validationRules.companyName,
    };

    const validation = validateAndSanitize(formData, rules);

    if (!validation.isValid) {
      // Show the first validation error with enhanced formatting
      const firstErrorField = Object.keys(validation.errors)[0];
      const firstError = validation.errors[firstErrorField];

      toast.error(formatValidationError(firstErrorField, firstError), {
        duration: 5000,
      });

      // Set all validation errors for UI display
      setValidationErrors(validation.errors);
      return;
    }

    // Password confirmation check with specific message
    if (
      validation.sanitizedData.password !==
      validation.sanitizedData.confirmPassword
    ) {
      const errorMessage =
        "Passwords don't match. Please make sure both password fields are identical.";
      toast.error(errorMessage);
      setValidationErrors({ confirmPassword: "Passwords don't match" });
      return;
    }

    // Clear validation errors if all checks pass
    setValidationErrors({});
    setIsLoading(true);

    try {
      // Check network connectivity before attempting signup
      if (!navigator.onLine) {
        toast.error(
          "You appear to be offline. Please check your internet connection and try again."
        );
        return;
      }

      const { error } = await signUp(
        validation.sanitizedData.email,
        validation.sanitizedData.password,
        validation.sanitizedData.companyName
      );

      if (error) {
        const errorMessage = getSignupErrorMessage(error);
        toast.error(errorMessage, {
          duration: 6000, // Longer duration for error messages
        });
      } else {
        // Success handling with context-aware messaging
        const selectedPlan = sessionStorage.getItem("selectedPlan");
        const successMessage = getSuccessMessage(selectedPlan);

        toast.success(successMessage, {
          duration: 7000, // Longer duration for important success messages
        });

        // Additional helpful information for users with selected plans
        if (selectedPlan) {
          setTimeout(() => {
            toast.info(
              "Check your spam folder if you don't see the confirmation email within a few minutes.",
              {
                duration: 5000,
              }
            );
          }, 2000);
        }

        // Navigate to login page
        navigate("/login");
      }
    } catch (error) {
      // Enhanced error logging for debugging
      console.error("Signup error:", error);

      // Network-specific error handling
      if (!navigator.onLine) {
        toast.error(
          "You appear to be offline. Please check your internet connection and try again."
        );
      } else if (
        error.name === "TypeError" &&
        error.message.includes("fetch")
      ) {
        toast.error(
          "Network error occurred. Please check your connection and try again."
        );
      } else {
        // Generic fallback with support contact suggestion
        toast.error(
          "An unexpected error occurred during account creation. Please try again or contact support if the issue persists.",
          {
            duration: 7000,
          }
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e) => {
    const { id, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [id]: value,
    }));

    // Clear validation error when user starts typing
    if (validationErrors[id]) {
      setValidationErrors((prev) => ({
        ...prev,
        [id]: null,
      }));
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const toggleConfirmPasswordVisibility = () => {
    setShowConfirmPassword(!showConfirmPassword);
  };

  // Helper function to show additional tips
  const showEmailTips = () => {
    toast.info(
      "Email confirmation tips: Check your spam folder, add our domain to contacts, and allow up to 5 minutes for delivery.",
      {
        duration: 8000,
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
          <CardTitle className="text-2xl">Create Your Account</CardTitle>
          <CardDescription>
            Start collecting reviews in minutes
            <button
              type="button"
              onClick={showEmailTips}
              className="ml-2 text-blue-600 hover:text-blue-800 text-sm underline"
            >
              Need help with email confirmation?
            </button>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="companyName">Company Name</Label>
              <Input
                id="companyName"
                placeholder="Enter your company name"
                value={formData.companyName}
                onChange={handleChange}
                onBlur={() => handleBlur("companyName")}
                required
                disabled={isLoading}
                className={
                  validationErrors.companyName
                    ? "border-red-500 focus:border-red-500"
                    : ""
                }
              />
              {validationErrors.companyName && (
                <p className="text-sm text-red-600">
                  {validationErrors.companyName}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="Enter your email"
                value={formData.email}
                onChange={handleChange}
                onBlur={() => handleBlur("email")}
                required
                disabled={isLoading}
                className={
                  validationErrors.email
                    ? "border-red-500 focus:border-red-500"
                    : ""
                }
              />
              {validationErrors.email && (
                <p className="text-sm text-red-600">{validationErrors.email}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Create a password (min. 6 characters)"
                  value={formData.password}
                  onChange={handleChange}
                  onBlur={() => handleBlur("password")}
                  required
                  disabled={isLoading}
                  className={`pr-10 ${
                    validationErrors.password
                      ? "border-red-500 focus:border-red-500"
                      : ""
                  }`}
                />
                <button
                  type="button"
                  onClick={togglePasswordVisibility}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none focus:text-gray-700 disabled:opacity-50"
                  disabled={isLoading}
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
              {validationErrors.password && (
                <p className="text-sm text-red-600">
                  {validationErrors.password}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="Confirm your password"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  onBlur={() => handleBlur("confirmPassword")}
                  required
                  disabled={isLoading}
                  className={`pr-10 ${
                    validationErrors.confirmPassword
                      ? "border-red-500 focus:border-red-500"
                      : ""
                  }`}
                />
                <button
                  type="button"
                  onClick={toggleConfirmPasswordVisibility}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none focus:text-gray-700 disabled:opacity-50"
                  disabled={isLoading}
                  tabIndex={-1}
                  aria-label={
                    showConfirmPassword
                      ? "Hide confirm password"
                      : "Show confirm password"
                  }
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
              {validationErrors.confirmPassword && (
                <p className="text-sm text-red-600">
                  {validationErrors.confirmPassword}
                </p>
              )}
            </div>

            <Button
              type="submit"
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
              disabled={isLoading}
            >
              {isLoading ? "Creating Account..." : "Create Account"}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              Already have an account?{" "}
              <Link to="/login" className="text-blue-600 hover:underline">
                Sign in
              </Link>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Signup;
