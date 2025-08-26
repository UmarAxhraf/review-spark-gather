import React, { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import TeamLayout from "@/components/TeamLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  BarChart3,
  TrendingUp,
  Users,
  Star,
  QrCode,
  Download,
  Calendar,
} from "lucide-react";
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
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  Area,
  AreaChart,
} from "recharts";

interface AnalyticsData {
  totalReviews: number;
  avgRating: number;
  totalEmployees: number;
  activeQRCodes: number;
  reviewsThisMonth: number;
  ratingTrend: number;
  reviewsByMonth: Array<{ month: string; reviews: number; rating: number }>;
  reviewsByEmployee: Array<{
    name: string;
    reviews: number;
    avgRating: number;
  }>;
  reviewsByRating: Array<{ rating: number; count: number }>;
  qrCodeScans: Array<{ date: string; scans: number }>;
}

const Analytics = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState("30");
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData>({
    totalReviews: 0,
    avgRating: 0,
    totalEmployees: 0,
    activeQRCodes: 0,
    reviewsThisMonth: 0,
    ratingTrend: 0,
    reviewsByMonth: [],
    reviewsByEmployee: [],
    reviewsByRating: [],
    qrCodeScans: [],
  });

  useEffect(() => {
    if (user) {
      fetchAnalyticsData();
    }
  }, [user, dateRange]);

  const fetchAnalyticsData = async () => {
    if (!user) return;

    try {
      setLoading(true);

      // Fetch total stats
      const { data: reviews, error: reviewsError } = await supabase
        .from("reviews")
        .select("*")
        .eq("company_id", user.id);

      const { data: employees, error: employeesError } = await supabase
        .from("employees")
        .select("*")
        .eq("company_id", user.id);

      // Fetch QR code scans - NEW CODE
      const daysAgo = parseInt(dateRange);
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - daysAgo);

      const { data: qrScans, error: qrScansError } = await supabase
        .from("qr_code_scans")
        .select("*")
        .eq("company_id", user.id)
        .gte("created_at", startDate.toISOString());

      if (reviewsError) throw reviewsError;
      if (employeesError) throw employeesError;
      if (qrScansError) throw qrScansError;

      const totalReviews = reviews?.length || 0;
      const avgRating =
        totalReviews > 0
          ? reviews.reduce((sum, review) => sum + review.rating, 0) /
            totalReviews
          : 0;
      const totalEmployees = employees?.length || 0;
      const activeQRCodes =
        employees?.filter((emp) => emp.is_active).length || 0;

      // Calculate reviews this month
      const now = new Date();
      const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const reviewsThisMonth =
        reviews?.filter((review) => new Date(review.created_at) >= thisMonth)
          .length || 0;

      // Generate monthly data (last 12 months)
      const reviewsByMonth = [];
      for (let i = 11; i >= 0; i--) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
        const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0);

        const monthReviews =
          reviews?.filter((review) => {
            const reviewDate = new Date(review.created_at);
            return reviewDate >= monthStart && reviewDate <= monthEnd;
          }) || [];

        const monthRating =
          monthReviews.length > 0
            ? monthReviews.reduce((sum, review) => sum + review.rating, 0) /
              monthReviews.length
            : 0;

        reviewsByMonth.push({
          month: date.toLocaleDateString("en-US", {
            month: "short",
            year: "2-digit",
          }),
          reviews: monthReviews.length,
          rating: Number(monthRating.toFixed(1)),
        });
      }

      // Reviews by employee
      const reviewsByEmployee =
        employees
          ?.map((employee) => {
            const empReviews =
              reviews?.filter((review) => review.employee_id === employee.id) ||
              [];
            const empRating =
              empReviews.length > 0
                ? empReviews.reduce((sum, review) => sum + review.rating, 0) /
                  empReviews.length
                : 0;

            return {
              name: employee.name,
              reviews: empReviews.length,
              avgRating: Number(empRating.toFixed(1)),
            };
          })
          .sort((a, b) => b.reviews - a.reviews)
          .slice(0, 10) || [];

      // Reviews by rating distribution
      const reviewsByRating = [1, 2, 3, 4, 5].map((rating) => ({
        rating,
        count:
          reviews?.filter((review) => review.rating === rating).length || 0,
      }));

      // Process QR code scans data - REPLACE mock data
      const qrCodeScans = [];
      const scansByDate = {};

      // Initialize all dates in the range with 0 scans
      for (let i = daysAgo - 1; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        });
        scansByDate[dateStr] = 0;
      }

      // Count scans by date
      if (qrScans && qrScans.length > 0) {
        qrScans.forEach((scan) => {
          const scanDate = new Date(scan.created_at);
          const dateStr = scanDate.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
          });
          scansByDate[dateStr] = (scansByDate[dateStr] || 0) + 1;
        });
      }

      // Convert to array format for chart
      for (const [date, scans] of Object.entries(scansByDate)) {
        qrCodeScans.push({ date, scans });
      }

      // Sort by date
      qrCodeScans.sort((a, b) => {
        const dateA = new Date(a.date);
        const dateB = new Date(b.date);
        return dateA.getTime() - dateB.getTime();
      });

      // Calculate rating trend (compare current month with previous month)
      const currentMonthRating =
        reviewsByMonth[reviewsByMonth.length - 1].rating;
      const prevMonthRating = reviewsByMonth[reviewsByMonth.length - 2].rating;
      const ratingTrend =
        prevMonthRating > 0
          ? Number(
              (
                (currentMonthRating - prevMonthRating) /
                prevMonthRating
              ).toFixed(2)
            )
          : 0;

      setAnalyticsData({
        totalReviews,
        avgRating: Number(avgRating.toFixed(1)),
        totalEmployees,
        activeQRCodes,
        reviewsThisMonth,
        ratingTrend,
        reviewsByMonth,
        reviewsByEmployee,
        reviewsByRating,
        qrCodeScans,
      });
    } catch (error: any) {
      console.error("Error fetching analytics:", error);
      toast.error("Failed to load analytics data");
    } finally {
      setLoading(false);
    }
  };

  const chartConfig = {
    reviews: {
      label: "Reviews",
      color: "hsl(var(--chart-1))",
    },
    rating: {
      label: "Rating",
      color: "hsl(var(--chart-2))",
    },
    scans: {
      label: "Scans",
      color: "hsl(var(--chart-3))",
    },
  };

  const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884d8"];

  if (loading) {
    return (
      <TeamLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </TeamLayout>
    );
  }

  return (
    <TeamLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Analytics Dashboard
            </h1>
            <p className="text-gray-600">
              Comprehensive insights into your review performance
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Select period" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">Last 7 days</SelectItem>
                <SelectItem value="30">Last 30 days</SelectItem>
                <SelectItem value="90">Last 3 months</SelectItem>
                <SelectItem value="365">Last year</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Export Report
            </Button>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Reviews
              </CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {analyticsData.totalReviews}
              </div>
              <p className="text-xs text-muted-foreground">
                +{analyticsData.reviewsThisMonth} this month
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Average Rating
              </CardTitle>
              <Star className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {analyticsData.avgRating}
              </div>
              <p className="text-xs text-muted-foreground">
                {analyticsData.ratingTrend > 0 ? "+" : ""}
                {analyticsData.ratingTrend} from last month
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Team Members
              </CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {analyticsData.totalEmployees}
              </div>
              <p className="text-xs text-muted-foreground">
                {analyticsData.activeQRCodes} with active QR codes
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                QR Code Scans
              </CardTitle>
              <QrCode className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {analyticsData.qrCodeScans.reduce(
                  (sum, day) => sum + day.scans,
                  0
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Last {dateRange} days
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="reviews">Reviews</TabsTrigger>
            <TabsTrigger value="team">Team Performance</TabsTrigger>
            <TabsTrigger value="qrcodes">QR Codes</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Review Trends</CardTitle>
                </CardHeader>
                <CardContent>
                  <ChartContainer config={chartConfig}>
                    <ResponsiveContainer width="100%" height={300}>
                      <AreaChart data={analyticsData.reviewsByMonth}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" />
                        <YAxis />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Area
                          type="monotone"
                          dataKey="reviews"
                          stroke="var(--color-reviews)"
                          fill="var(--color-reviews)"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Rating Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  <ChartContainer config={chartConfig}>
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={analyticsData.reviewsByRating}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ rating, count }) => `${rating}★ (${count})`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="count"
                        >
                          {analyticsData.reviewsByRating.map((entry, index) => (
                            <Cell
                              key={`cell-${index}`}
                              fill={COLORS[index % COLORS.length]}
                            />
                          ))}
                        </Pie>
                        <ChartTooltip content={<ChartTooltipContent />} />
                      </PieChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="reviews">
            <Card>
              <CardHeader>
                <CardTitle>Monthly Review & Rating Trends</CardTitle>
              </CardHeader>
              <CardContent>
                <ChartContainer config={chartConfig}>
                  <ResponsiveContainer width="100%" height={400}>
                    <LineChart data={analyticsData.reviewsByMonth}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis yAxisId="left" />
                      <YAxis yAxisId="right" orientation="right" />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Bar
                        yAxisId="left"
                        dataKey="reviews"
                        fill="var(--color-reviews)"
                      />
                      <Line
                        yAxisId="right"
                        type="monotone"
                        dataKey="rating"
                        stroke="var(--color-rating)"
                        strokeWidth={2}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="team">
            <Card>
              <CardHeader>
                <CardTitle>Team Performance</CardTitle>
              </CardHeader>
              <CardContent>
                <ChartContainer config={chartConfig}>
                  <ResponsiveContainer width="100%" height={400}>
                    <BarChart data={analyticsData.reviewsByEmployee}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Bar dataKey="reviews" fill="var(--color-reviews)" />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="qrcodes">
            <Card>
              <CardHeader>
                <CardTitle>QR Code Scan Activity</CardTitle>
              </CardHeader>
              <CardContent>
                <ChartContainer config={chartConfig}>
                  <ResponsiveContainer width="100%" height={400}>
                    <AreaChart data={analyticsData.qrCodeScans}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Area
                        type="monotone"
                        dataKey="scans"
                        stroke="var(--color-scans)"
                        fill="var(--color-scans)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </TeamLayout>
  );
};

export default Analytics;

//===================================================>>>>>>>>>>>>>>>>>>>>>==========================================
