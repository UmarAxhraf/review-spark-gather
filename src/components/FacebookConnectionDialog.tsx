import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Loader2, ExternalLink, Facebook, CheckCircle } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { facebookService, FacebookPage } from "@/lib/facebookService";
import { useAuth } from "@/contexts/AuthContext";

interface FacebookConnectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConnect: (pageId: string, pageName: string) => Promise<void>;
  isConnecting: boolean;
}

type ConnectionStep = "auth" | "page-selection" | "connecting";

export const FacebookConnectionDialog: React.FC<
  FacebookConnectionDialogProps
> = ({ open, onOpenChange, onConnect, isConnecting }) => {
  const { user } = useAuth();
  const [step, setStep] = useState<ConnectionStep>("auth");
  const [error, setError] = useState("");
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [pages, setPages] = useState<FacebookPage[]>([]);
  const [selectedPageId, setSelectedPageId] = useState("");
  const [accessToken, setAccessToken] = useState("");

  // Reset state when dialog opens/closes
  useEffect(() => {
    if (open) {
      setStep("auth");
      setError("");
      setPages([]);
      setSelectedPageId("");
      setAccessToken("");
    }
  }, [open]);

  const handleFacebookAuth = async () => {
    if (!user) {
      setError("User not authenticated");
      return;
    }

    setIsAuthenticating(true);
    setError("");

    try {
      // Get Facebook OAuth URL
      const authUrl = facebookService.getAuthUrl(user.id);

      // Open popup window for OAuth
      const popup = window.open(
        authUrl,
        "facebook-oauth",
        "width=600,height=600,scrollbars=yes,resizable=yes"
      );

      if (!popup) {
        throw new Error("Popup blocked. Please allow popups for this site.");
      }

      // Listen for OAuth completion
      const checkClosed = setInterval(() => {
        if (popup.closed) {
          clearInterval(checkClosed);
          setIsAuthenticating(false);
        }
      }, 1000);

      // Listen for OAuth callback
      const handleMessage = async (event: MessageEvent) => {
        if (event.origin !== window.location.origin) return;

        if (event.data.type === "FACEBOOK_OAUTH_SUCCESS") {
          clearInterval(checkClosed);
          popup.close();
          window.removeEventListener("message", handleMessage);

          const { code, state } = event.data;

          try {
            // Exchange code for access token
            const tokens = await facebookService.exchangeCodeForToken(
              code,
              state
            );
            setAccessToken(tokens.access_token);

            // Fetch user's Facebook pages
            const userPages = await facebookService.getUserPages(
              tokens.access_token
            );
            setPages(userPages);
            setStep("page-selection");
          } catch (error) {
            console.error("Token exchange failed:", error);
            setError(error.message || "Failed to authenticate with Facebook");
          }

          setIsAuthenticating(false);
        } else if (event.data.type === "FACEBOOK_OAUTH_ERROR") {
          clearInterval(checkClosed);
          popup.close();
          window.removeEventListener("message", handleMessage);
          setError(event.data.error || "Facebook authentication failed");
          setIsAuthenticating(false);
        }
      };

      window.addEventListener("message", handleMessage);
    } catch (error) {
      console.error("Facebook auth error:", error);
      setError(error.message || "Failed to start Facebook authentication");
      setIsAuthenticating(false);
    }
  };

  const handlePageSelection = async () => {
    if (!selectedPageId || !accessToken) {
      setError("Please select a Facebook page");
      return;
    }

    const selectedPage = pages.find((page) => page.id === selectedPageId);
    if (!selectedPage) {
      setError("Selected page not found");
      return;
    }

    setStep("connecting");
    setError("");

    try {
      await onConnect(selectedPageId, selectedPage.name);
      onOpenChange(false);
    } catch (error) {
      console.error("Page connection failed:", error);
      setError(error.message || "Failed to connect Facebook page");
      setStep("page-selection");
    }
  };

  const handleClose = () => {
    if (!isAuthenticating && !isConnecting && step !== "connecting") {
      setStep("auth");
      setError("");
      setPages([]);
      setSelectedPageId("");
      setAccessToken("");
      onOpenChange(false);
    }
  };

  const renderAuthStep = () => (
    <>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <Facebook className="w-5 h-5 text-blue-600" />
          Connect Facebook
        </DialogTitle>
        <DialogDescription>
          Connect your Facebook business page to import and manage your reviews.
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-4">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        <div className="bg-blue-50 p-4 rounded-lg">
          <h4 className="font-medium text-blue-900 mb-2 flex items-center gap-2">
            <ExternalLink className="w-4 h-4" />
            What you'll need:
          </h4>
          <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
            <li>Admin access to your Facebook business page</li>
            <li>Permission to manage page reviews and ratings</li>
            <li>A Facebook account linked to your business page</li>
          </ul>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
          <p className="text-sm text-amber-800">
            <strong>Note:</strong> You'll be redirected to Facebook to authorize
            access to your business pages.
          </p>
        </div>
      </div>

      <DialogFooter>
        <Button
          type="button"
          variant="outline"
          onClick={handleClose}
          disabled={isAuthenticating}
        >
          Cancel
        </Button>
        <Button
          onClick={handleFacebookAuth}
          disabled={isAuthenticating}
          className="bg-blue-600 hover:bg-blue-700"
        >
          {isAuthenticating ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Authenticating...
            </>
          ) : (
            <>
              <Facebook className="mr-2 h-4 w-4" />
              Connect with Facebook
            </>
          )}
        </Button>
      </DialogFooter>
    </>
  );

  const renderPageSelectionStep = () => (
    <>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <CheckCircle className="w-5 h-5 text-green-600" />
          Select Facebook Page
        </DialogTitle>
        <DialogDescription>
          Choose which Facebook business page you'd like to connect for review
          management.
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-4">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="page-select">Facebook Business Page</Label>
          <Select value={selectedPageId} onValueChange={setSelectedPageId}>
            <SelectTrigger>
              <SelectValue placeholder="Select a Facebook page" />
            </SelectTrigger>
            <SelectContent>
              {pages.map((page) => (
                <SelectItem key={page.id} value={page.id}>
                  <div className="flex items-center gap-2">
                    <span>{page.name}</span>
                    {page.category && (
                      <span className="text-xs text-gray-500">
                        ({page.category})
                      </span>
                    )}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {pages.length === 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
            <p className="text-sm text-amber-800">
              No Facebook business pages found. Make sure you have admin access
              to at least one business page.
            </p>
          </div>
        )}
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={() => setStep("auth")}>
          Back
        </Button>
        <Button
          onClick={handlePageSelection}
          disabled={!selectedPageId || pages.length === 0}
          className="bg-blue-600 hover:bg-blue-700"
        >
          Connect Page
        </Button>
      </DialogFooter>
    </>
  );

  const renderConnectingStep = () => (
    <>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
          Connecting Facebook Page
        </DialogTitle>
        <DialogDescription>
          Setting up your Facebook page connection and syncing initial data...
        </DialogDescription>
      </DialogHeader>

      <div className="flex items-center justify-center py-8">
        <div className="text-center space-y-2">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto" />
          <p className="text-sm text-gray-600">
            This may take a few moments...
          </p>
        </div>
      </div>
    </>
  );

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        {step === "auth" && renderAuthStep()}
        {step === "page-selection" && renderPageSelectionStep()}
        {step === "connecting" && renderConnectingStep()}
      </DialogContent>
    </Dialog>
  );
};
