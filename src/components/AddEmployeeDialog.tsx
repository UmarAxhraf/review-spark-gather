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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Upload, User, UserPlus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface Employee {
  id?: string;
  name: string;
  email?: string;
  position?: string;
  department_id?: string;
  position_id?: string;
  is_active: boolean;
  photo_url?: string;
}

interface Department {
  id: string;
  name: string;
}

interface Position {
  id: string;
  title: string;
  department_id: string;
}

interface AddEmployeeDialogProps {
  employee?: Employee;
  onEmployeeAdded: () => void;
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

const AddEmployeeDialog = ({
  employee,
  onEmployeeAdded,
  trigger,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
}: AddEmployeeDialogProps) => {
  const { user } = useAuth();
  const [internalOpen, setInternalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [filteredPositions, setFilteredPositions] = useState<Position[]>([]);

  // Use controlled or internal state for dialog open/close
  const open = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setOpen = controlledOnOpenChange || setInternalOpen;

  const [formData, setFormData] = useState<Employee>({
    name: "",
    email: "",
    position: "",
    department_id: "",
    position_id: "",
    is_active: true,
    photo_url: "",
  });

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

  // Fetch departments and positions data
  const fetchDepartmentsAndPositions = useCallback(async () => {
    try {
      //console.log("Fetching departments and positions...");

      // Fetch departments with explicit distinct query
      const { data: departmentsData, error: deptError } = await supabase
        .from("departments")
        .select("id, name")
        .order("name");

      if (deptError) {
        console.error("Error fetching departments:", deptError);
        toast.error("Failed to load departments");
        return;
      }

      // Remove duplicates from departments data
      const uniqueDepartments = removeDuplicates(departmentsData || []);
      // console.log("Departments fetched:", uniqueDepartments);
      setDepartments(uniqueDepartments);

      // Fetch positions with explicit distinct query
      const { data: positionsData, error: posError } = await supabase
        .from("positions")
        .select("id, title, department_id")
        .order("title");

      if (posError) {
        console.error("Error fetching positions:", posError);
        toast.error("Failed to load positions");
        return;
      }

      // Remove duplicates from positions data
      const uniquePositions = removeDuplicates(positionsData || []);
      //console.log("Positions fetched:", uniquePositions);
      setPositions(uniquePositions);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Failed to load dropdown data");
    }
  }, [removeDuplicates]);

  // Fetch data when dialog opens
  useEffect(() => {
    if (open) {
      fetchDepartmentsAndPositions();
    }
  }, [open, fetchDepartmentsAndPositions]);

  // Filter positions based on selected department
  useEffect(() => {
    if (formData.department_id && positions.length > 0) {
      const filtered = positions.filter(
        (position) => position.department_id === formData.department_id
      );
      // console.log(
      //   "Filtered positions for department",
      //   formData.department_id,
      //   ":",
      //   filtered
      // );
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
      setFormData((prev) => ({ ...prev, position_id: "" }));
    }
  }, [formData.department_id, positions]);

  // Initialize form data when employee prop changes or dialog opens
  useEffect(() => {
    if (employee) {
      setFormData({
        name: employee.name || "",
        email: employee.email || "",
        position: employee.position || "",
        department_id: employee.department_id || "",
        position_id: employee.position_id || "",
        is_active: employee.is_active ?? true,
        photo_url: employee.photo_url || "",
      });
      setPhotoPreview(employee.photo_url || null);
    } else {
      setFormData({
        name: "",
        email: "",
        position: "",
        department_id: "",
        position_id: "",
        is_active: true,
        photo_url: "",
      });
      setPhotoPreview(null);
    }
    setPhotoFile(null);
  }, [employee, open]);

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
      const filePath = `employee-photos/${fileName}`;

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setIsLoading(true);

    try {
      let photoUrl = formData.photo_url;

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
          .select("title")
          .eq("id", formData.position_id)
          .single();

        if (positionData) {
          positionTitle = positionData.title;
        }
      }

      const employeeData = {
        name: formData.name,
        email: formData.email || null,
        position: positionTitle || null, // Keep for backward compatibility
        department_id: formData.department_id || null,
        position_id: formData.position_id || null,
        is_active: formData.is_active,
        photo_url: photoUrl || null,
        company_id: user.id,
      };

      // console.log("Submitting employee data:", employeeData);

      if (employee?.id) {
        // Update existing employee
        const { error } = await supabase
          .from("employees")
          .update(employeeData)
          .eq("id", employee.id);

        if (error) throw error;
        toast.success("Employee updated successfully!");
      } else {
        // Create new employee
        const { error } = await supabase
          .from("employees")
          .insert([employeeData]);

        if (error) throw error;
        toast.success("Employee added successfully!");
      }

      setOpen(false);
      onEmployeeAdded();
    } catch (error: any) {
      console.error("Error saving employee:", error);
      toast.error(error.message || "Failed to save employee");
    } finally {
      setIsLoading(false);
    }
  };

