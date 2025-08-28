import React, { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import TeamLayout from "@/components/TeamLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { QrCode, Scan, Calendar, TrendingUp, ChartColumn } from "lucide-react";
import {
  StatsCardSkeleton,
  CardSkeleton,
} from "@/components/ui/skeleton-loaders";
import { BackButton } from "@/components/ui/back-button";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts";

interface ScanData {
  date: string;
  count: number;
}

interface EmployeeScanData {
  employee_id: string;
  employee_name: string;
  scan_count: number;
}

// Add chart configuration before the component
const chartConfig = {
  count: {
    label: "Scans",
    color: "hsl(var(--chart-1))",
  },
};

const QRCodeAnalytics = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState("30");
  const [totalScans, setTotalScans] = useState(0);
  const [scansByDay, setScansByDay] = useState<ScanData[]>([]);
  const [topEmployees, setTopEmployees] = useState<EmployeeScanData[]>([]);
  const [conversionRate, setConversionRate] = useState(0);

  useEffect(() => {
    if (user) {
      fetchAnalytics();
    }
  }, [user, timeRange]);

  const fetchAnalytics = async () => {
    if (!user) return;
    setLoading(true);

    try {
      // Get total scans
      const { count: totalCount, error: countError } = await supabase
        .from("qr_code_scans")
        .select("id", { count: "exact" })
        .eq("company_id", user.id)
        .gte("created_at", getDateFromRange(timeRange));

      if (countError) throw countError;
      setTotalScans(totalCount || 0);

      // Get scans by day
      const { data: dailyData, error: dailyError } = await supabase.rpc(
        "get_daily_qr_scans",
        {
          company_id_param: user.id,
          days_param: parseInt(timeRange),
        }
      );

      if (dailyError) throw dailyError;
      setScansByDay(dailyData || []);

      // Get top employees by scan count
      const { data: employeeData, error: employeeError } = await supabase.rpc(
        "get_top_employees_by_scans",
        {
          company_id_param: user.id,
          days_param: parseInt(timeRange),
          limit_param: 5,
        }
      );

      if (employeeError) throw employeeError;
      setTopEmployees(employeeData || []);

      // Get conversion rate (scans to reviews)
      const { data: conversionData, error: conversionError } =
        await supabase.rpc("get_qr_conversion_rate", {
          company_id_param: user.id,
          days_param: parseInt(timeRange),
        });

      if (conversionError) throw conversionError;
      setConversionRate(conversionData?.[0]?.conversion_rate || 0);
    } catch (error: any) {
      console.error("Error fetching QR analytics:", error);
      toast.error("Failed to load QR code analytics");
    } finally {
      setLoading(false);
    }
  };

  const getDateFromRange = (days: string) => {
    const date = new Date();
    date.setDate(date.getDate() - parseInt(days));
    return date.toISOString();
  };

  // if (loading) {
  //   return (
  //     <TeamLayout>
  //       <div className="flex items-center justify-center h-64">
  //         <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
  //       </div>
  //     </TeamLayout>
  //   );
  // }

  if (loading) {
    return (
      <TeamLayout>
        <div className="space-y-6">
          {/* Header Skeleton */}
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <div className="h-8 w-56 bg-gray-200 rounded animate-pulse"></div>
              <div className="h-4 w-72 bg-gray-200 rounded animate-pulse"></div>
            </div>
            <div className="h-10 w-44 bg-gray-200 rounded animate-pulse"></div>
          </div>

          {/* Stats Cards Skeleton */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatsCardSkeleton />
            <StatsCardSkeleton />
            <StatsCardSkeleton />
            <StatsCardSkeleton />
          </div>

          {/* Charts Skeleton */}
          <div className="space-y-6">
            <CardSkeleton />
            <CardSkeleton />
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
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              QR Code Analytics
            </h1>
            <p className="text-gray-600">
              Track and analyze QR code performance
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Select time range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">Last 7 days</SelectItem>
                <SelectItem value="30">Last 30 days</SelectItem>
                <SelectItem value="90">Last 90 days</SelectItem>
                <SelectItem value="365">Last year</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Scans</CardTitle>
              <Scan className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalScans}</div>
              <p className="text-xs text-muted-foreground">
                In the last {timeRange} days
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Conversion Rate
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {(conversionRate * 100).toFixed(1)}%
              </div>
              <p className="text-xs text-muted-foreground">
                Scans that led to reviews
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Avg. Daily Scans
              </CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {scansByDay.length > 0
                  ? (
                      scansByDay.reduce((sum, day) => sum + day.count, 0) /
                      scansByDay.length
                    ).toFixed(1)
                  : "0"}
              </div>
              <p className="text-xs text-muted-foreground">
                Average scans per day
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Top Performer
              </CardTitle>
              <QrCode className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold truncate">
                {topEmployees.length > 0
                  ? topEmployees[0].employee_name
                  : "N/A"}
              </div>
              <p className="text-xs text-muted-foreground">
                {topEmployees.length > 0
                  ? `${topEmployees[0].scan_count} scans`
                  : "No data"}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Top Employees */}
        <Card>
          <CardHeader>
            <CardTitle>Top Performing QR Codes</CardTitle>
          </CardHeader>
          <CardContent>
            {topEmployees.length > 0 ? (
              <div className="space-y-4">
                {topEmployees.map((employee, index) => (
                  <div
                    key={employee.employee_id}
                    className="flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100">
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-medium">{employee.employee_name}</p>
                      </div>
                    </div>
                    <div className="font-medium">
                      {employee.scan_count} scans
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                No scan data available for the selected time period
              </div>
            )}
          </CardContent>
        </Card>
        {/* Daily Scan Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ChartColumn className="h-5 w-5" />
              Daily Scan Activity
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              QR code scans per day over the last {timeRange} days
            </p>
          </CardHeader>
          <CardContent>
            <div className="h-[400px]">
              {scansByDay.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <BarChart className="h-12 w-12 text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    No scan data available
                  </h3>
                  <p className="text-gray-600 max-w-md">
                    Daily scan data will appear here once your QR codes start
                    being used. Share your QR codes with customers to begin
                    tracking scan activity.
                  </p>
                </div>
              ) : (
                <ChartContainer config={chartConfig}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={scansByDay.map((day) => ({
                        ...day,
                        formattedDate: new Date(day.date).toLocaleDateString(
                          undefined,
                          {
                            month: "short",
                            day: "numeric",
                          }
                        ),
                      }))}
                      margin={{
                        top: 20,
                        right: 30,
                        left: 20,
                        bottom: 60,
                      }}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        className="opacity-30"
                      />
                      <XAxis
                        dataKey="formattedDate"
                        tick={{ fontSize: 12 }}
                        angle={-45}
                        textAnchor="end"
                        height={60}
                        interval={0}
                      />
                      <YAxis
                        tick={{ fontSize: 12 }}
                        label={{
                          value: "Number of Scans",
                          angle: -90,
                          position: "insideLeft",
                        }}
                      />
                      <ChartTooltip
                        content={<ChartTooltipContent />}
                        labelFormatter={(value, payload) => {
                          if (payload && payload[0]) {
                            const date = new Date(payload[0].payload.date);
                            return date.toLocaleDateString(undefined, {
                              weekday: "long",
                              year: "numeric",
                              month: "long",
                              day: "numeric",
                            });
                          }
                          return value;
                        }}
                        formatter={(value, name) => [
                          `${value} ${value === 1 ? "scan" : "scans"}`,
                          "Total Scans",
                        ]}
                      />
                      <Bar
                        dataKey="count"
                        fill="var(--color-count)"
                        radius={[4, 4, 0, 0]}
                        className="hover:opacity-80 transition-opacity"
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartContainer>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </TeamLayout>
  );
};

export default QRCodeAnalytics;

//--------==================>>>>>>>>>>>>>>>>>>>===================-------------------------------------
