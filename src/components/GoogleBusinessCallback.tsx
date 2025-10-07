// import { useEffect, useState, useRef } from "react";
// import { useNavigate, useSearchParams } from "react-router-dom";
// import { useAuth } from "@/contexts/AuthContext";
// import { googleBusinessService } from "@/lib/googleBusinessService";
// import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
// import { Loader2, CheckCircle, XCircle } from "lucide-react";
// import { Button } from "@/components/ui/button";

// interface ConnectionStatus {
//   status: "loading" | "success" | "error";
//   message: string;
// }

// export default function GoogleBusinessCallback() {
//   const [searchParams] = useSearchParams();
//   const navigate = useNavigate();
//   const { user, loading } = useAuth();
//   const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>({
//     status: "loading",
//     message: "Processing OAuth callback...",
//   });

//   const hasProcessedRef = useRef(false);

//   useEffect(() => {
//     // CRITICAL: Don't process until auth is ready
//     if (loading) {
//       console.log("Waiting for auth to finish loading...", {
//         loading,
//         hasUser: !!user,
//       });
//       return;
//     }

//     // If we already processed, don't run again
//     if (hasProcessedRef.current) {
//       console.log("OAuth callback already processed");
//       return;
//     }

//     const handleCallback = async () => {
//       // Check if we have the required URL parameters
//       const code = searchParams.get("code");
//       const error = searchParams.get("error");
//       const state = searchParams.get("state");

//       if (!code && !error) {
//         console.log("No OAuth parameters found, skipping callback processing");
//         return;
//       }

//       // Mark as processing BEFORE any async work
//       hasProcessedRef.current = true;
//       console.log("Starting OAuth callback processing...");

//       try {
//         // Clear OAuth flow flag
//         localStorage.removeItem("inOAuthFlow");

//         // Validate state to prevent CSRF
//         const storedState = sessionStorage.getItem("oauth_state");
//         const storedTimestamp = sessionStorage.getItem("oauth_timestamp");
//         const storedRedirectUri = sessionStorage.getItem("oauth_redirect_uri");

//         if (error) {
//           throw new Error(`OAuth error: ${error}`);
//         }

//         if (!code) {
//           throw new Error("No authorization code received");
//         }

//         console.log("State validation:", {
//           receivedState: state,
//           storedState: storedState,
//           match: state === storedState,
//         });

//         if (!state || state !== storedState) {
//           throw new Error("Invalid OAuth state - possible CSRF attack");
//         }

//         // Check for authorization code expiration (5 minutes)
//         if (storedTimestamp) {
//           const timestamp = parseInt(storedTimestamp);
//           const now = Date.now();
//           const fiveMinutes = 5 * 60 * 1000;

//           if (now - timestamp > fiveMinutes) {
//             throw new Error("Authorization code expired");
//           }
//         }

//         // At this point, auth.loading is false
//         // If we don't have a user, it means they're not logged in
//         if (!user) {
//           throw new Error(
//             "No authenticated user found. Please sign in and try again."
//           );
//         }

//         console.log("User authenticated:", user.id);

//         setConnectionStatus({
//           status: "loading",
//           message: "Exchanging authorization code for access token...",
//         });

//         // Exchange authorization code for access token
//         const tokenData = await googleBusinessService.exchangeCodeForToken(
//           code,
//           storedRedirectUri ||
//             window.location.origin + "/google-business-callback"
//         );

//         console.log("Token exchange successful");

//         setConnectionStatus({
//           status: "loading",
//           message: "Saving Google My Business connection...",
//         });

//         // Save the connection
//         await googleBusinessService.saveConnection(
//           user.id,
//           tokenData.access_token,
//           tokenData.refresh_token,
//           tokenData.expires_in
//         );

//         console.log("Connection saved successfully");

//         // Clean up OAuth state from sessionStorage
//         sessionStorage.removeItem("oauth_state");
//         sessionStorage.removeItem("oauth_timestamp");
//         sessionStorage.removeItem("oauth_redirect_uri");

//         setConnectionStatus({
//           status: "success",
//           message: "Google My Business connected successfully!",
//         });

//         // Redirect to platforms page after a short delay
//         setTimeout(() => {
//           navigate("/platforms");
//         }, 2000);
//       } catch (error) {
//         console.error("OAuth callback error:", error);

//         // Clean up OAuth state on error
//         sessionStorage.removeItem("oauth_state");
//         sessionStorage.removeItem("oauth_timestamp");
//         sessionStorage.removeItem("oauth_redirect_uri");

//         setConnectionStatus({
//           status: "error",
//           message: error instanceof Error ? error.message : "Connection failed",
//         });
//       }
//     };

//     handleCallback();
//   }, [loading, user, searchParams, navigate]); // CRITICAL: Include loading and user

//   const getStatusIcon = () => {
//     switch (connectionStatus.status) {
//       case "loading":
//         return <Loader2 className="h-8 w-8 animate-spin text-blue-500" />;
//       case "success":
//         return <CheckCircle className="h-8 w-8 text-green-500" />;
//       case "error":
//         return <XCircle className="h-8 w-8 text-red-500" />;
//     }
//   };

