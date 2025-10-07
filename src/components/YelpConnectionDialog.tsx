import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ExternalLink, Loader2 } from "lucide-react";

interface YelpConnectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConnect: (businessUrl: string, businessLocation: string) => Promise<void>;
}

export function YelpConnectionDialog({
  open,
  onOpenChange,
  onConnect,
}: YelpConnectionDialogProps) {
  const [businessUrl, setBusinessUrl] = useState("");
  const [businessLocation, setBusinessLocation] = useState("");
  const [error, setError] = useState("");
  const [isConnecting, setIsConnecting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!businessUrl.trim()) {
      setError("Please enter your Yelp business URL");
      return;
    }

    if (!businessLocation.trim()) {
      setError("Please enter your business location");
      return;
    }

    if (!businessUrl.includes("yelp.com/biz/")) {
      setError("Please enter a valid Yelp business URL");
      return;
    }

    try {
      setIsConnecting(true);
      await onConnect(businessUrl.trim(), businessLocation.trim());
      setBusinessUrl("");
      setBusinessLocation("");
      setError("");
    } catch (error: any) {
      setError(error.message || "Failed to connect to Yelp");
    } finally {
      setIsConnecting(false);
    }
  };

  const handleClose = () => {
    if (!isConnecting) {
      setBusinessUrl("");
      setBusinessLocation("");
      setError("");
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="text-red-600">Yelp</span>
            Connection
          </DialogTitle>
          <DialogDescription>
            Connect your Yelp business profile to import and manage your
            reviews using our improved matching system.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="businessUrl">Yelp Business URL *</Label>
            <Input
              id="businessUrl"
              type="url"
              placeholder="https://www.yelp.com/biz/your-business-name-city"
              value={businessUrl}
              onChange={(e) => setBusinessUrl(e.target.value)}
              disabled={isConnecting}
              className={error ? "border-red-500" : ""}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="businessLocation">Business Location *</Label>
            <Input
              id="businessLocation"
              type="text"
              placeholder="New York, NY or 10001"
              value={businessLocation}
              onChange={(e) => setBusinessLocation(e.target.value)}
              disabled={isConnecting}
              className={error ? "border-red-500" : ""}
              required
            />
            <p className="text-xs text-gray-500">
              Enter your city and state (e.g., "Los Angeles, CA") or zip code (e.g., "90210")
            </p>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="bg-blue-50 p-3 rounded-lg">
            <h4 className="font-medium text-blue-900 mb-2 flex items-center gap-2">
              <ExternalLink className="w-4 h-4" />
              How this works:
            </h4>
            <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
              <li>We extract your business name from the Yelp URL</li>
              <li>We search Yelp's database using your business name and location</li>
              <li>We match the results to ensure we get the correct business</li>
              <li>This provides more reliable review importing than URL-only methods</li>
            </ol>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isConnecting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isConnecting}>
              {isConnecting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Connecting...
                </>
              ) : (
                "Connect Yelp"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
