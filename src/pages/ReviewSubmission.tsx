// import React, { useState, useEffect, useRef } from "react";
// import { useParams } from "react-router-dom";
// import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
// import { Button } from "@/components/ui/button";
// import { Input } from "@/components/ui/input";
// import { Label } from "@/components/ui/label";
// import { Textarea } from "@/components/ui/textarea";
// import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
// import {
//   Star,
//   MessageSquare,
//   Video,
//   AlertCircle,
//   CheckCircle2,
// } from "lucide-react";
// import { supabase } from "@/integrations/supabase/client";
// import { toast } from "sonner";
// import VideoRecorder from "@/components/VideoRecorder";
// import VideoUploader from "@/components/VideoUploader";
// import { Progress } from "@/components/ui/progress";
// import { Alert, AlertDescription } from "@/components/ui/alert";

// interface Employee {
//   id: string;
//   name: string;
//   position?: string;
//   company_id: string;
// }

// interface FormErrors {
//   rating?: string;
//   customerName?: string;
//   customerEmail?: string;
//   video?: string;
// }

// const ReviewSubmission = () => {
//   const { qrCodeId } = useParams();
//   const [employee, setEmployee] = useState<Employee | null>(null);
//   const [loading, setLoading] = useState(true);
//   const [submitting, setSubmitting] = useState(false);
//   const [rating, setRating] = useState(0);
//   const [customerName, setCustomerName] = useState("");
//   const [customerEmail, setCustomerEmail] = useState("");
//   const [comment, setComment] = useState("");
//   const [reviewType, setReviewType] = useState<"text" | "video">("text");
//   const [videoFile, setVideoFile] = useState<Blob | File | null>(null);

//   // New state variables for enhanced features
//   const [formErrors, setFormErrors] = useState<FormErrors>({});
//   const [uploadProgress, setUploadProgress] = useState(0);
//   const [submissionStatus, setSubmissionStatus] = useState<
//     "idle" | "success" | "error"
//   >("idle");
//   const [submissionId, setSubmissionId] = useState<string | null>(null);
//   const formSubmittedRef = useRef(false);

//   useEffect(() => {
//     if (qrCodeId) {
//       fetchEmployee();
//       recordQRCodeScan(); // Record QR code scan when page loads
//     }
//   }, [qrCodeId]);

//   const fetchEmployee = async () => {
//     try {
//       console.log("Fetching employee for QR code:", qrCodeId);
//       const { data, error } = await supabase
//         .from("employees")
//         .select("*")
//         .eq("qr_code_id", qrCodeId)
//         .eq("is_active", true)
//         .single();

//       if (error) {
//         console.error("Error fetching employee:", error);
//         toast.error("Employee not found or inactive");
//         return;
//       }

//       console.log("Employee found:", data);
//       setEmployee(data);
//     } catch (error) {
//       console.error("Error:", error);
//       toast.error("Failed to load employee information");
//     } finally {
//       setLoading(false);
//     }
//   };

//   // New function to record QR code scan
//   const recordQRCodeScan = async () => {
//     try {
//       if (!qrCodeId) return;

//       // First get the employee to get their company_id and id
//       const { data: employeeData, error: employeeError } = await supabase
//         .from("employees")
//         .select("id, company_id")
//         .eq("qr_code_id", qrCodeId)
//         .single();

//       if (employeeError || !employeeData) {
//         console.error(
//           "Error fetching employee for scan recording:",
//           employeeError
//         );
//         return;
//       }

//       // Record the scan
//       const { error } = await supabase.from("qr_code_scans").insert({
//         qr_code_id: qrCodeId,
//         company_id: employeeData.company_id,
//         employee_id: employeeData.id,
//         ip_address: "anonymous", // For privacy reasons
//         user_agent: navigator.userAgent.substring(0, 255), // Truncate if too long
//       });

//       if (error) {
//         console.error("Error recording QR code scan:", error);
//       }
//     } catch (error) {
//       console.error("Error in recordQRCodeScan:", error);
//     }
//   };

//   const uploadVideo = async (
//     videoBlob: Blob | File
//   ): Promise<string | null> => {
//     try {
//       console.log("Starting video upload...", videoBlob);
//       setUploadProgress(0);

