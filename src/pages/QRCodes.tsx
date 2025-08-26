// import React, { useState, useEffect } from "react";
// import { useAuth } from "@/contexts/AuthContext";
// import { supabase } from "@/integrations/supabase/client";
// import { toast } from "sonner";
// import TeamLayout from "@/components/TeamLayout";
// import QRCodeCard from "@/components/QRCodeCard";
// import QRCodeDialog from "@/components/QRCodeDialog";
// import { Button } from "@/components/ui/button";
// import { Input } from "@/components/ui/input";
// import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
// import { Search, QrCode, Download, Share2, Settings } from "lucide-react";
// // import { useQRCode } from "@/contexts/QRCodeContext";
// import { useQRCode } from "../contexts/QRCodeContext";
// import { QRCodeSVG } from "qrcode.react";
// import JSZip from "jszip";
// import { saveAs } from "file-saver";
// import { Progress } from "@/components/ui/progress";

// interface Employee {
//   id: string;
//   name: string;
//   email?: string;
//   position?: string;
//   qr_code_id: string;
//   is_active: boolean;
//   created_at: string;
// }

// const QRCodes = () => {
//   const { user } = useAuth();
//   const { settings } = useQRCode();
//   const [employees, setEmployees] = useState<Employee[]>([]);
//   const [loading, setLoading] = useState(true);
//   const [searchTerm, setSearchTerm] = useState("");
//   const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(
//     null
//   );
//   const [qrDialogOpen, setQrDialogOpen] = useState(false);
//   const [downloadProgress, setDownloadProgress] = useState(0);
//   const [isDownloading, setIsDownloading] = useState(false);

//   useEffect(() => {
//     if (user) {
//       fetchEmployees();
//     }
//   }, [user]);

//   const fetchEmployees = async () => {
//     if (!user) return;

//     try {
//       const { data, error } = await supabase
//         .from("employees")
//         .select("*")
//         .eq("company_id", user.id)
//         .order("created_at", { ascending: false });

//       if (error) throw error;
//       setEmployees(data || []);
//     } catch (error: any) {
//       console.error("Error fetching employees:", error);
//       toast.error("Failed to load QR codes");
//     } finally {
//       setLoading(false);
//     }
//   };

//   const handleViewQR = (employee: Employee) => {
//     setSelectedEmployee(employee);
//     setQrDialogOpen(true);
//   };

//   const generateQRCodeImage = (
//     employee: Employee
//   ): Promise<{ name: string; blob: Blob }> => {
//     return new Promise((resolve) => {
//       const reviewUrl = `${window.location.origin}/review/${employee.qr_code_id}`;
//       const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
//       const qrCodeContainer = document.createElement("div");
//       document.body.appendChild(qrCodeContainer);

//       // Render QR code with current settings
//       import("react-dom/client").then(({ createRoot }) => {
//         const root = createRoot(qrCodeContainer);
//         root.render(
//           <QRCodeSVG
//             value={reviewUrl}
//             size={300}
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
//         );

//         // Wait for render
//         setTimeout(() => {
//           const svgElement = qrCodeContainer.querySelector("svg");
//           if (!svgElement) {
//             document.body.removeChild(qrCodeContainer);
//             resolve({ name: `${employee.name}-qr-code.png`, blob: new Blob() });
//             return;
//           }

//           const svgData = new XMLSerializer().serializeToString(svgElement);
//           const canvas = document.createElement("canvas");
//           const ctx = canvas.getContext("2d");
//           const img = new Image();

//           img.onload = () => {
//             canvas.width = img.width;
//             canvas.height = img.height;
//             ctx?.drawImage(img, 0, 0);

//             canvas.toBlob((blob) => {
//               document.body.removeChild(qrCodeContainer);
//               if (blob) {
//                 resolve({ name: `${employee.name}-qr-code.png`, blob });
//               } else {
//                 resolve({
//                   name: `${employee.name}-qr-code.png`,
//                   blob: new Blob(),
//                 });
//               }
//             });
//           };

//           img.src = "data:image/svg+xml;base64," + btoa(svgData);
//         }, 100);
//       });
//     });
//   };

//   const handleBulkDownload = async () => {
//     if (employees.length === 0) return;

//     setIsDownloading(true);
//     setDownloadProgress(0);

