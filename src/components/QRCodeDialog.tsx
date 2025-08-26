// import React from 'react';
// import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
// import { Button } from "@/components/ui/button";
// import { QRCodeSVG } from "qrcode.react";
// import { Download, Share } from "lucide-react";
// import { toast } from "sonner";

// interface Employee {
//   id: string;
//   name: string;
//   qr_code_id: string;
// }

// interface QRCodeDialogProps {
//   employee: Employee | null;
//   open: boolean;
//   onOpenChange: (open: boolean) => void;
// }

// const QRCodeDialog = ({ employee, open, onOpenChange }: QRCodeDialogProps) => {
//   if (!employee) return null;

//   const reviewUrl = `${window.location.origin}/review/${employee.qr_code_id}`;

//   const downloadQR = () => {
//     const svg = document.getElementById('qr-code-svg');
//     if (!svg) return;

//     const svgData = new XMLSerializer().serializeToString(svg);
//     const canvas = document.createElement('canvas');
//     const ctx = canvas.getContext('2d');
//     const img = new Image();

//     img.onload = () => {
//       canvas.width = img.width;
//       canvas.height = img.height;
//       ctx?.drawImage(img, 0, 0);

//       const pngFile = canvas.toDataURL('image/png');
//       const downloadLink = document.createElement('a');
//       downloadLink.download = `${employee.name}-qr-code.png`;
//       downloadLink.href = pngFile;
//       downloadLink.click();
//     };

//     img.src = 'data:image/svg+xml;base64,' + btoa(svgData);
//   };

//   const shareQR = async () => {
//     try {
//       if (navigator.share) {
//         await navigator.share({
//           title: `Review QR Code for ${employee.name}`,
//           text: `Scan this QR code to leave a review for ${employee.name}`,
//           url: reviewUrl,
//         });
//       } else {
//         await navigator.clipboard.writeText(reviewUrl);
//         toast.success('Review URL copied to clipboard!');
//       }
//     } catch (error) {
//       console.error('Error sharing:', error);
//       toast.error('Failed to share QR code');
//     }
//   };

//   return (
//     <Dialog open={open} onOpenChange={onOpenChange}>
//       <DialogContent className="sm:max-w-[400px]">
//         <DialogHeader>
//           <DialogTitle>QR Code for {employee.name}</DialogTitle>
//         </DialogHeader>

//         <div className="space-y-6">
//           <div className="flex justify-center p-6 bg-white border-2 border-gray-200 rounded-lg">
//             <QRCodeSVG
//               id="qr-code-svg"
//               value={reviewUrl}
//               size={200}
//               level="M"
//               includeMargin={true}
//             />
//           </div>

//           <div className="space-y-2">
//             <p className="text-sm text-gray-600">
//               <strong>Review URL:</strong>
//             </p>
//             <p className="text-xs bg-gray-100 p-2 rounded break-all">
//               {reviewUrl}
//             </p>
//           </div>

//           <div className="flex gap-2">
//             <Button onClick={downloadQR} variant="outline" className="flex-1">
//               <Download className="h-4 w-4 mr-2" />
//               Download PNG
//             </Button>
//             <Button onClick={shareQR} className="flex-1">
//               <Share className="h-4 w-4 mr-2" />
//               Share
//             </Button>
//           </div>
//         </div>
//       </DialogContent>
//     </Dialog>
//   );
// };

// export default QRCodeDialog;

//=============================================>>>>>>>>>>>>>>>>>>>==========================================

import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTabs,
  DialogTab,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { QRCodeSVG } from "qrcode.react";
import { Download, Share, Palette, Settings } from "lucide-react";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useQRCode } from "@/contexts/QRCodeContext";

interface Employee {
  id: string;
  name: string;
  qr_code_id: string;
}

interface QRCodeDialogProps {
  employee: Employee | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const QRCodeDialog = ({ employee, open, onOpenChange }: QRCodeDialogProps) => {
  const { settings, updateSettings } = useQRCode();
  const [activeTab, setActiveTab] = useState("preview");

  if (!employee) return null;

  const reviewUrl = `${window.location.origin}/review/${employee.qr_code_id}`;

  const downloadQR = () => {
    const svg = document.getElementById("qr-code-svg-dialog");
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
    };

    img.src = "data:image/svg+xml;base64," + btoa(svgData);
  };

