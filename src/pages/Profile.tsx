import React, { useState, useEffect, useMemo } from "react";
import { SubscriptionProgress } from "@/components/SubscriptionProgress";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import {
  User,
  Building2,
  Mail,
  Phone,
  MapPin,
  Globe,
  Users,
  Palette,
  Settings,
  Edit,
  Loader2,
  Clock,
  Crown,
  Calendar,
  AlertTriangle,
  QrCode,
  Copy,
  Facebook,
  ExternalLink,
  Shield,
  Star,
  Plane,
  Download,
} from "lucide-react";
import { BackButton } from "@/components/ui/back-button";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { usePageVisibility } from "@/hooks/use-page-visibility";
import { useQueryClient } from "@tanstack/react-query";

interface ProfileData {
  id: string;
  company_name: string;
  email: string;
  phone?: string;
  website?: string;
  address?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  description?: string;
  industry?: string;
  employee_count?: string;
  timezone?: string;
  primary_color?: string;
  secondary_color?: string;
  logo_url?: string;
  email_notifications?: boolean;
  review_notifications?: boolean;
  weekly_reports?: boolean;
  public_profile?: boolean;
  show_employee_count?: boolean;
  trial_start?: string;
  trial_end?: string;
  trial_used?: boolean;
  plan_name?: string;
  subscription_start?: string;
  subscription_end?: string;
  next_billing_date?: string;
  role?: string;
  company_qr_code_id?: string;
  company_qr_url?: string;
}

interface PlatformProfile {
  id: string;
  platform_type: string;
  profile_url: string;
  profile_name?: string;
  is_active: boolean;
}

type LoadingState = "idle" | "loading" | "error" | "success";

