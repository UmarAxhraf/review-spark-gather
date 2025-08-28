import React, { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import TeamLayout from "@/components/TeamLayout";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useQuery } from "@tanstack/react-query";
import {
  Download,
  FileText,
  BarChart3,
  Users,
  MessageSquare,
  Calendar,
  Filter,
} from "lucide-react";
import { BackButton } from "@/components/ui/back-button";

interface Employee {
  id: string;
  name: string;
  email?: string;
  position?: string;
  qr_code_id: string;
  is_active: boolean;
  created_at: string;
}

interface Review {
  id: string;
  customer_name: string;
  customer_email?: string;
  rating: number;
  comment?: string;
  review_type: string;
  is_approved: boolean;
  created_at: string;
  employee: {
    name: string;
    position?: string;
  };
}

const ExportReports = () => {
  const { user } = useAuth();
  const [selectedPeriod, setSelectedPeriod] = useState("30");
  const [selectedFormat, setSelectedFormat] = useState("csv");
  const [isExporting, setIsExporting] = useState<string | null>(null);

  const { data: employees = [] } = useQuery({
    queryKey: ["employees"],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("employees")
        .select("*")
        .eq("company_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as Employee[];
    },
    enabled: !!user,
  });

  const { data: reviews = [] } = useQuery({
    queryKey: ["reviews-export"],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("reviews")
        .select(
          `
          *,
          employee:employees(name, position)
        `
        )
        .eq("company_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as Review[];
    },
    enabled: !!user,
  });

  const getFilteredData = () => {
    const daysAgo = parseInt(selectedPeriod);
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysAgo);

    return {
      employees: employees.filter(
        (emp) => new Date(emp.created_at) >= cutoffDate
      ),
      reviews: reviews.filter((rev) => new Date(rev.created_at) >= cutoffDate),
    };
  };

  const exportToCSV = (data: any[], filename: string, headers: string[]) => {
    const csvContent = [
      headers.join(","),
      ...data.map((row) =>
        headers
          .map((header) => {
            const value = header.includes(".")
              ? header.split(".").reduce((obj, key) => obj?.[key], row)
              : row[header];
            return `"${String(value || "").replace(/"/g, '""')}"`;
          })
          .join(",")
      ),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${filename}.csv`;
    link.click();
    window.URL.revokeObjectURL(url);
  };

  const exportToJSON = (data: any, filename: string) => {
    const jsonContent = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonContent], { type: "application/json" });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${filename}.json`;
    link.click();
    window.URL.revokeObjectURL(url);
  };

  const handleExport = async (type: string) => {
    setIsExporting(type);
    const filteredData = getFilteredData();
    const periodLabel =
      selectedPeriod === "7"
        ? "7-days"
        : selectedPeriod === "30"
        ? "30-days"
        : selectedPeriod === "90"
        ? "90-days"
        : "all-time";

    try {
      switch (type) {
        case "employees":
          const employeeHeaders = [
            "name",
            "email",
            "position",
            "qr_code_id",
            "is_active",
            "created_at",
          ];
          if (selectedFormat === "csv") {
            exportToCSV(
              filteredData.employees,
              `employees-${periodLabel}`,
              employeeHeaders
            );
          } else {
            exportToJSON(filteredData.employees, `employees-${periodLabel}`);
          }
          break;

        case "reviews":
          const reviewHeaders = [
            "customer_name",
            "customer_email",
            "rating",
            "comment",
            "review_type",
            "is_approved",
            "employee.name",
            "employee.position",
            "created_at",
          ];
          if (selectedFormat === "csv") {
            exportToCSV(
              filteredData.reviews,
              `reviews-${periodLabel}`,
              reviewHeaders
            );
          } else {
            exportToJSON(filteredData.reviews, `reviews-${periodLabel}`);
          }
          break;

        case "analytics":
          const analyticsData = {
            summary: {
              total_employees: filteredData.employees.length,
              active_employees: filteredData.employees.filter(
                (emp) => emp.is_active
              ).length,
              total_reviews: filteredData.reviews.length,
              approved_reviews: filteredData.reviews.filter(
                (rev) => rev.is_approved
              ).length,
              average_rating:
                filteredData.reviews.length > 0
                  ? (
                      filteredData.reviews.reduce(
                        (sum, rev) => sum + rev.rating,
                        0
                      ) / filteredData.reviews.length
                    ).toFixed(2)
                  : "0",
              period: `${selectedPeriod} days`,
            },
            employees: filteredData.employees,
            reviews: filteredData.reviews,
          };

          if (selectedFormat === "csv") {
            // Export summary as CSV
            const summaryHeaders = ["metric", "value"];
            const summaryData = Object.entries(analyticsData.summary).map(
              ([key, value]) => ({
                metric: key.replace(/_/g, " ").toUpperCase(),
                value: value,
              })
            );
            exportToCSV(
              summaryData,
              `analytics-summary-${periodLabel}`,
              summaryHeaders
            );
          } else {
            exportToJSON(analyticsData, `analytics-report-${periodLabel}`);
          }
          break;

        case "comprehensive":
          const comprehensiveData = {
            generated_at: new Date().toISOString(),
            period: `${selectedPeriod} days`,
            summary: {
              total_employees: filteredData.employees.length,
              active_employees: filteredData.employees.filter(
                (emp) => emp.is_active
              ).length,
              total_reviews: filteredData.reviews.length,
              approved_reviews: filteredData.reviews.filter(
                (rev) => rev.is_approved
              ).length,
              average_rating:
                filteredData.reviews.length > 0
                  ? (
                      filteredData.reviews.reduce(
                        (sum, rev) => sum + rev.rating,
                        0
                      ) / filteredData.reviews.length
                    ).toFixed(2)
                  : "0",
            },
            employees: filteredData.employees,
            reviews: filteredData.reviews,
            performance_metrics: {
              reviews_by_rating: [1, 2, 3, 4, 5].map((rating) => ({
                rating,
                count: filteredData.reviews.filter(
                  (rev) => rev.rating === rating
                ).length,
              })),
              top_performers: filteredData.employees
                .map((emp) => ({
                  ...emp,
                  review_count: filteredData.reviews.filter(
                    (rev) => rev.employee?.name === emp.name
                  ).length,
                  average_rating: (() => {
                    const empReviews = filteredData.reviews.filter(
                      (rev) => rev.employee?.name === emp.name
                    );
                    return empReviews.length > 0
                      ? (
                          empReviews.reduce((sum, rev) => sum + rev.rating, 0) /
                          empReviews.length
                        ).toFixed(2)
                      : "0";
                  })(),
                }))
                .sort((a, b) => b.review_count - a.review_count)
                .slice(0, 5),
            },
          };

          exportToJSON(
            comprehensiveData,
            `comprehensive-report-${periodLabel}`
          );
          break;
      }

      toast.success(
        `${type.charAt(0).toUpperCase() + type.slice(1)} exported successfully`
      );
    } catch (error) {
      console.error("Export error:", error);
      toast.error("Failed to export data");
    } finally {
      setIsExporting(null);
    }
  };

  const filteredData = getFilteredData();

  return (
    <TeamLayout>
      <div className="space-y-6">
        <div className="mb-6">
          <BackButton />
        </div>
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Export & Reporting
            </h1>
            <p className="text-gray-600">
              Export data and generate comprehensive reports
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <FileText className="h-6 w-6 text-gray-500" />
          </div>
        </div>

        {/* Filter Controls */}
        <Card>
          <CardHeader>
            <div className="flex items-center space-x-2">
              <Filter className="h-5 w-5 text-blue-600" />
              <CardTitle>Export Settings</CardTitle>
            </div>
            <CardDescription>
              Configure your export preferences and time period
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="period">Time Period</Label>
                <Select
                  value={selectedPeriod}
                  onValueChange={setSelectedPeriod}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select time period" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7">Last 7 days</SelectItem>
                    <SelectItem value="30">Last 30 days</SelectItem>
                    <SelectItem value="90">Last 90 days</SelectItem>
                    <SelectItem value="365">Last year</SelectItem>
                    <SelectItem value="9999">All time</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="format">Export Format</Label>
                <Select
                  value={selectedFormat}
                  onValueChange={setSelectedFormat}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select format" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="csv">CSV</SelectItem>
                    <SelectItem value="json">JSON</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Data Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Team Members
              </CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {filteredData.employees.length}
              </div>
              <p className="text-xs text-muted-foreground">
                {filteredData.employees.filter((emp) => emp.is_active).length}{" "}
                active
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Reviews</CardTitle>
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {filteredData.reviews.length}
              </div>
              <p className="text-xs text-muted-foreground">
                {filteredData.reviews.filter((rev) => rev.is_approved).length}{" "}
                approved
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Rating</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {filteredData.reviews.length > 0
                  ? (
                      filteredData.reviews.reduce(
                        (sum, rev) => sum + rev.rating,
                        0
                      ) / filteredData.reviews.length
                    ).toFixed(1)
                  : "0.0"}
              </div>
              <p className="text-xs text-muted-foreground">Out of 5.0</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Period</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {selectedPeriod === "9999" ? "All" : selectedPeriod}
              </div>
              <p className="text-xs text-muted-foreground">
                {selectedPeriod === "9999" ? "time" : "days"}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Export Options */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Individual Exports */}
          <Card>
            <CardHeader>
              <CardTitle>Individual Exports</CardTitle>
              <CardDescription>
                Export specific data types separately
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => handleExport("employees")}
                disabled={isExporting === "employees"}
              >
                <Users className="h-4 w-4 mr-2" />
                {isExporting === "employees"
                  ? "Exporting..."
                  : `Export Team Members (${filteredData.employees.length})`}
              </Button>

              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => handleExport("reviews")}
                disabled={isExporting === "reviews"}
              >
                <MessageSquare className="h-4 w-4 mr-2" />
                {isExporting === "reviews"
                  ? "Exporting..."
                  : `Export Reviews (${filteredData.reviews.length})`}
              </Button>

              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => handleExport("analytics")}
                disabled={isExporting === "analytics"}
              >
                <BarChart3 className="h-4 w-4 mr-2" />
                {isExporting === "analytics"
                  ? "Exporting..."
                  : "Export Analytics Summary"}
              </Button>
            </CardContent>
          </Card>

          {/* Comprehensive Reports */}
          <Card>
            <CardHeader>
              <CardTitle>Comprehensive Reports</CardTitle>
              <CardDescription>
                Generate complete reports with all data and analytics
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button
                className="w-full justify-start"
                onClick={() => handleExport("comprehensive")}
                disabled={isExporting === "comprehensive"}
              >
                <Download className="h-4 w-4 mr-2" />
                {isExporting === "comprehensive"
                  ? "Generating..."
                  : "Generate Comprehensive Report"}
              </Button>

              <div className="text-sm text-gray-600 space-y-2">
                <p>
                  <strong>Includes:</strong>
                </p>
                <ul className="list-disc list-inside space-y-1 text-xs">
                  <li>Complete team member data</li>
                  <li>All reviews and ratings</li>
                  <li>Performance analytics</li>
                  <li>Rating distribution</li>
                  <li>Top performer rankings</li>
                  <li>Summary statistics</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Stats */}
        <Card>
          <CardHeader>
            <CardTitle>Data Summary</CardTitle>
            <CardDescription>
              Quick overview of your filtered data
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
              <div>
                <div className="font-medium text-gray-900">
                  Team Performance
                </div>
                <div className="text-gray-600">
                  {filteredData.employees.filter((emp) => emp.is_active).length}{" "}
                  / {filteredData.employees.length} active members
                </div>
              </div>
              <div>
                <div className="font-medium text-gray-900">Review Approval</div>
                <div className="text-gray-600">
                  {filteredData.reviews.filter((rev) => rev.is_approved).length}{" "}
                  / {filteredData.reviews.length} approved
                </div>
              </div>
              <div>
                <div className="font-medium text-gray-900">
                  Rating Distribution
                </div>
                <div className="text-gray-600">
                  {[4, 5]
                    .map(
                      (rating) =>
                        filteredData.reviews.filter(
                          (rev) => rev.rating === rating
                        ).length
                    )
                    .reduce((a, b) => a + b, 0)}{" "}
                  high ratings (4-5★)
                </div>
              </div>
              <div>
                <div className="font-medium text-gray-900">Export Format</div>
                <div className="text-gray-600">
                  {selectedFormat.toUpperCase()} •{" "}
                  {selectedPeriod === "9999"
                    ? "All time"
                    : `${selectedPeriod} days`}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </TeamLayout>
  );
};

export default ExportReports;
