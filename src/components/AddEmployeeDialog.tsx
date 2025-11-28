import React, { useState, useEffect, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Upload, User, UserPlus, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

// ============================================================================
// INTERFACES & TYPES
// ============================================================================

interface Employee {
  id?: string;
  name: string;
  email?: string;
  position?: string;
  department_id?: string;
  position_id?: string;
  category_id?: string;
  is_active: boolean;
  photo_url?: string;
}

interface Department {
  id: string;
  name: string;
  company_id?: string;
}

interface Position {
  id: string;
  title: string;
  department_id: string;
  company_id?: string;
}

interface Category {
  id: string;
  name: string;
  color: string;
  company_id?: string;
}

interface Tag {
  id: string;
  name: string;
  color: string;
  company_id?: string;
}

interface AddEmployeeDialogProps {
  employee?: Employee;
  editingEmployee?: Employee | null;
  onEmployeeAdded: () => void;
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const AddEmployeeDialog: React.FC<AddEmployeeDialogProps> = ({
  employee,
  editingEmployee,
  onEmployeeAdded,
  trigger,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
}) => {
  // ============================================================================
  // HOOKS & STATE
  // ============================================================================

  const { user } = useAuth();
  const [internalOpen, setInternalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Photo handling
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  // Data state
  const [departments, setDepartments] = useState<Department[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [filteredPositions, setFilteredPositions] = useState<Position[]>([]);

  // Selection state
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(
    null
  );
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);

  // Use controlled or internal state for dialog open/close
  const open = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setOpen = controlledOnOpenChange || setInternalOpen;

  // Current employee (prioritize editingEmployee over employee prop)
  const currentEmployee = editingEmployee || employee;

  // Form data state
  const [formData, setFormData] = useState<Employee>({
    name: "",
    email: "",
    position: "",
    department_id: "",
    position_id: "",
    category_id: "",
    is_active: true,
    photo_url: "",
  });

  // ============================================================================
  // UTILITY FUNCTIONS
  // ============================================================================

  // Memoized function to remove duplicates and ensure data integrity
  const removeDuplicates = useCallback(
    <T extends { id: string }>(array: T[]): T[] => {
      const seen = new Map<string, T>();
      array.forEach((item) => {
        if (!seen.has(item.id)) {
          seen.set(item.id, item);
        }
      });
      return Array.from(seen.values());
    },
    []
  );

  // ============================================================================
  // DATA FETCHING FUNCTIONS
  // ============================================================================

  const fetchDepartments = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("departments")
        .select("id, name")
        .eq("company_id", user?.id)
        .order("name");

      if (error) {
        console.error("Error fetching departments:", error);
        toast.error("Failed to load departments");
        return;
      }

      const uniqueDepartments = removeDuplicates(data || []);
      setDepartments(uniqueDepartments);
    } catch (error) {
      console.error("Error fetching departments:", error);
      toast.error("Failed to load departments");
    }
  }, [user?.id, removeDuplicates]);

  const fetchPositions = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("positions")
        .select("id, title, department_id")
        .eq("company_id", user?.id)
        .order("title");

      if (error) {
        console.error("Error fetching positions:", error);
        toast.error("Failed to load positions");
        return;
      }

      const uniquePositions = removeDuplicates(data || []);
      setPositions(uniquePositions);
    } catch (error) {
      console.error("Error fetching positions:", error);
      toast.error("Failed to load positions");
    }
  }, [user?.id, removeDuplicates]);

  const fetchCategories = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .eq("company_id", user?.id)
        .order("name");

      if (error) {
        console.error("Error fetching categories:", error);
        toast.error("Failed to load categories");
        return;
      }

      setCategories(data || []);
    } catch (error) {
      console.error("Error fetching categories:", error);
      toast.error("Failed to load categories");
    }
  }, [user?.id]);

  const fetchTags = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("tags")
        .select("*")
        .eq("company_id", user?.id)
        .order("name");

      if (error) {
        console.error("Error fetching tags:", error);
        toast.error("Failed to load tags");
        return;
      }

      setTags(data || []);
    } catch (error) {
      console.error("Error fetching tags:", error);
      toast.error("Failed to load tags");
    }
  }, [user?.id]);

  const fetchAllData = useCallback(async () => {
    await Promise.all([
      fetchDepartments(),
      fetchPositions(),
      fetchCategories(),
      fetchTags(),
    ]);
  }, [fetchDepartments, fetchPositions, fetchCategories, fetchTags]);

  // ============================================================================
  // EFFECTS
  // ============================================================================

  // Fetch data when dialog opens
  useEffect(() => {
    if (open && user?.id) {
      fetchAllData();
    }
  }, [open, user?.id, fetchAllData]);

  // Filter positions based on selected department
  // Add debugging to the useEffect
  useEffect(() => {
    //console.log('Department changed:', formData.department_id);
    //console.log('Available positions:', positions);

    if (formData.department_id && positions.length > 0) {
      const filtered = positions.filter(
        (position) => position.department_id === formData.department_id
      );

      //console.log('Filtered positions:', filtered);
      setFilteredPositions(filtered);

      // Reset position if it doesn't belong to the selected department
      if (
        formData.position_id &&
        !filtered.find((p) => p.id === formData.position_id)
      ) {
        setFormData((prev) => ({ ...prev, position_id: "" }));
      }
    } else {
      setFilteredPositions([]);
    }
  }, [formData.department_id, positions]);

  // Initialize form data when employee prop changes or dialog opens
  useEffect(() => {
    if (currentEmployee) {
      setFormData({
        name: currentEmployee.name || "",
        email: currentEmployee.email || "",
        position: currentEmployee.position || "",
        department_id: currentEmployee.department_id || "",
        position_id: currentEmployee.position_id || "",
        category_id: currentEmployee.category_id || "",
        is_active: currentEmployee.is_active ?? true,
        photo_url: currentEmployee.photo_url || "",
      });
      setPhotoPreview(currentEmployee.photo_url || null);
      setSelectedCategoryId(currentEmployee.category_id || null);

      // TODO: Fetch employee tags if editing
      if (currentEmployee.id) {
        fetchEmployeeTags(currentEmployee.id);
      }
    } else {
      // Reset form for new employee
      setFormData({
        name: "",
        email: "",
        position: "",
        department_id: "",
        position_id: "",
        category_id: "",
        is_active: true,
        photo_url: "",
      });
      setPhotoPreview(null);
      setSelectedCategoryId(null);
      setSelectedTagIds([]);
    }
    setPhotoFile(null);
  }, [currentEmployee, open]);

  // ============================================================================
  // EVENT HANDLERS
  // ============================================================================

  const fetchEmployeeTags = async (employeeId: string) => {
    try {
      const { data, error } = await supabase
        .from("employee_tags")
        .select("tag_id")
        .eq("employee_id", employeeId);

      if (error) throw error;
      setSelectedTagIds(data?.map((item) => item.tag_id) || []);
    } catch (error) {
      console.error("Error fetching employee tags:", error);
    }
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPhotoFile(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setPhotoPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const uploadPhoto = async (file: File): Promise<string | null> => {
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `${user!.id}/employee-photos/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("company-assets")
        .upload(filePath, file);

      if (uploadError) {
        console.error("Upload error:", uploadError);
        return null;
      }

      const {
        data: { publicUrl },
      } = supabase.storage.from("company-assets").getPublicUrl(filePath);

      return publicUrl;
    } catch (error) {
      console.error("Error uploading photo:", error);
      return null;
    }
  };

  const handleDepartmentChange = (value: string) => {
    setFormData({ ...formData, department_id: value, position_id: "" });
  };

  const handlePositionChange = (value: string) => {
    // Only update position_id, don't touch the legacy position field
    setFormData({
      ...formData,
      position_id: value,
    });
  };

  const handleCategoryChange = (value: string) => {
    const categoryId = value === "none" ? null : value;
    setSelectedCategoryId(categoryId);
    setFormData((prev) => ({ ...prev, category_id: categoryId || "" }));
  };

  const addTag = (tagId: string) => {
    if (!selectedTagIds.includes(tagId)) {
      setSelectedTagIds((prev) => [...prev, tagId]);
    }
  };

  const removeTag = (tagId: string) => {
    setSelectedTagIds((prev) => prev.filter((id) => id !== tagId));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setIsLoading(true);

    try {
      // Required field validation
      const name = (formData.name || "").trim();
      const email = (formData.email || "").trim();
      const departmentId = formData.department_id;
      const positionId = formData.position_id;
      const emailRegex = /^\S+@\S+\.\S+$/;

      if (!name) {
        toast.error("Name is required.");
        setIsLoading(false);
        return;
      }
      if (!email) {
        toast.error("Email is required.");
        setIsLoading(false);
        return;
      }
      if (!emailRegex.test(email)) {
        toast.error("Please enter a valid email address.");
        setIsLoading(false);
        return;
      }
      if (!departmentId) {
        toast.error("Department is required.");
        setIsLoading(false);
        return;
      }
      if (!positionId) {
        toast.error(
          "Position is required. Select a position for the chosen department."
        );
        setIsLoading(false);
        return;
      }

      // Normalize inputs for duplicate checking
      const normalizedName = (formData.name || "").trim();
      const normalizedEmail = (formData.email || "").trim().toLowerCase();

      // Pre-check for duplicates only when email is provided
      if (!currentEmployee?.id && normalizedEmail) {
        const { data: existingEmployees, error: dupCheckError } = await supabase
          .from("employees")
          .select("id")
          .eq("company_id", user.id)
          .ilike("name", normalizedName)
          .ilike("email", normalizedEmail)
          .limit(1);

        if (dupCheckError) {
          console.error("Duplicate check error:", dupCheckError);
        } else if (existingEmployees && existingEmployees.length > 0) {
          toast.error(
            "An employee with the same name and email already exists in your company."
          );
          setIsLoading(false);
          return;
        }
      }

      let photoUrl = formData.photo_url;

      // Upload photo if a new one was selected
      if (photoFile) {
        const uploadedUrl = await uploadPhoto(photoFile);
        if (uploadedUrl) {
          photoUrl = uploadedUrl;
        }
      }

      // Get position title from positions table if position_id is selected
      let positionTitle = formData.position;
      if (formData.position_id) {
        const { data: positionData } = await supabase
          .from("positions")
          .select("title") // ✅ FIXED: Only select 'title' column
          .eq("id", formData.position_id)
          .single();

        if (positionData) {
          positionTitle = positionData.title; // ✅ FIXED: Only use 'title'
        }
      }

      const employeeData = {
        name: (formData.name || "").trim(),
        email: (formData.email || "").trim() || null,
        position: positionTitle || null,
        department_id: formData.department_id || null,
        position_id: formData.position_id || null,
        category_id: selectedCategoryId || null,
        is_active: formData.is_active,
        photo_url: photoUrl || null,
        company_id: user.id,
      };

      let employeeId: string;

      if (currentEmployee?.id) {
        // Update existing employee: pre-check duplicates if email is provided
        if (normalizedEmail) {
          const { data: existingEmployees, error: dupCheckError } = await supabase
            .from("employees")
            .select("id")
            .eq("company_id", user.id)
            .ilike("name", normalizedName)
            .ilike("email", normalizedEmail)
            .neq("id", currentEmployee.id)
            .limit(1);

          if (dupCheckError) {
            console.error("Duplicate check error (update):", dupCheckError);
          } else if (existingEmployees && existingEmployees.length > 0) {
            toast.error(
              "Another employee with the same name and email already exists in your company."
            );
            setIsLoading(false);
            return;
          }
        }

        // Proceed with update
        const { error } = await supabase
          .from("employees")
          .update(employeeData)
          .eq("id", currentEmployee.id);

        if (error) throw error;
        employeeId = currentEmployee.id;
        toast.success("Employee updated successfully!");
      } else {
        // Create new employee
        const { data, error } = await supabase
          .from("employees")
          .insert([employeeData])
          .select("id")
          .single();
        if (error) {
          // Handle unique constraint violation gracefully
          if (error.code === "23505") {
            toast.error(
              "An employee with the same name and email already exists in your company."
            );
          }
          throw error;
        }
        employeeId = data.id;
        toast.success("Employee added successfully!");
      }

      // Handle tag assignments
      if (currentEmployee?.id) {
        // Remove existing tags
        await supabase
          .from("employee_tags")
          .delete()
          .eq("employee_id", employeeId);
      }

      // Add new tags
      if (selectedTagIds.length > 0) {
        const tagInserts = selectedTagIds.map((tagId) => ({
          employee_id: employeeId,
          tag_id: tagId,
          assigned_by: user.id,
        }));

        const { error: tagError } = await supabase
          .from("employee_tags")
          .insert(tagInserts);

        if (tagError) {
          console.error("Error assigning tags:", tagError);
          toast.error("Employee saved but failed to assign tags");
        }
      }

      setOpen(false);
      onEmployeeAdded();
    } catch (error: any) {
      console.error("Error saving employee:", error);
      if (error?.code === "23505") {
        toast.error(
          "Duplicate employee detected: same name and email within your company."
        );
      } else {
        toast.error(error.message || "Failed to save employee");
      }
    } finally {
      setIsLoading(false);
    }
  };

  // ============================================================================
  // RENDER HELPERS
  // ============================================================================

  const renderSelectedTags = () => (
    <div className="flex flex-wrap gap-2 mb-2">
      {selectedTagIds.map((tagId) => {
        const tag = tags.find((t) => t.id === tagId);
        if (!tag) return null;
        return (
          <Badge
            key={tagId}
            variant="secondary"
            className="flex items-center gap-1"
            style={{ backgroundColor: tag.color + "20", color: tag.color }}
          >
            {tag.name}
            <X
              className="h-3 w-3 cursor-pointer"
              onClick={() => removeTag(tagId)}
            />
          </Badge>
        );
      })}
    </div>
  );

  const renderAvailableTags = () => (
    <div className="flex flex-wrap gap-2">
      {tags
        .filter((tag) => !selectedTagIds.includes(tag.id))
        .map((tag) => (
          <Badge
            key={tag.id}
            variant="outline"
            className="cursor-pointer hover:bg-gray-100"
            onClick={() => addTag(tag.id)}
            style={{ borderColor: tag.color, color: tag.color }}
          >
            {tag.name}
          </Badge>
        ))}
    </div>
  );

  // ============================================================================
  // MAIN RENDER
  // ============================================================================

  const dialogContent = (
    <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>
          {currentEmployee ? "Edit Employee" : "Add New Employee"}
        </DialogTitle>
        <DialogDescription>
          {currentEmployee
            ? "Update employee information and settings."
            : "Add a new team member to start collecting reviews."}
        </DialogDescription>
      </DialogHeader>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Photo Upload Section */}
        <div className="flex flex-col items-center space-y-4">
          <Avatar className="h-20 w-20">
            <AvatarImage src={photoPreview || undefined} />
            <AvatarFallback>
              <User className="h-8 w-8" />
            </AvatarFallback>
          </Avatar>
          <div>
            <Label htmlFor="photo" className="cursor-pointer">
              <div className="flex items-center space-x-2 text-sm text-blue-600 hover:text-blue-800">
                <Upload className="h-4 w-4" />
                <span>Upload Photo</span>
              </div>
            </Label>
            <Input
              id="photo"
              type="file"
              accept="image/*"
              onChange={handlePhotoChange}
              className="hidden"
            />
          </div>
        </div>

        {/* Basic Information */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="name">Full Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              placeholder="Enter full name"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email *</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) =>
                setFormData({ ...formData, email: e.target.value })
              }
              placeholder="Enter email address"
              required
            />
          </div>
        </div>

        {/* Department and Position Selection */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="department">Department *</Label>
            <Select
              key={`department-${departments.length}`}
              value={formData.department_id}
              onValueChange={handleDepartmentChange}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select department (required)" />
              </SelectTrigger>
              <SelectContent className="max-h-[200px] overflow-y-auto">
                {departments.map((dept) => (
                  <SelectItem key={`dept-${dept.id}`} value={dept.id}>
                    {dept.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="position">Position *</Label>
            <Select
              key={`position-${formData.department_id}-${filteredPositions.length}`}
              value={formData.position_id}
              onValueChange={handlePositionChange}
              disabled={
                !formData.department_id || filteredPositions.length === 0
              }
            >
              <SelectTrigger>
                <SelectValue
                  placeholder={
                    !formData.department_id
                      ? "Select department first"
                      : filteredPositions.length === 0
                      ? "No positions available (required)"
                      : "Select position (required)"
                  }
                />
              </SelectTrigger>
              <SelectContent className="max-h-[200px] overflow-y-auto">
                {filteredPositions.map((pos) => (
                  <SelectItem key={`pos-${pos.id}`} value={pos.id}>
                    {pos.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Legacy Position Field (for backward compatibility) */}
        <div className="space-y-2">
          <Label htmlFor="legacy-position">Position (Legacy)</Label>
          <Input
            id="legacy-position"
            value={formData.position || ""}
            onChange={(e) =>
              setFormData({ ...formData, position: e.target.value })
            }
            placeholder="Enter custom position title (optional)"
          />
        </div>

        {/* Category Selection */}
        {/* <div className="space-y-2">
          <Label htmlFor="category">Category</Label>
          <Select
            value={selectedCategoryId || ""}
            onValueChange={handleCategoryChange}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select a category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No Category</SelectItem>
              {categories.map((category) => (
                <SelectItem key={category.id} value={category.id}>
                  ● {category.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div> */}

        {/* Tag Selection */}
        {/* <div className="space-y-2">
          <Label htmlFor="tags">Tags</Label>
          <Select
            value=""
            onValueChange={(value) => {
              if (value && !selectedTagIds.includes(value)) {
                addTag(value);
              }
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select tags" />
            </SelectTrigger>
            <SelectContent>
              {tags
                .filter((tag) => !selectedTagIds.includes(tag.id))
                .map((tag) => (
                  <SelectItem key={tag.id} value={tag.id}>
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: tag.color }}
                      />
                      {tag.name}
                    </div>
                  </SelectItem>
                ))}
            </SelectContent>
          </Select> */}

        {/* Selected Tags Display */}
        {/* {selectedTagIds.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {selectedTagIds.map((tagId) => {
                const tag = tags.find((t) => t.id === tagId);
                if (!tag) return null;
                return (
                  <Badge
                    key={tagId}
                    variant="secondary"
                    className="flex items-center gap-1"
                    style={{
                      backgroundColor: tag.color + "20",
                      color: tag.color,
                    }}
                  >
                    {tag.name}
                    <X
                      className="h-3 w-3 cursor-pointer"
                      onClick={() => removeTag(tagId)}
                    />
                  </Badge>
                );
              })}
            </div>
          )}
        </div> */}

        {/* Active Status */}
        <div className="flex items-center space-x-2">
          <Switch
            id="active"
            checked={formData.is_active}
            onCheckedChange={(checked) =>
              setFormData({ ...formData, is_active: checked })
            }
          />
          <Label htmlFor="active">Active Employee</Label>
        </div>

        {/* Form Actions */}
        <div className="flex justify-end space-x-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading
              ? "Saving..."
              : currentEmployee
              ? "Update Employee"
              : "Add Employee"}
          </Button>
        </div>
      </form>
    </DialogContent>
  );

  // Conditional rendering based on trigger prop
  if (trigger) {
    return (
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>{trigger}</DialogTrigger>
        {dialogContent}
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {dialogContent}
    </Dialog>
  );
};

export default AddEmployeeDialog;
