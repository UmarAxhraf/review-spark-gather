import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  QrCode,
  Download,
  Share,
  Copy,
  Eye,
  Calendar,
  BarChart3,
  Globe,
  AlertTriangle,
  Settings,
  MoreHorizontal,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { useQRCode } from "@/contexts/QRCodeContext";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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
  onViewQR: () => void;
  onSelect: (checked: boolean) => void;
  isSelected: boolean;
  onAddTag: (tag: string) => void;
  onRemoveTag: (tag: string) => void;
  onUpdateCategory: (category: string) => void;
  onEditQRCode?: (employee: Employee) => void;  // Add this missing prop
  onToggleActive?: (employeeId: string, isActive: boolean) => Promise<void>;
  onRegenerateQR?: (employeeId: string) => Promise<void>;
  availableCategories: string[];
  availableTags: string[];
}

const QRCodeCard: React.FC<QRCodeCardProps> = ({
  employee,
  onViewQR,
  onSelect,
  isSelected,
  onAddTag,
  onRemoveTag,
  onUpdateCategory,
  onEditQRCode,
  onToggleActive,
  onRegenerateQR,
  availableCategories,
  availableTags,
}) => {
  const { settings } = useQRCode();
  const reviewUrl = `${window.location.origin}/review/${employee.qr_code_id}`;
  const isExpired = employee.qr_expires_at
    ? new Date(employee.qr_expires_at) <= new Date()
    : false;
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

  const handleEditSettings = () => {
    // Open edit dialog for this specific QR code
    onEditQRCode?.(employee);
  };

  const handleToggleActive = async () => {
    try {
      // Toggle QR code active status
      await onToggleActive?.(employee.id, !employee.qr_is_active);
      toast.success(`QR code ${employee.qr_is_active ? 'deactivated' : 'activated'} successfully`);
    } catch (error) {
      toast.error('Failed to update QR code status');
    }
  };

  const handleRegenerateQR = async () => {
    try {
      await onRegenerateQR?.(employee.id);
      toast.success('QR code regenerated successfully');
    } catch (error) {
      toast.error('Failed to regenerate QR code');
    }
  };

  return (
    <Card
      className={`w-full hover:shadow-lg transition-shadow ${
        !isActive ? "opacity-75" : ""
      } ${
        isExpired ? "border-red-200 bg-red-50/30" : ""
      }`}
    >
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <QrCode className="h-5 w-5" />
            {employee.name}
          </CardTitle>
          <div className="flex items-center gap-2">
            {getStatusBadge()}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleEditSettings}>
                  <Settings className="mr-2 h-4 w-4" />
                  Edit Settings
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleToggleActive}>
                  <AlertTriangle className="mr-2 h-4 w-4" />
                  {employee.qr_is_active ? 'Deactivate' : 'Activate'}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleRegenerateQR}>
                  <QrCode className="mr-2 h-4 w-4" />
                  Regenerate QR Code
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Enhanced status information for expired QR codes */}
        {isExpired && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <div className="flex items-center gap-2 text-red-700">
              <AlertTriangle className="h-4 w-4" />
              <span className="text-sm font-medium">
                This QR code has expired and cannot receive new reviews
              </span>
            </div>
            <p className="text-xs text-red-600 mt-1">
              Expired on {new Date(employee.qr_expires_at!).toLocaleDateString()}
            </p>
          </div>
        )}

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

        {/* Quick action buttons */}
        <div className="space-y-2">
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
              onClick={handleEditSettings}
              className="flex items-center gap-1"
            >
              <Settings className="h-3 w-3" />
              Edit
            </Button>
          </div>
          <div className="grid grid-cols-2 gap-2">
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
              onClick={handleCopyUrl}
              className="flex items-center gap-1"
              disabled={!isActive}
            >
              <Copy className="h-3 w-3" />
              Copy URL
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default QRCodeCard;
