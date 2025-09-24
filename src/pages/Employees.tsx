import React, { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import TeamLayout from "@/components/TeamLayout";
import EmployeeCard from "@/components/EmployeeCard";
import AddEmployeeDialog from "@/components/AddEmployeeDialog";
import { QRCodeDialog } from "@/components/QRCodeDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Search,
  Users,
  UserPlus,
  Download,
  ChevronDown,
  ChevronRight,
  Plus,
  Edit,
  Trash2,
} from "lucide-react";
import { PageLoading } from "@/components/ui/page-loading";
import {
  EmployeeCardSkeleton,
  StatsCardSkeleton,
} from "@/components/ui/skeleton-loaders";
import { Skeleton } from "@/components/ui/skeleton";
import { BackButton } from "@/components/ui/back-button";
import { AssignCategoryTagDialog } from "@/components/AssignCategoryTagDialog";
import { CategoryTagFormDialog } from "@/components/CategoryTagFormDialog";

interface Employee {
  id: string;
  name: string;
  email?: string;
  position?: string;
  department_id?: string;
  position_id?: string;
  qr_code_id: string;
  is_active: boolean;
  created_at: string;
  photo_url?: string;
  reviews_count?: number;
  avg_rating?: number;
  category_id?: string;
  department?: {
    name: string;
  };
  position_data?: {
    title: string;
  };
  category?: {
    id: string;
    name: string;
    color: string;
  };
  employee_tags?: Array<{
    tag_id: string;
    tag: {
      id: string;
      name: string;
      color: string;
    };
  }>;
}

interface Category {
  id: string;
  name: string;
  description?: string;
  color: string;
  company_id: string;
}

interface Tag {
  id: string;
  name: string;
  description?: string;
  color: string;
  company_id: string;
}

