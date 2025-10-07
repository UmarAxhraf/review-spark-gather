import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { QRCodeSVG } from "qrcode.react";
import { Download, Copy } from "lucide-react";
import { toast } from "sonner";

interface QRCodeDialogProps {
  employee: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function QRCodeDialog({
  employee,
  open,
  onOpenChange,
}: QRCodeDialogProps) {
  // Generate QR code URL dynamically using qr_code_id
  const qrCodeUrl = employee?.qr_code_id
    ? `${window.location.origin}/review/${employee.qr_code_id}`
    : "";
  const employeeName = employee?.name || "Employee";

  const handleDownload = () => {
    if (!qrCodeUrl) {
      toast.error("No QR code available for this employee");
      return;
    }

    // Create SVG element
    const svg = document.querySelector("#qr-code-svg");
    if (!svg) {
      toast.error("QR code not found");
      return;
    }

    // Convert SVG to canvas and download
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const img = new Image();

    // Get SVG data
    const svgData = new XMLSerializer().serializeToString(svg);
    const svgBlob = new Blob([svgData], {
      type: "image/svg+xml;charset=utf-8",
    });
    const url = URL.createObjectURL(svgBlob);

    img.onload = () => {
      canvas.width = 512;
      canvas.height = 512;
      ctx?.drawImage(img, 0, 0, 512, 512);

      // Download the image
      canvas.toBlob((blob) => {
        if (blob) {
          const downloadUrl = URL.createObjectURL(blob);
          const link = document.createElement("a");
          link.href = downloadUrl;
          link.download = `${employeeName.replace(/\s+/g, "_")}_QR_Code.png`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(downloadUrl);
          toast.success("QR code downloaded successfully");
        }
      }, "image/png");

      URL.revokeObjectURL(url);
    };

    img.src = url;
  };

  const handleCopyUrl = async () => {
    if (!qrCodeUrl) {
      toast.error("No QR code available for this employee");
      return;
    }

    try {
      await navigator.clipboard.writeText(qrCodeUrl);
      toast.success("QR code URL copied to clipboard");
    } catch (error) {
      toast.error("Failed to copy URL to clipboard");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>QR Code - {employeeName}</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col items-center space-y-6 py-6">
          {qrCodeUrl ? (
            <>
              <div className="bg-white p-4 rounded-lg shadow-sm">
                <QRCodeSVG
                  id="qr-code-svg"
                  value={qrCodeUrl}
                  size={300}
                  level="H"
                  includeMargin={true}
                />
              </div>

              <div className="text-center space-y-2">
                <p className="text-sm text-gray-600">
                  Scan this QR code to leave a review
                </p>
                <p className="text-xs text-gray-500 break-all max-w-[400px]">
                  {qrCodeUrl}
                </p>
              </div>

              <div className="flex gap-3">
                <Button
                  onClick={handleDownload}
                  className="flex items-center gap-2"
                >
                  <Download size={16} />
                  Download
                </Button>
                <Button
                  onClick={handleCopyUrl}
                  variant="outline"
                  className="flex items-center gap-2"
                >
                  <Copy size={16} />
                  Copy URL
                </Button>
              </div>
            </>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-500">
                No QR code available for this employee
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
