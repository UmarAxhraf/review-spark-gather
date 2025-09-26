import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import QRCodeCard from "@/components/QRCodeCard";
import { QRCodeDialog } from "@/components/QRCodeDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
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
  Tag,
  Plus,
  X,
  ArrowUpDown,
  Filter,
  ChevronDown,
  ChevronRight,
  Edit,
  Trash2,
} from "lucide-react";
import { AssignCategoryTagDialog } from "@/components/AssignCategoryTagDialog";
import { CategoryTagFormDialog } from "@/components/CategoryTagFormDialog";
import { useQRCode } from "../contexts/QRCodeContext";
import { QRCodeSVG } from "qrcode.react";
import JSZip from "jszip";
import { saveAs } from "file-saver";
import { Progress } from "@/components/ui/progress";
import {
  QRCardSkeleton,
  StatsCardSkeleton,
} from "@/components/ui/skeleton-loaders";
import { BackButton } from "@/components/ui/back-button";
import { useIsMobile } from "@/hooks/use-mobile";

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
  tags?: string[];
  category?: string;
  category_id?: string;
  employee_tags?: { tag_id: string }[];
  scan_count?: number;
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

type SortOption = "newest" | "oldest" | "expiry" | "scans";
type StatusFilter = "all" | "active" | "expired" | "inactive";

