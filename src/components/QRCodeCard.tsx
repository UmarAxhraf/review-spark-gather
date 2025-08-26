// import React from "react";
// import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
// import { Button } from "@/components/ui/button";
// import { Badge } from "@/components/ui/badge";
// import { QRCodeSVG } from "qrcode.react";
// import { QrCode, Eye, Download, Share, Copy } from "lucide-react";
// import { toast } from "sonner";
// import { useQRCode } from "@/contexts/QRCodeContext";

// interface Employee {
//   id: string;
//   name: string;
//   email?: string;
//   position?: string;
//   qr_code_id: string;
//   is_active: boolean;
//   created_at: string;
// }

// interface QRCodeCardProps {
//   employee: Employee;
//   onViewQR: (employee: Employee) => void;
// }

// const QRCodeCard = ({ employee, onViewQR }: QRCodeCardProps) => {
//   const { settings } = useQRCode();
//   const reviewUrl = `${window.location.origin}/review/${employee.qr_code_id}`;

//   const handleDownload = () => {
//     const svg = document.getElementById(`qr-code-svg-${employee.id}`);
//     if (!svg) return;

//     const svgData = new XMLSerializer().serializeToString(svg);
//     const canvas = document.createElement("canvas");
//     const ctx = canvas.getContext("2d");
//     const img = new Image();

//     img.onload = () => {
//       canvas.width = img.width;
//       canvas.height = img.height;
//       ctx?.drawImage(img, 0, 0);

//       const pngFile = canvas.toDataURL("image/png");
//       const downloadLink = document.createElement("a");
//       downloadLink.download = `${employee.name}-qr-code.png`;
//       downloadLink.href = pngFile;
//       downloadLink.click();

//       toast.success("QR code downloaded successfully");
//     };

//     img.src = "data:image/svg+xml;base64," + btoa(svgData);
//   };

//   const handleShare = async () => {
//     try {
//       if (navigator.share) {
//         await navigator.share({
//           title: `Review QR Code for ${employee.name}`,
//           text: `Scan this QR code to leave a review for ${employee.name}`,
//           url: reviewUrl,
//         });
//       } else {
//         await navigator.clipboard.writeText(reviewUrl);
//         toast.success("Review URL copied to clipboard!");
//       }
//     } catch (error) {
//       console.error("Error sharing:", error);
//       toast.error("Failed to share QR code");
//     }
//   };

//   const handleCopyUrl = async () => {
//     try {
//       await navigator.clipboard.writeText(reviewUrl);
//       toast.success("Review URL copied to clipboard!");
//     } catch (error) {
//       console.error("Error copying URL:", error);
//       toast.error("Failed to copy URL");
//     }
//   };

//   return (
//     <Card className="w-full hover:shadow-lg transition-shadow">
//       <CardHeader className="pb-3">
//         <div className="flex items-center justify-between">
//           <CardTitle className="text-lg flex items-center gap-2">
//             <QrCode className="h-5 w-5" />
//             {employee.name}
//           </CardTitle>
//           <Badge variant={employee.is_active ? "default" : "secondary"}>
//             {employee.is_active ? "Active" : "Inactive"}
//           </Badge>
//         </div>
//       </CardHeader>
//       <CardContent className="space-y-4">
//         <div className="space-y-2">
//           {employee.position && (
//             <p className="text-sm text-gray-600">
//               <strong>Position:</strong> {employee.position}
//             </p>
//           )}
//           {employee.email && (
//             <p className="text-sm text-gray-600">
//               <strong>Email:</strong> {employee.email}
//             </p>
//           )}
//           <p className="text-xs text-gray-500">
//             <strong>Created:</strong>{" "}
//             {new Date(employee.created_at).toLocaleDateString()}
//           </p>
//         </div>

//         <div className="flex justify-center p-4 bg-gray-50 rounded-lg">
//           <QRCodeSVG
//             id={`qr-code-svg-${employee.id}`}
//             value={reviewUrl}
//             size={120}
//             level={settings.errorCorrectionLevel}
//             fgColor={settings.fgColor}
//             bgColor={settings.bgColor}
//             includeMargin={settings.includeMargin}
//             imageSettings={
//               settings.logoImage
//                 ? {
//                     src: settings.logoImage,
//                     width: settings.logoWidth,
//                     height: settings.logoHeight,
//                     excavate: true,
//                     opacity: settings.logoOpacity,
//                   }
//                 : undefined
//             }
//           />
//         </div>

//         <div className="grid grid-cols-2 gap-2">
//           <Button
//             variant="outline"
//             size="sm"
//             onClick={() => onViewQR(employee)}
//             className="flex items-center gap-1"
//           >
//             <Eye className="h-3 w-3" />
//             View
//           </Button>
//           <Button
//             variant="outline"
//             size="sm"
//             onClick={handleDownload}
//             className="flex items-center gap-1"
//           >
//             <Download className="h-3 w-3" />
//             Download
//           </Button>
//           <Button
//             variant="outline"
//             size="sm"
//             onClick={handleShare}
//             className="flex items-center gap-1"
//           >
//             <Share className="h-3 w-3" />
//             Share
//           </Button>
//           <Button
//             variant="outline"
//             size="sm"
//             onClick={handleCopyUrl}
//             className="flex items-center gap-1"
//           >
//             <Copy className="h-3 w-3" />
//             Copy URL
//           </Button>
//         </div>
//       </CardContent>
//     </Card>
//   );
// };

// export default QRCodeCard;