//       // Create a unique filename
//       const fileExt =
//         videoBlob instanceof File ? videoBlob.name.split(".").pop() : "webm";
//       const fileName = `${employee?.id}_${Date.now()}.${fileExt}`;

//       console.log("Uploading file:", fileName);

//       // Upload with progress tracking
//       const { data, error } = await supabase.storage
//         .from("video-reviews")
//         .upload(fileName, videoBlob, {
//           cacheControl: "3600",
//           upsert: false,
//           onUploadProgress: (progress) => {
//             const percent = Math.round(
//               (progress.loaded / progress.total) * 100
//             );
//             setUploadProgress(percent);
//           },
//         });

//       if (error) {
//         console.error("Storage upload error:", error);
//         throw error;
//       }

//       console.log("Upload successful:", data);

//       const {
//         data: { publicUrl },
//       } = supabase.storage.from("video-reviews").getPublicUrl(fileName);

//       console.log("Public URL:", publicUrl);
//       return publicUrl;
//     } catch (error: any) {
//       console.error("Error uploading video:", error);
//       toast.error(
//         "Failed to upload video: " + (error.message || "Unknown error")
//       );
//       return null;
//     }
//   };

//   // New function to validate form
//   const validateForm = (): boolean => {
//     const errors: FormErrors = {};
//     let isValid = true;

//     if (rating === 0) {
//       errors.rating = "Please select a rating";
//       isValid = false;
//     }

//     if (!customerName.trim()) {
//       errors.customerName = "Please enter your name";
//       isValid = false;
//     }

//     if (customerEmail.trim() && !/^\S+@\S+\.\S+$/.test(customerEmail)) {
//       errors.customerEmail = "Please enter a valid email address";
//       isValid = false;
//     }

//     if (reviewType === "video" && !videoFile) {
//       errors.video = "Please record or upload a video";
//       isValid = false;
//     }

//     setFormErrors(errors);
//     return isValid;
//   };

//   // Check for duplicate submissions
//   const checkDuplicateSubmission = async (): Promise<boolean> => {
//     if (!employee) return false;

//     // Check if this customer has already submitted a review for this employee in the last hour
//     const oneHourAgo = new Date();
//     oneHourAgo.setHours(oneHourAgo.getHours() - 1);

//     const { data, error } = await supabase
//       .from("reviews")
//       .select("id")
//       .eq("employee_id", employee.id)
//       .eq("customer_name", customerName.trim())
//       .gte("created_at", oneHourAgo.toISOString())
//       .limit(1);

//     if (error) {
//       console.error("Error checking for duplicate submission:", error);
//       return false;
//     }

//     return data && data.length > 0;
//   };

//   const handleSubmit = async (e: React.FormEvent) => {
//     e.preventDefault();

//     // Prevent double submissions
//     if (formSubmittedRef.current) {
//       return;
//     }

//     console.log("Submitting review...", {
//       employee: employee?.id,
//       rating,
//       customerName: customerName.trim(),
//       reviewType,
//       hasVideo: !!videoFile,
//     });

//     // Validate form
//     if (!validateForm()) {
//       return;
//     }

//     // Check for duplicate submissions
//     const isDuplicate = await checkDuplicateSubmission();
//     if (isDuplicate) {
//       toast.error(
//         "You've already submitted a review for this employee recently"
//       );
//       return;
//     }

//     formSubmittedRef.current = true;
//     setSubmitting(true);
//     setSubmissionStatus("idle");

//     try {
//       let videoUrl = null;

//       if (reviewType === "video" && videoFile) {
//         console.log("Uploading video file...");
//         videoUrl = await uploadVideo(videoFile);
//         if (!videoUrl) {
//           throw new Error("Failed to upload video");
//         }
//         console.log("Video uploaded successfully:", videoUrl);
//       }

//       console.log("Inserting review into database...");
//       const { data, error } = await supabase
//         .from("reviews")
//         .insert({
//           employee_id: employee!.id,
//           company_id: employee!.company_id,
//           customer_name: customerName.trim(),
//           customer_email: customerEmail.trim() || null,
//           rating,
//           comment: comment.trim() || null,
//           review_type: reviewType,
//           video_url: videoUrl,
//           is_approved: false, // Default to not approved for moderation
//         })
//         .select("id")
//         .single();

