import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  Star,
  Check,
  X,
  Download,
  Flag,
  MessageSquare,
  Users,
  BarChart3,
  Filter,
  Mail,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { sendReviewResponseEmail } from "../lib/emailService";
import VideoPreview from "@/components/VideoPreview";
import {
  ReviewCardSkeleton,
  TableRowSkeleton,
} from "@/components/ui/skeleton-loaders";
import { BackButton } from "@/components/ui/back-button";
import { useIsMobile } from "@/hooks/use-mobile";

// Add custom hook for better breakpoint detection
const useResponsiveLayout = () => {
  const [screenSize, setScreenSize] = useState<"mobile" | "tablet" | "desktop">(
    "desktop"
  );

  useEffect(() => {
    const updateScreenSize = () => {
      const width = window.innerWidth;
      if (width < 768) {
        setScreenSize("mobile");
      } else if (width < 1024) {
        setScreenSize("tablet");
      } else {
        setScreenSize("desktop");
      }
    };

    updateScreenSize();
    window.addEventListener("resize", updateScreenSize);
    return () => window.removeEventListener("resize", updateScreenSize);
  }, []);

  return screenSize;
};

interface Review {
  id: string;
  customer_name: string;
  customer_email?: string;
  rating: number;
  comment?: string;
  review_type: string;
  video_url?: string;
  is_approved: boolean;
  flagged_as_spam: boolean;
  moderation_status: "pending" | "approved" | "rejected" | "flagged";
  sentiment_score?: number;
  assigned_to?: string;
  admin_response?: string;
  created_at: string;
  employee: {
    id: string;
    name: string;
    position?: string;
    department_id?: string;
  };
}

interface Employee {
  id: string;
  name: string;
  position?: string;
  department_id?: string;
}

interface Department {
  id: string;
  name: string;
  description?: string;
}

interface ReviewTemplate {
  id: string;
  name: string;
  subject?: string;
  content: string;
  category: string;
}

