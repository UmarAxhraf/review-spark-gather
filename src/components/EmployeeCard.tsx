import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { QRCodeSVG } from "qrcode.react";
import {
  User,
  Mail,
  Eye,
  Edit,
  Trash,
  Star,
  TrendingUp,
  Users,
  Calendar,
  Award,
} from "lucide-react";
import AddEmployeeDialog from "./AddEmployeeDialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

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
  hire_date?: string;
  performance_score?: number;
  skills?: string[];
  reviews_count?: number;
  avg_rating?: number;
  department?: {
    name: string;
  };
  position_data?: {
    title: string;
  };
  manager?: {
    name: string;
  };
}

interface EmployeeCardProps {
  employee: Employee;
  onEdit: (employee: Employee) => void;
  onDelete: (employeeId: string) => void;
  onViewQR: (employee: Employee) => void;
  onViewProfile?: (employee: Employee) => void;
  onToggleStatus?: (employeeId: string, newStatus: boolean) => void;
}

const EmployeeCard = ({
  employee,
  onEdit,
  onDelete,
  onViewQR,
  onViewProfile,
  onToggleStatus,
}: EmployeeCardProps) => {
  const [showQR, setShowQR] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const reviewUrl = `${window.location.origin}/review/${employee.qr_code_id}`;

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase();
  };

  const getPerformanceColor = (score?: number) => {
    if (!score) return "bg-gray-200";
    if (score >= 4.5) return "bg-green-500";
    if (score >= 3.5) return "bg-yellow-500";
    return "bg-red-500";
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString();
  };

  const handleEdit = () => {
    setEditDialogOpen(true);
  };

  const handleEditComplete = () => {
    setEditDialogOpen(false);
    onEdit(employee);
  };

  const handleDelete = () => {
    onDelete(employee.id);
    setShowDeleteDialog(false);
  };

  const handleViewProfile = () => {
    if (onViewProfile) {
      onViewProfile(employee);
    }
  };

  return (
    <>
      <Card className="w-full hover:shadow-lg transition-shadow">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Avatar className="h-12 w-12">
                <AvatarImage src={employee.photo_url} alt={employee.name} />
                <AvatarFallback className="bg-blue-100 text-blue-600">
                  {getInitials(employee.name)}
                </AvatarFallback>
              </Avatar>
              <div>
                <CardTitle className="text-lg">{employee.name}</CardTitle>
                <p className="text-sm text-gray-600">
                  {employee.position_data?.title ||
                    employee.position ||
                    "No position"}
                </p>
                {employee.department && (
                  <p className="text-xs text-gray-500">
                    {employee.department.name}
                  </p>
                )}
              </div>
            </div>
            <Badge variant={employee.is_active ? "default" : "secondary"}>
              {employee.is_active ? "Active" : "Inactive"}
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Performance Metrics */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-1">
                <Star className="h-3 w-3 text-yellow-500" />
                <span className="text-xs text-gray-600">Rating</span>
              </div>
              <p className="text-sm font-semibold">
                {employee.avg_rating ? `${employee.avg_rating}/5` : "N/A"}
              </p>
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-1">
                <TrendingUp className="h-3 w-3 text-blue-500" />
                <span className="text-xs text-gray-600">Reviews</span>
              </div>
              <p className="text-sm font-semibold">
                {employee.reviews_count || 0}
              </p>
            </div>
          </div>

          {/* Performance Score */}
          {employee.performance_score && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-600">Performance</span>
                <span className="text-xs font-semibold">
                  {employee.performance_score}/5
                </span>
              </div>
              <Progress
                value={(employee.performance_score / 5) * 100}
                className="h-2"
              />
            </div>
          )}

          {/* Skills */}
          {employee.skills && employee.skills.length > 0 && (
            <div className="space-y-2">
              <span className="text-xs text-gray-600">Skills</span>
              <div className="flex flex-wrap gap-1">
                {employee.skills.slice(0, 3).map((skill, index) => (
                  <Badge key={index} variant="outline" className="text-xs">
                    {skill}
                  </Badge>
                ))}
                {employee.skills.length > 3 && (
                  <Badge variant="outline" className="text-xs">
                    +{employee.skills.length - 3}
                  </Badge>
                )}
              </div>
            </div>
          )}

          {/* Additional Info */}
          <div className="space-y-1 text-xs text-gray-600">
            {employee.email && (
              <div className="flex items-center gap-1">
                <Mail className="h-3 w-3" />
                <span className="truncate">{employee.email}</span>
              </div>
            )}
            {employee.hire_date && (
              <div className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                <span>Hired: {formatDate(employee.hire_date)}</span>
              </div>
            )}
            {employee.manager && (
              <div className="flex items-center gap-1">
                <Users className="h-3 w-3" />
                <span>Manager: {employee.manager.name}</span>
              </div>
            )}
          </div>

          {/* QR Code (toggleable) */}
          {showQR && (
            <div className="flex justify-center p-4 bg-gray-50 rounded-lg">
              <QRCodeSVG value={reviewUrl} size={120} />
            </div>
          )}

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-2">
            {onViewProfile && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleViewProfile}
                className="text-xs"
              >
                <User className="h-3 w-3 mr-1" />
                Profile
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowQR(!showQR)}
              className="text-xs"
            >
              <Eye className="h-3 w-3 mr-1" />
              {showQR ? "Hide" : "Show"} QR
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleEdit}
              className="text-xs"
            >
              <Edit className="h-3 w-3 mr-1" />
              Edit
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setShowDeleteDialog(true)}
              className="text-xs"
            >
              <Trash className="h-3 w-3 mr-1" />
              Delete
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <AddEmployeeDialog
        employee={employee}
        onEmployeeAdded={handleEditComplete}
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Employee</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {employee.name}? This action
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default EmployeeCard;

//==========================================>>>>>>>>>>>>>>>>>>>>>>====================================