//   const handleRetry = () => {
//     hasProcessedRef.current = false;
//     navigate("/platforms");
//   };

//   return (
//     <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
//       <Card className="w-full max-w-md">
//         <CardHeader className="text-center">
//           <CardTitle className="flex items-center justify-center gap-2">
//             {getStatusIcon()}
//             Google My Business
//           </CardTitle>
//         </CardHeader>
//         <CardContent className="text-center space-y-4">
//           <p className="text-gray-600">{connectionStatus.message}</p>

//           {connectionStatus.status === "error" && (
//             <div className="space-y-2">
//               <Button onClick={handleRetry} className="w-full">
//                 Try Connecting Again
//               </Button>
//               <Button
//                 onClick={() => navigate("/platforms")}
//                 variant="outline"
//                 className="w-full"
//               >
//                 Return to Platforms
//               </Button>
//             </div>
//           )}
//         </CardContent>
//       </Card>
//     </div>
//   );
// }

//========================================>>>>>>>>>>>>>>>>>>>>>>>===============================

import { useEffect, useState, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { googleBusinessService } from "@/lib/googleBusinessService";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, CheckCircle, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ConnectionStatus {
  status: "loading" | "success" | "error";
  message: string;
}

export default function GoogleBusinessCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>({
    status: "loading",
    message: "Processing OAuth callback...",
  });

  const hasProcessedRef = useRef(false);

  useEffect(() => {
    if (loading) {
      console.log("Waiting for auth to finish loading...");
      return;
    }

    if (hasProcessedRef.current) {
      console.log("OAuth callback already processed");
      return;
    }

    const handleCallback = async () => {
      const code = searchParams.get("code");
      const error = searchParams.get("error");
      const state = searchParams.get("state");

      if (!code && !error) {
        console.log("No OAuth parameters found");
        return;
      }

      hasProcessedRef.current = true;
      console.log("Starting OAuth callback processing...");

      try {
        localStorage.removeItem("inOAuthFlow");

        const storedState = sessionStorage.getItem("oauth_state");
        const storedTimestamp = sessionStorage.getItem("oauth_timestamp");
        const storedRedirectUri = sessionStorage.getItem("oauth_redirect_uri");

        if (error) {
          throw new Error(`OAuth error: ${error}`);
        }

        if (!code) {
          throw new Error("No authorization code received");
        }

        if (!state || state !== storedState) {
          throw new Error("Invalid OAuth state - possible CSRF attack");
        }

        if (storedTimestamp) {
          const timestamp = parseInt(storedTimestamp);
          const now = Date.now();
          const fiveMinutes = 5 * 60 * 1000;

          if (now - timestamp > fiveMinutes) {
            throw new Error("Authorization code expired");
          }
        }

        if (!user) {
          throw new Error(
            "No authenticated user found. Please sign in and try again."
          );
        }

        console.log("User authenticated:", user.id);

        setConnectionStatus({
          status: "loading",
          message: "Exchanging authorization code for access token...",
        });

        const tokenData = await googleBusinessService.exchangeCodeForToken(
          code,
          storedRedirectUri ||
            window.location.origin + "/google-business-callback"
        );

        console.log("Token exchange successful");

        setConnectionStatus({
          status: "loading",
          message: "Saving Google My Business connection...",
        });

        await googleBusinessService.saveConnection(
          user.id,
          tokenData.access_token,
          tokenData.refresh_token,
          tokenData.expires_in
        );

        console.log("Connection saved successfully");

        // Clean up OAuth state
        sessionStorage.removeItem("oauth_state");
        sessionStorage.removeItem("oauth_timestamp");
        sessionStorage.removeItem("oauth_redirect_uri");

        setConnectionStatus({
          status: "success",
          message:
            "Successfully connected! Click 'Sync Reviews' on the platforms page to import your reviews.",
        });

        // Redirect immediately - let the user trigger the sync manually
        setTimeout(() => {
          navigate("/platforms");
        }, 2000);
      } catch (error) {
        console.error("OAuth callback error:", error);

        sessionStorage.removeItem("oauth_state");
        sessionStorage.removeItem("oauth_timestamp");
        sessionStorage.removeItem("oauth_redirect_uri");

        setConnectionStatus({
          status: "error",
          message: error instanceof Error ? error.message : "Connection failed",
        });
      }
    };

    handleCallback();
  }, [loading, user, searchParams, navigate]);

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

  const handleRetry = () => {
    hasProcessedRef.current = false;
    navigate("/platforms");
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="flex items-center justify-center gap-2">
            {getStatusIcon()}
            Google My Business
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <p className="text-gray-600">{connectionStatus.message}</p>

          {connectionStatus.status === "error" && (
            <div className="space-y-2">
              <Button onClick={handleRetry} className="w-full">
                Try Connecting Again
              </Button>
              <Button
                onClick={() => navigate("/platforms")}
                variant="outline"
                className="w-full"
              >
                Return to Platforms
              </Button>
            </div>
          )}

          {connectionStatus.status === "success" && (
            <p className="text-sm text-gray-500">
              Redirecting to platforms page...
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
