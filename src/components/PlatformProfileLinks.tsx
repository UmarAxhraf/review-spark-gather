import React from "react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  MapPin,
  Facebook,
  Star,
  Plane,
  Shield,
  Calendar,
} from "lucide-react";

interface PlatformProfile {
  id: string;
  platform_type: string;
  profile_url: string;
  profile_name?: string;
  is_active: boolean;
}

interface PlatformProfileLinksProps {
  profiles: PlatformProfile[];
  className?: string;
}

const platformConfigs = {
  google_my_business: {
    name: "Google Business Profile",
    icon: MapPin,
    color: "text-red-600",
    bgColor: "bg-red-50 hover:bg-red-100",
  },
  facebook: {
    name: "Facebook",
    icon: Facebook,
    color: "text-blue-600",
    bgColor: "bg-blue-50 hover:bg-blue-100",
  },
  yelp: {
    name: "Yelp Profile",
    icon: Star,
    color: "text-red-500",
    bgColor: "bg-red-50 hover:bg-red-100",
  },
  tripadvisor: {
    name: "TripAdvisor Profile",
    icon: Plane,
    color: "text-green-600",
    bgColor: "bg-green-50 hover:bg-green-100",
  },
  trustpilot: {
    name: "Trustpilot Profile",
    icon: Shield,
    color: "text-green-500",
    bgColor: "bg-green-50 hover:bg-green-100",
  },
  booking_com: {
    name: "Booking.com Profile",
    icon: Calendar,
    color: "text-blue-700",
    bgColor: "bg-blue-50 hover:bg-blue-100",
  },
};

const PlatformProfileLinks: React.FC<PlatformProfileLinksProps> = ({
  profiles,
  className = "",
}) => {
  const activeProfiles = profiles.filter((profile) => profile.is_active);

  if (activeProfiles.length === 0) {
    return null;
  }

  const handleProfileClick = (url: string) => {
    window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <div className={`space-y-3 ${className}`}>
      <div className="text-center">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Visit Our Profiles
        </h3>
        <p className="text-sm text-gray-600 mb-4">
          Check out our presence on these platforms or leave a review directly
        </p>
      </div>
      
      <div className="flex flex-wrap justify-center gap-3">
        <TooltipProvider>
          {activeProfiles.map((profile) => {
            const config = platformConfigs[profile.platform_type as keyof typeof platformConfigs];
            if (!config) return null;

            const IconComponent = config.icon;

            return (
              <Tooltip key={profile.id}>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="lg"
                    className={`h-12 w-12 rounded-full border-2 transition-all duration-200 ${config.bgColor} ${config.color} border-current hover:scale-105 hover:shadow-md`}
                    onClick={() => handleProfileClick(profile.profile_url)}
                  >
                    <IconComponent className="h-6 w-6" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="font-medium">{config.name}</p>
                  {profile.profile_name && (
                    <p className="text-xs text-gray-500">{profile.profile_name}</p>
                  )}
                </TooltipContent>
              </Tooltip>
            );
          })}
        </TooltipProvider>
      </div>
    </div>
  );
};

export default PlatformProfileLinks;