import React, { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { publicSupabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useScreenReader } from "@/hooks/use-screen-reader";
import { toast } from "sonner";

interface EmployeeData {
  id: string;
  name: string;
  company_id: string;
  email?: string | null;
  position?: string | null;
  qr_is_active?: boolean;
  qr_expires_at?: string | null;
}

interface CompanyProfile {
  id: string;
  company_name?: string | null;
  logo_url?: string | null;
  primary_color?: string | null;
  subscription_status?: string | null;
  subscription_end?: string | null;
  trial_end?: string | null;
}

const ProjectSubmission: React.FC = () => {
  const { qrCodeId } = useParams();
  const { speak } = useScreenReader();

  const [employee, setEmployee] = useState<EmployeeData | null>(null);
  const [company, setCompany] = useState<CompanyProfile | null>(null);
  const [blockedMessage, setBlockedMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [employeeName, setEmployeeName] = useState("");
  const [employeeDesignation, setEmployeeDesignation] = useState("");
  const [employeeEmail, setEmployeeEmail] = useState("");
  const [employeePhone, setEmployeePhone] = useState("");

  const companyName = useMemo(
    () => company?.company_name || "Company",
    [company]
  );

  useEffect(() => {
    const fetchData = async () => {
      if (!qrCodeId) return;

      try {
        const { data: employeeData, error: empErr } = await publicSupabase
          .from("employees" as any)
          .select(
            "id, name, company_id, email, position, qr_is_active, qr_expires_at"
          )
          .eq("qr_code_id", qrCodeId)
          .maybeSingle();

        if (empErr) throw empErr;
        if (!employeeData) {
          setBlockedMessage("Invalid link. Employee not found.");
          return;
        }

        setEmployee(employeeData as EmployeeData);
        setEmployeeName((employeeData as EmployeeData).name || "");
        setEmployeeDesignation((employeeData as EmployeeData).position || "");
        setEmployeeEmail((employeeData as EmployeeData).email || "");

        const { data: companyData, error: compErr } = await publicSupabase
          .from("profiles" as any)
          .select(
            "id, company_name, logo_url, primary_color, subscription_status, subscription_end, trial_end"
          )
          .eq("id", employeeData.company_id)
          .maybeSingle();

        if (compErr) throw compErr;
        setCompany(companyData as CompanyProfile);

        // Evaluate blocking rules
        const now = new Date();
        let msg: string | null = null;

        if (employeeData.qr_is_active === false) {
          msg =
            "This employee's QR is deactivated and cannot accept project submissions.";
        } else if (
          employeeData.qr_expires_at &&
          new Date(employeeData.qr_expires_at) <= now
        ) {
          msg =
            "This employee's QR has expired and cannot accept project submissions.";
        } else if (companyData?.subscription_status) {
          const status = companyData.subscription_status;
          const subscriptionEnd = companyData.subscription_end
            ? new Date(companyData.subscription_end)
            : null;
          const trialEnd = companyData.trial_end
            ? new Date(companyData.trial_end)
            : null;

          if (status === "expired" || status === "ended") {
            msg =
              "The company's subscription has expired or ended. Project submissions are not allowed.";
          } else if (status === "trial" && trialEnd && trialEnd <= now) {
            msg =
              "The company's trial has ended. Project submissions are not allowed.";
          } else if (
            (status === "active" || status === "canceled") &&
            subscriptionEnd &&
            subscriptionEnd <= now
          ) {
            msg =
              "The company's subscription period has ended. Project submissions are not allowed.";
          }
        }

        setBlockedMessage(msg);
      } catch (error) {
        console.error("Failed to load project submission context:", error);
        setBlockedMessage(
          "Unable to load submission context. Please try again later."
        );
      }
    };

    fetchData();
  }, [qrCodeId]);

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files || []);
    setFiles(selected);
  };

  // Generate object URLs for thumbnails and clean up on change/unmount
  useEffect(() => {
    const urls = files.map((f) => URL.createObjectURL(f));
    setPreviews(urls);
    return () => {
      urls.forEach((u) => URL.revokeObjectURL(u));
    };
  }, [files]);

  const removeFile = (index: number) => {
    setFiles((prev) => {
      const next = [...prev];
      next.splice(index, 1);
      return next;
    });
    // Allow re-selecting the same file by clearing the input value
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (blockedMessage) {
      toast.error(blockedMessage);
      return;
    }

    if (!employee?.id || !employee.company_id) {
      toast.error("Invalid employee or company context.");
      return;
    }

    // Require mandatory fields: title, description, and at least one image
    if (!title.trim()) {
      toast.error("Project title is required.");
      return;
    }
    if (!description.trim()) {
      toast.error("Project description is required.");
      return;
    }
    if (files.length === 0) {
      toast.error("Please add at least one image.");
      return;
    }

    // Require the three prefilled fields to be present
    if (
      !employeeName.trim() ||
      !employeeDesignation.trim() ||
      !employeeEmail.trim()
    ) {
      toast.error(
        "Employee details are missing. Please contact the company admin."
      );
      return;
    }
    // Validate email format (prefilled)
    if (!/^\S+@\S+\.\S+$/.test(employeeEmail)) {
      toast.error("Please ensure the professional email is valid.");
      return;
    }
    if (employeePhone && !/^\+?[0-9\-\s]{7,}$/.test(employeePhone)) {
      toast.error("Please enter a valid phone number.");
      return;
    }

    setIsSubmitting(true);
    try {
      // Upload images (if any)
      const imagePaths: string[] = [];
      for (const file of files) {
        const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
        const path = `${employee.company_id}/${
          employee.id
        }/${Date.now()}-${Math.random().toString(36).slice(2)}-${safeName}`;

        const { error: uploadError } = await publicSupabase.storage
          .from("project-images")
          .upload(path, file, {
            cacheControl: "3600",
            upsert: false,
          });

        if (uploadError) throw uploadError;
        imagePaths.push(path);
      }

      // Insert project submission
      const { error: insertError } = await publicSupabase
        .from("project_submissions" as any)
        .insert({
          company_id: employee.company_id,
          employee_id: employee.id,
          title: title.trim() || null,
          description: description.trim() || null,
          image_paths: imagePaths,
          status: "submitted",
          employee_name: employeeName.trim() || null,
          employee_designation: employeeDesignation.trim() || null,
          employee_email: employeeEmail.trim() || null,
          employee_phone: employeePhone.trim() || null,
        });

      if (insertError) throw insertError;

      toast.success("Project submitted successfully. Thank you!");
      setTitle("");
      setDescription("");
      setFiles([]);
      // Keep prefilled details; clear only optional phone
      setEmployeePhone("");
    } catch (error: any) {
      console.error("Project submission failed:", error);
      toast.error(
        error?.message || "Failed to submit project. Please try again later."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-2xl mx-auto px-4">
        {/* Company/Employee Header (matches Review Submission style) */}
        <div
          className="mb-6 p-6 rounded-xl text-center shadow-sm"
          style={{
            background: company?.primary_color
              ? `linear-gradient(to bottom right, ${company.primary_color}20, ${company.primary_color}10)`
              : "linear-gradient(to bottom right, #3b82f620, #3b82f610)",
          }}
        >
          {company?.logo_url && (
            <img
              src={company.logo_url}
              alt={company.company_name || "Company Logo"}
              className="h-16 w-auto mx-auto mb-4"
            />
          )}
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Submit Your Project
          </h1>
          <p className="text-gray-600">
            {employee ? (
              <>
                Submit you project details and images{" "}
                <span className="font-semibold">{employee.name}</span>
                {employee.position && (
                  <span className="text-gray-500"> ({employee.position})</span>
                )}
              </>
            ) : (
              <>
                Help us review your work for{" "}
                <span className="font-semibold">{companyName}</span>
              </>
            )}
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{companyName}: Project Submission</CardTitle>
          </CardHeader>
          <CardContent>
            {blockedMessage && (
              <Alert variant="destructive" className="mb-4">
                <AlertTitle>Submission Blocked</AlertTitle>
                <AlertDescription>{blockedMessage}</AlertDescription>
              </Alert>
            )}

            {!blockedMessage && (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Employee Name
                    </label>
                    <Input
                      value={employeeName}
                      readOnly
                      required
                      placeholder="e.g., Jane Doe"
                    />
                    <p className="text-xs text-gray-500 mt-1">Prefilled</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Designation
                    </label>
                    <Input
                      value={employeeDesignation}
                      readOnly
                      required
                      placeholder="e.g., Senior Developer"
                    />
                    <p className="text-xs text-gray-500 mt-1">Prefilled</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Professional Email
                    </label>
                    <Input
                      type="email"
                      value={employeeEmail}
                      readOnly
                      required
                      placeholder="e.g., jane.doe@company.com"
                    />
                    <p className="text-xs text-gray-500 mt-1">Prefilled</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Phone Number
                    </label>
                    <Input
                      value={employeePhone}
                      onChange={(e) => setEmployeePhone(e.target.value)}
                      placeholder="e.g., +1 555-123-4567"
                    />
                    <p className="text-xs text-gray-500 mt-1">Optional</p>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Project Title *
                  </label>
                  <Input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g., Q3 Website Redesign"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Description *
                  </label>
                  <Textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="What did you build? Scope, outcomes, timeline, collaborators..."
                    rows={5}
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Images (proof) *
                  </label>
                  <Input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={onFileChange}
                  />
                  {files.length > 0 && (
                    <p className="text-xs text-gray-600 mt-1">
                      {files.length} image(s) selected
                    </p>
                  )}

                  {files.length > 0 && (
                    <div className="mt-3 grid grid-cols-2 md:grid-cols-3 gap-3">
                      {files.map((file, idx) => (
                        <div
                          key={`${file.name}-${idx}`}
                          className="relative border rounded-md overflow-hidden shadow-sm bg-white"
                        >
                          {previews[idx] && (
                            <img
                              src={previews[idx]}
                              alt={file.name}
                              className="w-full h-24 object-cover"
                              onLoad={() => {
                                // The effect cleanup also revokes; this is defensive.
                              }}
                            />
                          )}
                          <button
                            type="button"
                            onClick={() => removeFile(idx)}
                            className="absolute top-1 right-1 text-xs px-2 py-1 rounded bg-red-500 text-white hover:bg-red-600"
                            aria-label={`Remove ${file.name}`}
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  {files.length === 0 && (
                    <p className="text-xs text-red-600 mt-1">
                      Please add at least one image.
                    </p>
                  )}
                </div>

                <div className="flex justify-end">
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? "Submitting..." : "Submit Project"}
                  </Button>
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ProjectSubmission;