//===============================================>>>>>>>>>>>>>>>>>>>>=========================================

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { QRCodeSVG } from "qrcode.react";
import {
  QrCode,
  Eye,
  Download,
  Share,
  Copy,
  Calendar,
  BarChart3,
  Globe,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import { useQRCode } from "@/contexts/QRCodeContext";

interface Employee {
  id: string;
  name: string;
  email?: string;
  position?: string;
  qr_code_id: string;
  is_active: boolean;
  created_at: string;
  qr_expires_at?: string;
  qr_scan_limit?: number;
  qr_is_active: boolean;
  custom_landing_page?: string;
  qr_redirect_url?: string;
}

interface QRCodeCardProps {
  employee: Employee;
  onViewQR: (employee: Employee) => void;
}

const QRCodeCard = ({ employee, onViewQR }: QRCodeCardProps) => {
  const { settings } = useQRCode();
  const reviewUrl =
    employee.qr_redirect_url ||
    `${window.location.origin}/review/${employee.qr_code_id}`;

  const isExpired =
    employee.qr_expires_at && new Date(employee.qr_expires_at) <= new Date();
  const isActive = employee.qr_is_active && !isExpired;

  const daysUntilExpiry = employee.qr_expires_at
    ? Math.ceil(
        (new Date(employee.qr_expires_at).getTime() - new Date().getTime()) /
          (1000 * 60 * 60 * 24)
      )
    : null;

  const handleDownload = () => {
    const svg = document.getElementById(`qr-code-svg-${employee.id}`);
    if (!svg) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const img = new Image();

    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx?.drawImage(img, 0, 0);

      const pngFile = canvas.toDataURL("image/png");
      const downloadLink = document.createElement("a");
      downloadLink.download = `${employee.name}-qr-code.png`;
      downloadLink.href = pngFile;
      downloadLink.click();

      toast.success("QR code downloaded successfully");
    };

    img.src = "data:image/svg+xml;base64," + btoa(svgData);
  };

  const handleShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: `Review QR Code for ${employee.name}`,
          text: `Scan this QR code to leave a review for ${employee.name}`,
          url: reviewUrl,
        });
      } else {
        await navigator.clipboard.writeText(reviewUrl);
        toast.success("Review URL copied to clipboard!");
      }
    } catch (error) {
      console.error("Error sharing:", error);
      toast.error("Failed to share QR code");
    }
  };

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(reviewUrl);
      toast.success("Review URL copied to clipboard!");
    } catch (error) {
      console.error("Error copying URL:", error);
      toast.error("Failed to copy URL");
    }
  };

  const getStatusBadge = () => {
    if (isExpired) {
      return <Badge variant="destructive">Expired</Badge>;
    }
    if (!employee.qr_is_active) {
      return <Badge variant="secondary">Inactive</Badge>;
    }
    if (daysUntilExpiry !== null && daysUntilExpiry <= 7) {
      return (
        <Badge variant="outline" className="border-orange-500 text-orange-600">
          Expires Soon
        </Badge>
      );
    }
    return <Badge variant="default">Active</Badge>;
  };

  return (
    <Card
      className={`w-full hover:shadow-lg transition-shadow ${
        !isActive ? "opacity-75" : ""
      }`}
    >
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <QrCode className="h-5 w-5" />
            {employee.name}
          </CardTitle>
          {getStatusBadge()}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          {employee.position && (
            <p className="text-sm text-gray-600">
              <strong>Position:</strong> {employee.position}
            </p>
          )}
          {employee.email && (
            <p className="text-sm text-gray-600">
              <strong>Email:</strong> {employee.email}
            </p>
          )}

          {/* Enhanced Information */}
          {employee.qr_expires_at && (
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="h-4 w-4" />
              <span
                className={
                  isExpired
                    ? "text-red-600"
                    : daysUntilExpiry && daysUntilExpiry <= 7
                    ? "text-orange-600"
                    : "text-gray-600"
                }
              >
                {isExpired
                  ? "Expired"
                  : `Expires ${new Date(
                      employee.qr_expires_at
                    ).toLocaleDateString()}`}
              </span>
            </div>
          )}

          {employee.qr_scan_limit && (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <BarChart3 className="h-4 w-4" />
              <span>Scan limit: {employee.qr_scan_limit}</span>
            </div>
          )}

          {employee.custom_landing_page && (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Globe className="h-4 w-4" />
              <span>Custom landing page</span>
            </div>
          )}

          <p className="text-xs text-gray-500">
            <strong>Created:</strong>{" "}
            {new Date(employee.created_at).toLocaleDateString()}
          </p>
        </div>

        <div className="flex justify-center p-4 bg-gray-50 rounded-lg relative">
          {!isActive && (
            <div className="absolute inset-0 bg-gray-900/20 rounded-lg flex items-center justify-center">
              <AlertTriangle className="h-8 w-8 text-gray-600" />
            </div>
          )}
          <QRCodeSVG
            id={`qr-code-svg-${employee.id}`}
            value={reviewUrl}
            size={120}
            level={settings.errorCorrectionLevel}
            fgColor={settings.fgColor}
            bgColor={settings.bgColor}
            includeMargin={settings.includeMargin}
            imageSettings={
              settings.logoImage
                ? {
                    src: settings.logoImage,
                    width: settings.logoWidth,
                    height: settings.logoHeight,
                    excavate: true,
                    opacity: settings.logoOpacity,
                  }
                : undefined
            }
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onViewQR(employee)}
            className="flex items-center gap-1"
          >
            <Eye className="h-3 w-3" />
            View
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownload}
            className="flex items-center gap-1"
            disabled={!isActive}
          >
            <Download className="h-3 w-3" />
            Download
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleShare}
            className="flex items-center gap-1"
            disabled={!isActive}
          >
            <Share className="h-3 w-3" />
            Share
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleCopyUrl}
            className="flex items-center gap-1"
            disabled={!isActive}
          >
            <Copy className="h-3 w-3" />
            Copy URL
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default QRCodeCard;