const Reviews = () => {
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const screenSize = useResponsiveLayout();
  const [currentPage, setCurrentPage] = useState(1);
  const [filterStatus, setFilterStatus] = useState<
    "all" | "approved" | "pending" | "flagged"
  >("all");
  const [selectedEmployee, setSelectedEmployee] = useState<string>("all");
  const [selectedDepartment, setSelectedDepartment] = useState<string>("all");
  const [selectedReviews, setSelectedReviews] = useState<string[]>([]);
  const [showResponseDialog, setShowResponseDialog] = useState(false);
  const [selectedReviewForResponse, setSelectedReviewForResponse] =
    useState<Review | null>(null);
  const [responseText, setResponseText] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");
  const [sendEmail, setSendEmail] = useState(true);
  const reviewsPerPage = 10;
  const queryClient = useQueryClient();

  // Add this helper function for video downloads
  const handleVideoDownload = async (
    videoUrl: string,
    customerName: string
  ) => {
    try {
      const response = await fetch(videoUrl);
      if (!response.ok) {
        throw new Error("Failed to fetch video");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;

      // Extract file extension from URL or default to mp4
      const urlObj = new URL(videoUrl);
      const pathParts = urlObj.pathname.split(".");
      const extension =
        pathParts.length > 1 ? pathParts[pathParts.length - 1] : "mp4";

      link.download = `${customerName.replace(
        /[^a-z0-9]/gi,
        "_"
      )}_video_review.${extension}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast.success("Video download started");
    } catch (error) {
      console.error("Download failed:", error);
      toast.error("Failed to download video. Please try again.");
    }
  };

  // Fetch employees
  const { data: employees = [] } = useQuery({
    queryKey: ["employees"],
    queryFn: async () => {
      if (!user) return [];

      const { data, error } = await supabase
        .from("employees")
        .select("id, name, position, department_id")
        .eq("company_id", user.id)
        .eq("is_active", true)
        .order("name");

      if (error) throw error;
      return data as Employee[];
    },
    enabled: !!user,
  });

  // Fetch departments
  const { data: departments = [] } = useQuery({
    queryKey: ["departments"],
    queryFn: async () => {
      if (!user) return [];

      const { data, error } = await supabase
        .from("departments")
        .select("id, name, description")
        .eq("company_id", user.id)
        .order("name");

      if (error) throw error;
      return data as Department[];
    },
    enabled: !!user,
  });

  // Fetch reviews with enhanced data
  const {
    data: reviews = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ["reviews", filterStatus, selectedEmployee, selectedDepartment],
    queryFn: async () => {
      if (!user) return [];

      let query = supabase
        .from("reviews")
        .select(
          `
          *,
          employee:employees(id, name, position, department_id)
        `
        )
        .eq("company_id", user.id)
        .order("created_at", { ascending: false });

      if (filterStatus === "approved") {
        query = query.eq("moderation_status", "approved");
      } else if (filterStatus === "pending") {
        query = query.eq("moderation_status", "pending");
      } else if (filterStatus === "flagged") {
        query = query.eq("flagged_as_spam", true);
      }

      const { data, error } = await query;

      if (error) throw error;

      let filteredData = data as Review[];

      // Apply employee filter
      if (selectedEmployee !== "all") {
        filteredData = filteredData.filter(
          (review) => review.employee?.id === selectedEmployee
        );
      }

      // Apply department filter
      if (selectedDepartment !== "all") {
        filteredData = filteredData.filter((review) => {
          const employee = employees.find(
            (emp) => emp.id === review.employee?.id
          );
          return employee?.department_id === selectedDepartment;
        });
      }

      return filteredData;
    },
    enabled: !!user,
  });

  // Fetch review templates
  const { data: templates = [] } = useQuery({
    queryKey: ["review-templates"],
    queryFn: async () => {
      if (!user) return [];

      const { data, error } = await supabase
        .from("review_templates")
        .select("*")
        .eq("company_id", user.id)
        .eq("is_active", true)
        .order("name");

      if (error) throw error;
      return data as ReviewTemplate[];
    },
    enabled: !!user,
  });

  // Email sending function
  // Email sending function
  const sendEmailResponse = async (reviewData: any, response: string) => {
    try {
      const result = await sendReviewResponseEmail({
        customerEmail: reviewData.customer_email,
        customerName: reviewData.customer_name || "Valued Customer",
        reviewText: reviewData.comment || "No comment provided", // Fixed: changed from review_text to comment
        adminResponse: response,
        companyName: "Review Spark Gather",
      });

      if (!result.success) {
        throw new Error(result.error);
      }

      return result;
    } catch (error) {
      console.error("Email sending error:", error);
      throw error;
    }
  };
  // const sendEmailResponse = async (reviewData: any, response: string) => {
  //   try {
  //     const result = await sendReviewResponseEmail({
  //       customerEmail: reviewData.customer_email,
  //       customerName: reviewData.customer_name || "Valued Customer",
  //       reviewText: reviewData.review_text,
  //       adminResponse: response,
  //       companyName: "Review Spark Gather",
  //     });

  //     if (!result.success) {
  //       throw new Error(result.error);
  //     }

  //     return result;
  //   } catch (error) {
  //     console.error("Email sending error:", error);
  //     throw error;
  //   }
  // };

  // Bulk approve mutation
  const bulkApproveMutation = useMutation({
    mutationFn: async (reviewIds: string[]) => {
      const { error } = await supabase
        .from("reviews")
        .update({ moderation_status: "approved", is_approved: true })
        .in("id", reviewIds);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reviews"] });
      toast.success(`${selectedReviews.length} reviews approved successfully`);
      setSelectedReviews([]);
    },
    onError: (error: any) => {
      toast.error("Failed to approve reviews");
    },
  });

  // Bulk reject mutation
  const bulkRejectMutation = useMutation({
    mutationFn: async (reviewIds: string[]) => {
      const { error } = await supabase
        .from("reviews")
        .update({ moderation_status: "rejected" })
        .in("id", reviewIds);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reviews"] });
      toast.success(`${selectedReviews.length} reviews rejected successfully`);
      setSelectedReviews([]);
    },
    onError: (error: any) => {
      toast.error("Failed to reject reviews");
    },
  });

  // Bulk delete mutation
  const bulkDeleteMutation = useMutation({
    mutationFn: async (reviewIds: string[]) => {
      const { error } = await supabase
        .from("reviews")
        .delete()
        .in("id", reviewIds);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reviews"] });
      toast.success(`${selectedReviews.length} reviews deleted successfully`);
      setSelectedReviews([]);
    },
    onError: (error: any) => {
      toast.error("Failed to delete reviews");
    },
  });

  // Response mutation with email sending
  const responseMutation = useMutation({
    mutationFn: async ({
      reviewId,
      response,
      sendEmailFlag,
    }: {
      reviewId: string;
      response: string;
      sendEmailFlag: boolean;
    }) => {
      // Update the review with admin response
      const { error: updateError } = await supabase
        .from("reviews")
        .update({
          admin_response: response,
          responded_at: new Date().toISOString(),
          responded_by: (await supabase.auth.getUser()).data.user?.id,
        })
        .eq("id", reviewId);

      if (updateError) throw updateError;

      // Send email if requested and customer email exists
      if (sendEmailFlag && selectedReviewForResponse?.customer_email) {
        await sendEmailResponse(selectedReviewForResponse, response);
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["reviews"] });

      if (
        variables.sendEmailFlag &&
        selectedReviewForResponse?.customer_email
      ) {
        toast.success("Response sent and email delivered successfully!");
      } else if (
        variables.sendEmailFlag &&
        !selectedReviewForResponse?.customer_email
      ) {
        toast.success(
          "Response saved successfully! (No email address available)"
        );
      } else {
        toast.success("Response saved successfully!");
      }

      setShowResponseDialog(false);
      setResponseText("");
      setSelectedTemplate("");
      setSendEmail(true);
    },
    onError: (error: any) => {
      console.error("Response mutation error:", error);
      toast.error("Failed to send response. Please try again.");
    },
  });

  const totalPages = Math.ceil(reviews.length / reviewsPerPage);
  const startIndex = (currentPage - 1) * reviewsPerPage;
  const paginatedReviews = reviews.slice(
    startIndex,
    startIndex + reviewsPerPage
  );

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedReviews(paginatedReviews.map((review) => review.id));
    } else {
      setSelectedReviews([]);
    }
  };

  const handleSelectReview = (reviewId: string, checked: boolean) => {
    if (checked) {
      setSelectedReviews((prev) => [...prev, reviewId]);
    } else {
      setSelectedReviews((prev) => prev.filter((id) => id !== reviewId));
    }
  };

  const handleTemplateSelect = (templateId: string) => {
    const template = templates.find((t) => t.id === templateId);
    if (template) {
      setResponseText(template.content);
      setSelectedTemplate(templateId);
    }
  };

  // Add reset filters function
  const resetFilters = () => {
    setFilterStatus("all");
    setSelectedEmployee("all");
    setSelectedDepartment("all");
  };

  const renderStars = (rating: number) => {
    return [...Array(5)].map((_, i) => (
      <Star
        key={i}
        className={`h-4 w-4 ${
          i < rating ? "fill-yellow-400 text-yellow-400" : "text-gray-300"
        }`}
      />
    ));
  };

  const getSentimentBadge = (score?: number) => {
    // Fix: Check for undefined/null, but allow 0 to display
    if (score === undefined || score === null) return null;

    if (score > 0.1) {
      return (
        <Badge variant="default" className="bg-green-100 text-green-800">
          Positive ({score.toFixed(2)})
        </Badge>
      );
    } else if (score < -0.1) {
      return <Badge variant="destructive">Negative ({score.toFixed(2)})</Badge>;
    } else {
      return <Badge variant="secondary">Neutral ({score.toFixed(2)})</Badge>;
    }
  };

  // const renderVideoPreview = (review: Review) => {
  //   if (review.review_type !== "video" || !review.video_url) return null;

  //   return (
  //     <div className="mt-2">
  //       <video
  //         src={review.video_url}
  //         className="w-32 h-20 object-cover rounded border"
  //         controls={false}
  //         poster=""
  //         preload="metadata"
  //         onError={(e) => {
  //           console.error("Video loading error:", e);
  //           // Fallback: try to reload with different parameters
  //           const video = e.target as HTMLVideoElement;
  //           if (video.src && !video.src.includes("?t=")) {
  //             video.src = video.src + "?t=" + Date.now();
  //           }
  //         }}
  //       />
  //     </div>
  //   );
  // };

  const renderVideoPreview = (review: Review) => {
    if (review.review_type !== "video" || !review.video_url) return null;

    return (
      <VideoPreview
        videoUrl={review.video_url}
        customerName={review.customer_name}
        reviewId={review.id}
      />
    );
  };

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-red-600">
              Error loading reviews: {error.message}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Add loading state display
  if (isLoading) {
    return (
      <div className="space-y-6">
        {/* Header Skeleton */}
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <div className="h-8 w-48 bg-gray-200 rounded animate-pulse"></div>
            <div className="h-4 w-80 bg-gray-200 rounded animate-pulse"></div>
          </div>
          <div className="flex space-x-2">
            <div className="h-10 w-32 bg-gray-200 rounded animate-pulse"></div>
            <div className="h-10 w-28 bg-gray-200 rounded animate-pulse"></div>
          </div>
        </div>

        {/* Stats Cards Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="h-24 bg-gray-200 rounded animate-pulse"></div>
          <div className="h-24 bg-gray-200 rounded animate-pulse"></div>
          <div className="h-24 bg-gray-200 rounded animate-pulse"></div>
          <div className="h-24 bg-gray-200 rounded animate-pulse"></div>
        </div>

        {/* Filters Skeleton */}
        <div className="flex items-center space-x-4">
          <div className="h-10 w-64 bg-gray-200 rounded animate-pulse"></div>
          <div className="h-10 w-32 bg-gray-200 rounded animate-pulse"></div>
        </div>

        {/* Table Skeleton */}
        <Card>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-6 gap-4 p-4 border-b">
                <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
                <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
                <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
                <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
                <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
                <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
              </div>
              {Array.from({ length: 5 }).map((_, i) => (
                <TableRowSkeleton key={i} />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Enhanced ReviewCard component for better mobile/tablet layout
  const ReviewCard = ({ review }: { review: Review }) => (
    <Card className="w-full hover:shadow-md transition-shadow duration-200">
      <CardContent className="p-4 sm:p-6">
        {/* Header with customer info and selection */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-start space-x-3 flex-1">
            <Checkbox
              checked={selectedReviews.includes(review.id)}
              onCheckedChange={(checked) =>
                handleSelectReview(review.id, checked as boolean)
              }
              className="mt-1"
            />
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-gray-900 text-base sm:text-lg">
                {review.customer_name}
              </h3>
              {review.customer_email && (
                <p className="text-sm text-gray-600 flex items-center mt-1">
                  <Mail className="h-3 w-3 mr-1 flex-shrink-0" />
                  <span className="truncate">{review.customer_email}</span>
                </p>
              )}
            </div>
          </div>

          {/* Status badges */}
          <div className="flex flex-col items-end space-y-1">
            <Badge
              variant={
                review.moderation_status === "approved"
                  ? "default"
                  : review.moderation_status === "flagged"
                  ? "destructive"
                  : "secondary"
              }
              className="text-xs"
            >
              {review.moderation_status}
            </Badge>
            {review.flagged_as_spam && (
              <Badge variant="destructive" className="text-xs">
                <Flag className="h-3 w-3 mr-1" />
                Spam
              </Badge>
            )}
          </div>
        </div>

        {/* Employee and Rating Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          <div>
            <p className="text-sm font-medium text-gray-700 mb-1">Employee</p>
            <div>
              <p className="font-medium text-gray-900">
                {review.employee.name}
              </p>
              {review.employee.position && (
                <p className="text-sm text-gray-600">
                  {review.employee.position}
                </p>
              )}
            </div>
          </div>

          <div>
            <p className="text-sm font-medium text-gray-700 mb-1">Rating</p>
            <div className="flex items-center space-x-2">
              <div className="flex items-center space-x-1">
                {renderStars(review.rating)}
              </div>
              <span className="text-sm font-medium text-gray-900">
                {review.rating}/5
              </span>
            </div>
          </div>
        </div>

        {/* Content Section */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-gray-700">Review Content</p>
            <div className="flex items-center space-x-2">
              <Badge
                variant={
                  review.review_type === "video" ? "default" : "secondary"
                }
                className="text-xs"
              >
                {review.review_type}
              </Badge>
              {getSentimentBadge(review.sentiment_score)}
            </div>
          </div>

          {review.comment && (
            <div className="bg-gray-50 rounded-lg p-3 mb-3">
              <p className="text-sm text-gray-700 leading-relaxed">
                {review.comment}
              </p>
            </div>
          )}

          {renderVideoPreview(review)}
        </div>

        {/* Additional badges */}
        <div className="flex flex-wrap gap-2 mb-4">
          {review.admin_response && (
            <Badge variant="outline" className="text-xs">
              <MessageSquare className="h-3 w-3 mr-1" />
              Responded
            </Badge>
          )}
        </div>

        {/* Date and Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pt-4 border-t border-gray-200 space-y-3 sm:space-y-0">
          <div>
            <p className="text-sm text-gray-600">
              {new Date(review.created_at).toLocaleDateString("en-US", {
                year: "numeric",
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap gap-2">
            {review.moderation_status === "pending" && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => bulkApproveMutation.mutate([review.id])}
                disabled={bulkApproveMutation.isPending}
                className="flex-1 sm:flex-none"
              >
                <Check className="h-4 w-4 mr-1" />
                Approve
              </Button>
            )}
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setSelectedReviewForResponse(review);
                setResponseText(review.admin_response || "");
                setShowResponseDialog(true);
              }}
              className="flex-1 sm:flex-none"
            >
              <MessageSquare className="h-4 w-4 mr-1" />
              Respond
            </Button>
            {review.review_type === "video" && review.video_url && (
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  handleVideoDownload(review.video_url!, review.customer_name)
                }
                className="flex-1 sm:flex-none"
              >
                <Download className="h-4 w-4 mr-1" />
                Download
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Enhanced Responsive Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col space-y-4 lg:flex-row lg:items-center lg:justify-between lg:space-y-0">
            <div className="flex-1">
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">
                Review Management
              </h1>
              <p className="text-sm sm:text-base text-gray-600 mt-1">
                Manage and moderate customer reviews with advanced tools
              </p>
            </div>

            {/* Enhanced Filter Buttons */}
            <div className="flex flex-wrap gap-2 lg:flex-nowrap">
              {[
                { key: "all", label: "All", icon: null },
                { key: "pending", label: "Pending", icon: null },
                { key: "approved", label: "Approved", icon: null },
                { key: "flagged", label: "Flagged", icon: Flag },
              ].map(({ key, label, icon: Icon }) => (
                <Button
                  key={key}
                  variant={filterStatus === key ? "default" : "outline"}
                  size={screenSize === "mobile" ? "sm" : "default"}
                  onClick={() => setFilterStatus(key as any)}
                  className={`${
                    screenSize === "mobile" ? "flex-1" : "flex-none"
                  } ${screenSize === "tablet" ? "min-w-[100px]" : ""}`}
                >
                  {Icon && <Icon className="h-4 w-4 mr-1" />}
                  {screenSize === "mobile" && key === "flagged"
                    ? "Flag"
                    : label}
                  {screenSize !== "mobile" && key === "all" && " Reviews"}
                </Button>
              ))}
            </div>
          </div>

          {/* Enhanced Additional Filters */}
          <div className="mt-4 flex flex-col space-y-3 md:flex-row md:items-center md:space-y-0 md:space-x-4">
            {/* Employee Filter */}
            <div className="flex items-center space-x-2 flex-1 md:flex-none">
              <Users className="h-4 w-4 text-gray-500 flex-shrink-0" />
              <Select
                value={selectedEmployee}
                onValueChange={setSelectedEmployee}
              >
                <SelectTrigger className="w-full md:w-48 lg:w-56">
                  <SelectValue placeholder="Filter by employee" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Employees</SelectItem>
                  {employees.map((employee) => (
                    <SelectItem key={employee.id} value={employee.id}>
                      {employee.name}
                      {employee.position && ` (${employee.position})`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Department Filter */}
            <div className="flex items-center space-x-2 flex-1 md:flex-none">
              <BarChart3 className="h-4 w-4 text-gray-500 flex-shrink-0" />
              <Select
                value={selectedDepartment}
                onValueChange={setSelectedDepartment}
              >
                <SelectTrigger className="w-full md:w-48 lg:w-56">
                  <SelectValue placeholder="Filter by department" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Departments</SelectItem>
                  {departments.map((department) => (
                    <SelectItem key={department.id} value={department.id}>
                      {department.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Reset Filters Button */}
            {(selectedEmployee !== "all" ||
              selectedDepartment !== "all" ||
              filterStatus !== "all") && (
              <Button
                variant="outline"
                size="sm"
                onClick={resetFilters}
                className="flex items-center space-x-1 w-full md:w-auto"
              >
                <Filter className="h-4 w-4" />
                <span>Reset Filters</span>
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Enhanced Main Content */}
      <div className="px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
        <div className="mb-4 sm:mb-6">
          <BackButton />
        </div>

        <Card>
          <CardHeader>
            <div className="flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
              <div>
                <CardTitle className="text-lg sm:text-xl lg:text-2xl">
                  Customer Reviews
                </CardTitle>
                <CardDescription className="text-sm sm:text-base">
                  {reviews.length} review{reviews.length !== 1 ? "s" : ""} found
                  {selectedReviews.length > 0 && (
                    <span className="ml-2 text-blue-600 font-medium">
                      ({selectedReviews.length} selected)
                    </span>
                  )}
                </CardDescription>
              </div>

              {/* Enhanced Bulk Actions */}
              {selectedReviews.length > 0 && (
                <div className="flex flex-col space-y-2 sm:flex-row sm:space-y-0 sm:space-x-2">
                  <Button
                    size="sm"
                    onClick={() => bulkApproveMutation.mutate(selectedReviews)}
                    disabled={bulkApproveMutation.isPending}
                    className="w-full sm:w-auto"
                  >
                    <Check className="h-4 w-4 mr-1" />
                    Approve ({selectedReviews.length})
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => bulkRejectMutation.mutate(selectedReviews)}
                    disabled={bulkRejectMutation.isPending}
                    className="w-full sm:w-auto"
                  >
                    <X className="h-4 w-4 mr-1" />
                    Reject ({selectedReviews.length})
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => bulkDeleteMutation.mutate(selectedReviews)}
                    disabled={bulkDeleteMutation.isPending}
                    className="w-full sm:w-auto"
                  >
                    Delete ({selectedReviews.length})
                  </Button>
                </div>
              )}
            </div>
          </CardHeader>

          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {screenSize === "mobile" || screenSize === "tablet" ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <ReviewCardSkeleton key={i} />
                  ))
                ) : (
                  <>
                    <div className="grid grid-cols-6 gap-4 p-4 border-b">
                      <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
                      <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
                      <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
                      <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
                      <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
                      <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
                    </div>
                    {Array.from({ length: 5 }).map((_, i) => (
                      <TableRowSkeleton key={i} />
                    ))}
                  </>
                )}
              </div>
            ) : reviews.length === 0 ? (
              <div className="text-center py-12">
                <div className="mx-auto w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                  <MessageSquare className="h-8 w-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  No reviews found
                </h3>
                <p className="text-gray-600">
                  Try adjusting your filters to see more results.
                </p>
              </div>
            ) : (
              <>
                {screenSize === "mobile" || screenSize === "tablet" ? (
                  // Enhanced Card Layout for Mobile and Tablet
                  <div
                    className={`grid gap-4 ${
                      screenSize === "tablet"
                        ? "md:grid-cols-2 lg:grid-cols-1"
                        : "grid-cols-1"
                    }`}
                  >
                    {paginatedReviews.map((review) => (
                      <ReviewCard key={review.id} review={review} />
                    ))}
                  </div>
                ) : (
                  // Desktop Table Layout
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-12">
                            <Checkbox
                              checked={
                                selectedReviews.length ===
                                  paginatedReviews.length &&
                                paginatedReviews.length > 0
                              }
                              onCheckedChange={handleSelectAll}
                            />
                          </TableHead>
                          <TableHead>Customer</TableHead>
                          <TableHead>Employee</TableHead>
                          <TableHead>Rating</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Content</TableHead>
                          <TableHead>Sentiment</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {paginatedReviews.map((review) => (
                          <TableRow
                            key={review.id}
                            className={
                              review.flagged_as_spam ? "bg-red-50" : ""
                            }
                          >
                            <TableCell>
                              <Checkbox
                                checked={selectedReviews.includes(review.id)}
                                onCheckedChange={(checked) =>
                                  handleSelectReview(
                                    review.id,
                                    checked as boolean
                                  )
                                }
                              />
                            </TableCell>
                            <TableCell>
                              <div>
                                <p className="font-medium">
                                  {review.customer_name}
                                </p>
                                {review.customer_email && (
                                  <p className="text-sm text-gray-600 flex items-center">
                                    <Mail className="h-3 w-3 mr-1" />
                                    {review.customer_email}
                                  </p>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div>
                                <p className="font-medium">
                                  {review.employee.name}
                                </p>
                                {review.employee.position && (
                                  <p className="text-sm text-gray-600">
                                    {review.employee.position}
                                  </p>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center space-x-1">
                                {renderStars(review.rating)}
                                <span className="ml-1 text-sm font-medium">
                                  {review.rating}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant={
                                  review.review_type === "video"
                                    ? "default"
                                    : "secondary"
                                }
                              >
                                {review.review_type}
                              </Badge>
                            </TableCell>
                            <TableCell className="max-w-xs">
                              {review.comment && (
                                <p className="text-sm text-gray-600 truncate mb-1">
                                  {review.comment}
                                </p>
                              )}
                              {renderVideoPreview(review)}
                              {review.flagged_as_spam && (
                                <Badge variant="destructive" className="mt-1">
                                  <Flag className="h-3 w-3 mr-1" />
                                  Spam
                                </Badge>
                              )}
                              {review.admin_response && (
                                <Badge variant="outline" className="mt-1">
                                  <MessageSquare className="h-3 w-3 mr-1" />
                                  Responded
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              {getSentimentBadge(review.sentiment_score)}
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant={
                                  review.moderation_status === "approved"
                                    ? "default"
                                    : review.moderation_status === "flagged"
                                    ? "destructive"
                                    : "secondary"
                                }
                              >
                                {review.moderation_status}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {new Date(review.created_at).toLocaleDateString()}
                            </TableCell>
                            <TableCell>
                              <div className="flex space-x-2">
                                {review.moderation_status === "pending" && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() =>
                                      bulkApproveMutation.mutate([review.id])
                                    }
                                    disabled={bulkApproveMutation.isPending}
                                  >
                                    <Check className="h-4 w-4" />
                                  </Button>
                                )}
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    setSelectedReviewForResponse(review);
                                    setResponseText(
                                      review.admin_response || ""
                                    );
                                    setShowResponseDialog(true);
                                  }}
                                >
                                  <MessageSquare className="h-4 w-4" />
                                </Button>
                                {review.review_type === "video" &&
                                  review.video_url && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() =>
                                        handleVideoDownload(
                                          review.video_url!,
                                          review.customer_name
                                        )
                                      }
                                      title="Download video"
                                    >
                                      <Download className="h-4 w-4" />
                                    </Button>
                                  )}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}

                {/* Enhanced Pagination */}
                {totalPages > 1 && (
                  <div className="mt-6 flex flex-col sm:flex-row items-center justify-between space-y-4 sm:space-y-0">
                    <div className="text-sm text-gray-600 order-2 sm:order-1">
                      Showing {(currentPage - 1) * reviewsPerPage + 1} to{" "}
                      {Math.min(currentPage * reviewsPerPage, reviews.length)}{" "}
                      of {reviews.length} reviews
                    </div>
                    <Pagination className="order-1 sm:order-2">
                      <PaginationContent className="flex-wrap justify-center">
                        {currentPage > 1 && (
                          <PaginationItem>
                            <PaginationPrevious
                              onClick={() => setCurrentPage(currentPage - 1)}
                              className="cursor-pointer"
                            />
                          </PaginationItem>
                        )}

                        {/* Show fewer page numbers on mobile */}
                        {isMobile
                          ? // Mobile: Show current page and adjacent pages
                            [...Array(Math.min(3, totalPages))]
                              .map((_, i) => {
                                const pageNum =
                                  Math.max(1, currentPage - 1) + i;
                                if (pageNum > totalPages) return null;
                                return (
                                  <PaginationItem key={pageNum}>
                                    <PaginationLink
                                      onClick={() => setCurrentPage(pageNum)}
                                      isActive={currentPage === pageNum}
                                      className="cursor-pointer"
                                    >
                                      {pageNum}
                                    </PaginationLink>
                                  </PaginationItem>
                                );
                              })
                              .filter(Boolean)
                          : // Desktop: Show all pages
                            [...Array(totalPages)].map((_, i) => (
                              <PaginationItem key={i + 1}>
                                <PaginationLink
                                  onClick={() => setCurrentPage(i + 1)}
                                  isActive={currentPage === i + 1}
                                  className="cursor-pointer"
                                >
                                  {i + 1}
                                </PaginationLink>
                              </PaginationItem>
                            ))}

                        {currentPage < totalPages && (
                          <PaginationItem>
                            <PaginationNext
                              onClick={() => setCurrentPage(currentPage + 1)}
                              className="cursor-pointer"
                            />
                          </PaginationItem>
                        )}
                      </PaginationContent>
                    </Pagination>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Responsive Response Dialog */}
      <Dialog open={showResponseDialog} onOpenChange={setShowResponseDialog}>
        <DialogContent className="max-w-2xl mx-4 sm:mx-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center text-lg">
              <MessageSquare className="h-5 w-5 mr-2" />
              Respond to Review
              {selectedReviewForResponse?.admin_response && (
                <Badge variant="outline" className="ml-2">
                  Previously Responded
                </Badge>
              )}
            </DialogTitle>
            <DialogDescription>
              {selectedReviewForResponse && (
                <div className="mt-2 p-3 bg-gray-50 rounded">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-2 space-y-2 sm:space-y-0">
                    <p className="font-medium">
                      {selectedReviewForResponse.customer_name}
                    </p>
                    {selectedReviewForResponse.customer_email && (
                      <div className="flex items-center text-sm text-gray-600">
                        <Mail className="h-3 w-3 mr-1" />
                        <span className="truncate">
                          {selectedReviewForResponse.customer_email}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center mt-1">
                    {renderStars(selectedReviewForResponse.rating)}
                    <span className="ml-2 text-sm">
                      {selectedReviewForResponse.rating} stars
                    </span>
                  </div>
                  {selectedReviewForResponse.comment && (
                    <p className="text-sm text-gray-600 mt-2">
                      "{selectedReviewForResponse.comment}"
                    </p>
                  )}
                  <p className="text-xs text-gray-500 mt-2">
                    Review for: {selectedReviewForResponse.employee.name}
                    {selectedReviewForResponse.employee.position &&
                      ` (${selectedReviewForResponse.employee.position})`}
                  </p>
                </div>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Use Template</label>
              <Select
                value={selectedTemplate}
                onValueChange={handleTemplateSelect}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose a response template" />
                </SelectTrigger>
                <SelectContent>
                  {templates.map((template) => (
                    <SelectItem key={template.id} value={template.id}>
                      {template.name} ({template.category})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium">Response</label>
              <Textarea
                value={responseText}
                onChange={(e) => setResponseText(e.target.value)}
                placeholder="Write your response to this review..."
                rows={6}
                className="mt-1"
              />
            </div>

            {selectedReviewForResponse?.customer_email && (
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="send-email"
                  checked={sendEmail}
                  onCheckedChange={setSendEmail}
                />
                <label
                  htmlFor="send-email"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Send email notification to customer
                </label>
              </div>
            )}
          </div>

          <DialogFooter className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
            <Button
              variant="outline"
              onClick={() => setShowResponseDialog(false)}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button
              onClick={async () => {
                if (!responseText.trim()) {
                  toast.error("Please enter a response");
                  return;
                }

                if (selectedReviewForResponse) {
                  responseMutation.mutate({
                    reviewId: selectedReviewForResponse.id,
                    response: responseText,
                    sendEmailFlag:
                      sendEmail && !!selectedReviewForResponse.customer_email,
                  });
                }
              }}
              disabled={!responseText.trim() || responseMutation.isPending}
              className="w-full sm:w-auto"
            >
              {responseMutation.isPending ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  {sendEmail && selectedReviewForResponse?.customer_email
                    ? "Sending..."
                    : "Saving..."}
                </div>
              ) : (
                <div className="flex items-center">
                  <MessageSquare className="h-4 w-4 mr-1" />
                  {sendEmail && selectedReviewForResponse?.customer_email
                    ? "Send Response & Email"
                    : "Save Response"}
                </div>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Reviews;
