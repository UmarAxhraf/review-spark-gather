import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useSupabaseSubscription } from "@/contexts/SupabaseSubscriptionContext";
import { PageLoading } from "@/components/ui/page-loading";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Shield, AlertTriangle } from "lucide-react";
import { useEffect } from "react";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiresSubscription?: boolean;
  allowPublicAccess?: boolean; // For review submission pages
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requiresSubscription = true,
  allowPublicAccess = false,
}) => {
  const { user, loading, session, verifySession } = useAuth();
  const {
    canAccessApp,
    loading: subscriptionLoading,
    getAccessMessage,
  } = useSupabaseSubscription();
  const location = useLocation();

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
      return <PageLoading />;
    }

    // User doesn't have access
    if (!canAccessApp) {
      const accessMessage = getAccessMessage();
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="max-w-md w-full space-y-8 p-6">
            <div className="text-center">
              <Shield className="mx-auto h-12 w-12 text-orange-500" />
              <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
                Subscription Required
              </h2>
            </div>
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{accessMessage}</AlertDescription>
            </Alert>
          </div>
        </div>
      );
    }
  }

  return <>{children}</>;
};

export default ProtectedRoute;