//     try {
//       const zip = new JSZip();
//       const activeEmployees = employees.filter((emp) => emp.is_active);

//       for (let i = 0; i < activeEmployees.length; i++) {
//         const employee = activeEmployees[i];
//         const { name, blob } = await generateQRCodeImage(employee);
//         zip.file(name, blob);

//         // Update progress
//         const progress = Math.round(((i + 1) / activeEmployees.length) * 100);
//         setDownloadProgress(progress);
//       }

//       const zipBlob = await zip.generateAsync({ type: "blob" });
//       saveAs(zipBlob, "qr-codes.zip");
//       toast.success("QR codes downloaded successfully");
//     } catch (error) {
//       console.error("Error generating ZIP file:", error);
//       toast.error("Failed to download QR codes");
//     } finally {
//       setIsDownloading(false);
//     }
//   };

//   const filteredEmployees = employees.filter(
//     (employee) =>
//       employee.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
//       employee.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
//       employee.position?.toLowerCase().includes(searchTerm.toLowerCase())
//   );

//   const activeQRCodes = employees.filter((emp) => emp.is_active);
//   const totalQRCodes = employees.length;

//   if (loading) {
//     return (
//       <TeamLayout>
//         <div className="flex items-center justify-center h-64">
//           <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
//         </div>
//       </TeamLayout>
//     );
//   }

//   return (
//     <TeamLayout>
//       <div className="space-y-6">
//         {/* Header */}
//         <div className="flex items-center justify-between">
//           <div>
//             <h1 className="text-3xl font-bold text-gray-900">
//               QR Code Management
//             </h1>
//             <p className="text-gray-600">
//               Generate, manage, and track QR codes for review collection
//             </p>
//           </div>
//           <Button variant="outline" onClick={() => setQrDialogOpen(true)}>
//             <Settings className="h-4 w-4 mr-2" />
//             Customize QR Codes
//           </Button>
//         </div>

//         {/* Stats Cards */}
//         <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
//           <Card>
//             <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
//               <CardTitle className="text-sm font-medium">
//                 Total QR Codes
//               </CardTitle>
//               <QrCode className="h-4 w-4 text-muted-foreground" />
//             </CardHeader>
//             <CardContent>
//               <div className="text-2xl font-bold">{totalQRCodes}</div>
//               <p className="text-xs text-muted-foreground">
//                 Generated QR codes
//               </p>
//             </CardContent>
//           </Card>
//           <Card>
//             <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
//               <CardTitle className="text-sm font-medium">
//                 Active QR Codes
//               </CardTitle>
//               <QrCode className="h-4 w-4 text-muted-foreground" />
//             </CardHeader>
//             <CardContent>
//               <div className="text-2xl font-bold">{activeQRCodes.length}</div>
//               <p className="text-xs text-muted-foreground">Currently active</p>
//             </CardContent>
//           </Card>
//           <Card>
//             <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
//               <CardTitle className="text-sm font-medium">
//                 Success Rate
//               </CardTitle>
//               <Share2 className="h-4 w-4 text-muted-foreground" />
//             </CardHeader>
//             <CardContent>
//               <div className="text-2xl font-bold">
//                 {totalQRCodes > 0
//                   ? Math.round((activeQRCodes.length / totalQRCodes) * 100)
//                   : 0}
//                 %
//               </div>
//               <p className="text-xs text-muted-foreground">Active QR codes</p>
//             </CardContent>
//           </Card>
//         </div>

//         {/* Actions Bar */}
//         <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
//           <div className="flex items-center space-x-2 flex-1 max-w-sm">
//             <div className="relative flex-1">
//               <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
//               <Input
//                 placeholder="Search QR codes..."
//                 value={searchTerm}
//                 onChange={(e) => setSearchTerm(e.target.value)}
//                 className="pl-10"
//               />
//             </div>
//           </div>

//           <div className="flex items-center space-x-2">
//             {employees.length > 0 && (
//               <Button
//                 variant="outline"
//                 size="sm"
//                 onClick={handleBulkDownload}
//                 disabled={isDownloading}
//               >
//                 <Download className="h-4 w-4 mr-2" />
//                 {isDownloading ? "Preparing ZIP..." : "Download All as ZIP"}
//               </Button>
//             )}
//           </div>
//         </div>

