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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  Trash2,
  Eye,
  Shield, // Add this for spam override
  MoreHorizontal, // Add this for the dropdown trigger
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
import { Skeleton } from "@/components/ui/skeleton";
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
  review_target_type: "employee" | "company";
  target_company_id?: string;
  employee?: {
    id: string;
    name: string;
    position?: string;
    department_id?: string;
  } | null;
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
  const [activeTab, setActiveTab] = useState<"employee" | "company">(
    "employee"
  );
  const [filterStatus, setFilterStatus] = useState<
    "all" | "approved" | "pending" | "flagged"
  >("all");
  const [selectedEmployee, setSelectedEmployee] = useState<string>("all");
  const [selectedDepartment, setSelectedDepartment] = useState<string>("all");
  const [selectedReviews, setSelectedReviews] = useState<string[]>([]);
  const [showResponseDialog, setShowResponseDialog] = useState(false);
  const [selectedReviewForResponse, setSelectedReviewForResponse] =
    useState<Review | null>(null);
  // Add these new state variables
  const [showReviewDetailsDialog, setShowReviewDetailsDialog] = useState(false);
  const [selectedReviewForDetails, setSelectedReviewForDetails] =
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
  const { data: employees = [], isLoading: employeesLoading } = useQuery({
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
  const { data: departments = [], isLoading: departmentsLoading } = useQuery({
    queryKey: ["departments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("departments")
        .select("id, name, description")
        .order("name");

      if (error) throw error;
      return data as Department[];
    },
    enabled: !!user,
  });

  // Fetch reviews with enhanced data - Updated to filter by tab
  const {
    data: reviews = [],
    isLoading: reviewsLoading,
    error,
  } = useQuery({
    queryKey: [
      "reviews",
      filterStatus,
      selectedEmployee,
      selectedDepartment,
      activeTab,
    ],
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

      // Filter by review type based on active tab
      if (activeTab === "employee") {
        query = query
          .eq("review_target_type", "employee")
          .not("employee_id", "is", null);
      } else {
        query = query
          .eq("review_target_type", "company")
          .not("target_company_id", "is", null);
      }

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

      // Apply employee filter (only for employee reviews)
      if (activeTab === "employee" && selectedEmployee !== "all") {
        filteredData = filteredData.filter(
          (review) => review.employee?.id === selectedEmployee
        );
      }

      // Apply department filter (only for employee reviews)
      if (activeTab === "employee" && selectedDepartment !== "all") {
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
  const { data: templates = [], isLoading: templatesLoading } = useQuery({
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

  // Fetch company profile
  const { data: companyProfile } = useQuery({
    queryKey: ["companyProfile"],
    queryFn: async () => {
      if (!user) return null;

      const { data, error } = await supabase
        .from("profiles")
        .select("company_name")
        .eq("id", user.id)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // ✅ FIX: Combine all loading states
  const isLoading =
    employeesLoading ||
    departmentsLoading ||
    reviewsLoading ||
    templatesLoading;

  // Email sending function
  const sendEmailResponse = async (reviewData: any, response: string) => {
    try {
      const result = await sendReviewResponseEmail({
        customerEmail: reviewData.customer_email,
        customerName: reviewData.customer_name || "Valued Customer",
        reviewText: reviewData.comment || "No comment provided",
        adminResponse: response,
        companyName: companyProfile?.company_name || "Your Company",
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

  // Add individual delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (reviewId: string) => {
      const { error } = await supabase
        .from("reviews")
        .delete()
        .eq("id", reviewId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reviews"] });
      toast.success("Review deleted successfully");
    },
    onError: (error: any) => {
      toast.error("Failed to delete review");
    },
  });

  // Add spam override mutation
  const spamOverrideMutation = useMutation({
    mutationFn: async (reviewId: string) => {
      const { error } = await supabase
        .from("reviews")
        .update({
          flagged_as_spam: false,
          moderation_status: "approved",
        })
        .eq("id", reviewId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reviews"] });
      toast.success("Review unmarked as spam and approved successfully");
    },
    onError: (error: any) => {
      console.error("Spam override error:", error);
      toast.error("Failed to override spam detection. Please try again.");
    },
  });

  // Add new mutation for marking reviews as spam
  const markAsSpamMutation = useMutation({
    mutationFn: async (reviewId: string) => {
      const { error } = await supabase
        .from("reviews")
        .update({
          flagged_as_spam: true,
          moderation_status: "flagged",
        })
        .eq("id", reviewId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reviews"] });
      toast.success("Review marked as spam successfully");
    },
    onError: (error: any) => {
      console.error("Mark as spam error:", error);
      toast.error("Failed to mark review as spam. Please try again.");
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
      <div className="space-y-6 p-4">
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
                <div key={i} className="grid grid-cols-6 gap-4 p-4 border-b">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-8 w-16" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-full" />
                </div>
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
                {review.employee?.name || "No employee assigned"}
              </p>
              {review.employee?.position && (
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
            <div className="mt-3">
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm text-gray-600 flex-1 line-clamp-3">
                  {review.comment}
                </p>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSelectedReviewForDetails(review);
                    setShowReviewDetailsDialog(true);
                  }}
                  className="h-6 w-6 p-0 shrink-0 mt-0.5"
                >
                  <Eye className="h-3 w-3" />
                </Button>
              </div>
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

          {/* Action buttons - Refactored with dropdown */}
          <div className="flex gap-2">
            {/* Keep Approve button visible */}
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

            {/* More Actions Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1 sm:flex-none"
                >
                  <MoreHorizontal className="h-4 w-4 mr-1" />
                  Actions
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                {/* Spam Actions */}
                {review.flagged_as_spam ? (
                  <DropdownMenuItem
                    onClick={() => spamOverrideMutation.mutate(review.id)}
                    disabled={spamOverrideMutation.isPending}
                  >
                    <Shield className="h-4 w-4 mr-2" />
                    Remove from Spam
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem
                    onClick={() => markAsSpamMutation.mutate(review.id)}
                    disabled={markAsSpamMutation.isPending}
                  >
                    <Flag className="h-4 w-4 mr-2" />
                    Add to Spam
                  </DropdownMenuItem>
                )}

                {/* Respond Action */}
                <DropdownMenuItem
                  onClick={() => {
                    setSelectedReviewForResponse(review);
                    setResponseText(review.admin_response || "");
                    setShowResponseDialog(true);
                  }}
                >
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Respond
                </DropdownMenuItem>

                {/* Download Action (only for videos) */}
                {review.review_type === "video" && review.video_url && (
                  <DropdownMenuItem
                    onClick={() =>
                      handleVideoDownload(
                        review.video_url!,
                        review.customer_name
                      )
                    }
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download Video
                  </DropdownMenuItem>
                )}

                {/* Delete Action */}
                <DropdownMenuItem
                  onClick={() => deleteMutation.mutate(review.id)}
                  disabled={deleteMutation.isPending}
                  className="text-red-600 focus:text-red-600"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="bg-gray-50">
      {/* Enhanced Responsive Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="px-3 sm:px-4 lg:px-6 xl:px-8 py-4">
          <div className="flex flex-col space-y-4 lg:flex-row lg:items-center lg:justify-between lg:space-y-0">
            <div className="flex-1 min-w-0">
              <h1 className="text-lg sm:text-xl lg:text-2xl xl:text-3xl font-bold text-gray-900 truncate">
                Review Management
              </h1>
              <p className="text-xs sm:text-sm lg:text-base text-gray-600 mt-1">
                Manage and moderate customer reviews with advanced tools
              </p>
            </div>

            {/* Enhanced Filter Buttons */}
            <div className="flex flex-wrap gap-1 sm:gap-2 lg:flex-nowrap">
              {[
                { key: "all", label: "All", icon: null },
                { key: "pending", label: "Pending", icon: null },
                { key: "approved", label: "Approved", icon: null },
                { key: "flagged", label: "Flagged", icon: Flag },
              ].map(({ key, label, icon: Icon }) => (
                <Button
                  key={key}
                  variant={filterStatus === key ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFilterStatus(key as any)}
                  className="flex items-center space-x-1 whitespace-nowrap text-xs sm:text-sm"
                >
                  {Icon && <Icon className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />}
                  {screenSize === "mobile" && key === "flagged"
                    ? "Flag"
                    : label}
                  {screenSize !== "mobile" && key === "all" && " Reviews"}
                </Button>
              ))}
            </div>
          </div>

          {/* Enhanced Additional Filters */}
          <div className="mt-4 flex flex-col space-y-3 md:flex-row md:items-center md:space-y-0 md:space-x-2 lg:space-x-4">
            {/* Employee Filter */}
            <div className="flex items-center space-x-2 flex-1 md:flex-none">
              <Users className="h-4 w-4 text-gray-500 flex-shrink-0" />
              <Select
                value={selectedEmployee}
                onValueChange={setSelectedEmployee}
              >
                <SelectTrigger className="w-full md:w-40 lg:w-48 xl:w-56">
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
                <SelectTrigger className="w-full md:w-40 lg:w-48 xl:w-56">
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
                className="flex items-center space-x-1 w-full md:w-auto whitespace-nowrap"
              >
                <Filter className="h-4 w-4" />
                <span>Reset Filters</span>
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Enhanced Main Content */}
      <div className="px-3 sm:px-4 lg:px-6 xl:px-8 py-4">
        <div className="mb-4 sm:mb-6">
          <BackButton />
        </div>

        {/* Add Tabs for Employee and Company Reviews */}
        <Tabs
          value={activeTab}
          onValueChange={(value) => {
            setActiveTab(value as "employee" | "company");
            // Reset filters when switching tabs
            setSelectedEmployee("all");
            setSelectedDepartment("all");
            setFilterStatus("all");
            setCurrentPage(1);
          }}
        >
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger
              value="employee"
              className="flex items-center space-x-2"
            >
              <Users className="h-4 w-4" />
              <span>Employee Reviews</span>
            </TabsTrigger>
            <TabsTrigger
              value="company"
              className="flex items-center space-x-2"
            >
              <BarChart3 className="h-4 w-4" />
              <span>Company Reviews</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="employee">
            <Card className="w-full">
              <CardHeader>
                <div className="flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
                  <div className="min-w-0 flex-1">
                    <CardTitle className="text-base sm:text-lg lg:text-xl xl:text-2xl truncate">
                      Employee Reviews
                    </CardTitle>
                    <CardDescription className="text-xs sm:text-sm lg:text-base">
                      {reviews.length} review{reviews.length !== 1 ? "s" : ""}{" "}
                      found
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
                        onClick={() =>
                          bulkApproveMutation.mutate(selectedReviews)
                        }
                        disabled={bulkApproveMutation.isPending}
                        className="w-full sm:w-auto text-xs sm:text-sm"
                      >
                        <Check className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                        Approve ({selectedReviews.length})
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          bulkRejectMutation.mutate(selectedReviews)
                        }
                        disabled={bulkRejectMutation.isPending}
                        className="w-full sm:w-auto text-xs sm:text-sm"
                      >
                        <X className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                        Reject ({selectedReviews.length})
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() =>
                          bulkDeleteMutation.mutate(selectedReviews)
                        }
                        disabled={bulkDeleteMutation.isPending}
                        className="w-full sm:w-auto text-xs sm:text-sm"
                      >
                        Delete ({selectedReviews.length})
                      </Button>
                    </div>
                  )}
                </div>
              </CardHeader>

              <CardContent className="p-0 sm:p-6">
                {reviews.length === 0 ? (
                  <div className="text-center py-12 px-4">
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
                      <div className="p-4 sm:p-0">
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
                      </div>
                    ) : (
                      // Desktop Table Layout with responsive columns
                      <div className="w-full">
                        <div className="overflow-x-auto">
                          <Table className="min-w-full">
                            <TableHeader>
                              <TableRow>
                                <TableHead className="w-8 sm:w-12">
                                  <Checkbox
                                    checked={
                                      selectedReviews.length ===
                                        paginatedReviews.length &&
                                      paginatedReviews.length > 0
                                    }
                                    onCheckedChange={handleSelectAll}
                                  />
                                </TableHead>
                                <TableHead className="w-32 max-w-[150px]">
                                  Customer
                                </TableHead>
                                <TableHead className="min-w-[100px] hidden lg:table-cell">
                                  Employee
                                </TableHead>
                                <TableHead className="w-16 sm:w-20">
                                  Rating
                                </TableHead>
                                <TableHead className="w-16 sm:w-20 hidden md:table-cell">
                                  Type
                                </TableHead>
                                <TableHead className="min-w-[150px] max-w-[200px] hidden xl:table-cell">
                                  Content
                                </TableHead>
                                {/* <TableHead className="w-20 hidden lg:table-cell">
                              Sentiment
                            </TableHead> */}
                                <TableHead className="w-20">Status</TableHead>
                                <TableHead className="w-24 hidden sm:table-cell">
                                  Date
                                </TableHead>
                                <TableHead className="w-16">Actions</TableHead>
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
                                      checked={selectedReviews.includes(
                                        review.id
                                      )}
                                      onCheckedChange={(checked) =>
                                        handleSelectReview(
                                          review.id,
                                          checked as boolean
                                        )
                                      }
                                    />
                                  </TableCell>
                                  {/* <TableCell>
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
                              </TableCell> */}
                                  <TableCell className="max-w-[150px]">
                                    <div>
                                      <p className="font-medium truncate">
                                        {review.customer_name}
                                      </p>
                                      {review.customer_email && (
                                        <div className="text-sm text-gray-600 flex items-center">
                                          <Mail className="h-3 w-3 mr-1 shrink-0" />
                                          <p className="truncate max-w-[100px]">
                                            {review.customer_email}
                                          </p>
                                        </div>
                                      )}
                                    </div>
                                  </TableCell>
                                  {/* <TableCell>
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
                            </TableCell> */}
                                  <TableCell className="hidden lg:table-cell">
                                    {review.review_target_type === "employee" &&
                                    review.employee ? (
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
                                    ) : (
                                      <div>
                                        <p className="font-medium text-blue-600">
                                          Company Review
                                        </p>
                                        <p className="text-sm text-gray-600">
                                          Direct company feedback
                                        </p>
                                      </div>
                                    )}
                                  </TableCell>
                                  <TableCell>
                                    <div className="flex items-center space-x-1">
                                      {renderStars(review.rating)}
                                      <span className="ml-1 text-sm font-medium">
                                        {review.rating}
                                      </span>
                                    </div>
                                  </TableCell>
                                  <TableCell className="hidden md:table-cell">
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
                                  <TableCell className="max-w-xs hidden xl:table-cell">
                                    {review.comment ? (
                                      <div className="flex items-center gap-2">
                                        <p className="truncate flex-1">
                                          {review.comment}
                                        </p>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => {
                                            setSelectedReviewForDetails(review);
                                            setShowReviewDetailsDialog(true);
                                          }}
                                          className="h-6 w-6 p-0 shrink-0"
                                        >
                                          <Eye className="h-3 w-3" />
                                        </Button>
                                      </div>
                                    ) : (
                                      <span className="text-muted-foreground">
                                        No comment
                                      </span>
                                    )}
                                    {renderVideoPreview(review)}
                                    {review.flagged_as_spam && (
                                      <Badge
                                        variant="destructive"
                                        className="mt-1"
                                      >
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
                                  {/* <TableCell className="hidden lg:table-cell">
                                {getSentimentBadge(review.sentiment_score)}
                              </TableCell> */}
                                  <TableCell>
                                    <Badge
                                      variant={
                                        review.moderation_status === "approved"
                                          ? "default"
                                          : review.moderation_status ===
                                            "flagged"
                                          ? "destructive"
                                          : "secondary"
                                      }
                                    >
                                      {review.moderation_status}
                                    </Badge>
                                  </TableCell>
                                  <TableCell className="hidden sm:table-cell">
                                    {new Date(
                                      review.created_at
                                    ).toLocaleDateString()}
                                  </TableCell>
                                  <TableCell>
                                    <div className="flex space-x-2">
                                      {/* Keep Approve button visible */}
                                      {review.moderation_status ===
                                        "pending" && (
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          onClick={() =>
                                            bulkApproveMutation.mutate([
                                              review.id,
                                            ])
                                          }
                                          disabled={
                                            bulkApproveMutation.isPending
                                          }
                                          title="Approve"
                                        >
                                          <Check className="h-4 w-4" />
                                        </Button>
                                      )}

                                      {/* More Actions Dropdown */}
                                      <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                          <Button
                                            size="sm"
                                            variant="outline"
                                            title="More Actions"
                                          >
                                            <MoreHorizontal className="h-4 w-4" />
                                          </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent
                                          align="end"
                                          className="w-48"
                                        >
                                          {/* Spam Actions */}
                                          {review.flagged_as_spam ? (
                                            <DropdownMenuItem
                                              onClick={() =>
                                                spamOverrideMutation.mutate(
                                                  review.id
                                                )
                                              }
                                              disabled={
                                                spamOverrideMutation.isPending
                                              }
                                            >
                                              <Shield className="h-4 w-4 mr-2" />
                                              Remove from Spam
                                            </DropdownMenuItem>
                                          ) : (
                                            <DropdownMenuItem
                                              onClick={() =>
                                                markAsSpamMutation.mutate(
                                                  review.id
                                                )
                                              }
                                              disabled={
                                                markAsSpamMutation.isPending
                                              }
                                            >
                                              <Flag className="h-4 w-4 mr-2" />
                                              Add to Spam
                                            </DropdownMenuItem>
                                          )}

                                          {/* Respond Action */}
                                          <DropdownMenuItem
                                            onClick={() => {
                                              setSelectedReviewForResponse(
                                                review
                                              );
                                              setResponseText(
                                                review.admin_response || ""
                                              );
                                              setShowResponseDialog(true);
                                            }}
                                          >
                                            <MessageSquare className="h-4 w-4 mr-2" />
                                            Respond
                                          </DropdownMenuItem>

                                          {/* Download Action (only for videos) */}
                                          {review.review_type === "video" &&
                                            review.video_url && (
                                              <DropdownMenuItem
                                                onClick={() =>
                                                  handleVideoDownload(
                                                    review.video_url!,
                                                    review.customer_name
                                                  )
                                                }
                                              >
                                                <Download className="h-4 w-4 mr-2" />
                                                Download Video
                                              </DropdownMenuItem>
                                            )}

                                          {/* Delete Action */}
                                          <DropdownMenuItem
                                            onClick={() =>
                                              deleteMutation.mutate(review.id)
                                            }
                                            disabled={deleteMutation.isPending}
                                            className="text-red-600 focus:text-red-600"
                                          >
                                            <Trash2 className="h-4 w-4 mr-2" />
                                            Delete
                                          </DropdownMenuItem>
                                        </DropdownMenuContent>
                                      </DropdownMenu>
                                    </div>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      </div>
                    )}

                    {/* Pagination */}
                    {totalPages > 1 && (
                      <div className="mt-6 flex justify-center px-4 sm:px-0">
                        <Pagination>
                          <PaginationContent className="flex-wrap">
                            {currentPage > 1 && (
                              <PaginationItem>
                                <PaginationPrevious
                                  onClick={() =>
                                    setCurrentPage(currentPage - 1)
                                  }
                                  className="cursor-pointer"
                                />
                              </PaginationItem>
                            )}

                            {[...Array(totalPages)].map((_, i) => (
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
                                  onClick={() =>
                                    setCurrentPage(currentPage + 1)
                                  }
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
          </TabsContent>

          <TabsContent value="company">
            <Card className="w-full">
              <CardHeader>
                <div className="flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
                  <div className="min-w-0 flex-1">
                    <CardTitle className="text-base sm:text-lg lg:text-xl xl:text-2xl truncate">
                      Company Reviews
                    </CardTitle>
                    <CardDescription className="text-xs sm:text-sm lg:text-base">
                      {reviews.length} review{reviews.length !== 1 ? "s" : ""}{" "}
                      found
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
                        onClick={() =>
                          bulkApproveMutation.mutate(selectedReviews)
                        }
                        disabled={bulkApproveMutation.isPending}
                        className="w-full sm:w-auto text-xs sm:text-sm"
                      >
                        <Check className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                        Approve ({selectedReviews.length})
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          bulkRejectMutation.mutate(selectedReviews)
                        }
                        disabled={bulkRejectMutation.isPending}
                        className="w-full sm:w-auto text-xs sm:text-sm"
                      >
                        <X className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                        Reject ({selectedReviews.length})
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() =>
                          bulkDeleteMutation.mutate(selectedReviews)
                        }
                        disabled={bulkDeleteMutation.isPending}
                        className="w-full sm:w-auto text-xs sm:text-sm"
                      >
                        Delete ({selectedReviews.length})
                      </Button>
                    </div>
                  )}
                </div>
              </CardHeader>

              <CardContent className="p-0 sm:p-6">
                {reviews.length === 0 ? (
                  <div className="text-center py-12 px-4">
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
                      <div className="p-4 sm:p-0">
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
                      </div>
                    ) : (
                      // Desktop Table Layout with responsive columns
                      <div className="w-full">
                        <div className="overflow-x-auto">
                          <Table className="min-w-full">
                            <TableHeader>
                              <TableRow>
                                <TableHead className="w-8 sm:w-12">
                                  <Checkbox
                                    checked={
                                      selectedReviews.length ===
                                        paginatedReviews.length &&
                                      paginatedReviews.length > 0
                                    }
                                    onCheckedChange={handleSelectAll}
                                  />
                                </TableHead>
                                <TableHead className="w-32 max-w-[150px]">
                                  Customer
                                </TableHead>
                                <TableHead className="min-w-[100px] hidden lg:table-cell">
                                  Employee
                                </TableHead>
                                <TableHead className="w-16 sm:w-20">
                                  Rating
                                </TableHead>
                                <TableHead className="w-16 sm:w-20 hidden md:table-cell">
                                  Type
                                </TableHead>
                                <TableHead className="min-w-[150px] max-w-[200px] hidden xl:table-cell">
                                  Content
                                </TableHead>
                                {/* <TableHead className="w-20 hidden lg:table-cell">
                              Sentiment
                            </TableHead> */}
                                <TableHead className="w-20">Status</TableHead>
                                <TableHead className="w-24 hidden sm:table-cell">
                                  Date
                                </TableHead>
                                <TableHead className="w-16">Actions</TableHead>
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
                                      checked={selectedReviews.includes(
                                        review.id
                                      )}
                                      onCheckedChange={(checked) =>
                                        handleSelectReview(
                                          review.id,
                                          checked as boolean
                                        )
                                      }
                                    />
                                  </TableCell>
                                  {/* <TableCell>
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
                              </TableCell> */}
                                  <TableCell className="max-w-[150px]">
                                    <div>
                                      <p className="font-medium truncate">
                                        {review.customer_name}
                                      </p>
                                      {review.customer_email && (
                                        <div className="text-sm text-gray-600 flex items-center">
                                          <Mail className="h-3 w-3 mr-1 shrink-0" />
                                          <p className="truncate max-w-[100px]">
                                            {review.customer_email}
                                          </p>
                                        </div>
                                      )}
                                    </div>
                                  </TableCell>
                                  {/* <TableCell>
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
                            </TableCell> */}
                                  <TableCell className="hidden lg:table-cell">
                                    {review.review_target_type === "employee" &&
                                    review.employee ? (
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
                                    ) : (
                                      <div>
                                        <p className="font-medium text-blue-600">
                                          Company Review
                                        </p>
                                        <p className="text-sm text-gray-600">
                                          Direct company feedback
                                        </p>
                                      </div>
                                    )}
                                  </TableCell>
                                  <TableCell>
                                    <div className="flex items-center space-x-1">
                                      {renderStars(review.rating)}
                                      <span className="ml-1 text-sm font-medium">
                                        {review.rating}
                                      </span>
                                    </div>
                                  </TableCell>
                                  <TableCell className="hidden md:table-cell">
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
                                  <TableCell className="max-w-xs hidden xl:table-cell">
                                    {review.comment ? (
                                      <div className="flex items-center gap-2">
                                        <p className="truncate flex-1">
                                          {review.comment}
                                        </p>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => {
                                            setSelectedReviewForDetails(review);
                                            setShowReviewDetailsDialog(true);
                                          }}
                                          className="h-6 w-6 p-0 shrink-0"
                                        >
                                          <Eye className="h-3 w-3" />
                                        </Button>
                                      </div>
                                    ) : (
                                      <span className="text-muted-foreground">
                                        No comment
                                      </span>
                                    )}
                                    {renderVideoPreview(review)}
                                    {review.flagged_as_spam && (
                                      <Badge
                                        variant="destructive"
                                        className="mt-1"
                                      >
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
                                  {/* <TableCell className="hidden lg:table-cell">
                                {getSentimentBadge(review.sentiment_score)}
                              </TableCell> */}
                                  <TableCell>
                                    <Badge
                                      variant={
                                        review.moderation_status === "approved"
                                          ? "default"
                                          : review.moderation_status ===
                                            "flagged"
                                          ? "destructive"
                                          : "secondary"
                                      }
                                    >
                                      {review.moderation_status}
                                    </Badge>
                                  </TableCell>
                                  <TableCell className="hidden sm:table-cell">
                                    {new Date(
                                      review.created_at
                                    ).toLocaleDateString()}
                                  </TableCell>
                                  <TableCell>
                                    <div className="flex space-x-2">
                                      {/* Keep Approve button visible */}
                                      {review.moderation_status ===
                                        "pending" && (
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          onClick={() =>
                                            bulkApproveMutation.mutate([
                                              review.id,
                                            ])
                                          }
                                          disabled={
                                            bulkApproveMutation.isPending
                                          }
                                          title="Approve"
                                        >
                                          <Check className="h-4 w-4" />
                                        </Button>
                                      )}

                                      {/* More Actions Dropdown */}
                                      <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                          <Button
                                            size="sm"
                                            variant="outline"
                                            title="More Actions"
                                          >
                                            <MoreHorizontal className="h-4 w-4" />
                                          </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent
                                          align="end"
                                          className="w-48"
                                        >
                                          {/* Spam Actions */}
                                          {review.flagged_as_spam ? (
                                            <DropdownMenuItem
                                              onClick={() =>
                                                spamOverrideMutation.mutate(
                                                  review.id
                                                )
                                              }
                                              disabled={
                                                spamOverrideMutation.isPending
                                              }
                                            >
                                              <Shield className="h-4 w-4 mr-2" />
                                              Remove from Spam
                                            </DropdownMenuItem>
                                          ) : (
                                            <DropdownMenuItem
                                              onClick={() =>
                                                markAsSpamMutation.mutate(
                                                  review.id
                                                )
                                              }
                                              disabled={
                                                markAsSpamMutation.isPending
                                              }
                                            >
                                              <Flag className="h-4 w-4 mr-2" />
                                              Add to Spam
                                            </DropdownMenuItem>
                                          )}

                                          {/* Respond Action */}
                                          <DropdownMenuItem
                                            onClick={() => {
                                              setSelectedReviewForResponse(
                                                review
                                              );
                                              setResponseText(
                                                review.admin_response || ""
                                              );
                                              setShowResponseDialog(true);
                                            }}
                                          >
                                            <MessageSquare className="h-4 w-4 mr-2" />
                                            Respond
                                          </DropdownMenuItem>

                                          {/* Download Action (only for videos) */}
                                          {review.review_type === "video" &&
                                            review.video_url && (
                                              <DropdownMenuItem
                                                onClick={() =>
                                                  handleVideoDownload(
                                                    review.video_url!,
                                                    review.customer_name
                                                  )
                                                }
                                              >
                                                <Download className="h-4 w-4 mr-2" />
                                                Download Video
                                              </DropdownMenuItem>
                                            )}

                                          {/* Delete Action */}
                                          <DropdownMenuItem
                                            onClick={() =>
                                              deleteMutation.mutate(review.id)
                                            }
                                            disabled={deleteMutation.isPending}
                                            className="text-red-600 focus:text-red-600"
                                          >
                                            <Trash2 className="h-4 w-4 mr-2" />
                                            Delete
                                          </DropdownMenuItem>
                                        </DropdownMenuContent>
                                      </DropdownMenu>
                                    </div>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      </div>
                    )}

                    {/* Pagination */}
                    {totalPages > 1 && (
                      <div className="mt-6 flex justify-center px-4 sm:px-0">
                        <Pagination>
                          <PaginationContent className="flex-wrap">
                            {currentPage > 1 && (
                              <PaginationItem>
                                <PaginationPrevious
                                  onClick={() =>
                                    setCurrentPage(currentPage - 1)
                                  }
                                  className="cursor-pointer"
                                />
                              </PaginationItem>
                            )}

                            {[...Array(totalPages)].map((_, i) => (
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
                                  onClick={() =>
                                    setCurrentPage(currentPage + 1)
                                  }
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
          </TabsContent>
        </Tabs>
      </div>

      {/* Review Details Dialog */}
      <Dialog
        open={showReviewDetailsDialog}
        onOpenChange={setShowReviewDetailsDialog}
      >
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Review Details</DialogTitle>
            <DialogDescription>
              Full review from {selectedReviewForDetails?.customer_name}
            </DialogDescription>
          </DialogHeader>

          {selectedReviewForDetails && (
            <div className="space-y-4">
              {/* Customer Info */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="font-medium">Customer:</span>
                  <p>{selectedReviewForDetails.customer_name}</p>
                </div>
                {selectedReviewForDetails.customer_email && (
                  <div>
                    <span className="font-medium">Email:</span>
                    <div className="flex items-center gap-1 mt-1">
                      <Mail className="h-3 w-3 text-gray-500" />
                      <p className="text-sm">
                        {selectedReviewForDetails.customer_email}
                      </p>
                    </div>
                  </div>
                )}
                <div>
                  <span className="font-medium">Date:</span>
                  <p>
                    {new Date(
                      selectedReviewForDetails.created_at
                    ).toLocaleDateString()}
                  </p>
                </div>
              </div>

              {/* Rating and Sentiment */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <span className="font-medium text-sm">Rating:</span>
                  <div className="flex items-center gap-1 mt-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={`h-4 w-4 ${
                          star <= selectedReviewForDetails.rating
                            ? "fill-yellow-400 text-yellow-400"
                            : "text-gray-300"
                        }`}
                      />
                    ))}
                    <span className="ml-2 text-sm text-gray-600">
                      ({selectedReviewForDetails.rating}/5)
                    </span>
                  </div>
                </div>
                {/* Sentiment Score */}
                <div>
                  <span className="font-medium text-sm">Sentiment:</span>
                  <div className="mt-1">
                    {getSentimentBadge(
                      selectedReviewForDetails.sentiment_score
                    ) || <Badge variant="secondary">Not analyzed</Badge>}
                  </div>
                </div>
              </div>

              {/* Employee Info */}
              <div>
                <span className="font-medium text-sm">Employee:</span>
                <p className="text-sm">
                  {selectedReviewForDetails.employee?.name ||
                    "No employee assigned"}
                  {selectedReviewForDetails.employee?.position && (
                    <span className="text-gray-600">
                      {" "}
                      - {selectedReviewForDetails.employee.position}
                    </span>
                  )}
                </p>
              </div>

              {/* Review Comment */}
              <div>
                <span className="font-medium text-sm">Review:</span>
                <div className="mt-2 p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm whitespace-pre-wrap leading-relaxed">
                    {selectedReviewForDetails.comment || "No comment provided"}
                  </p>
                </div>
              </div>

              {/* Video Preview if available */}
              {selectedReviewForDetails.video_url && (
                <div>
                  <span className="font-medium text-sm">Video Review:</span>
                  <div className="mt-2">
                    <VideoPreview
                      videoUrl={selectedReviewForDetails.video_url}
                      className="w-full max-w-md"
                    />
                  </div>
                </div>
              )}

              {/* Status and Admin Response */}
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <span className="font-medium text-sm">Status:</span>
                  <div className="mt-1 flex flex-wrap gap-2">
                    <Badge
                      variant={
                        selectedReviewForDetails.moderation_status ===
                        "approved"
                          ? "default"
                          : selectedReviewForDetails.moderation_status ===
                            "pending"
                          ? "secondary"
                          : "destructive"
                      }
                    >
                      {selectedReviewForDetails.moderation_status}
                    </Badge>

                    {selectedReviewForDetails.flagged_as_spam && (
                      <Badge variant="destructive">
                        <Flag className="h-3 w-3 mr-1" />
                        Spam
                      </Badge>
                    )}
                  </div>
                </div>

                {selectedReviewForDetails.admin_response && (
                  <div>
                    <span className="font-medium text-sm">Admin Response:</span>
                    <div className="mt-2 p-3 bg-blue-50 rounded-lg">
                      <p className="text-sm">
                        {selectedReviewForDetails.admin_response}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowReviewDetailsDialog(false)}
            >
              Close
            </Button>
            {selectedReviewForDetails?.flagged_as_spam ? (
              <Button
                variant="outline"
                onClick={() => {
                  spamOverrideMutation.mutate(selectedReviewForDetails.id);
                  setShowReviewDetailsDialog(false);
                }}
                disabled={spamOverrideMutation.isPending}
              >
                <Shield className="h-4 w-4 mr-2" />
                Mark as NOT Spam
              </Button>
            ) : (
              <Button
                variant="outline"
                onClick={() => {
                  markAsSpamMutation.mutate(selectedReviewForDetails.id);
                  setShowReviewDetailsDialog(false);
                }}
                disabled={markAsSpamMutation.isPending}
              >
                <Flag className="h-4 w-4 mr-2" />
                Add to Spam
              </Button>
            )}
            {selectedReviewForDetails &&
              !selectedReviewForDetails.admin_response && (
                <Button
                  onClick={() => {
                    setSelectedReviewForResponse(selectedReviewForDetails);
                    setShowReviewDetailsDialog(false);
                    setShowResponseDialog(true);
                  }}
                >
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Respond
                </Button>
              )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
                    Review for:{" "}
                    {selectedReviewForResponse.employee?.name || "Company"}
                    {selectedReviewForResponse.employee?.position &&
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
