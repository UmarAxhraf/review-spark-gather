import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
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
import { useToast } from "@/hooks/use-toast";
import TeamLayout from "@/components/TeamLayout";
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
} from "lucide-react";
import { BackButton } from "@/components/ui/back-button";

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
}

const Profile = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchProfile();
    }
  }, [user]);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user?.id)
        .single();

      if (error) {
        console.error("Error fetching profile:", error);
        toast({
          title: "Error",
          description: "Failed to load profile data",
          variant: "destructive",
        });
        return;
      }

      setProfile(data);
    } catch (error) {
      console.error("Error:", error);
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getUserInitials = () => {
    if (profile?.company_name) {
      return profile.company_name.charAt(0).toUpperCase();
    }
    if (user?.email) {
      return user.email.charAt(0).toUpperCase();
    }
    return "U";
  };

  const handleEditProfile = () => {
    navigate("/company-settings");
  };

  if (loading) {
    return (
      <TeamLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </TeamLayout>
    );
  }

  return (
    <TeamLayout>
      <div className="space-y-6">
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
            onClick={handleEditProfile}
            className="flex items-center gap-2"
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

          {/* Detailed Information */}
          <div className="lg:col-span-2 space-y-6">
            {/* Company Information */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-blue-600" />
                  <CardTitle>Company Information</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Company Name
                  </label>
                  <p className="mt-1">
                    {profile?.company_name || "Not specified"}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Industry
                  </label>
                  <p className="mt-1">{profile?.industry || "Not specified"}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Employee Count
                  </label>
                  <p className="mt-1">
                    {profile?.employee_count || "Not specified"}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Timezone
                  </label>
                  <p className="mt-1">{profile?.timezone || "Not specified"}</p>
                </div>
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

                {(profile?.address ||
                  profile?.city ||
                  profile?.state ||
                  profile?.zip_code) && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">
                      Address
                    </label>
                    <div className="mt-1 space-y-1">
                      {profile?.address && <p>{profile.address}</p>}
                      {(profile?.city ||
                        profile?.state ||
                        profile?.zip_code) && (
                        <p>
                          {[profile?.city, profile?.state, profile?.zip_code]
                            .filter(Boolean)
                            .join(", ")}
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Preferences */}
            <Card>
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
                      <div className="flex items-center gap-2">
                        <div
                          className={`w-2 h-2 rounded-full ${
                            profile?.email_notifications
                              ? "bg-green-500"
                              : "bg-gray-300"
                          }`}
                        />
                        <span className="text-sm">Email Notifications</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div
                          className={`w-2 h-2 rounded-full ${
                            profile?.review_notifications
                              ? "bg-green-500"
                              : "bg-gray-300"
                          }`}
                        />
                        <span className="text-sm">Review Notifications</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div
                          className={`w-2 h-2 rounded-full ${
                            profile?.weekly_reports
                              ? "bg-green-500"
                              : "bg-gray-300"
                          }`}
                        />
                        <span className="text-sm">Weekly Reports</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-muted-foreground">
                      Brand Colors
                    </label>
                    <div className="mt-2 flex gap-3">
                      {profile?.primary_color && (
                        <div className="flex items-center gap-2">
                          <div
                            className="w-6 h-6 rounded border"
                            style={{ backgroundColor: profile.primary_color }}
                          />
                          <span className="text-sm">Primary</span>
                        </div>
                      )}
                      {profile?.secondary_color && (
                        <div className="flex items-center gap-2">
                          <div
                            className="w-6 h-6 rounded border"
                            style={{ backgroundColor: profile.secondary_color }}
                          />
                          <span className="text-sm">Secondary</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </TeamLayout>
  );
};

export default Profile;