//       if (error) {
//         console.error("Database insert error:", error);
//         throw error;
//       }

//       console.log("Review submitted successfully", data);
//       setSubmissionId(data.id);
//       setSubmissionStatus("success");
//       toast.success("Thank you for your review!");

//       // Reset form
//       setRating(0);
//       setCustomerName("");
//       setCustomerEmail("");
//       setComment("");
//       setVideoFile(null);
//       setFormErrors({});
//     } catch (error: any) {
//       console.error("Error submitting review:", error);
//       setSubmissionStatus("error");
//       toast.error(
//         "Failed to submit review: " + (error.message || "Please try again.")
//       );
//     } finally {
//       setSubmitting(false);
//       setTimeout(() => {
//         formSubmittedRef.current = false;
//       }, 2000); // Allow resubmission after 2 seconds
//     }
//   };

//   const handleVideoRecorded = (blob: Blob) => {
//     console.log("Video recorded:", blob);
//     setVideoFile(blob);
//     setFormErrors({ ...formErrors, video: undefined });
//   };

//   const handleVideoSelected = (file: File) => {
//     console.log("Video selected:", file);
//     setVideoFile(file);
//     setFormErrors({ ...formErrors, video: undefined });
//   };

//   if (loading) {
//     return (
//       <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
//         <div className="text-center">
//           <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
//           <p className="mt-4 text-gray-600">Loading...</p>
//         </div>
//       </div>
//     );
//   }

//   if (!employee) {
//     return (
//       <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center px-4">
//         <Card className="w-full max-w-md text-center">
//           <CardContent className="pt-6">
//             <h2 className="text-2xl font-bold text-gray-900 mb-4">
//               Employee Not Found
//             </h2>
//             <p className="text-gray-600">
//               The employee you're looking for is not available or inactive.
//             </p>
//           </CardContent>
//         </Card>
//       </div>
//     );
//   }

//   // Show success message after submission
//   if (submissionStatus === "success") {
//     return (
//       <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center px-4">
//         <Card className="w-full max-w-md text-center">
//           <CardContent className="pt-6">
//             <div className="flex justify-center mb-4">
//               <CheckCircle2 className="h-16 w-16 text-green-500" />
//             </div>
//             <h2 className="text-2xl font-bold text-gray-900 mb-4">
//               Thank You!
//             </h2>
//             <p className="text-gray-600 mb-6">
//               Your review has been submitted successfully. We appreciate your
//               feedback!
//             </p>
//             <Button
//               onClick={() => setSubmissionStatus("idle")}
//               className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
//             >
//               Submit Another Review
//             </Button>
//           </CardContent>
//         </Card>
//       </div>
//     );
//   }

//   return (
//     <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 py-8 px-4">
//       <div className="max-w-md mx-auto">
//         <Card>
//           <CardHeader className="text-center">
//             <CardTitle className="text-2xl">Leave a Review</CardTitle>
//             <div className="mt-4">
//               <h3 className="text-lg font-semibold text-gray-900">
//                 {employee.name}
//               </h3>
//               {employee.position && (
//                 <p className="text-sm text-gray-600">{employee.position}</p>
//               )}
//             </div>
//           </CardHeader>
//           <CardContent>
//             <form onSubmit={handleSubmit} className="space-y-6">
//               {/* Review Type Selection */}
//               <div className="space-y-2">
//                 <Label>Review Type</Label>
//                 <Tabs
//                   value={reviewType}
//                   onValueChange={(value) => {
//                     setReviewType(value as "text" | "video");
//                     setVideoFile(null); // Clear video when switching types
//                   }}
//                 >
//                   <TabsList className="grid w-full grid-cols-2">
//                     <TabsTrigger
//                       value="text"
//                       className="flex items-center space-x-2"
//                     >
//                       <MessageSquare className="h-4 w-4" />
//                       <span>Text Review</span>
//                     </TabsTrigger>
//                     <TabsTrigger
//                       value="video"
//                       className="flex items-center space-x-2"
//                     >
//                       <Video className="h-4 w-4" />
//                       <span>Video Review</span>
//                     </TabsTrigger>
//                   </TabsList>
//                 </Tabs>
//               </div>

