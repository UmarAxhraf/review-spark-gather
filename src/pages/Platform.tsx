// import React, { useState } from "react";
// import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
// import { Button } from "@/components/ui/button";
// import { Badge } from "@/components/ui/badge";
// import { Switch } from "@/components/ui/switch";
// import {
//   PlugZap,
//   Star,
//   MapPin,
//   Plane,
//   Shield,
//   ExternalLink,
//   Settings,
//   Plus,
//   CheckCircle,
//   Clock,
//   AlertCircle,
// } from "lucide-react";
// import { BackButton } from "@/components/ui/back-button";

// interface Integration {
//   id: string;
//   name: string;
//   description: string;
//   icon: React.ComponentType<any>;
//   status: "connected" | "available" | "coming-soon";
//   reviewCount?: number;
//   lastSync?: string;
//   features: string[];
// }

// const Platform = () => {
//   const [integrations] = useState<Integration[]>([
//     {
//       id: "google-my-business",
//       name: "Google My Business",
//       description:
//         "Sync reviews from your Google Business Profile to get comprehensive insights.",
//       icon: MapPin,
//       status: "available",
//       features: [
//         "Review Import",
//         "Rating Analytics",
//         "Response Management",
//         "Real-time Sync",
//       ],
//     },
//     {
//       id: "tripadvisor",
//       name: "TripAdvisor",
//       description:
//         "Import and manage TripAdvisor reviews for hospitality and travel businesses.",
//       icon: Plane,
//       status: "available",
//       features: [
//         "Review Import",
//         "Traveler Insights",
//         "Ranking Tracking",
//         "Competitor Analysis",
//       ],
//     },
//     {
//       id: "trustpilot",
//       name: "Trustpilot",
//       description:
//         "Connect your Trustpilot account to centralize all customer feedback.",
//       icon: Shield,
//       status: "available",
//       features: [
//         "Review Import",
//         "Trust Score Tracking",
//         "Invitation Management",
//         "Analytics",
//       ],
//     },
//     {
//       id: "yelp",
//       name: "Yelp",
//       description:
//         "Sync Yelp reviews and manage your business reputation across platforms.",
//       icon: Star,
//       status: "coming-soon",
//       features: [
//         "Review Import",
//         "Business Insights",
//         "Photo Management",
//         "Check-in Data",
//       ],
//     },
//     {
//       id: "facebook",
//       name: "Facebook Reviews",
//       description: "Import reviews from your Facebook business page.",
//       icon: ExternalLink,
//       status: "coming-soon",
//       features: [
//         "Review Import",
//         "Page Insights",
//         "Social Analytics",
//         "Engagement Tracking",
//       ],
//     },
//     {
//       id: "booking",
//       name: "Booking.com",
//       description: "Connect your Booking.com property to import guest reviews.",
//       icon: ExternalLink,
//       status: "coming-soon",
//       features: [
//         "Guest Reviews",
//         "Property Analytics",
//         "Booking Insights",
//         "Seasonal Trends",
//       ],
//     },
//   ]);

//   const getStatusBadge = (status: string) => {
//     switch (status) {
//       case "connected":
//         return (
//           <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
//             <CheckCircle className="w-3 h-3 mr-1" />
//             Connected
//           </Badge>
//         );
//       case "available":
//         return (
//           <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">
//             <Plus className="w-3 h-3 mr-1" />
//             Available
//           </Badge>
//         );
//       case "coming-soon":
//         return (
//           <Badge className="bg-gray-100 text-gray-600 hover:bg-gray-100">
//             <Clock className="w-3 h-3 mr-1" />
//             Coming Soon
//           </Badge>
//         );
//       default:
//         return null;
//     }
//   };

//   const getStatusIcon = (status: string) => {
//     switch (status) {
//       case "connected":
//         return <CheckCircle className="w-5 h-5 text-green-600" />;
//       case "available":
//         return <Plus className="w-5 h-5 text-blue-600" />;
//       case "coming-soon":
//         return <Clock className="w-5 h-5 text-gray-400" />;
//       default:
//         return null;
//     }
//   };

//   return (
//     <div className="p-6 space-y-6 max-w-7xl mx-auto">
//       <div className="mb-6">
//         <BackButton />
//       </div>
//       {/* Header Section */}
//       <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
//         <div>
//           <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
//             <PlugZap className="w-8 h-8 text-blue-600" />
//             Platform Integrations
//           </h1>
//           <p className="text-gray-600 mt-2">
//             Connect your review platforms to centralize all customer feedback in
//             one place
//           </p>
//         </div>
//         <Button className="flex items-center gap-2 w-full sm:w-auto">
//           <Settings className="w-4 h-4" />
//           Integration Settings
//         </Button>
//       </div>

