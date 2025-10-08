import React, { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Mail, Plus, Search, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import QRCode from "qrcode";
import { csrfManager } from "@/lib/csrf";
import { config } from "@/lib/config";
import { BackButton } from "@/components/ui/back-button";
import { Textarea } from "@/components/ui/textarea";

interface ReviewRequest {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  company_name: string;
  created_date: string;
  last_sent_date: string;
  status: "sent" | "pending";
}

interface ReviewRequestFormData {
  firstName: string;
  lastName: string;
  email: string;
  companyName: string;
  emailBody: string;
}

// Skeleton Loader Component for Table
const TableSkeleton = () => {
  return (
    <>
      {[...Array(5)].map((_, index) => (
        <TableRow key={index}>
          <TableCell>
            <Skeleton className="h-4 w-8" />
          </TableCell>
          <TableCell>
            <Skeleton className="h-4 w-32" />
          </TableCell>
          <TableCell>
            <Skeleton className="h-4 w-40" />
          </TableCell>
          <TableCell>
            <Skeleton className="h-4 w-28" />
          </TableCell>
          <TableCell>
            <Skeleton className="h-4 w-24" />
          </TableCell>
          <TableCell>
            <Skeleton className="h-4 w-24" />
          </TableCell>
          <TableCell>
            <Skeleton className="h-6 w-16 rounded-full" />
          </TableCell>
          <TableCell>
            <Skeleton className="h-8 w-8 rounded" />
          </TableCell>
        </TableRow>
      ))}
    </>
  );
};

const ReviewRequest = () => {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const [reviewRequests, setReviewRequests] = useState<ReviewRequest[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalEntries, setTotalEntries] = useState(0);
  const [companyProfile, setCompanyProfile] = useState<any>(null);
  const entriesPerPage = 10;

  const [formData, setFormData] = useState<ReviewRequestFormData>({
    firstName: "",
    lastName: "",
    email: "",
    companyName: "",
    emailBody:
      "Thank you for choosing our services! We'd love to hear your thoughts! Your feedback helps us grow and improve, and we truly value your opinion. You can quickly share your thoughts by scanning the QR code below or clicking the button to leave your review online.",
  });

  // Fetch company profile for logo and company name
  const fetchCompanyProfile = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("company_name, logo_url, primary_color, company_qr_code_id")
        .eq("id", user.id)
        .single();

      if (error) {
        console.error("Error fetching company profile:", error);
        return;
      }

      if (data) {
        // logo_url is already a full public URL, no need to construct it again
        setCompanyProfile({
          company_name: data.company_name,
          logo_url: data.logo_url, // Use the stored URL directly
          primary_color: data.primary_color,
          company_qr_code_id: data.company_qr_code_id,
        });
      }
    } catch (error) {
      console.error("Error fetching company profile:", error);
    }
  };

  // Fetch review requests
  const fetchReviewRequests = async () => {
    if (!user) return;

    setIsFetching(true);
    try {
      const { data, error, count } = await supabase
        .from("review_requests")
        .select("*", { count: "exact" })
        .eq("company_id", user.id)
        .order("created_at", { ascending: false })
        .range(
          (currentPage - 1) * entriesPerPage,
          currentPage * entriesPerPage - 1
        );

      if (error) {
        console.error("Error fetching review requests:", error);
        toast.error("Failed to fetch review requests");
        return;
      }

      setReviewRequests(data || []);
      setTotalEntries(count || 0);
    } catch (error) {
      console.error("Error fetching review requests:", error);
      toast.error("Failed to fetch review requests");
    } finally {
      setIsFetching(false);
    }
  };

  // Generate company QR code
  const generateCompanyQRCode = async () => {
    if (!user || !companyProfile?.company_qr_code_id) return null;
  
    try {
      // Debug logging
      console.log('Environment check:', {
        VITE_APP_URL: import.meta.env.VITE_APP_URL,
        config_app_url: config.app.url,
        NODE_ENV: import.meta.env.NODE_ENV,
        PROD: import.meta.env.PROD
      });
      
      // Use company_qr_code_id instead of user.id
      // QR Code generation
      const reviewUrl = `${config.app.url}/review/company/${companyProfile.company_qr_code_id}`;
      console.log('Generated review URL:', reviewUrl);
      
      // Email template review button
      <a href="${config.app.url}/review/company/${companyProfile?.company_qr_code_id}" class="button">📝 Leave a Review Online</a>
      const qrCodeDataUrl = await QRCode.toDataURL(reviewUrl, {
        width: 300,
        margin: 2,
        color: {
          dark: "#000000",
          light: "#FFFFFF",
        },
      });
      return qrCodeDataUrl;
    } catch (error) {
      console.error("Error generating QR code:", error);
      return null;
    }
  };

  // Send email with QR code
  const sendReviewRequestEmail = async (
    formData: ReviewRequestFormData,
    qrCodeDataUrl: string
  ) => {
    try {
      const csrfToken = await csrfManager.getToken();

      const emailHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Review Request from ${formData.companyName}</title>
          <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f8fafc; }
            .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); }
            .myapps-branding { background: #ffffff; padding: 15px; text-align: center; border-bottom: 1px solid #e2e8f0; }
            .myapps-logo { max-width: 120px; height: auto; }
            .company-header { background: linear-gradient(135deg, ${
              companyProfile?.primary_color || "#3b82f6"
            } 0%, #1d4ed8 100%); color: white; padding: 30px; text-align: center; }
            .company-logo { max-width: 80px; height: auto; margin-bottom: 15px; border-radius: 8px; }
            .content { padding: 30px; }
            .qr-section { text-align: center; margin: 30px 0; padding: 20px; background: #f1f5f9; border-radius: 8px; }
            .qr-code { max-width: 200px; height: auto; border: 3px solid ${
              companyProfile?.primary_color || "#3b82f6"
            }; border-radius: 8px; }
            .button { display: inline-block; background: ${
              companyProfile?.primary_color || "#3b82f6"
            }; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; margin: 10px 0; }
            .footer { background: #f8fafc; padding: 20px; text-align: center; font-size: 14px; color: #64748b; }
            .myapps-footer { background: #1e293b; color: #94a3b8; padding: 15px; text-align: center; font-size: 12px; }
            .myapps-footer a { color: #60a5fa; text-decoration: none; }
          </style>
        </head>
        <body>
          <div class="container">
            <!-- SyncReviews Branding -->
            <div class="myapps-branding">
              <a href="https://review-spark-gather.vercel.app" target="_blank">
                <img src="https://review-spark-gather.vercel.app/logo.png" alt="SyncReviews" class="myapps-logo" />
              </a>
              <p style="margin: 8px 0 0 0; font-size: 12px; color: #64748b;">Powered by SyncReviews Platform</p>
            </div>
            
            <!-- Company Header -->
            <div class="company-header">
              ${
                companyProfile?.logo_url
                  ? `<img src="${companyProfile.logo_url}" alt="${formData.companyName} Logo" class="company-logo" />`
                  : ""
              }
              <h1>📧 Review Request</h1>
              <p>Help us grow with your feedback!</p>
            </div>
            
            <div class="content">
              <p>Dear ${formData.firstName} ${formData.lastName},</p>
              
              <!-- Custom Email Body -->
              <div style="margin: 20px 0; white-space: pre-line;">${
                formData.emailBody
              }</div>
              
              <!-- Protected QR Code Section -->
              
              <div class="qr-section">
                <h3>📱 Quick Review - Scan QR Code</h3>
                <div style="background: white; padding: 20px; border-radius: 8px; display: inline-block;">
                  <img src="${qrCodeDataUrl}" 
                       alt="QR Code for Review" 
                       style="width: 200px; height: 200px; border: 3px solid ${
                         companyProfile?.primary_color || "#3b82f6"
                       }; border-radius: 8px;" />
              </div>
              <p><em>Scan this QR code with your phone camera to leave a quick review</em></p>
              </div>
              
              <!-- Protected Review Button -->
              <div style="text-align: center; margin: 30px 0;">
                <a href="${config.app.url}/review/company/${
        companyProfile?.company_qr_code_id
      }" class="button">📝 Leave a Review Online</a>
              </div>
              
              <p>Thank you for taking a moment to share your feedback, it really makes a difference!</p>
            </div>
            
            <div class="footer">
              <p>Best regards,<br><strong>${
                formData.companyName
              } Team</strong></p>
              <p><small>This email was sent from ${
                formData.companyName
              }. If you have any questions, please contact us directly.</small></p>
            </div>
            
            <!-- MyApps Footer -->
            <div class="myapps-footer">
              <p>This email was sent using <a href="https://review-spark-gather.vercel.app" target="_blank">SyncReviews Platform</a></p>
              <p>© 2025 SyncReviews. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `;

      const emailRequest = {
        to: formData.email,
        subject: `Review Request from ${formData.companyName}`,
        html: emailHtml,
        from: "support@syncreviews.com",
        fromName: "SyncReviews",
        type: "supabase",
      };

      const { data, error } = await supabase.functions.invoke("send-email", {
        body: emailRequest,
        headers: {
          "X-CSRF-Token": csrfToken,
        },
      });

      if (error) {
        throw error;
      }

      return data;
    } catch (error) {
      console.error("Error sending email:", error);
      throw error;
    }
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setIsLoading(true);

    try {
      // Validate form
      if (
        !formData.firstName ||
        !formData.lastName ||
        !formData.email ||
        !formData.companyName
      ) {
        toast.error("Please fill in all fields");
        setIsLoading(false);
        return;
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email)) {
        toast.error("Please enter a valid email address");
        setIsLoading(false);
        return;
      }

      // Generate QR code
      const qrCodeDataUrl = await generateCompanyQRCode();
      if (!qrCodeDataUrl) {
        toast.error("Failed to generate QR code");
        setIsLoading(false);
        return;
      }

      // Send email
      const emailSent = await sendReviewRequestEmail(formData, qrCodeDataUrl);

      // Save to database
      const { error } = await supabase.from("review_requests").insert({
        company_id: user.id,
        first_name: formData.firstName,
        last_name: formData.lastName,
        email: formData.email,
        company_name: formData.companyName,
        status: emailSent ? "sent" : "pending",
        last_sent_date: emailSent ? new Date().toISOString() : null,
      });

      if (error) {
        console.error("Error saving review request:", error);
        toast.error("Failed to save review request");
        setIsLoading(false);
        return;
      }

      if (emailSent) {
        toast.success("Review request sent successfully!");
      } else {
        toast.warning("Review request saved but email failed to send");
      }

      // Reset form and close dialog
      setFormData({ firstName: "", lastName: "", email: "", companyName: "" });
      setIsOpen(false);
      fetchReviewRequests();
    } catch (error) {
      console.error("Error submitting review request:", error);
      toast.error("Failed to submit review request");
    } finally {
      setIsLoading(false);
    }
  };

  // Handle input changes
  const handleInputChange = (
    field: keyof ReviewRequestFormData,
    value: string
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  // Filter requests based on search term
  const filteredRequests = reviewRequests.filter(
    (request) =>
      request.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      request.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      request.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      request.company_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Calculate pagination
  const totalPages = Math.ceil(totalEntries / entriesPerPage);

  useEffect(() => {
    fetchReviewRequests();
  }, [user, currentPage]);

  // Add this new useEffect to fetch company profile
  useEffect(() => {
    if (user) {
      fetchCompanyProfile();
    }
  }, [user]);

  return (
    <div className="space-y-6 p-6">
      <div className="mb-6">
        <BackButton />
      </div>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Review Requests</h1>
          <p className="text-muted-foreground">
            Send review requests to customers and track responses
          </p>
        </div>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button className="bg-blue-600 hover:bg-blue-700 text-white">
              <Plus className="h-4 w-4 mr-2" />
              Send Review Request
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[525px]">
            <DialogHeader>
              <DialogTitle>Send Review Request</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name</Label>
                  <Input
                    id="firstName"
                    value={formData.firstName}
                    onChange={(e) =>
                      handleInputChange("firstName", e.target.value)
                    }
                    placeholder="Enter first name"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input
                    id="lastName"
                    value={formData.lastName}
                    onChange={(e) =>
                      handleInputChange("lastName", e.target.value)
                    }
                    placeholder="Enter last name"
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange("email", e.target.value)}
                  placeholder="Enter email address"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="companyName">Company Name</Label>
                <Input
                  id="companyName"
                  value={formData.companyName}
                  onChange={(e) =>
                    handleInputChange("companyName", e.target.value)
                  }
                  placeholder="Enter company name"
                  required
                />
              </div>

              {/* New Editable Email Body Field */}
              <div className="space-y-2">
                <Label htmlFor="emailBody">Email Message</Label>
                <Textarea
                  id="emailBody"
                  value={formData.emailBody}
                  onChange={(e) =>
                    handleInputChange("emailBody", e.target.value)
                  }
                  placeholder="Customize your review request message..."
                  rows={5}
                  className="resize-none"
                />
                <p className="text-xs text-muted-foreground">
                  💡 Note: The QR code and review button will be automatically
                  added below your message and cannot be edited.
                </p>
              </div>

              <div className="flex justify-end space-x-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {isLoading ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Mail className="h-4 w-4 mr-2" />
                      Submit
                    </>
                  )}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search and Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Review Requests</CardTitle>
            <div className="flex items-center space-x-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-64"
                />
              </div>
              <Button variant="outline" size="sm" onClick={fetchReviewRequests}>
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader className="bg-blue-600">
                <TableRow>
                  <TableHead className="text-white font-semibold">
                    S.No
                  </TableHead>
                  <TableHead className="text-white font-semibold">
                    Name
                  </TableHead>
                  <TableHead className="text-white font-semibold">
                    Email
                  </TableHead>
                  <TableHead className="text-white font-semibold">
                    Company
                  </TableHead>
                  <TableHead className="text-white font-semibold">
                    Created Date
                  </TableHead>
                  <TableHead className="text-white font-semibold">
                    Last Sent Date
                  </TableHead>
                  <TableHead className="text-white font-semibold">
                    Status
                  </TableHead>
                  <TableHead className="text-white font-semibold">
                    Resend
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isFetching ? (
                  <TableSkeleton />
                ) : filteredRequests.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8">
                      No review requests found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredRequests.map((request, index) => (
                    <TableRow key={request.id}>
                      <TableCell>
                        {(currentPage - 1) * entriesPerPage + index + 1}
                      </TableCell>
                      <TableCell>
                        {request.first_name} {request.last_name}
                      </TableCell>
                      <TableCell>{request.email}</TableCell>
                      <TableCell>{request.company_name}</TableCell>
                      <TableCell>
                        {new Date(request.created_date).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        {request.last_sent_date
                          ? new Date(
                              request.last_sent_date
                            ).toLocaleDateString()
                          : "-"}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            request.status === "sent" ? "default" : "secondary"
                          }
                        >
                          {request.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            // Implement resend functionality
                            toast.info("Resend functionality coming soon");
                          }}
                        >
                          <RefreshCw className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {!isFetching && totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <p className="text-sm text-muted-foreground">
                Showing {(currentPage - 1) * entriesPerPage + 1} to{" "}
                {Math.min(currentPage * entriesPerPage, totalEntries)} of{" "}
                {totalEntries} entries
              </p>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setCurrentPage((prev) => Math.max(prev - 1, 1))
                  }
                  disabled={currentPage === 1}
                >
                  Previous
                </Button>
                <span className="bg-blue-600 text-white px-3 py-1 rounded text-sm font-medium">
                  {currentPage}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setCurrentPage((prev) => Math.min(prev + 1, totalPages))
                  }
                  disabled={currentPage === totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ReviewRequest;
