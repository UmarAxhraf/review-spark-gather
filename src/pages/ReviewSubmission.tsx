import React, { useState, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Star,
  MessageSquare,
  Video,
  AlertCircle,
  CheckCircle2,
  Gift,
  Heart,
  Trophy,
  Sparkles,
  Mail,
  Phone,
} from "lucide-react";
import { publicSupabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import VideoRecorder from "@/components/VideoRecorder";
import VideoUploader from "@/components/VideoUploader";
import {
  retryWithBackoff,
  isOnline,
  waitForOnline,
} from "@/utils/networkUtils";

interface Employee {
  id: string;
  name: string;
  position?: string;
  company_id: string;
  email?: string;
}

interface Company {
  id: string;
  company_name?: string;
  logo_url?: string;
  primary_color?: string;
  thank_you_message?: string;
  incentive_enabled?: boolean;
  incentive_type?: string;
  incentive_value?: string;
  follow_up_enabled?: boolean;
  follow_up_delay_days?: number;
}

interface FormErrors {
  rating?: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  video?: string;
}

const ReviewSubmission = () => {
  const { qrCodeId } = useParams<{ qrCodeId: string }>();
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [company, setCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [rating, setRating] = useState(0);
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [comment, setComment] = useState("");
  const [reviewType, setReviewType] = useState<"text" | "video">("text");
  const [videoFile, setVideoFile] = useState<Blob | File | null>(null);
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [uploadProgress, setUploadProgress] = useState(0);
  const [submissionStatus, setSubmissionStatus] = useState<
    "idle" | "success" | "error"
  >("idle");
  const [submissionId, setSubmissionId] = useState<string | null>(null);
  const [showIncentive, setShowIncentive] = useState(false);
  const formSubmittedRef = useRef(false);

  useEffect(() => {
    if (qrCodeId) {
      fetchEmployeeAndCompany();
      recordQRCodeScan();
    }
  }, [qrCodeId]);

  const fetchEmployeeAndCompany = async () => {
    try {
      if (!isOnline()) {
        await waitForOnline();
      }

      // Fetch employee data with retry logic
      const employeeData = await retryWithBackoff(
        async () => {
          const { data, error } = await publicSupabase
            .from("employees")
            .select("id, name, position, company_id, email")
            .eq("qr_code_id", qrCodeId)
            .eq("is_active", true)
            .single();

          if (error) {
            throw new Error(`Employee fetch failed: ${error.message}`);
          }
          return data;
        },
        3,
        1000
      );

      setEmployee(employeeData);

      // Fetch company settings with fallback
      try {
        const { data: companyData, error: companyError } = await publicSupabase
          .from("profiles")
          .select("id, company_name, logo_url, primary_color")
          .eq("id", employeeData.company_id)
          .maybeSingle(); // Use maybeSingle instead of single to handle no results

        if (companyError && companyError.code !== "PGRST116") {
          console.warn("Company settings error:", companyError);
        }

        // Set company data with defaults
        setCompany({
          id: employeeData.company_id,
          company_name: companyData?.company_name || "Company",
          logo_url: companyData?.logo_url || undefined,
          primary_color: companyData?.primary_color || "#3b82f6",
          thank_you_message: "Thank you for your feedback!",
          incentive_enabled: false,
          follow_up_enabled: false,
        });
      } catch (companyError) {
        console.warn(
          "Using default company settings due to error:",
          companyError
        );
        setCompany({
          id: employeeData.company_id,
          company_name: "Company",
          primary_color: "#3b82f6",
          thank_you_message: "Thank you for your feedback!",
          incentive_enabled: false,
          follow_up_enabled: false,
        });
      }
    } catch (error) {
      console.error("Error fetching employee:", error);
      toast.error("Failed to load employee information");
    } finally {
      setLoading(false);
    }
  };

  const recordQRCodeScan = async () => {
    try {
      if (!qrCodeId) return;

      const { data: employeeData, error: employeeError } = await publicSupabase
        .from("employees")
        .select("id, company_id")
        .eq("qr_code_id", qrCodeId)
        .single();

      if (employeeError || !employeeData) {
        console.error(
          "Error fetching employee for scan recording:",
          employeeError
        );
        return;
      }

      // Get IP address with fallback
      let ipAddress = "anonymous";
      try {
        const response = await fetch("https://api.ipify.org?format=json", {
          signal: AbortSignal.timeout(5000),
        });
        if (response.ok) {
          const data = await response.json();
          ipAddress = data.ip;
        }
      } catch (ipError) {
        console.warn("Could not fetch IP address:", ipError);
      }

      await retryWithBackoff(
        async () => {
          const { error } = await publicSupabase.from("qr_code_scans").insert({
            qr_code_id: qrCodeId,
            employee_id: employeeData.id,
            company_id: employeeData.company_id,
            ip_address: ipAddress,
            user_agent: navigator.userAgent.substring(0, 255),
          });

          if (error) {
            throw new Error(`QR scan recording failed: ${error.message}`);
          }
        },
        2,
        1000
      );
    } catch (error) {
      console.error("Error recording scan:", error);
    }
  };

  // Update the uploadVideo function
  const uploadVideo = async (file: Blob | File): Promise<string> => {
    if (!file) {
      throw new Error("No file provided");
    }

    return retryWithBackoff(
      async () => {
        const fileName = `review-${Date.now()}-${Math.random()
          .toString(36)
          .substring(2)}.webm`;

        // Force correct content type
        let contentType = "video/webm";
        let uploadFile: Blob | File = file;

        if (file.type) {
          const validVideoTypes = [
            "video/webm",
            "video/mp4",
            "video/webm;codecs=vp9,opus",
            "video/webm;codecs=vp8,opus",
            "video/webm;codecs=h264,opus",
            "video/mp4;codecs=h264,aac",
          ];

          if (
            validVideoTypes.some((type) =>
              file.type.startsWith(type.split(";")[0])
            )
          ) {
            contentType = file.type;
          } else {
            console.warn(
              "Invalid file type detected:",
              file.type,
              "forcing to video/webm"
            );
            uploadFile = new Blob([file], { type: "video/webm" });
            contentType = "video/webm";
          }
        } else {
          console.warn("No file type detected, forcing to video/webm");
          uploadFile = new Blob([file], { type: "video/webm" });
          contentType = "video/webm";
        }

        // Upload to storage
        const { data, error } = await publicSupabase.storage
          .from("video-reviews")
          .upload(fileName, uploadFile, {
            contentType,
            upsert: false,
            cacheControl: "3600",
            metadata: {
              "content-type": contentType,
              "file-type": "video",
              "original-type": file.type || "unknown",
            },
          });

        if (error) {
          console.error("Upload error:", error);
          throw new Error(`Upload failed: ${error.message}`);
        }

        // Generate signed URL for better security and access
        const { data: signedUrlData, error: urlError } =
          await publicSupabase.storage
            .from("video-reviews")
            .createSignedUrl(data.path, 60 * 60 * 24 * 365); // 1 year expiry

        if (urlError) {
          console.warn(
            "Failed to create signed URL, falling back to public URL:",
            urlError
          );
          // Fallback to public URL
          const {
            data: { publicUrl },
          } = publicSupabase.storage
            .from("video-reviews")
            .getPublicUrl(data.path);

          return publicUrl;
        }
        return signedUrlData.signedUrl;
      },
      3,
      2000
    );
  };

  const validateForm = (): boolean => {
    const errors: FormErrors = {};

    if (rating === 0) {
      errors.rating = "Please provide a rating";
    }

    if (!customerName.trim()) {
      errors.customerName = "Name is required";
    }

    if (customerEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail)) {
      errors.customerEmail = "Please enter a valid email address";
    }

    if (reviewType === "video" && !videoFile) {
      errors.video = "Please record or upload a video";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const checkDuplicateSubmission = async (): Promise<boolean> => {
    try {
      if (!employee || !customerEmail) return false;

      const twentyFourHoursAgo = new Date(
        Date.now() - 24 * 60 * 60 * 1000
      ).toISOString();

      const { data, error } = await publicSupabase
        .from("reviews")
        .select("id")
        .eq("employee_id", employee.id)
        .eq("customer_email", customerEmail)
        .gte("created_at", twentyFourHoursAgo)
        .limit(1);

      if (error) {
        console.error("Error checking duplicates:", error);
        return false;
      }

      return data && data.length > 0;
    } catch (error) {
      console.error("Error checking duplicates:", error);
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formSubmittedRef.current || submitting) {
      return;
    }

    if (!validateForm()) {
      return;
    }

    if (!employee) {
      toast.error("Employee information not found");
      return;
    }

    if (!isOnline()) {
      toast.error(
        "No internet connection. Please check your network and try again."
      );
      return;
    }

    // Check for duplicate submissions
    if (customerEmail) {
      const isDuplicate = await checkDuplicateSubmission();
      if (isDuplicate) {
        toast.error(
          "You have already submitted a review for this employee in the last 24 hours."
        );
        return;
      }
    }

    setSubmitting(true);
    formSubmittedRef.current = true;

    try {
      let videoUrl: string | null = null;

      // Upload video if provided
      if (reviewType === "video" && videoFile) {
        setUploadProgress(25);
        try {
          videoUrl = await uploadVideo(videoFile);
          setUploadProgress(50);
        } catch (uploadError) {
          console.error("Video upload error:", uploadError);
          toast.error("Failed to upload video. Please try again.");
          throw uploadError;
        }
      }

      const reviewData = await retryWithBackoff(
        async () => {
          const { data, error } = await publicSupabase
            .from("reviews")
            .insert({
              employee_id: employee.id,
              company_id: employee.company_id,
              customer_name: customerName.trim(),
              customer_email: customerEmail.trim() || null,
              customer_phone: customerPhone.trim() || null,
              rating,
              comment: comment.trim() || null,
              review_type: reviewType,
              video_url: videoUrl,
              allow_follow_up: !!customerEmail,
              share_permission: true,
            })
            .select("id")
            .single();

          if (error) {
            console.error("Database error:", error);
            if (error.code === "23505") {
              throw new Error(
                "You have already submitted a review for this employee today."
              );
            }
            if (error.code === "42501") {
              throw new Error(
                "Permission denied. Please refresh the page and try again."
              );
            }
            throw new Error(`Submission failed: ${error.message}`);
          }

          if (!data || !data.id) {
            throw new Error("Review submission failed - no data returned");
          }

          return data;
        },
        3,
        1000
      );

      setUploadProgress(100);

      // Safely access the id with null check
      if (reviewData && reviewData.id) {
        setSubmissionId(reviewData.id);
        setSubmissionStatus("success");

        // Show incentive if enabled
        if (company?.incentive_enabled) {
          setShowIncentive(true);
        }

        toast.success("Review submitted successfully!");
      } else {
        throw new Error("Review submission failed - invalid response data");
      }
    } catch (error: any) {
      console.error("Error submitting review:", error);
      setSubmissionStatus("error");

      let errorMessage = "Failed to submit review. Please try again.";

      if (error.message?.includes("401")) {
        errorMessage = "Authentication error. Please refresh and try again.";
      } else if (error.message?.includes("406")) {
        errorMessage = "Request format error. Please try again.";
      } else if (error.message?.includes("already submitted")) {
        errorMessage = error.message;
      } else if (error.message?.includes("Permission denied")) {
        errorMessage = error.message;
      } else if (error.message?.includes("network")) {
        errorMessage =
          "Network error. Please check your connection and try again.";
      }

      toast.error(errorMessage);
      formSubmittedRef.current = false;
    } finally {
      setSubmitting(false);
      setUploadProgress(0);
    }
  };

  const resetForm = () => {
    setRating(0);
    setCustomerName("");
    setCustomerEmail("");
    setCustomerPhone("");
    setComment("");
    setVideoFile(null);
    setFormErrors({});
    setSubmissionStatus("idle");
    setSubmissionId(null);
    setShowIncentive(false);
    formSubmittedRef.current = false;
  };

  const handleVideoRecorded = (blob: Blob) => {
    setVideoFile(blob);
    setFormErrors((prev) => ({ ...prev, video: undefined }));
  };

  const handleVideoSelected = (file: File) => {
    setVideoFile(file);
    setFormErrors((prev) => ({ ...prev, video: undefined }));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading employee information...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!employee) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-pink-100 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Employee Not Found
            </h2>
            <p className="text-gray-600 mb-4">
              The QR code you scanned is not associated with an active employee.
            </p>
            <Button onClick={() => window.location.reload()} variant="outline">
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (submissionStatus === "success") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              {company?.thank_you_message || "Thank you for your feedback!"}
            </h2>
            <p className="text-gray-600 mb-6">
              Your review has been submitted successfully and will help us
              improve our service.
            </p>

            {showIncentive && company?.incentive_enabled && (
              <div className="bg-gradient-to-r from-purple-500 to-pink-500 text-white p-4 rounded-lg mb-6">
                <Gift className="h-8 w-8 mx-auto mb-2" />
                <h3 className="font-semibold mb-1">Special Offer!</h3>
                <p className="text-sm">
                  {company.incentive_value || "Thank you for your feedback!"}
                </p>
              </div>
            )}

            <Button onClick={resetForm} className="w-full">
              Submit Another Review
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8 px-4"
      style={{
        background: company?.primary_color
          ? `linear-gradient(to bottom right, ${company.primary_color}20, ${company.primary_color}10)`
          : undefined,
      }}
    >
      <div className="max-w-2xl mx-auto">
        {/* Company Header */}
        <div className="text-center mb-8">
          {company?.logo_url && (
            <img
              src={company.logo_url}
              alt={company.company_name || "Company Logo"}
              className="h-16 w-auto mx-auto mb-4"
            />
          )}
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Share Your Experience
          </h1>
          <p className="text-gray-600">
            Help us improve by sharing your feedback about{" "}
            <span className="font-semibold">{employee.name}</span>
            {employee.position && (
              <span className="text-gray-500"> ({employee.position})</span>
            )}
          </p>
        </div>

        <Card className="shadow-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Heart className="h-5 w-5 text-red-500" />
              Review Submission
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Review Type Selection */}
              <Tabs
                value={reviewType}
                onValueChange={(value) =>
                  setReviewType(value as "text" | "video")
                }
              >
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="text" className="flex items-center gap-2">
                    <MessageSquare className="h-4 w-4" />
                    Text Review
                  </TabsTrigger>
                  <TabsTrigger
                    value="video"
                    className="flex items-center gap-2"
                  >
                    <Video className="h-4 w-4" />
                    Video Review
                  </TabsTrigger>
                </TabsList>

                {/* Rating */}
                <div className="space-y-2 mt-6">
                  <Label htmlFor="rating">Rating *</Label>
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => {
                          setRating(star);
                          setFormErrors((prev) => ({
                            ...prev,
                            rating: undefined,
                          }));
                        }}
                        className={`p-1 rounded transition-colors ${
                          star <= rating
                            ? "text-yellow-400 hover:text-yellow-500"
                            : "text-gray-300 hover:text-gray-400"
                        }`}
                      >
                        <Star className="h-8 w-8 fill-current" />
                      </button>
                    ))}
                  </div>
                  {formErrors.rating && (
                    <p className="text-sm text-red-600">{formErrors.rating}</p>
                  )}
                </div>

                {/* Customer Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="customerName">Your Name *</Label>
                    <Input
                      id="customerName"
                      value={customerName}
                      onChange={(e) => {
                        setCustomerName(e.target.value);
                        setFormErrors((prev) => ({
                          ...prev,
                          customerName: undefined,
                        }));
                      }}
                      placeholder="Enter your name"
                      className={
                        formErrors.customerName ? "border-red-500" : ""
                      }
                    />
                    {formErrors.customerName && (
                      <p className="text-sm text-red-600">
                        {formErrors.customerName}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="customerEmail">
                      Email <span className="text-gray-500">(optional)</span>
                    </Label>
                    <Input
                      id="customerEmail"
                      type="email"
                      value={customerEmail}
                      onChange={(e) => {
                        setCustomerEmail(e.target.value);
                        setFormErrors((prev) => ({
                          ...prev,
                          customerEmail: undefined,
                        }));
                      }}
                      placeholder="your.email@example.com"
                      className={
                        formErrors.customerEmail ? "border-red-500" : ""
                      }
                    />
                    {formErrors.customerEmail && (
                      <p className="text-sm text-red-600">
                        {formErrors.customerEmail}
                      </p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="customerPhone">
                    Phone <span className="text-gray-500">(optional)</span>
                  </Label>
                  <Input
                    id="customerPhone"
                    type="tel"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="Your phone number"
                  />
                </div>

                {/* Review Content */}
                <TabsContent value="text" className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="comment">Your Review</Label>
                    <Textarea
                      id="comment"
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      placeholder="Tell us about your experience..."
                      rows={4}
                    />
                  </div>
                </TabsContent>

                <TabsContent value="video" className="space-y-4">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Record or Upload Video</Label>
                      <Tabs defaultValue="record" className="w-full">
                        <TabsList className="grid w-full grid-cols-2">
                          <TabsTrigger
                            value="record"
                            className="flex items-center gap-2"
                          >
                            <Video className="h-4 w-4" />
                            Record Video
                          </TabsTrigger>
                          <TabsTrigger
                            value="upload"
                            className="flex items-center gap-2"
                          >
                            <MessageSquare className="h-4 w-4" />
                            Upload Video
                          </TabsTrigger>
                        </TabsList>

                        <TabsContent value="record" className="mt-4">
                          <VideoRecorder
                            onVideoRecorded={handleVideoRecorded}
                          />
                        </TabsContent>

                        <TabsContent value="upload" className="mt-4">
                          <VideoUploader
                            onVideoSelected={handleVideoSelected}
                          />
                        </TabsContent>
                      </Tabs>

                      {formErrors.video && (
                        <p className="text-sm text-red-600">
                          {formErrors.video}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="videoComment">
                        Additional Comments{" "}
                        <span className="text-gray-500">(optional)</span>
                      </Label>
                      <Textarea
                        id="videoComment"
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                        placeholder="Any additional feedback..."
                        rows={3}
                      />
                    </div>
                  </div>
                </TabsContent>
              </Tabs>

              {/* Upload Progress */}
              {uploadProgress > 0 && uploadProgress < 100 && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Uploading...</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <Progress value={uploadProgress} className="w-full" />
                </div>
              )}

              {/* Submit Button */}
              <Button
                type="submit"
                disabled={submitting || !isOnline()}
                className="w-full"
                size="lg"
              >
                {submitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Submitting...
                  </>
                ) : (
                  "Submit Review"
                )}
              </Button>

              {!isOnline() && (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    No internet connection. Please check your network and try
                    again.
                  </AlertDescription>
                </Alert>
              )}
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ReviewSubmission;