const Employees = () => {
  const { user } = useAuth();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(
    null
  );
  const [qrDialogOpen, setQrDialogOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);

  // Category and Tag management state
  const [categories, setCategories] = useState<Category[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [tagDialogOpen, setTagDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [editingTag, setEditingTag] = useState<Tag | null>(null);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [selectedEmployeeForAssign, setSelectedEmployeeForAssign] =
    useState<Employee | null>(null);
  const [managementSectionOpen, setManagementSectionOpen] = useState(false);

  // Memoized calculations for better performance
  const stats = useMemo(() => {
    const totalEmployees = employees.length;
    const activeEmployees = employees.filter((emp) => emp.is_active);
    const activeCount = activeEmployees.length;
    const activeRate =
      totalEmployees > 0 ? Math.round((activeCount / totalEmployees) * 100) : 0;

    return {
      totalEmployees,
      activeCount,
      activeRate,
      totalQRCodes: totalEmployees,
    };
  }, [employees]);

  // Update the filteredEmployees to include category/tag filtering
  const filteredEmployees = useMemo(() => {
    if (!searchTerm && selectedCategory === "all" && selectedTags.length === 0)
      return employees;

    return employees.filter((employee) => {
      const matchesSearch =
        !searchTerm ||
        employee.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        employee.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        employee.position?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        employee.department?.name
          ?.toLowerCase()
          .includes(searchTerm.toLowerCase()) ||
        employee.position_data?.title
          ?.toLowerCase()
          .includes(searchTerm.toLowerCase());

      const matchesCategory =
        selectedCategory === "all" ||
        (selectedCategory && employee.category_id === selectedCategory);

      const matchesTags =
        selectedTags.length === 0 ||
        selectedTags.some((tagId) =>
          employee.employee_tags?.some((et) => et.tag_id === tagId)
        );

      return matchesSearch && matchesCategory && matchesTags;
    });
  }, [employees, searchTerm, selectedCategory, selectedTags]);

  useEffect(() => {
    if (user) {
      fetchEmployees();

      // Set up real-time subscriptions
      const reviewsSubscription = supabase
        .channel("reviews-changes")
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "reviews",
            filter: `company_id=eq.${user.id}`,
          },
          () => {
            // console.log("Reviews changed, refreshing employee data...");
            fetchEmployees();
          }
        )
        .subscribe();

      const employeesSubscription = supabase
        .channel("employees-changes")
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "employees",
            filter: `company_id=eq.${user.id}`,
          },
          (payload) => {
            //console.log("Employee data changed:", payload);
            if (payload.eventType === "UPDATE") {
              setEmployees((prev) =>
                prev.map((emp) =>
                  emp.id === payload.new.id ? { ...emp, ...payload.new } : emp
                )
              );
            } else {
              fetchEmployees();
            }
          }
        )
        .subscribe();

      return () => {
        reviewsSubscription.unsubscribe();
        employeesSubscription.unsubscribe();
      };
    }
  }, [user]);

  const fetchEmployees = async () => {
    if (!user) return;

    try {
      // First, try the simple query without joins to ensure basic functionality
      const { data, error } = await supabase
        .from("employees")
        .select(
          `
        *,
        reviews:reviews!employee_id(
          id,
          rating
        )
      `
        )
        .eq("company_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Calculate review statistics for each employee
      const employeesWithStats = (data || []).map((employee) => {
        const reviews = employee.reviews || [];
        const reviewsCount = reviews.length;
        const avgRating =
          reviewsCount > 0
            ? reviews.reduce(
                (sum: number, review: any) => sum + review.rating,
                0
              ) / reviewsCount
            : 0;

        return {
          ...employee,
          reviews_count: reviewsCount,
          avg_rating:
            avgRating > 0 ? Math.round(avgRating * 10) / 10 : undefined,
          reviews: undefined,
        };
      });

      // Now try to fetch department and position data separately
      const employeesWithDeptPos = await Promise.all(
        employeesWithStats.map(async (employee) => {
          let department = null;
          let position_data = null;

          // Try to fetch department if department_id exists
          if (employee.department_id) {
            try {
              const { data: deptData } = await supabase
                .from("departments")
                .select("name")
                .eq("id", employee.department_id)
                .single();
              department = deptData;
            } catch (error) {
              console.warn(
                "Could not fetch department for employee:",
                employee.id
              );
            }
          }

          // Try to fetch position if position_id exists
          if (employee.position_id) {
            try {
              const { data: posData } = await supabase
                .from("positions")
                .select("title")
                .eq("id", employee.position_id)
                .single();
              position_data = posData;
            } catch (error) {
              console.warn(
                "Could not fetch position for employee:",
                employee.id
              );
            }
          }

          return {
            ...employee,
            department,
            position_data,
          };
        })
      );

      setEmployees(employeesWithDeptPos);
      //console.log("Employees updated:", employeesWithDeptPos.length);
    } catch (error: any) {
      console.error("Error fetching employees:", error);
      toast.error("Failed to load employees");
    } finally {
      setLoading(false);
    }
  };

  const handleToggleEmployeeStatus = async (
    employeeId: string,
    newStatus: boolean
  ) => {
    try {
      const { error } = await supabase
        .from("employees")
        .update({ is_active: newStatus })
        .eq("id", employeeId);

      if (error) throw error;

      toast.success(
        `Employee ${newStatus ? "activated" : "deactivated"} successfully`
      );
    } catch (error: any) {
      console.error("Error updating employee status:", error);
      toast.error("Failed to update employee status");
    }
  };

  const handleDeleteEmployee = async (id: string) => {
    try {
      const { error } = await supabase.from("employees").delete().eq("id", id);

      if (error) throw error;

      toast.success("Employee deleted successfully");
      fetchEmployees();
    } catch (error: any) {
      console.error("Error deleting employee:", error);
      toast.error("Failed to delete employee");
    }
  };

  const handleViewQR = (employee: Employee) => {
    setSelectedEmployee(employee);
    setQrDialogOpen(true);
  };

  const handleEditEmployee = (employee: Employee) => {
    setEditingEmployee(employee);
  };

  const handleViewProfile = (employee: Employee) => {
    // Implement profile view logic here
    // console.log("View profile for:", employee);
  };

  const handleBulkExport = () => {
    const csvContent = [
      "Name,Email,Position,Department,QR Code URL,Status,Created Date",
      ...employees.map(
        (emp) =>
          `"${emp.name}","${emp.email || ""}","${
            emp.position_data?.title || emp.position || ""
          }","${emp.department?.name || ""}","${
            window.location.origin
          }/review/${emp.qr_code_id}","${
            emp.is_active ? "Active" : "Inactive"
          }","${new Date(emp.created_at).toLocaleDateString()}"`
      ),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "employees.csv";
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <TeamLayout>
        <div className="space-y-6">
          {/* Header skeleton */}
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <Skeleton className="h-8 w-48" />
              <Skeleton className="h-4 w-64" />
            </div>
            <Skeleton className="h-10 w-32" />
          </div>

          {/* Search skeleton */}
          <div className="flex items-center space-x-4">
            <Skeleton className="h-10 flex-1" />
            <Skeleton className="h-10 w-32" />
          </div>

          {/* Stats skeleton */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <StatsCardSkeleton key={i} />
            ))}
          </div>

          {/* Employee cards skeleton */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <EmployeeCardSkeleton key={i} />
            ))}
          </div>
        </div>
      </TeamLayout>
    );
  }

  return (
    <TeamLayout>
      <div className="space-y-6">
        <div className="mb-6">
          <BackButton />
        </div>

        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Team Members</h1>
            <p className="text-gray-600 mt-1">
              Manage your team and track their performance
            </p>
          </div>
          <AddEmployeeDialog
            onEmployeeAdded={fetchEmployees}
            trigger={
              <Button>
                <UserPlus className="h-4 w-4 mr-2" />
                Add Employee
              </Button>
            }
          />
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Team Members
              </CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalEmployees}</div>
              <p className="text-xs text-muted-foreground">
                {stats.activeCount} active members
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                QR Codes Generated
              </CardTitle>
              <UserPlus className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalQRCodes}</div>
              <p className="text-xs text-muted-foreground">
                Ready for review collection
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Active Rate
                <span className="ml-1 inline-block w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
              </CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.activeRate}%</div>
              <p className="text-xs text-muted-foreground">
                {stats.activeCount} of {stats.totalEmployees} members active
              </p>
              {stats.totalEmployees > 0 && (
                <div className="mt-2">
                  <div className="w-full bg-gray-200 rounded-full h-1.5">
                    <div
                      className="bg-green-500 h-1.5 rounded-full transition-all duration-300"
                      style={{ width: `${stats.activeRate}%` }}
                    ></div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Actions Bar */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center space-x-2 flex-1 max-w-sm">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search team members..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {employees.length > 0 && (
              <Button variant="outline" size="sm" onClick={handleBulkExport}>
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
            )}
            <AddEmployeeDialog
              onEmployeeAdded={fetchEmployees}
              trigger={
                <Button>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Add Employee
                </Button>
              }
            />
          </div>
        </div>

        {/* Team Members Grid */}
        {filteredEmployees.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {searchTerm ? "No team members found" : "No team members yet"}
              </h3>
              <p className="text-gray-600 mb-4">
                {searchTerm
                  ? "Try adjusting your search terms"
                  : "Add your first team member to start collecting reviews"}
              </p>
              {!searchTerm && (
                <AddEmployeeDialog
                  onEmployeeAdded={fetchEmployees}
                  trigger={
                    <Button>
                      <UserPlus className="h-4 w-4 mr-2" />
                      Add Employee
                    </Button>
                  }
                />
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredEmployees.map((employee) => (
              <EmployeeCard
                key={employee.id}
                employee={employee}
                onToggleStatus={handleToggleEmployeeStatus}
                onDelete={handleDeleteEmployee}
                onViewQR={handleViewQR}
                onEdit={handleEditEmployee}
                onViewProfile={handleViewProfile}
              />
            ))}
          </div>
        )}

        {/* Dialogs */}
        <QRCodeDialog
          employee={selectedEmployee}
          open={qrDialogOpen}
          onOpenChange={setQrDialogOpen}
        />

        <AddEmployeeDialog
          employee={editingEmployee}
          onEmployeeAdded={fetchEmployees}
          open={!!editingEmployee}
          onOpenChange={(open) => {
            if (!open) setEditingEmployee(null);
          }}
        />
      </div>
    </TeamLayout>
  );
};

export default Employees;
