import { useEffect, useState, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, CheckCircle, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ConnectionStatus {
  status: "loading" | "success" | "error";
  message: string;
}

export default function FacebookCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>({
    status: "loading",
    message: "Processing Facebook OAuth callback...",
  });

  const hasProcessedRef = useRef(false);

  useEffect(() => {
    // Don't process until auth is ready
    if (loading) {
      console.log("Waiting for auth to finish loading...", {
        loading,
        hasUser: !!user,
      });
      return;
    }

    // If we already processed, don't run again
    if (hasProcessedRef.current) {
      console.log("Facebook OAuth callback already processed");
      return;
    }

    const handleCallback = async () => {
      // Check if we have the required URL parameters
      const code = searchParams.get("code");
      const error = searchParams.get("error");
      const state = searchParams.get("state");

      if (!code && !error) {
        console.log("No Facebook OAuth parameters found, skipping callback processing");
        return;
      }

      // Mark as processing BEFORE any async work
      hasProcessedRef.current = true;
      console.log("Starting Facebook OAuth callback processing...");

      try {
        // Validate state to prevent CSRF
        const storedState = sessionStorage.getItem("facebook_oauth_state");
        const storedTimestamp = sessionStorage.getItem("facebook_oauth_timestamp");

        if (error) {
          throw new Error(`Facebook OAuth error: ${error}`);
        }

        if (!code) {
          throw new Error("No authorization code received from Facebook");
        }

        console.log("Facebook state validation:", {
          receivedState: state,
          storedState: storedState,
          match: state === storedState,
        });

        if (!state || state !== storedState) {
          throw new Error("Invalid Facebook OAuth state - possible CSRF attack");
        }

        // Check for authorization code expiration (10 minutes)
        if (storedTimestamp) {
          const timestamp = parseInt(storedTimestamp);
          const now = Date.now();
          const tenMinutes = 10 * 60 * 1000;

          if (now - timestamp > tenMinutes) {
            throw new Error("Facebook authorization code expired");
          }
        }

        // Check if user is authenticated
        if (!user) {
          throw new Error(
            "No authenticated user found. Please sign in and try again."
          );
        }

        console.log("User authenticated:", user.id);

        // Post success message to parent window (for popup flow)
        if (window.opener) {
          window.opener.postMessage(
            {
              type: "FACEBOOK_OAUTH_SUCCESS",
              code,
              state,
            },
            window.location.origin
          );
          window.close();
          return;
        }

        // If not in popup, show success message and redirect
        setConnectionStatus({
          status: "success",
          message: "Facebook OAuth completed successfully! Redirecting...",
        });

        // Clean up OAuth state from sessionStorage
        sessionStorage.removeItem("facebook_oauth_state");
        sessionStorage.removeItem("facebook_oauth_timestamp");
        sessionStorage.removeItem("facebook_oauth_redirect_uri");

        // Redirect to platforms page after a short delay
        setTimeout(() => {
          navigate("/platforms");
        }, 2000);
      } catch (error) {
        console.error("Facebook OAuth callback error:", error);

        // Clean up OAuth state on error
        sessionStorage.removeItem("facebook_oauth_state");
        sessionStorage.removeItem("facebook_oauth_timestamp");
        sessionStorage.removeItem("facebook_oauth_redirect_uri");

        const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";

        // Post error message to parent window (for popup flow)
        if (window.opener) {
          window.opener.postMessage(
            {
              type: "FACEBOOK_OAUTH_ERROR",
              error: errorMessage,
            },
            window.location.origin
          );
          window.close();
          return;
        }

        setConnectionStatus({
          status: "error",
          message: `Facebook connection failed: ${errorMessage}`,
        });
      }
    };

    handleCallback();
  }, [searchParams, navigate, user, loading]);

  const handleRetry = () => {
    navigate("/platforms");
  };

  const getStatusIcon = () => {
    switch (connectionStatus.status) {
      case "loading":
        return <Loader2 className="h-8 w-8 animate-spin text-blue-500" />;
      case "success":
        return <CheckCircle className="h-8 w-8 text-green-500" />;
      case "error":
        return <XCircle className="h-8 w-8 text-red-500" />;
    }
  };

  const getStatusColor = () => {
    switch (connectionStatus.status) {
      case "loading":
        return "border-blue-200";
      case "success":
        return "border-green-200";
      case "error":
        return "border-red-200";
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className={`w-full max-w-md ${getStatusColor()}`}>
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">{getStatusIcon()}</div>
          <CardTitle className="text-xl">
            {connectionStatus.status === "loading" && "Connecting Facebook..."}
            {connectionStatus.status === "success" && "Facebook Connected!"}
            {connectionStatus.status === "error" && "Connection Failed"}
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <p className="text-gray-600">{connectionStatus.message}</p>
          {connectionStatus.status === "error" && (
            <Button onClick={handleRetry} className="w-full">
              Return to Platforms
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}