  // const handleSubmit = async (e: React.FormEvent) => {
  //   e.preventDefault();
  //   if (!user) return;

  //   setIsLoading(true);

  //   try {
  //     let photoUrl = formData.photo_url;

  //     if (photoFile) {
  //       const uploadedUrl = await uploadPhoto(photoFile);
  //       if (uploadedUrl) {
  //         photoUrl = uploadedUrl;
  //       }
  //     }

  //     const employeeData = {
  //       name: formData.name,
  //       email: formData.email || null,
  //       position: formData.position || null,
  //       department_id: formData.department_id || null,
  //       position_id: formData.position_id || null,
  //       is_active: formData.is_active,
  //       photo_url: photoUrl || null,
  //       company_id: user.id,
  //     };

  //     console.log("Submitting employee data:", employeeData);

  //     if (employee?.id) {
  //       // Update existing employee
  //       const { error } = await supabase
  //         .from("employees")
  //         .update(employeeData)
  //         .eq("id", employee.id);

  //       if (error) throw error;
  //       toast.success("Employee updated successfully!");
  //     } else {
  //       // Create new employee
  //       const { error } = await supabase
  //         .from("employees")
  //         .insert([employeeData]);

  //       if (error) throw error;
  //       toast.success("Employee added successfully!");
  //     }

  //     setOpen(false);
  //     onEmployeeAdded();
  //   } catch (error: any) {
  //     console.error("Error saving employee:", error);
  //     toast.error(error.message || "Failed to save employee");
  //   } finally {
  //     setIsLoading(false);
  //   }
  // };

  // Handle department selection with explicit value checking
  const handleDepartmentChange = (value: string) => {
    // console.log("Department selected:", value);
    setFormData({ ...formData, department_id: value, position_id: "" });
  };

  // Handle position selection with explicit value checking
  const handlePositionChange = (value: string) => {
    // console.log("Position selected:", value);
    setFormData({ ...formData, position_id: value });
  };

  const dialogContent = (
    <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>
          {employee ? "Edit Employee" : "Add New Employee"}
        </DialogTitle>
        <DialogDescription>
          {employee
            ? "Update employee information and settings."
            : "Add a new team member to start collecting reviews."}
        </DialogDescription>
      </DialogHeader>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Photo Upload */}
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
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) =>
                setFormData({ ...formData, email: e.target.value })
              }
              placeholder="Enter email address"
            />
          </div>
        </div>

        {/* Department and Position Dropdowns */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="department">Department</Label>
            <Select
              key={`department-${departments.length}`} // Force re-render when departments change
              value={formData.department_id}
              onValueChange={handleDepartmentChange}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select department" />
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
            <Label htmlFor="position">Position</Label>
            <Select
              key={`position-${formData.department_id}-${filteredPositions.length}`} // Force re-render when filtered positions change
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
                      ? "No positions available"
                      : "Select position"
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
            value={formData.position}
            onChange={(e) =>
              setFormData({ ...formData, position: e.target.value })
            }
            placeholder="Enter position title (optional)"
          />
        </div>

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

        {/* Submit Buttons */}
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
              : employee
              ? "Update Employee"
              : "Add Employee"}
          </Button>
        </div>
      </form>
    </DialogContent>
  );

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

// //=================================>>>>>>>>>>>>>>>>>>======================================
