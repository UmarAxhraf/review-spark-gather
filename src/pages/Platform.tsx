import React, { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
// Add Trash icon to the imports
import {
  MapPin,
  Facebook,
  Star,
  ExternalLink,
  Plus,
  Eye,
  Plane,
  Shield,
  Calendar,
  Trash2,
} from "lucide-react";
import { BackButton } from "@/components/ui/back-button";
import { Skeleton } from "@/components/ui/skeleton";
import { CardSkeleton } from "@/components/ui/skeleton-loaders";

interface PlatformProfile {
  id: string;
  platform_type: string;
  profile_url: string;
  profile_name?: string;
  is_active: boolean;
}

interface PlatformConfig {
  id: string;
  name: string;
  description: string;
  icon: React.ComponentType<any>;
  placeholder: string;
  urlPattern?: RegExp;
}

const Platform = () => {
  const { user } = useAuth();
  const [profiles, setProfiles] = useState<PlatformProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [selectedPlatform, setSelectedPlatform] =
    useState<PlatformConfig | null>(null);
  const [profileUrl, setProfileUrl] = useState("");
  const [profileName, setProfileName] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const platformConfigs: PlatformConfig[] = [
    {
      id: "google_my_business",
      name: "Google My Business",
      description:
        "Add your Google My Business profile link to help customers find and review your business.",
      icon: MapPin,
      placeholder: "https://maps.google.com/...",
      urlPattern:
        /^https:\/\/(www\.google\.com\/maps|maps\.google\.com|goo\.gl|g\.page)\/.*/,
    },
    {
      id: "facebook",
      name: "Facebook Business Page",
      description:
        "Connect your Facebook business page to showcase your social presence.",
      icon: Facebook,
      placeholder: "https://facebook.com/...",
      urlPattern: /^https:\/\/(www\.)?facebook\.com\/.*/,
    },
    {
      id: "yelp",
      name: "Yelp Business Profile",
      description:
        "Add your Yelp business profile to help customers discover and review your services.",
      icon: Star,
      placeholder: "https://yelp.com/biz/...",
      urlPattern: /^https:\/\/(www\.)?yelp\.com\/biz\/.*/,
    },
    {
      id: "tripadvisor",
      name: "TripAdvisor",
      description:
        "Connect your TripAdvisor listing to showcase travel and hospitality reviews.",
      icon: Plane,
      placeholder: "https://tripadvisor.com/...",
      urlPattern: /^https:\/\/(www\.)?tripadvisor\.(com|co\.uk|ca|com\.au)\/.*/,
    },
    {
      id: "trustpilot",
      name: "Trustpilot",
      description:
        "Add your Trustpilot profile to display customer trust and review scores.",
      icon: Shield,
      placeholder: "https://trustpilot.com/review/...",
      urlPattern: /^https:\/\/(www\.)?trustpilot\.(com|co\.uk|dk)\/.*/,
    },
    {
      id: "booking_com",
      name: "Booking.com",
      description:
        "Connect your Booking.com property listing for hospitality businesses.",
      icon: Calendar,
      placeholder: "https://booking.com/hotel/...",
      urlPattern: /^https:\/\/(www\.)?booking\.com\/.*/,
    },
  ];

  useEffect(() => {
    if (user) {
      fetchProfiles();
    }
  }, [user]);

  const fetchProfiles = async () => {
    try {
      const { data, error } = await supabase
        .from("platform_profiles")
        .select("*")
        .eq("company_id", user?.id)
        .eq("is_active", true);

      if (error) throw error;
      setProfiles(data || []);
    } catch (error) {
      console.error("Error fetching profiles:", error);
      toast.error("Failed to load platform profiles");
    } finally {
      setLoading(false);
    }
  };

  const handleAddProfile = (platform: PlatformConfig) => {
    const existingProfile = profiles.find(
      (p) => p.platform_type === platform.id
    );
    setSelectedPlatform(platform);
    setProfileUrl(existingProfile?.profile_url || "");
    setProfileName(existingProfile?.profile_name || "");
    setShowDialog(true);
  };

  const handleSaveProfile = async () => {
    if (!selectedPlatform || !profileUrl.trim()) {
      toast.error("Please enter a valid profile URL");
      return;
    }

    // Validate URL format if pattern is provided
    if (
      selectedPlatform.urlPattern &&
      !selectedPlatform.urlPattern.test(profileUrl)
    ) {
      toast.error(`Please enter a valid ${selectedPlatform.name} URL`);
      return;
    }

    setSaving(true);
    try {
      const existingProfile = profiles.find(
        (p) => p.platform_type === selectedPlatform.id
      );

      if (existingProfile) {
        // Update existing profile
        const { error } = await supabase
          .from("platform_profiles")
          .update({
            profile_url: profileUrl.trim(),
            profile_name: profileName.trim() || null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", existingProfile.id);

        if (error) throw error;
        toast.success("Profile updated successfully!");
      } else {
        // Create new profile
        const { error } = await supabase.from("platform_profiles").insert({
          company_id: user?.id,
          platform_type: selectedPlatform.id,
          profile_url: profileUrl.trim(),
          profile_name: profileName.trim() || null,
        });

        if (error) throw error;
        toast.success("Profile added successfully!");
      }

      await fetchProfiles();
      setShowDialog(false);
      setProfileUrl("");
      setProfileName("");
    } catch (error) {
      console.error("Error saving profile:", error);
      toast.error("Failed to save profile. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleViewProfile = (url: string) => {
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const getProfileForPlatform = (platformId: string) => {
    return profiles.find((p) => p.platform_type === platformId);
  };

  // Add this new function to handle profile deletion
  const handleDeleteProfile = async () => {
    if (!selectedPlatform || !user?.id) return;

    const existingProfile = getProfileForPlatform(selectedPlatform.id);
    if (!existingProfile) return;

    setDeleting(true);
    try {
      const { error } = await supabase
        .from("platform_profiles")
        .delete()
        .eq("id", existingProfile.id)
        .eq("company_id", user.id); // Extra security check

      if (error) throw error;

      toast.success(`${selectedPlatform.name} profile removed successfully!`);
      await fetchProfiles();
      setShowDialog(false);
      setProfileUrl("");
      setProfileName("");
    } catch (error) {
      console.error("Error deleting profile:", error);
      toast.error("Failed to remove profile. Please try again.");
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <div className="mb-6">
          <BackButton />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <BackButton />
      </div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Platform Profiles</h1>
        <p className="text-muted-foreground">
          Add your profile URLs to help customers find and connect with your
          business. These links will appear on the review submission page.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {platformConfigs.map((platform) => {
          const profile = getProfileForPlatform(platform.id);
          const IconComponent = platform.icon;

          return (
            <Card key={platform.id} className="relative">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <IconComponent className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">{platform.name}</CardTitle>
                  </div>
                </div>
                <CardDescription className="text-sm">
                  {platform.description}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {profile ? (
                    <>
                      <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                        <div className="flex items-center gap-2 text-green-700 text-sm font-medium mb-1">
                          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                          Profile Added
                        </div>
                        {profile.profile_name && (
                          <p className="text-sm text-gray-600 mb-1">
                            {profile.profile_name}
                          </p>
                        )}
                        <p className="text-xs text-gray-500 break-all">
                          {profile.profile_url}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewProfile(profile.profile_url)}
                          className="flex-1"
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleAddProfile(platform)}
                          className="flex-1"
                        >
                          Edit
                        </Button>
                      </div>
                    </>
                  ) : (
                    <Button
                      onClick={() => handleAddProfile(platform)}
                      className="w-full"
                      variant="outline"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Profile
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Add Profile Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {profiles.find((p) => p.platform_type === selectedPlatform?.id)
                ? "Edit"
                : "Add"}{" "}
              {selectedPlatform?.name} Profile
            </DialogTitle>
            <DialogDescription>
              Enter your {selectedPlatform?.name} profile URL to help customers
              find your business.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="profile-url">Profile URL *</Label>
              <Input
                id="profile-url"
                placeholder={selectedPlatform?.placeholder}
                value={profileUrl}
                onChange={(e) => setProfileUrl(e.target.value)}
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="profile-name">Display Name (Optional)</Label>
              <Input
                id="profile-name"
                placeholder="e.g., Main Location, Downtown Store"
                value={profileName}
                onChange={(e) => setProfileName(e.target.value)}
                className="mt-1"
              />
            </div>
          </div>

          <DialogFooter>
            <div className="flex justify-between w-full">
              {/* Show remove button only if profile exists */}
              {profiles.find(
                (p) => p.platform_type === selectedPlatform?.id
              ) && (
                <Button
                  variant="destructive"
                  onClick={handleDeleteProfile}
                  disabled={saving || deleting}
                  className="mr-auto"
                >
                  {deleting ? (
                    <>
                      <Trash2 className="h-4 w-4 mr-2 animate-spin" />
                      Removing...
                    </>
                  ) : (
                    <>
                      <Trash2 className="h-4 w-4 mr-2" />
                      Remove Profile
                    </>
                  )}
                </Button>
              )}

              <div className="flex gap-2 ml-auto">
                <Button
                  variant="outline"
                  onClick={() => setShowDialog(false)}
                  disabled={saving || deleting}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSaveProfile}
                  disabled={saving || deleting}
                >
                  {saving ? "Saving..." : "Save Profile"}
                </Button>
              </div>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Platform;
