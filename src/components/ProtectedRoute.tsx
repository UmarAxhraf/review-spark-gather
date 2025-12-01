import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useSupabaseSubscription } from "@/contexts/SupabaseSubscriptionContext";
import { PageLoading } from "@/components/ui/page-loading";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, Crown, Calendar } from "lucide-react";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiresSubscription?: boolean;
  allowPublicAccess?: boolean; // For review submission pages
  fallbackDuringLoading?: React.ReactNode; // Optional route-specific loading UI
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requiresSubscription = true,
  allowPublicAccess = false,
  fallbackDuringLoading,
}) => {
  const { user, loading, session, verifySession } = useAuth();
  const {
    canAccessApp,
    loading: subscriptionLoading,
    getAccessMessage,
    subscription,
    getSubscriptionStatus,
    isAdmin,
  } = useSupabaseSubscription();
  const location = useLocation();
  const navigate = useNavigate();

  // Simple activity tracking
  useEffect(() => {
    if (session) {
      const currentTime = Date.now();
      localStorage.setItem("lastActivity", currentTime.toString());
    }
  }, [session]);

  // Public access routes don't need auth
  if (allowPublicAccess) {
    return <>{children}</>;
  }

  // Show loading while checking auth
  if (loading) {
    if (fallbackDuringLoading) return <>{fallbackDuringLoading}</>;
    return <PageLoading />;
  }

  // If no user or session, redirect to login
  if (!user || !session) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // If subscription is required, check subscription status
  if (requiresSubscription) {
    // Still loading subscription data
    if (subscriptionLoading) {
      if (fallbackDuringLoading) return <>{fallbackDuringLoading}</>;
      return <PageLoading />;
    }

    // User doesn't have access - render the same card as SubscriptionGuard
    if (!canAccessApp) {
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
    }
  }

  return <>{children}</>;
};

export default ProtectedRoute;