  const shareQR = async () => {
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

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        updateSettings({ logoImage: event.target?.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const removeLogo = () => {
    updateSettings({ logoImage: null });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>QR Code for {employee.name}</DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="preview">Preview</TabsTrigger>
            <TabsTrigger value="customize">Customize</TabsTrigger>
          </TabsList>

          <TabsContent value="preview" className="space-y-6">
            <div className="flex justify-center p-6 bg-white border-2 border-gray-200 rounded-lg">
              <QRCodeSVG
                id="qr-code-svg-dialog"
                value={reviewUrl}
                size={200}
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

            <div className="space-y-2">
              <p className="text-sm text-gray-600">
                <strong>Review URL:</strong>
              </p>
              <p className="text-xs bg-gray-100 p-2 rounded break-all">
                {reviewUrl}
              </p>
            </div>

            <div className="flex gap-2">
              <Button onClick={downloadQR} variant="outline" className="flex-1">
                <Download className="h-4 w-4 mr-2" />
                Download PNG
              </Button>
              <Button onClick={shareQR} className="flex-1">
                <Share className="h-4 w-4 mr-2" />
                Share
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="customize" className="space-y-6">
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="fgColor">Foreground Color</Label>
                  <Input
                    id="fgColor"
                    type="color"
                    value={settings.fgColor}
                    onChange={(e) =>
                      updateSettings({ fgColor: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bgColor">Background Color</Label>
                  <Input
                    id="bgColor"
                    type="color"
                    value={settings.bgColor}
                    onChange={(e) =>
                      updateSettings({ bgColor: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="errorLevel">Error Correction Level</Label>
                <Select
                  value={settings.errorCorrectionLevel}
                  onValueChange={(value) =>
                    updateSettings({
                      errorCorrectionLevel: value as "L" | "M" | "Q" | "H",
                    })
                  }
                >
                  <SelectTrigger id="errorLevel">
                    <SelectValue placeholder="Select level" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="L">Low (7%)</SelectItem>
                    <SelectItem value="M">Medium (15%)</SelectItem>
                    <SelectItem value="Q">Quartile (25%)</SelectItem>
                    <SelectItem value="H">High (30%)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-500">
                  Higher levels allow for more damage to the QR code while
                  remaining scannable.
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="includeMargin">Include Margin</Label>
                  <Switch
                    id="includeMargin"
                    checked={settings.includeMargin}
                    onCheckedChange={(checked) =>
                      updateSettings({ includeMargin: checked })
                    }
                  />
                </div>
                <p className="text-xs text-gray-500">
                  Adds a white margin around the QR code for better scanning.
                </p>
              </div>

              <div className="space-y-2">
                <Label>Logo Image</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={handleLogoUpload}
                    className="flex-1"
                  />
                  {settings.logoImage && (
                    <Button variant="outline" size="sm" onClick={removeLogo}>
                      Remove
                    </Button>
                  )}
                </div>
                {settings.logoImage && (
                  <div className="space-y-4 mt-4">
                    <div className="space-y-2">
                      <Label>Logo Size</Label>
                      <div className="flex items-center gap-4">
                        <Slider
                          value={[settings.logoWidth]}
                          min={20}
                          max={100}
                          step={1}
                          onValueChange={(value) =>
                            updateSettings({
                              logoWidth: value[0],
                              logoHeight: value[0],
                            })
                          }
                        />
                        <span className="text-sm">{settings.logoWidth}px</span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Logo Opacity</Label>
                      <div className="flex items-center gap-4">
                        <Slider
                          value={[settings.logoOpacity * 100]}
                          min={10}
                          max={100}
                          step={5}
                          onValueChange={(value) =>
                            updateSettings({
                              logoOpacity: value[0] / 100,
                            })
                          }
                        />
                        <span className="text-sm">
                          {Math.round(settings.logoOpacity * 100)}%
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default QRCodeDialog;