//               {/* Rating */}
//               <div className="space-y-2">
//                 <Label>Rating *</Label>
//                 <div className="flex justify-center space-x-1">
//                   {[1, 2, 3, 4, 5].map((star) => (
//                     <button
//                       key={star}
//                       type="button"
//                       onClick={() => {
//                         setRating(star);
//                         setFormErrors({ ...formErrors, rating: undefined });
//                       }}
//                       className="p-1 hover:scale-110 transition-transform"
//                     >
//                       <Star
//                         className={`h-8 w-8 ${
//                           star <= rating
//                             ? "fill-yellow-400 text-yellow-400"
//                             : "text-gray-300"
//                         }`}
//                       />
//                     </button>
//                   ))}
//                 </div>
//                 {rating > 0 && (
//                   <p className="text-center text-sm text-gray-600">
//                     {rating} star{rating !== 1 ? "s" : ""}
//                   </p>
//                 )}
//                 {formErrors.rating && (
//                   <p className="text-center text-sm text-red-500">
//                     {formErrors.rating}
//                   </p>
//                 )}
//               </div>

//               {/* Customer Name */}
//               <div className="space-y-2">
//                 <Label htmlFor="customerName">Your Name *</Label>
//                 <Input
//                   id="customerName"
//                   value={customerName}
//                   onChange={(e) => {
//                     setCustomerName(e.target.value);
//                     if (e.target.value.trim()) {
//                       setFormErrors({ ...formErrors, customerName: undefined });
//                     }
//                   }}
//                   placeholder="Enter your name"
//                   className={formErrors.customerName ? "border-red-500" : ""}
//                   required
//                 />
//                 {formErrors.customerName && (
//                   <p className="text-sm text-red-500">
//                     {formErrors.customerName}
//                   </p>
//                 )}
//               </div>

//               {/* Customer Email */}
//               <div className="space-y-2">
//                 <Label htmlFor="customerEmail">Your Email (Optional)</Label>
//                 <Input
//                   id="customerEmail"
//                   type="email"
//                   value={customerEmail}
//                   onChange={(e) => {
//                     setCustomerEmail(e.target.value);
//                     if (
//                       e.target.value.trim() === "" ||
//                       /^\S+@\S+\.\S+$/.test(e.target.value)
//                     ) {
//                       setFormErrors({
//                         ...formErrors,
//                         customerEmail: undefined,
//                       });
//                     }
//                   }}
//                   placeholder="Enter your email"
//                   className={formErrors.customerEmail ? "border-red-500" : ""}
//                 />
//                 {formErrors.customerEmail && (
//                   <p className="text-sm text-red-500">
//                     {formErrors.customerEmail}
//                   </p>
//                 )}
//               </div>

//               {/* Review Content */}
//               <Tabs value={reviewType}>
//                 <TabsContent value="text" className="space-y-2">
//                   <Label htmlFor="comment">Comment (Optional)</Label>
//                   <Textarea
//                     id="comment"
//                     value={comment}
//                     onChange={(e) => setComment(e.target.value)}
//                     placeholder="Tell us about your experience..."
//                     rows={4}
//                   />
//                 </TabsContent>

//                 <TabsContent value="video" className="space-y-4">
//                   <Label>Video Review</Label>
//                   <Tabs defaultValue="record" className="w-full">
//                     <TabsList className="grid w-full grid-cols-2">
//                       <TabsTrigger value="record">Record Video</TabsTrigger>
//                       <TabsTrigger value="upload">Upload Video</TabsTrigger>
//                     </TabsList>

//                     <TabsContent value="record">
//                       <VideoRecorder
//                         onVideoRecorded={handleVideoRecorded}
//                         maxDuration={120}
//                       />
//                     </TabsContent>

//                     <TabsContent value="upload">
//                       <VideoUploader
//                         onVideoSelected={handleVideoSelected}
//                         maxSizeMB={50}
//                       />
//                     </TabsContent>
//                   </Tabs>

//                   {formErrors.video && (
//                     <p className="text-sm text-red-500">{formErrors.video}</p>
//                   )}