const QRCodes = () => {
  const { user } = useAuth();
  const { settings } = useQRCode();
  const isMobile = useIsMobile();
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
  const [qrAnalytics, setQrAnalytics] = useState<any>(null);
  const [filterStatus, setFilterStatus] = useState<StatusFilter>("all");

  // Bulk action states
  const [bulkExpirationDate, setBulkExpirationDate] = useState("");
  const [bulkScanLimit, setBulkScanLimit] = useState("");
  const [bulkCustomPage, setBulkCustomPage] = useState("");
  const [bulkRedirectUrl, setBulkRedirectUrl] = useState("");

  // New organization states
  const [sortBy, setSortBy] = useState<SortOption>("newest");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState("");
  const [newCategory, setNewCategory] = useState("");
  const [tagDialogOpen, setTagDialogOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);

  // Add these state variables
  const [categories, setCategories] = useState<Category[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [customCategories, setCustomCategories] = useState<string[]>([]);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [newTagName, setNewTagName] = useState("");
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [editingTag, setEditingTag] = useState<Tag | null>(null);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [selectedEmployeeForAssign, setSelectedEmployeeForAssign] =
    useState<Employee | null>(null);
  const [managementSectionOpen, setManagementSectionOpen] = useState(false);

  // Add filtering state
  const [filters, setFilters] = useState({
    category: "",
    tag: "",
    status: "all",
  });

  const fetchEmployees = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("employees")
        .select(
          `
          *,
          employee_tags(tag_id),
          categories(id, name, color),
          positions!employees_position_id_fkey(id, title),
          departments!employees_department_id_fkey(id, name)
        `
        )
        .eq("company_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Transform the data to include position text
      const transformedData =
        data?.map((employee) => ({
          ...employee,
          position: employee.positions?.title || employee.position, // Use position title from join, fallback to legacy text
        })) || [];

      setEmployees(transformedData);
    } catch (error: any) {
      console.error("Error fetching employees:", error);
      toast.error("Failed to load QR codes");
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = useCallback(async () => {
    if (!user?.id) return;

    try {
      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .eq("company_id", user.id)
        .order("name");

      if (error) throw error;
      setCategories(data || []);
    } catch (error) {
      console.error("Error fetching categories:", error);
      toast.error("Failed to fetch categories");
    }
  }, [user?.id]);

  const fetchTags = useCallback(async () => {
    if (!user?.id) return;

    try {
      const { data, error } = await supabase
        .from("tags")
        .select("*")
        .eq("company_id", user.id)
        .order("name");

      if (error) throw error;
      setTags(data || []);
    } catch (error) {
      console.error("Error fetching tags:", error);
      toast.error("Failed to fetch tags");
    }
  }, [user?.id]);

  // Move this useEffect AFTER the function definitions
  useEffect(() => {
    if (user?.id) {
      fetchEmployees();
      fetchCategories();
      fetchTags();
    }
  }, [user?.id, fetchCategories, fetchTags]);

  // Get unique categories and tags for filters
  const availableCategories = useMemo(() => {
    // First, get default categories from database
    const defaultCategoryNames = [
      "Employee",
      "Campaign",
      "Branch",
      "Event",
      "Product",
    ];

    // Check if default categories exist in database, if not create them
    const existingDefaults = categories.filter((cat) =>
      defaultCategoryNames.includes(cat.name)
    );

    // Combine existing database categories with any missing defaults
    const allCategories = [...categories];

    // Add missing default categories as display-only items
    defaultCategoryNames.forEach((defaultName) => {
      if (!categories.find((cat) => cat.name === defaultName)) {
        allCategories.push({
          id: `default-${defaultName.toLowerCase()}`,
          name: defaultName,
          color: "#6B7280", // Default gray color
          company_id: user?.id || "",
        });
      }
    });

    return allCategories;
  }, [categories, user?.id]);

  const availableTags = useMemo(() => {
    // Get tags from both database and employee associations
    const dbTags = tags || [];
    const employeeTags = employees
      .flatMap((emp) => emp.employee_tags || [])
      .map((et) => tags.find((t) => t.id === et.tag_id))
      .filter(Boolean);

    // Combine and deduplicate
    const allTags = [...dbTags, ...employeeTags];
    const uniqueTags = allTags.filter(
      (tag, index, self) =>
        tag && self.findIndex((t) => t?.id === tag.id) === index
    );

    return uniqueTags;
  }, [tags, employees]);

  const handleCreateCategory = async (
    name: string,
    description: string,
    color: string
  ) => {
    try {
      const { error } = await supabase.from("categories").insert({
        company_id: user?.id,
        name,
        description,
        color,
      });

      if (error) throw error;

      await fetchCategories();
      setCategoryDialogOpen(false);
      toast.success("Category created successfully");
    } catch (error) {
      console.error("Error creating category:", error);
      toast.error("Failed to create category");
    }
  };

  const handleUpdateCategory = async (
    id: string,
    name: string,
    description: string,
    color: string
  ) => {
    try {
      const { error } = await supabase
        .from("categories")
        .update({
          name,
          description,
          color,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id);

      if (error) throw error;

      await fetchCategories();
      setEditingCategory(null);
      setCategoryDialogOpen(false);
      toast.success("Category updated successfully");
    } catch (error) {
      console.error("Error updating category:", error);
      toast.error("Failed to update category");
    }
  };

  const handleDeleteCategory = async (id: string) => {
    try {
      const { error } = await supabase.from("categories").delete().eq("id", id);

      if (error) throw error;

      await fetchCategories();
      await fetchEmployees();
      toast.success("Category deleted successfully");
    } catch (error) {
      console.error("Error deleting category:", error);
      toast.error("Failed to delete category");
    }
  };

  const handleCreateTag = async (
    name: string,
    description: string,
    color: string
  ) => {
    try {
      const { error } = await supabase.from("tags").insert({
        company_id: user?.id,
        name,
        description,
        color,
      });

      if (error) throw error;

      await fetchTags();
      setTagDialogOpen(false);
      toast.success("Tag created successfully");
    } catch (error) {
      console.error("Error creating tag:", error);
      toast.error("Failed to create tag");
    }
  };

  const handleUpdateTag = async (
    id: string,
    name: string,
    description: string,
    color: string
  ) => {
    try {
      const { error } = await supabase
        .from("tags")
        .update({
          name,
          description,
          color,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id);

      if (error) throw error;

      await fetchTags();
      setEditingTag(null);
      setTagDialogOpen(false);
      toast.success("Tag updated successfully");
    } catch (error) {
      console.error("Error updating tag:", error);
      toast.error("Failed to update tag");
    }
  };

  const handleDeleteTag = async (id: string) => {
    try {
      // First remove all employee-tag associations
      await supabase.from("employee_tags").delete().eq("tag_id", id);

      // Then delete the tag
      const { error } = await supabase.from("tags").delete().eq("id", id);

      if (error) throw error;

      await fetchTags();
      await fetchEmployees();
      toast.success("Tag deleted successfully");
    } catch (error) {
      console.error("Error deleting tag:", error);
      toast.error("Failed to delete tag");
    }
  };

  const handleAssignEmployeeCategory = async (
    employeeId: string,
    categoryId: string | null
  ) => {
    try {
      const { error } = await supabase
        .from("employees")
        .update({ category_id: categoryId })
        .eq("id", employeeId);

      if (error) throw error;

      await fetchEmployees();
      toast.success("Category assigned successfully");
    } catch (error) {
      console.error("Error assigning category:", error);
      toast.error("Failed to assign category");
    }
  };

  const handleAssignTags = async (employeeId: string, tagIds: string[]) => {
    try {
      // Remove existing tags
      await supabase
        .from("employee_tags")
        .delete()
        .eq("employee_id", employeeId);

      // Add new tags
      if (tagIds.length > 0) {
        const { error } = await supabase.from("employee_tags").insert(
          tagIds.map((tagId) => ({
            employee_id: employeeId,
            tag_id: tagId,
            assigned_by: user?.id,
          }))
        );

        if (error) throw error;
      }

      await fetchEmployees();
      toast.success("Tags assigned successfully");
    } catch (error) {
      console.error("Error assigning tags:", error);
      toast.error("Failed to assign tags");
    }
  };

  // Enhanced filtering and sorting logic
  const filteredEmployees = useMemo(() => {
    let filtered = employees.filter((employee) => {
      const matchesSearch =
        employee.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        employee.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        employee.position?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus =
        filterStatus === "all" ||
        (filterStatus === "active" &&
          employee.qr_is_active &&
          (!employee.qr_expires_at ||
            new Date(employee.qr_expires_at) > new Date())) ||
        (filterStatus === "expired" &&
          employee.qr_expires_at &&
          new Date(employee.qr_expires_at) <= new Date()) ||
        (filterStatus === "inactive" && !employee.qr_is_active);

      const matchesCategory =
        selectedCategory === "all" ||
        (selectedCategory && employee.category_id === selectedCategory);

      const matchesTags =
        selectedTags.length === 0 ||
        selectedTags.some((tagId) =>
          employee.employee_tags?.some((et) => et.tag_id === tagId)
        );

      // Additional filtering based on new filters
      const matchesFilterCategory =
        !filters.category ||
        filters.category === "all" ||
        (filters.category === "none" && !employee.category_id) ||
        (filters.category !== "none" &&
          employee.category_id === filters.category);

      const matchesFilterTag =
        !filters.tag ||
        filters.tag === "all" ||
        employee.employee_tags?.some((et) => et.tag_id === filters.tag);

      const matchesFilterStatus =
        filters.status === "all" ||
        (filters.status === "active" &&
          employee.qr_is_active &&
          (!employee.qr_expires_at ||
            new Date(employee.qr_expires_at) > new Date())) ||
        (filters.status === "inactive" && !employee.qr_is_active) ||
        (filters.status === "expired" &&
          employee.qr_expires_at &&
          new Date(employee.qr_expires_at) <= new Date());

      return (
        matchesSearch &&
        matchesStatus &&
        matchesCategory &&
        matchesTags &&
        matchesFilterCategory &&
        matchesFilterTag &&
        matchesFilterStatus
      );
    });

    // Apply sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case "newest":
          return (
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          );
        case "oldest":
          return (
            new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
          );
        case "expiry":
          if (!a.qr_expires_at && !b.qr_expires_at) return 0;
          if (!a.qr_expires_at) return 1;
          if (!b.qr_expires_at) return -1;
          return (
            new Date(a.qr_expires_at).getTime() -
            new Date(b.qr_expires_at).getTime()
          );
        case "scans":
          return (b.scan_count || 0) - (a.scan_count || 0);
        default:
          return 0;
      }
    });

    return filtered;
  }, [
    employees,
    searchTerm,
    filterStatus,
    selectedCategory,
    selectedTags,
    sortBy,
    filters,
  ]);

  // Group by status for visual separation
  const groupedEmployees = useMemo(() => {
    const active = filteredEmployees.filter(
      (emp) =>
        emp.qr_is_active &&
        (!emp.qr_expires_at || new Date(emp.qr_expires_at) > new Date())
    );
    const expired = filteredEmployees.filter(
      (emp) => emp.qr_expires_at && new Date(emp.qr_expires_at) <= new Date()
    );
    const inactive = filteredEmployees.filter((emp) => !emp.qr_is_active);

    return { active, expired, inactive };
  }, [filteredEmployees]);

  // Tag management functions
  const handleAddTag = async (employeeId: string, tag: string) => {
    try {
      const employee = employees.find((emp) => emp.id === employeeId);
      if (!employee) return;

      const updatedTags = [...(employee.tags || []), tag];

      const { error } = await supabase
        .from("employees")
        .update({ tags: updatedTags })
        .eq("id", employeeId);

      if (error) throw error;

      await fetchEmployees();
      toast.success("Tag added successfully");
    } catch (error: any) {
      console.error("Error adding tag:", error);
      toast.error("Failed to add tag");
    }
  };

  const handleRemoveTag = async (employeeId: string, tagToRemove: string) => {
    try {
      const employee = employees.find((emp) => emp.id === employeeId);
      if (!employee) return;

      const updatedTags = (employee.tags || []).filter(
        (tag) => tag !== tagToRemove
      );

      const { error } = await supabase
        .from("employees")
        .update({ tags: updatedTags })
        .eq("id", employeeId);

      if (error) throw error;

      await fetchEmployees();
      toast.success("Tag removed successfully");
    } catch (error: any) {
      console.error("Error removing tag:", error);
      toast.error("Failed to remove tag");
    }
  };

  // Add category management functions
  const handleAddCategory = () => {
    if (
      newCategoryName.trim() &&
      !availableCategories.includes(newCategoryName.trim())
    ) {
      setCustomCategories((prev) => [...prev, newCategoryName.trim()]);
      setNewCategoryName("");
      setCategoryDialogOpen(false);
      toast.success("Category added successfully");
    } else {
      toast.error("Category already exists or is empty");
    }
  };

  const handleAddNewTag = () => {
    if (newTagName.trim() && !availableTags.includes(newTagName.trim())) {
      // Add the tag to a selected employee or show a dialog to select employee
      setNewTagName("");
      setTagDialogOpen(false);
      toast.success("Tag will be added when assigned to an employee");
    } else {
      toast.error("Tag already exists or is empty");
    }
  };

  const handleViewQR = (employee: Employee) => {
    setSelectedEmployee(employee);
    setQrDialogOpen(true);
  };

  const fetchQRAnalytics = async () => {
    if (!user) return;

    try {
      // Get total scans from qr_code_scans table
      const { count: totalScans, error: countError } = await supabase
        .from("qr_code_scans")
        .select("id", { count: "exact" })
        .eq("company_id", user.id);

      if (countError) throw countError;

      // Get unique scans (distinct IP addresses)
      const { count: uniqueScans, error: uniqueError } = await supabase
        .from("qr_code_scans")
        .select("ip_address", { count: "exact" })
        .eq("company_id", user.id);

      if (uniqueError) throw uniqueError;

      // Get recent scans with employee data
      const { data: recentScans, error: recentError } = await supabase
        .from("qr_code_scans")
        .select(
          `
          *,
          employees(name, position)
        `
        )
        .eq("company_id", user.id)
        .order("created_at", { ascending: false })
        .limit(10);

      if (recentError) throw recentError;

      // Get daily scan trends using the existing function
      const { data: dailyScans, error: dailyError } = await supabase.rpc(
        "get_daily_qr_scans",
        {
          company_id_param: user.id,
          days_param: 30,
        }
      );

      if (dailyError) throw dailyError;

      // Get top employees by scan count
      const { data: topEmployees, error: topError } = await supabase.rpc(
        "get_top_employees_by_scans",
        {
          company_id_param: user.id,
          days_param: 30,
          limit_param: 5,
        }
      );

      if (topError) throw topError;

      // Calculate conversion rate
      const { data: conversionData, error: conversionError } =
        await supabase.rpc("get_qr_conversion_rate", {
          company_id_param: user.id,
          days_param: 30,
        });

      if (conversionError) throw conversionError;

      // Set the analytics data in the expected format
      setQrAnalytics({
        total_scans: totalScans || 0,
        unique_scans: uniqueScans || 0,
        conversion_rate: conversionData?.[0]?.conversion_rate * 100 || 0,
        daily_scans: dailyScans || [],
        top_employees: topEmployees || [],
        recent_scans: recentScans || [],
        top_devices: [], // Can be implemented later with user_agent parsing
      });
    } catch (error) {
      console.error("Error fetching QR analytics:", error);
      toast.error("Failed to fetch analytics data");
    }
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

  const handleEditQRCode = (employee: Employee) => {
    // Set the selected employee for bulk actions (treating single employee as bulk of 1)
    setSelectedEmployees([employee.id]);

    // Pre-populate the bulk action form with current employee data
    setBulkExpirationDate(
      employee.qr_expires_at
        ? new Date(employee.qr_expires_at).toISOString().slice(0, 16)
        : ""
    );
    setBulkScanLimit(employee.qr_scan_limit?.toString() || "");
    setBulkCustomPage(employee.custom_landing_page || "");
    setBulkRedirectUrl(employee.qr_redirect_url || "");

    // Open the bulk actions dialog
    setBulkActionDialogOpen(true);
  };

  const handleToggleActive = async (employeeId: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from("employees")
        .update({ qr_is_active: isActive })
        .eq("id", employeeId);

      if (error) throw error;

      // Refresh the employees list
      fetchEmployees();
      toast.success(
        `QR code ${isActive ? "activated" : "deactivated"} successfully`
      );
    } catch (error) {
      console.error("Error toggling QR code status:", error);
      toast.error("Failed to update QR code status");
      throw error;
    }
  };

  const handleRegenerateQR = async (employeeId: string) => {
    try {
      // Generate a new QR code ID
      const newQRCodeId = crypto.randomUUID();

      const { error } = await supabase
        .from("employees")
        .update({ qr_code_id: newQRCodeId })
        .eq("id", employeeId);

      if (error) throw error;

      // Refresh the employees list
      fetchEmployees();
      toast.success("QR code regenerated successfully");
    } catch (error) {
      console.error("Error regenerating QR code:", error);
      toast.error("Failed to regenerate QR code");
      throw error;
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
            qr_expires_at: bulkExpirationDate || null,
            qr_scan_limit: bulkScanLimit ? parseInt(bulkScanLimit) : null,
            custom_landing_page: bulkCustomPage || null,
            qr_redirect_url: bulkRedirectUrl || null,
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
      <div className="space-y-6 p-6">
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
          <StatsCardSkeleton />
          <StatsCardSkeleton />
          <StatsCardSkeleton />
          <StatsCardSkeleton />
        </div>

        {/* Search and Filters Skeleton */}
        <div className="flex items-center space-x-4">
          <div className="h-10 flex-1 bg-gray-200 rounded animate-pulse"></div>
          <div className="h-10 w-32 bg-gray-200 rounded animate-pulse"></div>
        </div>

        {/* QR Codes Grid Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <QRCardSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="mb-6">
        <BackButton />
      </div>
      {/* Header */}
      <div
        className={`flex ${
          isMobile ? "flex-col space-y-4" : "items-center justify-between"
        }`}
      >
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            QR Code Management
          </h1>
          <p className="text-gray-600">
            Generate, manage, and track QR codes for review collection
          </p>
        </div>
        <div
          className={`flex ${
            isMobile ? "flex-col space-y-2 w-full" : "items-center space-x-2"
          }`}
        >
          <Button
            variant="outline"
            onClick={handleViewAnalytics}
            className={isMobile ? "w-full justify-center" : ""}
          >
            <BarChart3 className="h-4 w-4 mr-2" />
            Analytics
          </Button>
          <Button
            variant="outline"
            onClick={() => setQrDialogOpen(true)}
            className={isMobile ? "w-full justify-center" : ""}
          >
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
            <p className="text-xs text-muted-foreground">Generated QR codes</p>
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
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
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

      {/* Category & Tag Management */}
      {/* <Collapsible
          open={managementSectionOpen}
          onOpenChange={setManagementSectionOpen}
        >
          <CollapsibleTrigger asChild>
            <Button variant="outline" className="w-full justify-between mb-4">
              <span>Category & Tag Management</span>
              {managementSectionOpen ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-4 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Categories</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <Button
                      onClick={() => {
                        setEditingCategory(null);
                        setCategoryDialogOpen(true);
                      }}
                      size="sm"
                      className="w-full"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Category
                    </Button>
                    <div className="space-y-1 max-h-32 overflow-y-auto">
                      {categories.map((category) => (
                        <div
                          key={category.id}
                          className="flex items-center justify-between p-2 border rounded"
                        >
                          <div className="flex items-center space-x-2">
                            <div
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: category.color }}
                            />
                            <span className="text-sm">{category.name}</span>
                          </div>
                          <div className="flex space-x-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setEditingCategory(category);
                                setCategoryDialogOpen(true);
                              }}
                            >
                              <Edit className="h-3 w-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDeleteCategory(category.id)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Tags</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <Button
                      onClick={() => {
                        setEditingTag(null);
                        setTagDialogOpen(true);
                      }}
                      size="sm"
                      className="w-full"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Tag
                    </Button>
                    <div className="space-y-1 max-h-32 overflow-y-auto">
                      {tags.map((tag) => (
                        <div
                          key={tag.id}
                          className="flex items-center justify-between p-2 border rounded"
                        >
                          <div className="flex items-center space-x-2">
                            <div
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: tag.color }}
                            />
                            <span className="text-sm">{tag.name}</span>
                          </div>
                          <div className="flex space-x-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setEditingTag(tag);
                                setTagDialogOpen(true);
                              }}
                            >
                              <Edit className="h-3 w-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDeleteTag(tag.id)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </CollapsibleContent>
        </Collapsible> */}

      {/* Enhanced Filter UI */}
      {/* <div className="bg-white p-4 rounded-lg shadow-sm border mb-6">
          <div className="flex items-center gap-4 mb-4">
            <Filter className="w-5 h-5 text-gray-500" />
            <h3 className="font-medium">Filters</h3>
            {(filters.category || filters.tag || filters.status !== "all") && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() =>
                  setFilters({ category: "", tag: "", status: "all" })
                }
                className="text-red-600 hover:text-red-700"
              >
                <X className="w-4 h-4 mr-1" />
                Clear All
              </Button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label className="text-sm font-medium mb-2 block">Category</Label>
              <Select
                value={filters.category}
                onValueChange={(value) =>
                  setFilters((prev) => ({ ...prev, category: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="All categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="none">No Category</SelectItem>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: category.color }}
                        />
                        {category.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-sm font-medium mb-2 block">Tag</Label>
              <Select
                value={filters.tag}
                onValueChange={(value) =>
                  setFilters((prev) => ({ ...prev, tag: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="All tags" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Tags</SelectItem>
                  {tags.map((tag) => (
                    <SelectItem key={tag.id} value={tag.id}>
                      <Badge
                        variant="secondary"
                        style={{ backgroundColor: tag.color, color: "white" }}
                      >
                        {tag.name}
                      </Badge>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-sm font-medium mb-2 block">Status</Label>
              <Select
                value={filters.status}
                onValueChange={(value) =>
                  setFilters((prev) => ({ ...prev, status: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="expired">Expired</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div> */}

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
                  <DialogTitle>
                    {selectedEmployees.length === 1
                      ? "Edit QR Code"
                      : `Bulk Actions (${selectedEmployees.length})`}
                  </DialogTitle>
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
                        onChange={(e) => setBulkExpirationDate(e.target.value)}
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
              <QRCodeCard
                employee={employee}
                onViewQR={handleViewQR}
                onSelect={(checked) => handleBulkSelect(employee.id, checked)}
                isSelected={selectedEmployees.includes(employee.id)}
                onAddTag={(employeeId, tagName) => {
                  // Handle legacy tag addition if needed
                }}
                onRemoveTag={(employeeId, tagName) => {
                  // Handle legacy tag removal if needed
                }}
                onUpdateCategory={(employeeId, category) => {
                  // Handle legacy category update if needed
                }}
                onEditQRCode={handleEditQRCode}
                onToggleActive={handleToggleActive}
                onRegenerateQR={handleRegenerateQR}
                availableCategories={categories.map((c) => c.name)}
                availableTags={tags.map((t) => t.name)}
              />
            </div>
          ))}
        </div>
      )}

      {/* Analytics Dialog */}
      <Dialog open={analyticsDialogOpen} onOpenChange={setAnalyticsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>QR Code Analytics</DialogTitle>
            <DialogDescription>
              Real-time insights into your QR code performance
            </DialogDescription>
          </DialogHeader>
          {qrAnalytics ? (
            <div className="space-y-6">
              <div className="grid grid-cols-3 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="text-2xl font-bold">
                      {qrAnalytics.total_scans}
                    </div>
                    <p className="text-sm text-muted-foreground">Total Scans</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="text-2xl font-bold">
                      {qrAnalytics.unique_scans}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Unique Visitors
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="text-2xl font-bold">
                      {qrAnalytics.conversion_rate.toFixed(1)}%
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
                    <h4 className="font-semibold mb-3">
                      Top Performing Employees
                    </h4>
                    <div className="space-y-2">
                      {qrAnalytics.top_employees?.length > 0 ? (
                        qrAnalytics.top_employees.map((employee, index) => (
                          <div
                            key={employee.employee_id}
                            className="flex items-center justify-between p-2 bg-gray-50 rounded"
                          >
                            <span className="font-medium">
                              {employee.employee_name}
                            </span>
                            <span className="text-sm text-muted-foreground">
                              {employee.scan_count} scans
                            </span>
                          </div>
                        ))
                      ) : (
                        <p className="text-sm text-muted-foreground">
                          No employee data available
                        </p>
                      )}
                    </div>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-3">Recent Scans</h4>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {qrAnalytics.recent_scans?.length > 0 ? (
                        qrAnalytics.recent_scans.map((scan, index) => (
                          <div
                            key={index}
                            className="flex justify-between text-sm"
                          >
                            <div>
                              <span className="font-medium">
                                {scan.employees?.name || "Unknown"}
                              </span>
                              {scan.employees?.position && (
                                <span className="text-muted-foreground ml-2">
                                  ({scan.employees.position})
                                </span>
                              )}
                            </div>
                            <span className="text-muted-foreground">
                              {new Date(scan.created_at).toLocaleDateString()}
                            </span>
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

      {/* QR Code Dialog */}
      <QRCodeDialog
        employee={selectedEmployee}
        open={qrDialogOpen}
        onOpenChange={setQrDialogOpen}
      />

      {/* Category Dialog */}
      <CategoryTagFormDialog
        open={categoryDialogOpen}
        onOpenChange={setCategoryDialogOpen}
        type="category"
        item={editingCategory}
        onSave={handleCreateCategory}
        onUpdate={handleUpdateCategory}
      />

      {/* Tag Dialog */}
      <CategoryTagFormDialog
        open={tagDialogOpen}
        onOpenChange={setTagDialogOpen}
        type="tag"
        item={editingTag}
        onSave={handleCreateTag}
        onUpdate={handleUpdateTag}
      />

      {/* Assignment Dialog */}
      <AssignCategoryTagDialog
        open={assignDialogOpen}
        onOpenChange={setAssignDialogOpen}
        employee={selectedEmployeeForAssign}
        categories={categories}
        tags={tags}
        onAssignCategory={handleAssignEmployeeCategory}
        onAssignTags={handleAssignTags}
      />
    </div>
  );
};

export default QRCodes;