//         {/* Download Progress */}
//         {isDownloading && (
//           <div className="space-y-2">
//             <Progress value={downloadProgress} className="h-2" />
//             <p className="text-xs text-center text-gray-500">
//               Generating QR codes: {downloadProgress}% complete
//             </p>
//           </div>
//         )}

//         {/* QR Codes Grid */}
//         {filteredEmployees.length === 0 ? (
//           <Card>
//             <CardContent className="text-center py-12">
//               <QrCode className="h-12 w-12 text-gray-400 mx-auto mb-4" />
//               <h3 className="text-lg font-medium text-gray-900 mb-2">
//                 {searchTerm ? "No QR codes found" : "No QR codes yet"}
//               </h3>
//               <p className="text-gray-600 mb-4">
//                 {searchTerm
//                   ? "Try adjusting your search terms"
//                   : "Add team members to generate QR codes for review collection"}
//               </p>
//               {!searchTerm && (
//                 <Button onClick={() => (window.location.href = "/employees")}>
//                   <QrCode className="h-4 w-4 mr-2" />
//                   Go to Team Management
//                 </Button>
//               )}
//             </CardContent>
//           </Card>
//         ) : (
//           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
//             {filteredEmployees.map((employee) => (
//               <QRCodeCard
//                 key={employee.id}
//                 employee={employee}
//                 onViewQR={handleViewQR}
//               />
//             ))}
//           </div>
//         )}

//         {/* QR Code Dialog */}
//         <QRCodeDialog
//           employee={selectedEmployee}
//           open={qrDialogOpen}
//           onOpenChange={setQrDialogOpen}
//         />
//       </div>
//     </TeamLayout>
//   );
// };

// export default QRCodes;

//===================================>>>>>>>>>>>>>>>>>>>>>>>>============================================

import React, { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import TeamLayout from "@/components/TeamLayout";
import QRCodeCard from "@/components/QRCodeCard";
import QRCodeDialog from "@/components/QRCodeDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Search,
  QrCode,
  Download,
  Share2,
  Settings,
  Calendar,
  BarChart3,
  Globe,
  RefreshCw,
  Clock,
  Users,
  Eye,
} from "lucide-react";
import { useQRCode } from "../contexts/QRCodeContext";
import { QRCodeSVG } from "qrcode.react";
import JSZip from "jszip";
import { saveAs } from "file-saver";
import { Progress } from "@/components/ui/progress";

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

interface QRAnalytics {
  total_scans: number;
  unique_scans: number;
  conversion_rate: number;
  top_devices: Array<{ device_type: string; count: number }>;
  recent_scans: Array<{
    scan_date: string;
    device_type: string;
    location_country: string;
  }>;
}