//                   {/* Optional text comment for video reviews */}
//                   <div className="space-y-2">
//                     <Label htmlFor="videoComment">
//                       Additional Comments (Optional)
//                     </Label>
//                     <Textarea
//                       id="videoComment"
//                       value={comment}
//                       onChange={(e) => setComment(e.target.value)}
//                       placeholder="Add any additional comments about your video review..."
//                       rows={2}
//                     />
//                   </div>
//                 </TabsContent>
//               </Tabs>

//               {/* Video status indicator */}
//               {reviewType === "video" && videoFile && (
//                 <div className="text-center text-sm text-green-600 bg-green-50 p-2 rounded">
//                   ✓ Video ready for submission (
//                   {Math.round((videoFile.size / 1024 / 1024) * 100) / 100} MB)
//                 </div>
//               )}

//               {/* Upload progress indicator */}
//               {submitting && uploadProgress > 0 && uploadProgress < 100 && (
//                 <div className="space-y-2">
//                   <div className="flex justify-between text-sm">
//                     <span>Uploading video...</span>
//                     <span>{uploadProgress}%</span>
//                   </div>
//                   <Progress value={uploadProgress} className="h-2" />
//                 </div>
//               )}

//               {/* Error message */}
//               {submissionStatus === "error" && (
//                 <Alert variant="destructive">
//                   <AlertCircle className="h-4 w-4" />
//                   <AlertDescription>
//                     There was an error submitting your review. Please try again.
//                   </AlertDescription>
//                 </Alert>
//               )}

//               <Button
//                 type="submit"
//                 className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
//                 disabled={
//                   submitting ||
//                   rating === 0 ||
//                   !customerName.trim() ||
//                   (reviewType === "video" && !videoFile)
//                 }
//               >
//                 {submitting ? "Submitting..." : "Submit Review"}
//               </Button>
//             </form>
//           </CardContent>
//         </Card>
//       </div>
//     </div>
//   );
// };

// export default ReviewSubmission;