//       {/* Stats Overview */}
//       <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
//         <Card>
//           <CardContent className="p-4">
//             <div className="flex items-center justify-between">
//               <div>
//                 <p className="text-sm text-gray-600">Connected</p>
//                 <p className="text-2xl font-bold text-green-600">0</p>
//               </div>
//               <CheckCircle className="w-8 h-8 text-green-600" />
//             </div>
//           </CardContent>
//         </Card>
//         <Card>
//           <CardContent className="p-4">
//             <div className="flex items-center justify-between">
//               <div>
//                 <p className="text-sm text-gray-600">Available</p>
//                 <p className="text-2xl font-bold text-blue-600">3</p>
//               </div>
//               <Plus className="w-8 h-8 text-blue-600" />
//             </div>
//           </CardContent>
//         </Card>
//         <Card>
//           <CardContent className="p-4">
//             <div className="flex items-center justify-between">
//               <div>
//                 <p className="text-sm text-gray-600">Coming Soon</p>
//                 <p className="text-2xl font-bold text-gray-600">3</p>
//               </div>
//               <Clock className="w-8 h-8 text-gray-600" />
//             </div>
//           </CardContent>
//         </Card>
//         <Card>
//           <CardContent className="p-4">
//             <div className="flex items-center justify-between">
//               <div>
//                 <p className="text-sm text-gray-600">Total Reviews</p>
//                 <p className="text-2xl font-bold text-purple-600">--</p>
//               </div>
//               <Star className="w-8 h-8 text-purple-600" />
//             </div>
//           </CardContent>
//         </Card>
//       </div>

//       {/* Integration Cards */}
//       <div className="space-y-4">
//         <h2 className="text-xl font-semibold text-gray-900">
//           Available Integrations
//         </h2>
//         <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
//           {integrations.map((integration) => {
//             const IconComponent = integration.icon;
//             return (
//               <Card
//                 key={integration.id}
//                 className="hover:shadow-lg transition-shadow"
//               >
//                 <CardHeader className="pb-4">
//                   <div className="flex items-start justify-between">
//                     <div className="flex items-center gap-3">
//                       <div className="p-2 bg-gray-100 rounded-lg">
//                         <IconComponent className="w-6 h-6 text-gray-700" />
//                       </div>
//                       <div>
//                         <CardTitle className="text-lg">
//                           {integration.name}
//                         </CardTitle>
//                         {getStatusBadge(integration.status)}
//                       </div>
//                     </div>
//                     {getStatusIcon(integration.status)}
//                   </div>
//                 </CardHeader>
//                 <CardContent className="space-y-4">
//                   <p className="text-gray-600 text-sm leading-relaxed">
//                     {integration.description}
//                   </p>

//                   {/* Features */}
//                   {/* <div>
//                     <p className="text-sm font-medium text-gray-900 mb-2">
//                       Features:
//                     </p>
//                     <div className="flex flex-wrap gap-2">
//                       {integration.features.map((feature, index) => (
//                         <Badge
//                           key={index}
//                           variant="outline"
//                           className="text-xs"
//                         >
//                           {feature}
//                         </Badge>
//                       ))}
//                     </div>
//                   </div> */}

//                   {/* Action Button */}
//                   <div className="pt-2">
//                     {integration.status === "available" && (
//                       <Button className="w-full" variant="default">
//                         <Plus className="w-4 h-4 mr-2" />
//                         Connect {integration.name}
//                       </Button>
//                     )}
//                     {integration.status === "connected" && (
//                       <div className="space-y-2">
//                         <div className="flex items-center justify-between">
//                           <span className="text-sm text-gray-600">
//                             Auto-sync enabled
//                           </span>
//                           <Switch checked={true} />
//                         </div>
//                         <Button className="w-full" variant="outline">
//                           <Settings className="w-4 h-4 mr-2" />
//                           Manage Integration
//                         </Button>
//                       </div>
//                     )}
//                     {integration.status === "coming-soon" && (
//                       <Button className="w-full" variant="outline" disabled>
//                         <Clock className="w-4 h-4 mr-2" />
//                         Coming Soon
//                       </Button>
//                     )}
//                   </div>
//                 </CardContent>
//               </Card>
//             );
//           })}
//         </div>
//       </div>

//       {/* Help Section */}
//       <Card className="bg-blue-50 border-blue-200">
//         <CardContent className="p-6">
//           <div className="flex flex-col sm:flex-row sm:items-start gap-4">
//             <AlertCircle className="w-6 h-6 text-blue-600 mt-1 flex-shrink-0" />
//             <div className="flex-1">
//               <h3 className="font-semibold text-blue-900 mb-2">
//                 Need Help with Integrations?
//               </h3>
//               <p className="text-blue-800 text-sm mb-4">
//                 Our team can help you set up integrations and migrate your
//                 existing reviews. Each integration includes step-by-step setup
//                 guides and dedicated support.
//               </p>
//               <div className="flex flex-col sm:flex-row gap-3">
//                 <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
//                   Contact Support
//                 </Button>
//                 <Button
//                   size="sm"
//                   variant="outline"
//                   className="border-blue-300 text-blue-700 hover:bg-blue-100"
//                 >
//                   View Documentation
//                 </Button>
//               </div>
//             </div>
//           </div>
//         </CardContent>
//       </Card>
//     </div>
//   );
// };

// export default Platform;

import React from "react";

const Platform = () => {
  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
        Platform Integrations
      </h1>
      {/* <p className="text-gray-600 mt-2">
        Connect your review platforms to centralize all customer feedback in one
        place
      </p> */}
    </div>
  );
};

export default Platform;
