import React, { useEffect } from "react";
import { useSupabaseSubscription } from "@/contexts/SupabaseSubscriptionContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, Crown, Clock, Calendar } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

interface SubscriptionGuardProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  showTrialWarning?: boolean;
}

export const SubscriptionGuard: React.FC<SubscriptionGuardProps> = ({
  children,
  fallback,
  showTrialWarning = true,
}) => {
  const {
    canAccessApp,
    loading,
    isTrialing,
    isAdmin,
    daysUntilExpiry,
    getAccessMessage,
    getSubscriptionStatus,
    subscription,
  } = useSupabaseSubscription();
  const navigate = useNavigate();
  const location = useLocation();

  // Check for success parameter in URL which indicates a successful payment
  const urlParams = new URLSearchParams(location.search);
  const hasSuccessParam = urlParams.get("success") === "true";

  // If we have a success parameter, allow access temporarily
  const allowTemporaryAccess = hasSuccessParam;

  // Effect to enforce access restrictions on every location change (including back button)
  useEffect(() => {
    // Skip if still loading
    if (loading) return;
    
    // Skip if on profile page and subscription is canceled (this is allowed)
    const isCanceled = subscription?.subscription_status === "canceled";
    const isProfilePage = location.pathname === "/profile";
    if (isCanceled && isProfilePage) return;
    
    // If user doesn't have access and no temporary access, redirect to profile
    if (!canAccessApp && !allowTemporaryAccess) {
      navigate("/profile");
    }
  }, [canAccessApp, loading, location, navigate, subscription, allowTemporaryAccess]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Allow access if canAccessApp OR we have temporary access from successful payment
  // OR if this is the profile page and user has a canceled subscription
  const isCanceled = subscription?.subscription_status === "canceled";
  const isProfilePage = location.pathname === "/profile";

  if (canAccessApp || allowTemporaryAccess || (isCanceled && isProfilePage)) {
    return (
      <>
        {children}
        {/* Show trial warning */}
        {showTrialWarning &&
          isTrialing &&
          daysUntilExpiry <= 3 &&
          daysUntilExpiry > 0 && (
            <div className="fixed bottom-4 right-4 z-50">
              {/* ... trial warning UI ... */}
            </div>
          )}
        {/* Show canceled subscription warning if on profile page */}
        {isCanceled && isProfilePage && (
          <div className="fixed bottom-4 right-4 z-50">
            <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 rounded shadow-md">
              <div className="flex items-center">
                <AlertTriangle className="h-5 w-5 mr-2" />
                <p>
                  Your subscription has been canceled. You can only access this
                  page.
                  <br />
                  <Button
                    variant="link"
                    className="p-0 h-auto text-yellow-700 underline"
                    onClick={() => navigate("/profile?tab=subscription")}
                  >
                    Renew your subscription
                  </Button>
                </p>
              </div>
            </div>
          </div>
        )}
      </>
    );
  }

  if (fallback) {
    return <>{fallback}</>;
  }

  // Default blocked access UI
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
            <AlertTriangle className="h-6 w-6 text-red-600" />
          </div>
          <CardTitle className="text-xl font-semibold text-gray-900">
            Access Restricted
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <p className="text-gray-600">{getAccessMessage()}</p>

          {/* Show subscription status */}
          <div className="bg-gray-50 p-3 rounded-lg">
            <div className="flex items-center justify-center gap-2 text-sm">
              <Calendar className="h-4 w-4" />
              <span className="font-medium">Status:</span>
              <span
                className={`px-2 py-1 rounded text-xs font-medium ${
                  getSubscriptionStatus() === "Active"
                    ? "bg-green-100 text-green-800"
                    : getSubscriptionStatus() === "Trial"
                    ? "bg-blue-100 text-blue-800"
                    : "bg-red-100 text-red-800"
                }`}
              >
                {getSubscriptionStatus()}
              </span>
            </div>
            {subscription?.plan_name && (
              <div className="mt-1 text-xs text-gray-500">
                Plan: {subscription.plan_name}
              </div>
            )}
          </div>

          {isAdmin && (
            <div className="flex items-center justify-center gap-2 text-sm text-purple-600 bg-purple-50 p-2 rounded">
              <Crown className="h-4 w-4" />
              Admin Access Detected
            </div>
          )}

          <div className="space-y-2">
            <Button onClick={() => navigate("/")} className="w-full">
              View Pricing Plans
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate("/profile")}
              className="w-full"
            >
              View Profile
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