const Profile = () => {
  const { user, verifySession } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // State management
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loadingState, setLoadingState] = useState<LoadingState>("idle");
  const [portalLoading, setPortalLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>("");
  const [platformProfiles, setPlatformProfiles] = useState<PlatformProfile[]>(
    []
  );

  // Subscription context
  const {
    subscription,
    loading: subscriptionLoading,
    createPortalSession,
    isActive,
    isTrialActive,
    trialDaysLeft,
  } = useSubscription();

  // Add page visibility detection
  usePageVisibility((isVisible) => {
    if (isVisible && user?.id) {
      // Refresh data when page becomes visible again
      fetchProfile();

      // Also verify the session is still valid
      verifySession();
    }
  });

  const fetchPlatformProfiles = async () => {
    if (!user?.id) return;

    try {
      const { data, error } = await supabase
        .from("platform_profiles")
        .select("*")
        .eq("company_id", user.id)
        .eq("is_active", true);

      if (error) throw error;
      setPlatformProfiles(data || []);
    } catch (error) {
      console.error("Error fetching platform profiles:", error);
    }
  };

  useEffect(() => {
    if (user?.id) {
      fetchPlatformProfiles();
    }
  }, [user?.id]);

  const getPlatformIcon = (platformType: string) => {
    const iconMap = {
      google_my_business: MapPin,
      facebook: Facebook,
      yelp: Star,
      tripadvisor: Plane,
      trustpilot: Shield,
      booking_com: Calendar,
    };
    return iconMap[platformType as keyof typeof iconMap] || Globe;
  };

  const getPlatformName = (platformType: string) => {
    const nameMap = {
      google_my_business: "Google My Business",
      facebook: "Facebook",
      yelp: "Yelp",
      tripadvisor: "TripAdvisor",
      trustpilot: "Trustpilot",
      booking_com: "Booking.com",
    };
    return nameMap[platformType as keyof typeof nameMap] || platformType;
  };

  // Computed values with proper fallbacks
  const computedValues = useMemo(() => {
    // Fix: Ensure skeleton shows until BOTH profile and subscription are loaded
    const isLoading =
      loadingState === "loading" || subscriptionLoading || !profile;
    const hasError = loadingState === "error" || error;

    // Determine subscription status with priority order
    let status = "No Active Plan";
    let statusColor = "bg-gray-100 text-gray-800";
    let statusIcon = Clock;

    if (isLoading) {
      status = "Loading...";
      statusIcon = Loader2;
    } else if (isActive) {
      status = "Active Subscription";
      statusColor = "bg-green-100 text-green-800";
      statusIcon = Crown;
    } else if (isTrialActive) {
      const days = trialDaysLeft || 0;
      status = `Free Trial (${days} days left)`;
      statusColor =
        days <= 3
          ? "bg-orange-100 text-orange-800"
          : "bg-blue-100 text-blue-800";
      statusIcon = Clock;
    } else if (profile?.trial_used) {
      status = "Expired";
      statusColor = "bg-red-100 text-red-800";
      statusIcon = AlertTriangle;
    }

    // Calculate billing amount with admin check
    const isAdmin = profile?.role === "admin";
    const billingAmount = isAdmin
      ? "Free"
      : subscription?.subscription_price
      ? `$${(subscription.subscription_price / 100).toFixed(2)}/month`
      : isTrialActive
      ? "Free (Trial)"
      : "Free";

    return {
      isLoading,
      hasError,
      status,
      statusColor,
      statusIcon,
      billingAmount,
      isExpired: !isActive && !isTrialActive && profile?.trial_used,
      showUpgrade: !isActive && (!isTrialActive || (trialDaysLeft || 0) <= 7),
    };
  }, [
    loadingState,
    subscriptionLoading,
    error,
    isActive,
    isTrialActive,
    trialDaysLeft,
    subscription,
    profile,
  ]);

  // Effects
  useEffect(() => {
    if (user?.id) {
      fetchProfile();
    } else {
      setError("User not authenticated");
      setLoadingState("error");
    }
  }, [user?.id]);

  // QR Code helper functions
  const getCompanyReviewUrl = (qrCodeId: string) => {
    return `${window.location.origin}/review/company/${qrCodeId}`;
  };

  const generateQRCode = async () => {
    if (!profile?.company_qr_code_id) return;

    const reviewUrl = getCompanyReviewUrl(profile.company_qr_code_id);

    try {
      const QRCode = (await import("qrcode")).default;
      const dataUrl = await QRCode.toDataURL(reviewUrl, {
        width: 256,
        margin: 2,
        color: {
          dark: profile.primary_color || "#000000",
          light: "#FFFFFF",
        },
      });
      setQrCodeDataUrl(dataUrl);
    } catch (error) {
      console.error("Error generating QR code:", error);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({ title: "Copied to clipboard!" });
    } catch (error) {
      toast({ title: "Failed to copy", variant: "destructive" });
    }
  };

  const downloadCompanyQRCode = () => {
    if (!qrCodeDataUrl || !profile?.company_name) {
      toast({
        title: "QR code not available for download",
        variant: "destructive",
      });
      return;
    }

    // Create a link element and trigger download
    const link = document.createElement("a");
    link.href = qrCodeDataUrl;
    link.download = `${profile.company_name.replace(
      /\s+/g,
      "_"
    )}_Company_QR_Code.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({ title: "QR code downloaded successfully" });
  };

  // Generate QR code when profile loads
  useEffect(() => {
    if (profile?.company_qr_code_id) {
      generateQRCode();
    }
  }, [profile?.company_qr_code_id]);

  // API functions with better error handling
  const fetchProfile = async () => {
    if (!user?.id) {
      setError("User ID not available");
      setLoadingState("error");
      return;
    }

    try {
      setLoadingState("loading");
      setError(null);

      const { data, error: supabaseError } = await supabase
        .from("profiles")
        .select(
          `
          *,
          trial_start,
          trial_end, 
          trial_used,
          plan_name,
          subscription_start,
          subscription_end,
          next_billing_date,
          role
        `
        )
        .eq("id", user.id)
        .single();

      if (supabaseError) {
        throw new Error(supabaseError.message || "Failed to fetch profile");
      }

      if (!data) {
        throw new Error("Profile not found");
      }

      setProfile(data);
      setLoadingState("success");
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to load profile";
      console.error("Profile fetch error:", error);
      setError(errorMessage);
      setLoadingState("error");

      toast({
        title: "Profile Load Error",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  const handlePortalSession = async () => {
    try {
      setPortalLoading(true);
      await createPortalSession();
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Failed to open customer portal";
      console.error("Portal session error:", error);
      toast({
        title: "Portal Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setPortalLoading(false);
    }
  };

  // Helper functions
  const getUserInitials = () => {
    if (profile?.company_name) {
      return profile.company_name.charAt(0).toUpperCase();
    }
    if (user?.email) {
      return user.email.charAt(0).toUpperCase();
    }
    return "U";
  };

  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return "Not available";
    try {
      return new Date(dateString).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch {
      return "Invalid date";
    }
  };

  const formatAddress = (): string[] => {
    if (!profile) return ["Not specified"];

    const parts = [
      profile.address,
      [profile.city, profile.state, profile.zip_code]
        .filter(Boolean)
        .join(", "),
    ].filter(Boolean);

    return parts.length > 0 ? parts : ["Not specified"];
  };

  // Loading skeleton
  const SubscriptionSkeleton = () => (
    <div className="space-y-6 p-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-6 w-20" />
          </div>
        ))}
      </div>
      <div className="border rounded-lg p-4">
        <Skeleton className="h-5 w-32 mb-3" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-32" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  // Error state
  if (computedValues.hasError && !profile) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <AlertTriangle className="h-12 w-12 text-red-500" />
        <div className="text-center">
          <h2 className="text-xl font-semibold">Failed to Load Profile</h2>
          <p className="text-muted-foreground">{error}</p>
          <Button
            onClick={fetchProfile}
            className="mt-4"
            disabled={loadingState === "loading"}
          >
            {loadingState === "loading" ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Retrying...
              </>
            ) : (
              "Try Again"
            )}
          </Button>
        </div>
      </div>
    );
  }

  // Initial loading state
  if (loadingState === "loading" && !profile) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  const StatusIcon = computedValues.statusIcon;

  return (
    <div className="space-y-6 p-6">
      <div className="mb-6">
        <BackButton />
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Profile</h1>
          <p className="text-muted-foreground">
            View and manage your company profile information
          </p>
        </div>
        <Button
          onClick={() => navigate("/company-settings")}
          className="flex items-center gap-2"
          disabled={!profile}
        >
          <Edit className="h-4 w-4" />
          Edit Profile
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Overview */}
        <Card className="lg:col-span-1">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <Avatar className="h-24 w-24">
                <AvatarImage
                  src={profile?.logo_url || ""}
                  alt={profile?.company_name || ""}
                />
                <AvatarFallback className="bg-blue-100 text-blue-600 text-2xl">
                  {getUserInitials()}
                </AvatarFallback>
              </Avatar>
            </div>
            <CardTitle className="text-xl">
              {profile?.company_name || "Company Name"}
            </CardTitle>
            <CardDescription>
              {profile?.industry || "Industry not specified"}
            </CardDescription>

            {/* Subscription Status Badge */}
            <div className="flex justify-center mt-3">
              <Badge
                className={`${computedValues.statusColor} flex items-center gap-1 hover:bg-primary/20`}
              >
                <StatusIcon
                  className={`h-3 w-3 ${
                    computedValues.isLoading ? "animate-spin" : ""
                  }`}
                />
                {computedValues.status}
              </Badge>
            </div>

            {profile?.public_profile && (
              <Badge variant="secondary" className="mt-2">
                Public Profile
              </Badge>
            )}
          </CardHeader>

          <CardContent className="space-y-4">
            {profile?.description && (
              <div>
                <h4 className="font-medium mb-2">About</h4>
                <p className="text-sm text-muted-foreground">
                  {profile.description}
                </p>
              </div>
            )}

            <Separator />

            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span>{profile?.email || user?.email}</span>
              </div>

              {profile?.phone && (
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span>{profile.phone}</span>
                </div>
              )}

              {profile?.website && (
                <div className="flex items-center gap-2 text-sm">
                  <Globe className="h-4 w-4 text-muted-foreground" />
                  <a
                    href={profile.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline"
                  >
                    {profile.website}
                  </a>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Subscription Details */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Crown className="h-5 w-5" />
              Subscription Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {computedValues.isLoading ? (
              <SubscriptionSkeleton />
            ) : (
              <>
                {/* Current Status Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <div className="space-y-2">
                    <h4 className="font-medium">Status</h4>
                    <Badge
                      className={`${computedValues.statusColor} px-2 py-1 text-xs font-medium rounded-full hover:bg-primary/20`}
                    >
                      {computedValues.status}
                    </Badge>
                  </div>

                  <div className="space-y-2">
                    <h4 className="font-medium">Plan</h4>
                    <p className="text-sm">
                      {profile?.plan_name ||
                        (isTrialActive
                          ? "Free Trial"
                          : isActive
                          ? "Review Enterprise"
                          : "Free")}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <h4 className="font-medium">Price</h4>
                    <p className="text-sm">{computedValues.billingAmount}</p>
                  </div>
                </div>

                {/* Active Subscription Card - Only show if truly active and not in trial */}
                {isActive && subscription && !isTrialActive && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <h4 className="font-medium text-green-800 mb-4">
                      Active Subscription
                    </h4>

                    {/* Add Subscription Progress Bar */}
                    {profile?.subscription_start &&
                      profile?.subscription_end && (
                        <SubscriptionProgress
                          startDate={profile.subscription_start}
                          endDate={profile.subscription_end}
                          className="mb-4"
                        />
                      )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-green-700 font-medium">
                          Current Period Start:
                        </p>
                        <p className="text-green-800">
                          {formatDate(profile?.subscription_start)}
                        </p>
                      </div>
                      <div>
                        <p className="text-green-700 font-medium">
                          Current Period End:
                        </p>
                        <p className="text-green-800">
                          {formatDate(profile?.subscription_end)}
                        </p>
                      </div>
                      <div>
                        <p className="text-green-700 font-medium">
                          Next Billing Date:
                        </p>
                        <p className="text-green-800">
                          {formatDate(profile?.next_billing_date)}
                        </p>
                      </div>
                      <div>
                        <p className="text-green-700 font-medium">
                          Monthly Cost:
                        </p>
                        <p className="text-green-800">
                          {computedValues.billingAmount}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Trial Warning - Only show if trial is active and no paid subscription */}
                {isTrialActive && !isActive && (trialDaysLeft || 0) <= 7 && (
                  <div className="border rounded-lg p-4 bg-orange-50">
                    <h4 className="font-medium text-orange-800 mb-3">
                      Trial Ending Soon
                    </h4>
                    {/* Add Trial Progress Bar */}
                    {profile?.trial_start && profile?.trial_end && (
                      <SubscriptionProgress
                        startDate={profile.trial_start}
                        endDate={profile.trial_end}
                        className="mb-3"
                      />
                    )}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-orange-700 font-medium">
                          Trial Started:
                        </p>
                        <p className="text-orange-800">
                          {formatDate(profile?.trial_start)}
                        </p>
                      </div>
                      <div>
                        <p className="text-orange-700 font-medium">
                          Trial Expires:
                        </p>
                        <p className="text-orange-800">
                          {formatDate(profile?.trial_end)}
                        </p>
                      </div>
                    </div>
                    <div className="mt-3 flex items-center gap-2 text-orange-700">
                      <Clock className="h-4 w-4" />
                      <span className="text-sm font-medium">
                        {trialDaysLeft} days remaining
                      </span>
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="space-y-3">
                  {(isActive || isTrialActive) && (
                    <Button
                      onClick={handlePortalSession}
                      disabled={portalLoading}
                      variant="outline"
                      className="w-full"
                    >
                      {portalLoading ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          Loading...
                        </>
                      ) : (
                        "Manage Subscription"
                      )}
                    </Button>
                  )}

                  {computedValues.showUpgrade && (
                    <Button
                      onClick={() => navigate("/#pricing")}
                      className="w-full bg-blue-600 hover:bg-blue-700"
                    >
                      {computedValues.isExpired
                        ? "Reactivate Subscription"
                        : "Upgrade Now"}
                    </Button>
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Additional Information Cards */}
      {/* Company QR Code Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center space-x-2">
            <QrCode className="h-5 w-5 text-blue-600" />
            <CardTitle>Company QR Code & Review Link</CardTitle>
          </div>
          <CardDescription>
            Share this permanent QR code and link to collect reviews for your
            company
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-6">
            {/* QR Code Display */}
            {/* QR Code Display */}
            <div className="text-center">
              <div className="bg-white p-4 rounded-lg border inline-block">
                {qrCodeDataUrl ? (
                  <img
                    src={qrCodeDataUrl}
                    alt="Company QR Code"
                    className="w-48 h-48 mx-auto"
                  />
                ) : (
                  <div className="w-48 h-48 bg-gray-100 flex items-center justify-center">
                    <QrCode className="h-12 w-12 text-gray-400" />
                  </div>
                )}
              </div>
              <p className="text-sm text-gray-600 mt-2">
                Scan to leave a company review
              </p>
              {/* Add centered download button */}
              {qrCodeDataUrl && (
                <div className="mt-4 flex justify-center">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={downloadCompanyQRCode}
                    className="flex items-center gap-2"
                  >
                    <Download className="h-4 w-4" />
                    Download QR Code
                  </Button>
                </div>
              )}
            </div>

            {/* Review Link */}
            <div className="space-y-4">
              <div>
                <Label>Shareable Review Link</Label>
                <div className="flex gap-2 mt-1">
                  <Input
                    value={
                      profile?.company_qr_code_id
                        ? getCompanyReviewUrl(profile.company_qr_code_id)
                        : ""
                    }
                    readOnly
                    className="font-mono text-sm"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      copyToClipboard(
                        profile?.company_qr_code_id
                          ? getCompanyReviewUrl(profile.company_qr_code_id)
                          : ""
                      )
                    }
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div>
                <Label>QR Code ID</Label>
                <div className="flex gap-2 mt-1">
                  <Input
                    value={profile?.company_qr_code_id || ""}
                    readOnly
                    className="font-mono text-sm"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      copyToClipboard(profile?.company_qr_code_id || "")
                    }
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="font-medium text-blue-900 mb-2">How to use:</h4>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• Print the QR code and display it in your business</li>
                  <li>• Share the review link on social media or email</li>
                  <li>• Customers can scan or click to leave reviews</li>
                  <li>• This QR code never expires and never changes</li>
                </ul>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Company Information */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-blue-600" />
              <CardTitle>Company Information</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { label: "Company Name", value: profile?.company_name },
              { label: "Industry", value: profile?.industry },
              { label: "Employee Count", value: profile?.employee_count },
              { label: "Timezone", value: profile?.timezone },
            ].map(({ label, value }) => (
              <div key={label}>
                <label className="text-sm font-medium text-muted-foreground">
                  {label}
                </label>
                <p className="mt-1">{value || "Not specified"}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Contact & Address */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-green-600" />
              <CardTitle>Contact & Address</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">
                  Email
                </label>
                <p className="mt-1">{profile?.email || user?.email}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">
                  Phone
                </label>
                <p className="mt-1">{profile?.phone || "Not specified"}</p>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-muted-foreground">
                Address
              </label>
              <div className="mt-1 space-y-1">
                {formatAddress().map((line, index) => (
                  <p key={index}>{line}</p>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Platform Profiles */}
        {platformProfiles.length > 0 && (
          <Card className="lg:col-span-2">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Globe className="h-5 w-5 text-blue-600" />
                <CardTitle>Platform Profiles</CardTitle>
              </div>
              <CardDescription>
                Your connected review platform profiles
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {platformProfiles.map((profile) => {
                  const IconComponent = getPlatformIcon(profile.platform_type);
                  return (
                    <div
                      key={profile.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-100 rounded-lg">
                          <IconComponent className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                          <p className="font-medium text-sm">
                            {getPlatformName(profile.platform_type)}
                          </p>
                          {profile.profile_name && (
                            <p className="text-xs text-gray-500 truncate max-w-[120px]">
                              {profile.profile_name}
                            </p>
                          )}
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          window.open(profile.profile_url, "_blank")
                        }
                        className="flex items-center gap-1"
                      >
                        <ExternalLink className="h-3 w-3" />
                        Visit
                      </Button>
                    </div>
                  );
                })}
              </div>
              <div className="mt-4 pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => navigate("/platforms")}
                  className="w-full"
                >
                  Manage Platform Profiles
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Preferences */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Settings className="h-5 w-5 text-purple-600" />
              <CardTitle>Preferences</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">
                  Notifications
                </label>
                <div className="mt-2 space-y-1">
                  {[
                    {
                      key: "email_notifications",
                      label: "Email Notifications",
                    },
                    {
                      key: "review_notifications",
                      label: "Review Notifications",
                    },
                    { key: "weekly_reports", label: "Weekly Reports" },
                  ].map(({ key, label }) => (
                    <div key={key} className="flex items-center gap-2">
                      <div
                        className={`w-2 h-2 rounded-full ${
                          profile?.[key as keyof ProfileData]
                            ? "bg-green-500"
                            : "bg-gray-300"
                        }`}
                      />
                      <span className="text-sm">{label}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-muted-foreground">
                  Brand Colors
                </label>
                <div className="mt-2 flex gap-3">
                  {[
                    { color: profile?.primary_color, label: "Primary" },
                    { color: profile?.secondary_color, label: "Secondary" },
                  ].map(
                    ({ color, label }) =>
                      color && (
                        <div key={label} className="flex items-center gap-2">
                          <div
                            className="w-6 h-6 rounded border"
                            style={{ backgroundColor: color }}
                          />
                          <span className="text-sm">{label}</span>
                        </div>
                      )
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Profile;