const QRCodes = () => {
  const { user } = useAuth();
  const { settings } = useQRCode();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(
    null
  );
  const [qrDialogOpen, setQrDialogOpen] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [isDownloading, setIsDownloading] = useState(false);
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([]);
  const [bulkActionDialogOpen, setBulkActionDialogOpen] = useState(false);
  const [analyticsDialogOpen, setAnalyticsDialogOpen] = useState(false);
  const [qrAnalytics, setQrAnalytics] = useState<QRAnalytics | null>(null);
  const [filterStatus, setFilterStatus] = useState<
    "all" | "active" | "expired" | "inactive"
  >("all");

  // Bulk action states
  const [bulkExpirationDate, setBulkExpirationDate] = useState("");
  const [bulkScanLimit, setBulkScanLimit] = useState("");
  const [bulkCustomPage, setBulkCustomPage] = useState("");
  const [bulkRedirectUrl, setBulkRedirectUrl] = useState("");

  useEffect(() => {
    if (user) {
      fetchEmployees();
    }
  }, [user]);

  const fetchEmployees = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("employees")
        .select("*")
        .eq("company_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setEmployees(data || []);
    } catch (error: any) {
      console.error("Error fetching employees:", error);
      toast.error("Failed to load QR codes");
    } finally {
      setLoading(false);
    }
  };

  const fetchQRAnalytics = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("qr_analytics")
        .select("*")
        .eq("company_id", user.id);

      if (error) throw error;

      // Process analytics data
      const totalScans = data.length;
      const uniqueScans = new Set(data.map((scan) => scan.ip_address)).size;
      const conversionRate =
        totalScans > 0 ? (uniqueScans / totalScans) * 100 : 0;

      const deviceCounts = data.reduce((acc: any, scan) => {
        acc[scan.device_type] = (acc[scan.device_type] || 0) + 1;
        return acc;
      }, {});

      const topDevices = Object.entries(deviceCounts)
        .map(([device_type, count]) => ({
          device_type,
          count: count as number,
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      const recentScans = data
        .sort(
          (a, b) =>
            new Date(b.scan_date).getTime() - new Date(a.scan_date).getTime()
        )
        .slice(0, 10)
        .map((scan) => ({
          scan_date: scan.scan_date,
          device_type: scan.device_type,
          location_country: scan.location_country || "Unknown",
        }));

      setQrAnalytics({
        total_scans: totalScans,
        unique_scans: uniqueScans,
        conversion_rate: Math.round(conversionRate),
        top_devices: topDevices,
        recent_scans: recentScans,
      });
    } catch (error: any) {
      console.error("Error fetching QR analytics:", error);
      toast.error("Failed to load analytics");
    }
  };

  const handleViewQR = (employee: Employee) => {
    setSelectedEmployee(employee);
    setQrDialogOpen(true);
  };

  const handleViewAnalytics = () => {
    fetchQRAnalytics();
    setAnalyticsDialogOpen(true);
  };

  const handleBulkSelect = (employeeId: string, checked: boolean) => {
    if (checked) {
      setSelectedEmployees((prev) => [...prev, employeeId]);
    } else {
      setSelectedEmployees((prev) => prev.filter((id) => id !== employeeId));
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedEmployees(filteredEmployees.map((emp) => emp.id));
    } else {
      setSelectedEmployees([]);
    }
  };

  const handleBulkAction = async (
    action: "activate" | "deactivate" | "update" | "regenerate"
  ) => {
    if (selectedEmployees.length === 0) {
      toast.error("Please select employees first");
      return;
    }

    try {
      let updateData: any = {};

      switch (action) {
        case "activate":
          updateData = { qr_is_active: true };
          break;
        case "deactivate":
          updateData = { qr_is_active: false };
          break;
        case "update":
          updateData = {
            ...(bulkExpirationDate && { qr_expires_at: bulkExpirationDate }),
            ...(bulkScanLimit && { qr_scan_limit: parseInt(bulkScanLimit) }),
            ...(bulkCustomPage && { custom_landing_page: bulkCustomPage }),
            ...(bulkRedirectUrl && { qr_redirect_url: bulkRedirectUrl }),
          };
          break;
        case "regenerate":
          // Generate new QR code IDs
          for (const employeeId of selectedEmployees) {
            const newQrCodeId = `qr_${Date.now()}_${Math.random()
              .toString(36)
              .substr(2, 9)}`;
            await supabase
              .from("employees")
              .update({ qr_code_id: newQrCodeId })
              .eq("id", employeeId);
          }
          break;
      }

      if (action !== "regenerate") {
        const { error } = await supabase
          .from("employees")
          .update(updateData)
          .in("id", selectedEmployees);

        if (error) throw error;
      }

      await fetchEmployees();
      setSelectedEmployees([]);
      setBulkActionDialogOpen(false);
      toast.success(`Bulk ${action} completed successfully`);
    } catch (error: any) {
      console.error(`Error performing bulk ${action}:`, error);
      toast.error(`Failed to perform bulk ${action}`);
    }
  };

  // ... existing code ...

  const generateQRCodeImage = (
    employee: Employee
  ): Promise<{ name: string; blob: Blob }> => {
    return new Promise((resolve) => {
      const reviewUrl = `${window.location.origin}/review/${employee.qr_code_id}`;
      const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      const qrCodeContainer = document.createElement("div");
      document.body.appendChild(qrCodeContainer);

      // Render QR code with current settings
      import("react-dom/client").then(({ createRoot }) => {
        const root = createRoot(qrCodeContainer);
        root.render(
          <QRCodeSVG
            value={reviewUrl}
            size={300}
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
        );

        // Wait for render
        setTimeout(() => {
          const svgElement = qrCodeContainer.querySelector("svg");
          if (!svgElement) {
            document.body.removeChild(qrCodeContainer);
            resolve({ name: `${employee.name}-qr-code.png`, blob: new Blob() });
            return;
          }

          const svgData = new XMLSerializer().serializeToString(svgElement);
          const canvas = document.createElement("canvas");
          const ctx = canvas.getContext("2d");
          const img = new Image();

          img.onload = () => {
            canvas.width = img.width;
            canvas.height = img.height;
            ctx?.drawImage(img, 0, 0);

            canvas.toBlob((blob) => {
              document.body.removeChild(qrCodeContainer);
              if (blob) {
                resolve({ name: `${employee.name}-qr-code.png`, blob });
              } else {
                resolve({
                  name: `${employee.name}-qr-code.png`,
                  blob: new Blob(),
                });
              }
            });
          };

          img.src = "data:image/svg+xml;base64," + btoa(svgData);
        }, 100);
      });
    });
  };

  const handleBulkDownload = async () => {
    if (employees.length === 0) return;

    setIsDownloading(true);
    setDownloadProgress(0);

    try {
      const zip = new JSZip();
      const activeEmployees = employees.filter((emp) => emp.is_active);

      for (let i = 0; i < activeEmployees.length; i++) {
        const employee = activeEmployees[i];
        const { name, blob } = await generateQRCodeImage(employee);
        zip.file(name, blob);

        // Update progress
        const progress = Math.round(((i + 1) / activeEmployees.length) * 100);
        setDownloadProgress(progress);
      }

      const zipBlob = await zip.generateAsync({ type: "blob" });
      saveAs(zipBlob, "qr-codes.zip");
      toast.success("QR codes downloaded successfully");
    } catch (error) {
      console.error("Error generating ZIP file:", error);
      toast.error("Failed to download QR codes");
    } finally {
      setIsDownloading(false);
    }
  };

  const filteredEmployees = employees.filter((employee) => {
    const matchesSearch =
      employee.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      employee.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      employee.position?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesFilter = (() => {
      switch (filterStatus) {
        case "active":
          return (
            employee.qr_is_active &&
            (!employee.qr_expires_at ||
              new Date(employee.qr_expires_at) > new Date())
          );
        case "expired":
          return (
            employee.qr_expires_at &&
            new Date(employee.qr_expires_at) <= new Date()
          );
        case "inactive":
          return !employee.qr_is_active;
        default:
          return true;
      }
    })();

    return matchesSearch && matchesFilter;
  });

  const activeQRCodes = employees.filter(
    (emp) =>
      emp.qr_is_active &&
      (!emp.qr_expires_at || new Date(emp.qr_expires_at) > new Date())
  );
  const expiredQRCodes = employees.filter(
    (emp) => emp.qr_expires_at && new Date(emp.qr_expires_at) <= new Date()
  );
  const totalQRCodes = employees.length;

  if (loading) {
    return (
      <TeamLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </TeamLayout>
    );
  }

  return (
    <TeamLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              QR Code Management
            </h1>
            <p className="text-gray-600">
              Generate, manage, and track QR codes for review collection
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <Button variant="outline" onClick={handleViewAnalytics}>
              <BarChart3 className="h-4 w-4 mr-2" />
              Analytics
            </Button>
            <Button variant="outline" onClick={() => setQrDialogOpen(true)}>
              <Settings className="h-4 w-4 mr-2" />
              Customize QR Codes
            </Button>
          </div>
        </div>

        {/* Enhanced Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total QR Codes
              </CardTitle>
              <QrCode className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalQRCodes}</div>
              <p className="text-xs text-muted-foreground">
                Generated QR codes
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Active QR Codes
              </CardTitle>
              <QrCode className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {activeQRCodes.length}
              </div>
              <p className="text-xs text-muted-foreground">Currently active</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Expired QR Codes
              </CardTitle>
              <Clock className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {expiredQRCodes.length}
              </div>
              <p className="text-xs text-muted-foreground">Need renewal</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Success Rate
              </CardTitle>
              <Share2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {totalQRCodes > 0
                  ? Math.round((activeQRCodes.length / totalQRCodes) * 100)
                  : 0}
                %
              </div>
              <p className="text-xs text-muted-foreground">Active QR codes</p>
            </CardContent>
          </Card>
        </div>

        {/* Enhanced Actions Bar */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center space-x-2 flex-1 max-w-sm">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search QR codes..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select
              value={filterStatus}
              onValueChange={(value: any) => setFilterStatus(value)}
            >
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="expired">Expired</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center space-x-2">
            {selectedEmployees.length > 0 && (
              <Dialog
                open={bulkActionDialogOpen}
                onOpenChange={setBulkActionDialogOpen}
              >
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Users className="h-4 w-4 mr-2" />
                    Bulk Actions ({selectedEmployees.length})
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>Bulk Actions</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        onClick={() => handleBulkAction("activate")}
                        size="sm"
                      >
                        Activate All
                      </Button>
                      <Button
                        onClick={() => handleBulkAction("deactivate")}
                        variant="outline"
                        size="sm"
                      >
                        Deactivate All
                      </Button>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <Label htmlFor="bulk-expiration">Expiration Date</Label>
                        <Input
                          id="bulk-expiration"
                          type="datetime-local"
                          value={bulkExpirationDate}
                          onChange={(e) =>
                            setBulkExpirationDate(e.target.value)
                          }
                        />
                      </div>

                      <div>
                        <Label htmlFor="bulk-scan-limit">Scan Limit</Label>
                        <Input
                          id="bulk-scan-limit"
                          type="number"
                          placeholder="e.g., 100"
                          value={bulkScanLimit}
                          onChange={(e) => setBulkScanLimit(e.target.value)}
                        />
                      </div>

                      <div>
                        <Label htmlFor="bulk-custom-page">
                          Custom Landing Page
                        </Label>
                        <Textarea
                          id="bulk-custom-page"
                          placeholder="Custom HTML content..."
                          value={bulkCustomPage}
                          onChange={(e) => setBulkCustomPage(e.target.value)}
                        />
                      </div>

                      <div>
                        <Label htmlFor="bulk-redirect-url">Redirect URL</Label>
                        <Input
                          id="bulk-redirect-url"
                          placeholder="https://example.com"
                          value={bulkRedirectUrl}
                          onChange={(e) => setBulkRedirectUrl(e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        onClick={() => handleBulkAction("update")}
                        size="sm"
                      >
                        Update Settings
                      </Button>
                      <Button
                        onClick={() => handleBulkAction("regenerate")}
                        variant="outline"
                        size="sm"
                      >
                        <RefreshCw className="h-4 w-4 mr-1" />
                        Regenerate QR
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            )}

            {employees.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleBulkDownload}
                disabled={isDownloading}
              >
                <Download className="h-4 w-4 mr-2" />
                {isDownloading ? "Preparing ZIP..." : "Download All as ZIP"}
              </Button>
            )}
          </div>
        </div>

        {/* Bulk Selection */}
        {filteredEmployees.length > 0 && (
          <div className="flex items-center space-x-2">
            <Checkbox
              checked={selectedEmployees.length === filteredEmployees.length}
              onCheckedChange={handleSelectAll}
            />
            <Label>Select All ({filteredEmployees.length} items)</Label>
            {selectedEmployees.length > 0 && (
              <Badge variant="secondary">
                {selectedEmployees.length} selected
              </Badge>
            )}
          </div>
        )}

        {/* Download Progress */}
        {isDownloading && (
          <div className="space-y-2">
            <Progress value={downloadProgress} className="h-2" />
            <p className="text-xs text-center text-gray-500">
              Generating QR codes: {downloadProgress}% complete
            </p>
          </div>
        )}

        {/* QR Codes Grid */}
        {filteredEmployees.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <QrCode className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {searchTerm ? "No QR codes found" : "No QR codes yet"}
              </h3>
              <p className="text-gray-600 mb-4">
                {searchTerm
                  ? "Try adjusting your search terms"
                  : "Add team members to generate QR codes for review collection"}
              </p>
              {!searchTerm && (
                <Button onClick={() => (window.location.href = "/employees")}>
                  <QrCode className="h-4 w-4 mr-2" />
                  Go to Team Management
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredEmployees.map((employee) => (
              <div key={employee.id} className="relative">
                <div className="absolute top-2 left-2 z-10">
                  <Checkbox
                    checked={selectedEmployees.includes(employee.id)}
                    onCheckedChange={(checked) =>
                      handleBulkSelect(employee.id, checked as boolean)
                    }
                  />
                </div>
                <QRCodeCard employee={employee} onViewQR={handleViewQR} />
              </div>
            ))}
          </div>
        )}

        {/* Analytics Dialog */}

        {/* Analytics Dialog */}
        <Dialog
          open={analyticsDialogOpen}
          onOpenChange={setAnalyticsDialogOpen}
        >
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>QR Code Analytics</DialogTitle>
            </DialogHeader>
            {qrAnalytics ? (
              <div className="space-y-6">
                <div className="grid grid-cols-3 gap-4">
                  <Card>
                    <CardContent className="p-4">
                      <div className="text-2xl font-bold">
                        {qrAnalytics.total_scans}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Total Scans
                      </p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <div className="text-2xl font-bold">
                        {qrAnalytics.unique_scans}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Unique Scans
                      </p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <div className="text-2xl font-bold">
                        {qrAnalytics.conversion_rate}%
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Conversion Rate
                      </p>
                    </CardContent>
                  </Card>
                </div>

                {qrAnalytics.total_scans > 0 ? (
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <h4 className="font-semibold mb-3">Top Devices</h4>
                      <div className="space-y-2">
                        {qrAnalytics.top_devices.length > 0 ? (
                          qrAnalytics.top_devices.map((device, index) => (
                            <div
                              key={index}
                              className="flex justify-between items-center"
                            >
                              <span className="text-sm">
                                {device.device_type}
                              </span>
                              <Badge variant="secondary">{device.count}</Badge>
                            </div>
                          ))
                        ) : (
                          <p className="text-sm text-muted-foreground">
                            No device data available
                          </p>
                        )}
                      </div>
                    </div>

                    <div>
                      <h4 className="font-semibold mb-3">Recent Scans</h4>
                      <div className="space-y-2 max-h-40 overflow-y-auto">
                        {qrAnalytics.recent_scans.length > 0 ? (
                          qrAnalytics.recent_scans.map((scan, index) => (
                            <div key={index} className="text-sm">
                              <div className="flex justify-between">
                                <span>{scan.device_type}</span>
                                <span className="text-muted-foreground">
                                  {new Date(
                                    scan.scan_date
                                  ).toLocaleDateString()}
                                </span>
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {scan.location_country}
                              </div>
                            </div>
                          ))
                        ) : (
                          <p className="text-sm text-muted-foreground">
                            No recent scans
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <QrCode className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold mb-2">
                      No Scan Data Yet
                    </h3>
                    <p className="text-muted-foreground">
                      QR code analytics will appear here once customers start
                      scanning your QR codes.
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-muted-foreground">Loading analytics...</p>
              </div>
            )}
          </DialogContent>
        </Dialog>
        {/* <Dialog
          open={analyticsDialogOpen}
          onOpenChange={setAnalyticsDialogOpen}
        >
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>QR Code Analytics</DialogTitle>
            </DialogHeader>
            {qrAnalytics && (
              <div className="space-y-6">
                <div className="grid grid-cols-3 gap-4">
                  <Card>
                    <CardContent className="p-4">
                      <div className="text-2xl font-bold">
                        {qrAnalytics.total_scans}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Total Scans
                      </p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <div className="text-2xl font-bold">
                        {qrAnalytics.unique_scans}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Unique Scans
                      </p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <div className="text-2xl font-bold">
                        {qrAnalytics.conversion_rate}%
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Conversion Rate
                      </p>
                    </CardContent>
                  </Card>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-semibold mb-3">Top Devices</h4>
                    <div className="space-y-2">
                      {qrAnalytics.top_devices.map((device, index) => (
                        <div
                          key={index}
                          className="flex justify-between items-center"
                        >
                          <span className="text-sm">{device.device_type}</span>
                          <Badge variant="secondary">{device.count}</Badge>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h4 className="font-semibold mb-3">Recent Scans</h4>
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {qrAnalytics.recent_scans.map((scan, index) => (
                        <div key={index} className="text-sm">
                          <div className="flex justify-between">
                            <span>{scan.device_type}</span>
                            <span className="text-muted-foreground">
                              {new Date(scan.scan_date).toLocaleDateString()}
                            </span>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {scan.location_country}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog> */}

        {/* QR Code Dialog */}
        <QRCodeDialog
          employee={selectedEmployee}
          open={qrDialogOpen}
          onOpenChange={setQrDialogOpen}
        />
      </div>
    </TeamLayout>
  );
};

export default QRCodes;
