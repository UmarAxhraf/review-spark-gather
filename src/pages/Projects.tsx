import React, { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { BackButton } from "@/components/ui/back-button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
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
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { useNavigate } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";
import { CardSkeleton } from "@/components/ui/skeleton-loaders";

interface Employee {
  id: string;
  name: string;
  qr_code_id: string;
}

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

const ProjectsPage: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [projects, setProjects] = useState<ProjectSubmission[]>([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | "">("");
  const [searchQuery, setSearchQuery] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const navigate = useNavigate();
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    const loadData = async () => {
      if (!user?.id) return;
      setLoading(true);
      try {
        const [
          { data: employeeData, error: employeeError },
          { data: projectData, error: projectError },
        ] = await Promise.all([
          supabase
            .from("employees" as any)
            .select("id, name, qr_code_id")
            .eq("company_id", user.id),
          supabase
            .from("project_submissions" as any)
            .select("*")
            .eq("company_id", user.id)
            .order("created_at", { ascending: false }),
        ]);

        if (employeeError) throw employeeError;
        if (projectError) throw projectError;

        setEmployees((employeeData || []) as Employee[]);
        setProjects((projectData || []) as ProjectSubmission[]);
      } catch (error: any) {
        console.error("Failed to load projects:", error);
        toast.error("Failed to load projects");
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [user?.id]);

  const filteredProjects = useMemo(() => {
    if (!selectedEmployeeId) return projects;
    return projects.filter((p) => p.employee_id === selectedEmployeeId);
  }, [projects, selectedEmployeeId]);

  const projectCountsByEmployee = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const p of projects) {
      counts[p.employee_id] = (counts[p.employee_id] || 0) + 1;
    }
    return counts;
  }, [projects]);

  const employeesMap = useMemo(() => {
    const map = new Map<string, Employee>();
    for (const e of employees) map.set(e.id, e);
    return map;
  }, [employees]);

  // Employee project stats for cards
  const employeeStats = useMemo(
    () =>
      employees.map((emp) => {
        const count = projectCountsByEmployee[emp.id] || 0;
        let lastSubmittedAt: string | null = null;
        for (const p of projects) {
          if (p.employee_id === emp.id) {
            const created = new Date(p.created_at);
            if (
              !lastSubmittedAt ||
              created.getTime() > new Date(lastSubmittedAt).getTime()
            ) {
              lastSubmittedAt = p.created_at;
            }
          }
        }
        return {
          id: emp.id,
          name: emp.name,
          qr_code_id: emp.qr_code_id,
          count,
          lastSubmittedAt,
        };
      }),
    [employees, projects, projectCountsByEmployee]
  );

  const visibleProjects = useMemo(() => {
    // Apply search by employee name on top of employee filter
    if (!searchQuery.trim()) return filteredProjects;
    const q = searchQuery.trim().toLowerCase();
    return filteredProjects.filter((p) => {
      const name = (
        p.employee_name ||
        employeesMap.get(p.employee_id)?.name ||
        ""
      ).toLowerCase();
      return name.includes(q);
    });
  }, [filteredProjects, searchQuery, employeesMap]);

  // Pagination helpers
  const totalPages = Math.max(1, Math.ceil(visibleProjects.length / pageSize));
  const start = (currentPage - 1) * pageSize;
  const paginatedProjects = useMemo(
    () => visibleProjects.slice(start, start + pageSize),
    [visibleProjects, start, pageSize]
  );
  useEffect(() => {
    // Reset to first page when filters/search change
    setCurrentPage(1);
  }, [searchQuery, selectedEmployeeId]);

  const getImageUrls = (path: string) => {
    const { data } = supabase.storage.from("project-images").getPublicUrl(path);
    return data.publicUrl;
  };

  const openPreview = (url: string) => {
    setPreviewImageUrl(url);
    setZoom(1);
    setPreviewOpen(true);
  };
  const zoomIn = () => setZoom((z) => Math.min(z + 0.25, 3));
  const zoomOut = () => setZoom((z) => Math.max(z - 0.25, 0.5));
  const resetZoom = () => setZoom(1);

  const handleDelete = async (proj: ProjectSubmission) => {
    if (!user?.id) return;
    const confirmed = window.confirm(
      "Delete this project submission? This cannot be undone."
    );
    if (!confirmed) return;
    setDeletingId(proj.id);
    try {
      const { error } = await supabase
        .from("project_submissions" as any)
        .delete()
        .eq("id", proj.id)
        .eq("company_id", user.id);
      if (error) throw error;
      setProjects((prev) => prev.filter((p) => p.id !== proj.id));
      toast.success("Project deleted");
    } catch (err: any) {
      console.error("Failed to delete project:", err);
      toast.error(err?.message || "Failed to delete project");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <BackButton />
      </div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-gray-900">
          Employee Projects Management
        </h1>
        <Badge variant="outline">Total: {projects.length}</Badge>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">
                Search by Employee Name
              </label>
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="e.g., Jane Doe"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Employee</label>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className="w-full border rounded px-2 py-2 text-sm flex items-center justify-between font-normal"
                  >
                    <span className="truncate">
                      {selectedEmployeeId
                        ? `${employeesMap.get(selectedEmployeeId)?.name || "Selected"} (Projects: ${projectCountsByEmployee[selectedEmployeeId] || 0})`
                        : "All Employees"}
                    </span>
                    <ChevronDown className="h-4 w-4 ml-2 shrink-0" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-[22rem] max-h-[50vh] overflow-y-auto">
                  <DropdownMenuLabel>Select Employee</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onSelect={(e) => {
                      e.preventDefault();
                      setSelectedEmployeeId("");
                    }}
                    className="flex items-center justify-between gap-3"
                  >
                    <span>All Employees</span>
                    <Badge variant="secondary">{projects.length} projects</Badge>
                  </DropdownMenuItem>
                  {employees.length === 0 ? (
                    <DropdownMenuItem
                      onSelect={(e) => e.preventDefault()}
                      className="text-sm text-gray-600"
                    >
                      No employees found
                    </DropdownMenuItem>
                  ) : (
                    employees.map((emp) => (
                      <DropdownMenuItem
                        key={emp.id}
                        onSelect={(e) => {
                          e.preventDefault();
                          setSelectedEmployeeId(emp.id);
                        }}
                        className="flex items-center justify-between gap-3"
                      >
                        <div className="min-w-0">
                          <div className="font-medium truncate">{emp.name}</div>
                        </div>
                        <Badge variant="secondary">
                          {projectCountsByEmployee[emp.id] || 0} projects
                        </Badge>
                      </DropdownMenuItem>
                    ))
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">
                Employee Summary
              </label>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className="w-full border rounded px-2 py-2 text-sm flex items-center justify-between font-normal"
                  >
                    <span className="truncate">Employee Project Summary</span>
                    <ChevronDown className="h-4 w-4 ml-2 shrink-0" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-[22rem] max-h-[50vh] overflow-y-auto">
                  <DropdownMenuLabel>
                    Employee Project Summary
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {employeeStats.length === 0 ? (
                    <DropdownMenuItem
                      onSelect={(e) => e.preventDefault()}
                      className="text-sm text-gray-600"
                    >
                      No employees found
                    </DropdownMenuItem>
                  ) : (
                    employeeStats
                      .slice()
                      .sort((a, b) => b.count - a.count)
                      .map((stat) => (
                        <DropdownMenuItem
                          key={stat.id}
                          onSelect={(e) => e.preventDefault()}
                          className="flex items-center justify-between gap-3"
                        >
                          <div className="min-w-0">
                            <div className="font-medium truncate">
                              {stat.name}
                            </div>
                            <div className="text-[11px] text-gray-600">
                              Last submission:{" "}
                              {stat.lastSubmittedAt
                                ? new Date(
                                    stat.lastSubmittedAt
                                  ).toLocaleDateString()
                                : "N/A"}
                            </div>
                          </div>
                          <Badge variant="secondary">
                            {stat.count} projects
                          </Badge>
                        </DropdownMenuItem>
                      ))
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            <div className="flex items-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setSelectedEmployeeId("");
                  setSearchQuery("");
                }}
              >
                Clear Filters
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Employee Project Summary moved into Filters dropdown to reduce space */}

      {loading ? (
        <div className="space-y-6">
          {/* Header skeleton */}
          <div className="flex items-center justify-between mb-2">
            <Skeleton className="h-6 w-64" />
            <Skeleton className="h-6 w-24" />
          </div>

          {/* Filters skeleton */}
          <Card className="mb-6">
            <CardHeader>
              <Skeleton className="h-5 w-28" />
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-24" />
              </div>
            </CardContent>
          </Card>

          {/* Projects list skeleton */}
          <div className="space-y-3">
            {Array.from({ length: Math.min(5, pageSize) }).map((_, i) => (
              <Card key={i} className="w-full">
                <CardContent className="py-3 px-4">
                  <CardSkeleton />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ) : visibleProjects.length === 0 ? (
        <p className="text-gray-600">No projects found.</p>
      ) : (
        <div className="space-y-3">
          {paginatedProjects.map((proj) => (
            <Card key={proj.id} className="w-full">
              <CardContent className="py-3 px-4">
                <div className="flex flex-col sm:flex-row sm:items-center items-start sm:justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium truncate max-w-[40vw]">
                        {proj.title || "Untitled Project"}
                      </span>
                      <Badge
                        variant={
                          proj.status === "approved" ? "default" : "secondary"
                        }
                      >
                        {proj.status || "submitted"}
                      </Badge>
                    </div>
                    <div className="text-xs text-gray-600 mt-0.5">
                      <span className="font-semibold text-blue-700">
                        {proj.employee_name ||
                          employeesMap.get(proj.employee_id)?.name ||
                          "Unknown"}
                      </span>
                      <span className="mx-1">•</span>
                      {new Date(proj.created_at).toLocaleDateString()}
                      <span className="mx-1">•</span>
                      {proj.image_paths?.length || 0} image
                      {(proj.image_paths?.length || 0) === 1 ? "" : "s"}
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row items-center gap-2 sm:shrink-0 w-full sm:w-auto justify-end mt-2 sm:mt-0">
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full sm:w-auto"
                      onClick={() => navigate(`/employee-projects/${proj.id}`)}
                    >
                      View Details
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => handleDelete(proj)}
                      className="bg-red-500 hover:bg-red-600 text-white w-full sm:w-auto"
                      disabled={deletingId === proj.id}
                    >
                      {deletingId === proj.id ? "Deleting..." : "Delete"}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          {totalPages > 1 && (
            <div className="flex justify-center">
              <Pagination>
                <PaginationContent className="flex-wrap">
                  {currentPage > 1 && (
                    <PaginationItem>
                      <PaginationPrevious
                        onClick={() => setCurrentPage((p) => p - 1)}
                      />
                    </PaginationItem>
                  )}
                  <PaginationItem>
                    <span className="px-3 py-1 text-sm">
                      Page {currentPage} of {totalPages}
                    </span>
                  </PaginationItem>
                  {currentPage < totalPages && (
                    <PaginationItem>
                      <PaginationNext
                        onClick={() => setCurrentPage((p) => p + 1)}
                      />
                    </PaginationItem>
                  )}
                </PaginationContent>
              </Pagination>
            </div>
          )}
        </div>
      )}
      {/* Image Preview Dialog */}
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
          <div className="space-y-3">
            <div className="flex items-center justify-between pr-14">
              <div className="text-sm text-gray-600 truncate max-w-[50vw]">
                {previewImageUrl ? previewImageUrl.split("/").pop() : "Preview"}
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={zoomOut}>
                  Zoom -
                </Button>
                <Button variant="outline" size="sm" onClick={resetZoom}>
                  Reset
                </Button>
                <Button variant="outline" size="sm" onClick={zoomIn}>
                  Zoom +
                </Button>
              </div>
            </div>
            <div className="max-h-[70vh] overflow-auto border rounded-md bg-black/5 flex items-center justify-center">
              {previewImageUrl && (
                <img
                  src={previewImageUrl}
                  alt="Image preview"
                  className="max-w-full max-h-[70vh]"
                  style={{
                    transform: `scale(${zoom})`,
                    transformOrigin: "center center",
                  }}
                />
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProjectsPage;
