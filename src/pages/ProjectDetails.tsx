import React, { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BackButton } from "@/components/ui/back-button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { ZoomIn, ZoomOut, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";

interface ProjectSubmission {
  id: string;
  company_id: string;
  employee_id: string;
  title: string | null;
  description: string | null;
  status: string | null;
  image_paths: string[] | null;
  created_at: string;
  employee_name?: string | null;
  employee_designation?: string | null;
  employee_email?: string | null;
  employee_phone?: string | null;
}

const ProjectDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [project, setProject] = useState<ProjectSubmission | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
  const [zoom, setZoom] = useState<number>(1);
  const MIN_ZOOM = 0.5;
  const MAX_ZOOM = 4;
  const ZOOM_STEP = 0.25;
  const [employeeFallback, setEmployeeFallback] = useState<{
    name?: string | null;
    email?: string | null;
    position?: string | null;
    phone?: string | null;
  } | null>(null);

  useEffect(() => {
    const fetchProject = async () => {
      if (!id) return;
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from("project_submissions")
          .select("*")
          .eq("id", id)
          .maybeSingle();

        if (error) throw error;
        if (!data) {
          toast.error("Submission not found");
          navigate("/employee-projects");
          return;
        }
        setProject(data as ProjectSubmission);
      } catch (err: any) {
        console.error("Error loading project details:", err);
        toast.error(err.message || "Failed to load submission details");
      } finally {
        setLoading(false);
      }
    };
    fetchProject();
  }, [id, navigate]);

  // Fetch employee details if the submission doesn't include them
  useEffect(() => {
    const fetchEmployee = async () => {
      if (!project?.employee_id) return;
      const needsName = !project.employee_name;
      const needsEmail = !project.employee_email;
      const needsDesignation = !project.employee_designation;
      const needsPhone = !project.employee_phone;
      if (!(needsName || needsEmail || needsDesignation || needsPhone)) return;
      try {
        const { data, error } = await supabase
          .from("employees")
          .select("id, name, email, position")
          .eq("id", project.employee_id)
          .maybeSingle();
        if (error) throw error;
        if (data) {
          setEmployeeFallback({
            name: (data as any).name || null,
            email: (data as any).email || null,
            position: (data as any).position || null,
            phone: null,
          });
        }
      } catch (err) {
        console.warn("Could not fetch employee fallback:", err);
      }
    };
    fetchEmployee();
  }, [
    project?.employee_id,
    project?.employee_name,
    project?.employee_email,
    project?.employee_designation,
    project?.employee_phone,
  ]);

  const getPublicImageUrl = (path: string) => {
    const { data } = supabase.storage.from("project-images").getPublicUrl(path);
    return data.publicUrl;
  };

  const onOpenImage = (path: string) => {
    const url = getPublicImageUrl(path);
    setPreviewImageUrl(url);
    setPreviewOpen(true);
    setZoom(1);
  };

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="mb-6">
          <BackButton />
        </div>
        {/* Header skeleton */}
        <div className="flex items-center justify-between mb-2">
          <Skeleton className="h-7 w-48" />
          <Skeleton className="h-6 w-20" />
        </div>

        {/* Details card skeleton */}
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-64" />
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div className="space-y-3">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-4 w-56" />
              </div>
              <div className="space-y-3">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-40" />
              </div>
            </div>

            {/* Description skeleton */}
            <div className="space-y-2 mb-4">
              <Skeleton className="h-4 w-36" />
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-5/6" />
              <Skeleton className="h-3 w-3/4" />
            </div>

            {/* Images grid skeleton */}
            <div className="space-y-2">
              <Skeleton className="h-4 w-40" />
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {Array.from({ length: 8 }).map((_, i) => (
                  <Skeleton key={i} className="h-24 w-full" />
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="p-6">
        <BackButton />
        <p className="mt-4 text-gray-600">Submission not found.</p>
      </div>
    );
  }

  const displayName =
    project.employee_name || employeeFallback?.name || "Unknown";
  const displayDesignation =
    project.employee_designation || employeeFallback?.position || null;
  const displayEmail =
    project.employee_email || employeeFallback?.email || null;
  const displayPhone =
    project.employee_phone || employeeFallback?.phone || null;

  return (
    <div className="p-6">
      <div className="mb-6">
        <BackButton />
      </div>

      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-semibold">Project Submission Details</h1>
        <Badge
          variant={project.status === "approved" ? "default" : "secondary"}
        >
          {project.status || "submitted"}
        </Badge>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>{project.title || "Untitled Project"}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <div className="text-sm text-gray-800 font-semibold">
                Submitted on
              </div>
              <div className="text-base text-gray-600">
                {new Date(project.created_at).toLocaleString()}
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-800 font-semibold">
                Employee Details
              </div>
              <div className="mt-1">
                {/* Name + Designation on SAME line */}
                <div className="flex items-center gap-2">
                  <div className="text-base font-semibold text-indigo-600">
                    {displayName}
                  </div>

                  {displayDesignation && (
                    <Badge variant="secondary" className="font-medium">
                      {displayDesignation}
                    </Badge>
                  )}
                </div>

                {/* Email (new line) */}
                {displayEmail && (
                  <div className="text-sm mt-1">
                    <a
                      href={`mailto:${displayEmail}`}
                      className="text-blue-600 hover:underline font-medium"
                    >
                      {displayEmail}
                    </a>
                  </div>
                )}

                {/* Phone (new line) */}
                {displayPhone && (
                  <div className="text-sm font-medium text-slate-700 mt-1">
                    {displayPhone}
                  </div>
                )}
              </div>
            </div>
          </div>

          {project.description && (
            <div className="mb-4">
              <div className="text-sm text-gray-800 mb-1 font-semibold">
                Description
              </div>
              <div className="text-base whitespace-pre-wrap text-gray-600">
                {project.description}
              </div>
            </div>
          )}

          <div>
            <div className="text-sm text-gray-800 font-semibold mb-2">
              Project Images
            </div>
            {project.image_paths && project.image_paths.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {project.image_paths.map((p, idx) => (
                  <button
                    key={`${p}-${idx}`}
                    className="block w-full aspect-video bg-gray-100 rounded-md overflow-hidden border hover:ring-2 hover:ring-primary"
                    onClick={() => onOpenImage(p)}
                    title="Click to preview"
                  >
                    <img
                      src={getPublicImageUrl(p)}
                      alt={`Project image ${idx + 1}`}
                      className="object-cover w-full h-full"
                      loading="lazy"
                    />
                  </button>
                ))}
              </div>
            ) : (
              <div className="text-sm text-gray-600">No images uploaded</div>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          onClick={() => navigate("/employee-projects")}
        >
          Back to submissions
        </Button>
      </div>

      <Dialog
        open={previewOpen}
        onOpenChange={(open) => {
          setPreviewOpen(open);
          if (!open) {
            setPreviewImageUrl(null);
            setZoom(1);
          }
        }}
      >
        <DialogContent className="sm:max-w-[90vw] max-w-[95vw]">
          {/* Toolbar */}
          <div className="flex items-center justify-end gap-2 mb-3 pr-16 sm:pr-20">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setZoom((z) => Math.min(MAX_ZOOM, z + ZOOM_STEP))}
              disabled={zoom >= MAX_ZOOM}
              aria-label="Zoom in"
              title="Zoom in"
            >
              <ZoomIn />
              <span className="sr-only">Zoom in</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setZoom((z) => Math.max(MIN_ZOOM, z - ZOOM_STEP))}
              disabled={zoom <= MIN_ZOOM}
              aria-label="Zoom out"
              title="Zoom out"
            >
              <ZoomOut />
              <span className="sr-only">Zoom out</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setZoom(1)}
              aria-label="Reset zoom"
              title="Reset zoom"
            >
              <RefreshCw />
              <span className="sr-only">Reset zoom</span>
            </Button>
          </div>

          {/* Image Container */}
          {previewImageUrl ? (
            <div className="max-h-[70vh] overflow-auto border rounded-md bg-black/5">
              <div className="flex items-center justify-center p-2">
                <img
                  src={previewImageUrl}
                  alt="Preview"
                  className="select-none"
                  style={{
                    transform: `scale(${zoom})`,
                    transformOrigin: "center center",
                    transition: "transform 150ms ease-in-out",
                    maxWidth: "100%",
                    maxHeight: "68vh",
                  }}
                />
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProjectDetails;