//========================>>>>>>>>>>>>>>>>===============================================================

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
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import VideoRecorder from "@/components/VideoRecorder";
import VideoUploader from "@/components/VideoUploader";

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
      //console.log("Fetching employee for QR code:", qrCodeId);

      // Fetch employee data
      const { data: employeeData, error: employeeError } = await supabase
        .from("employees")
        .select("id, name, position, company_id, email")
        .eq("qr_code_id", qrCodeId)
        .eq("is_active", true)
        .single();

      if (employeeError) {
        console.error("Error fetching employee:", employeeError);
        toast.error("Employee not found or inactive");
        return;
      }

      //  console.log("Employee found:", employeeData);
      setEmployee(employeeData);

      // Fetch company settings from profiles table
      const { data: companyData, error: companyError } = await supabase
        .from("profiles")
        .select(
          `
          id,
          company_name,
          logo_url,
          primary_color
        `
        )
        .eq("id", employeeData.company_id)
        .single();

      if (companyError) {
        console.warn(
          "Company settings not found, using defaults:",
          companyError
        );
        // Set default company data
        setCompany({
          id: employeeData.company_id,
          company_name: "Company",
          primary_color: "#3b82f6",
          thank_you_message: "Thank you for your feedback!",
          incentive_enabled: false,
          follow_up_enabled: false,
        });
      } else {
        // console.log("Company settings loaded:", companyData);
        setCompany({
          ...companyData,
          thank_you_message: "Thank you for your feedback!",
          incentive_enabled: false,
          follow_up_enabled: false,
        });
      }
    } catch (error) {
      console.error("Error:", error);
      toast.error("Failed to load employee information");
    } finally {
      setLoading(false);
    }
  };

  const recordQRCodeScan = async () => {
    try {
      if (!qrCodeId) return;

      const { data: employeeData, error: employeeError } = await supabase
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

      const response = await fetch("https://api.ipify.org?format=json");
      const data = await response.json();
      const ipAddress = data.ip;

      const { error } = await supabase.from("qr_code_scans").insert({
        qr_code_id: qrCodeId,
        employee_id: employeeData.id,
        company_id: employeeData.company_id,
        // Remove scanned_at - created_at is automatically set by the database
        //ip_address: "anonymous", // For privacy reasons
        ip_address: ipAddress,
        user_agent: navigator.userAgent.substring(0, 255), // Truncate if too long
      });

      if (error) {
        console.error("Error recording QR code scan:", error);
      } else {
        // console.log("QR code scan recorded successfully");
      }
    } catch (error) {
      console.error("Error recording scan:", error);
    }
  };

  // const recordQRCodeScan = async () => {
  //   try {
  //     if (!qrCodeId) return;

  //     const { data: employeeData, error: employeeError } = await supabase
  //       .from("employees")
  //       .select("id, company_id")
  //       .eq("qr_code_id", qrCodeId)
  //       .single();

  //     if (employeeError || !employeeData) {
  //       console.error(
  //         "Error fetching employee for scan recording:",
  //         employeeError
  //       );
  //       return;
  //     }

  //     const { error } = await supabase.from("qr_code_scans").insert({
  //       qr_code_id: qrCodeId,
  //       employee_id: employeeData.id,
  //       company_id: employeeData.company_id,
  //       scanned_at: new Date().toISOString(),
  //     });

  //     if (error) {
  //       console.error("Error recording QR code scan:", error);
  //     }
  //   } catch (error) {
  //     console.error("Error recording scan:", error);
  //   }
  // };

  const uploadVideo = async (file: Blob | File): Promise<string | null> => {
    try {
      const fileName = `review-${Date.now()}.webm`;
      //const filePath = `reviews/${fileName}`;
      const filePath = `${fileName}`;

      const { data, error } = await supabase.storage
        .from("video-reviews")
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: false,
        });

      if (error) {
        console.error("Error uploading video:", error);
        throw error;
      }

      const {
        data: { publicUrl },
      } = supabase.storage.from("video-reviews").getPublicUrl(filePath);

      return publicUrl;
    } catch (error) {
      console.error("Video upload failed:", error);
      throw error;
    }
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
      const twentyFourHoursAgo = new Date(
        Date.now() - 24 * 60 * 60 * 1000
      ).toISOString();

      const { data, error } = await supabase
        .from("reviews")
        .select("id")
        .eq("employee_id", employee?.id)
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
        videoUrl = await uploadVideo(videoFile);
        setUploadProgress(50);
      }

      // Insert review
      const { data: reviewData, error: reviewError } = await supabase
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

      setUploadProgress(75);

      if (reviewError) {
        console.error("Error submitting review:", reviewError);
        throw reviewError;
      }

      setUploadProgress(100);
      setSubmissionId(reviewData.id);
      setSubmissionStatus("success");

      // Show incentive if enabled
      if (company?.incentive_enabled) {
        setShowIncentive(true);
      }

      toast.success("Review submitted successfully!");
    } catch (error) {
      console.error("Error submitting review:", error);
      setSubmissionStatus("error");
      toast.error("Failed to submit review. Please try again.");
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

                <TabsContent value="text" className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="comment">Your Feedback</Label>
                    <Textarea
                      id="comment"
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      placeholder="Share your experience..."
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

                    {/* {videoFile && (
                      <div className="space-y-2">
                        <Label>Preview</Label>
                        <video
                          src={URL.createObjectURL(videoFile)}
                          controls
                          className="w-full max-w-md rounded-lg"
                        />
                      </div>
                    )} */}

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

                {/* <TabsContent value="video" className="space-y-4">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Record or Upload Video</Label>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <VideoRecorder onVideoRecorded={handleVideoRecorded} />
                        <VideoUploader onVideoSelected={handleVideoSelected} />
                      </div>
                      {formErrors.video && (
                        <p className="text-sm text-red-600">
                          {formErrors.video}
                        </p>
                      )}
                    </div>

                    {videoFile && (
                      <div className="space-y-2">
                        <Label>Preview</Label>
                        <video
                          src={URL.createObjectURL(videoFile)}
                          controls
                          className="w-full max-w-md rounded-lg"
                        />
                      </div>
                    )}

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
                </TabsContent> */}
              </Tabs>

              {/* Upload Progress */}
              {submitting && uploadProgress > 0 && (
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
                disabled={submitting || formSubmittedRef.current}
                className="w-full"
                style={{
                  backgroundColor: company?.primary_color || undefined,
                }}
              >
                {submitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Submitting Review...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Submit Review
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ReviewSubmission;
