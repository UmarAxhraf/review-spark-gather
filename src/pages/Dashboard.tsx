// import { useState, useEffect, useCallback, useRef } from "react";
// import {
//   Card,
//   CardContent,
//   CardDescription,
//   CardHeader,
//   CardTitle,
// } from "@/components/ui/card";
// import { Button } from "@/components/ui/button";
// import { Badge } from "@/components/ui/badge";
// import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
// import { Switch } from "@/components/ui/switch";
// import {
//   Select,
//   SelectContent,
//   SelectItem,
//   SelectTrigger,
//   SelectValue,
// } from "@/components/ui/select";
// import {
//   Star,
//   Users,
//   TrendingUp,
//   QrCode,
//   Bell,
//   Settings,
//   Plus,
//   Eye,
//   BarChart3,
//   Download,
//   RefreshCw,
//   Calendar,
//   Target,
//   Award,
//   Activity,
//   Zap,
//   Filter,
//   Grid,
//   Layout,
//   ChevronUp,
//   ChevronDown,
//   User,
//   LogOut,
//   Menu,
//   Database,
//   FileText,
// } from "lucide-react";
// import { useNavigate } from "react-router-dom";
// import NotificationBell from "@/components/NotificationBell";
// import { useAuth } from "@/contexts/AuthContext";
// import { supabase } from "@/integrations/supabase/client";
// import { toast } from "sonner";
// import {
//   LineChart,
//   Line,
//   AreaChart,
//   Area,
//   BarChart,
//   Bar,
//   XAxis,
//   YAxis,
//   CartesianGrid,
//   Tooltip,
//   ResponsiveContainer,
//   PieChart,
//   Pie,
//   Cell,
// } from "recharts";
// import {
//   DropdownMenu,
//   DropdownMenuContent,
//   DropdownMenuItem,
//   DropdownMenuSeparator,
//   DropdownMenuTrigger,
// } from "@/components/ui/dropdown-menu";
// import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

// interface Review {
//   id: string;
//   customer_name: string;
//   customer_email?: string;
//   rating: number;
//   comment?: string;
//   review_type: string;
//   video_url?: string;
//   is_approved: boolean;
//   created_at: string;
//   employee: {
//     name: string;
//     position?: string;
//   };
// }

// interface Employee {
//   id: string;
//   name: string;
//   email?: string;
//   position?: string;
//   department_id?: string;
//   qr_code_id: string;
//   is_active: boolean;
//   created_at: string;
//   reviews_count?: number;
//   avg_rating?: number;
//   performance_score?: number;
//   photo_url?: string;
// }

// interface Department {
//   id: string;
//   name: string;
//   description?: string;
//   manager_id?: string;
//   employee_count?: number;
// }

// interface DashboardStats {
//   totalReviews: number;
//   avgRating: number;
//   teamMembers: number;
//   thisMonth: number;
//   qrCodeScans: number;
//   pendingReviews: number;
//   approvedReviews: number;
//   reviewGrowth: number;
//   customerSatisfaction: number;
//   responseRate: number;
//   avgResponseTime: number;
//   topRatedEmployee: string;
//   departmentCount: number;
// }

// interface DashboardWidget {
//   id: string;
//   type: "stats" | "chart" | "list" | "performance";
//   title: string;
//   position: { x: number; y: number };
//   size: { width: number; height: number };
//   config: any;
//   isVisible: boolean;
// }

// interface ChartData {
//   name: string;
//   value: number;
//   date?: string;
//   reviews?: number;
//   rating?: number;
// }

// const COLORS = [
//   "#3B82F6",
//   "#10B981",
//   "#F59E0B",
//   "#EF4444",
//   "#8B5CF6",
//   "#06B6D4",
// ];

// const Dashboard = () => {
//   const navigate = useNavigate();
//   const { user, signOut } = useAuth();
//   const [loading, setLoading] = useState(true);
//   const [realTimeEnabled, setRealTimeEnabled] = useState(true);
//   const [refreshing, setRefreshing] = useState(false);
//   const [timeRange, setTimeRange] = useState("30d");
//   const [selectedDepartment, setSelectedDepartment] = useState("all");

//   const subscriptionsRef = useRef<any[]>([]);

//   const [stats, setStats] = useState<DashboardStats>({
//     totalReviews: 0,
//     avgRating: 0,
//     teamMembers: 0,
//     thisMonth: 0,
//     qrCodeScans: 0,
//     pendingReviews: 0,
//     approvedReviews: 0,
//     reviewGrowth: 0,
//     customerSatisfaction: 0,
//     responseRate: 0,
//     avgResponseTime: 0,
//     topRatedEmployee: "",
//     departmentCount: 0,
//   });

//   const [recentReviews, setRecentReviews] = useState<Review[]>([]);
//   const [topPerformers, setTopPerformers] = useState<Employee[]>([]);
//   const [departments, setDepartments] = useState<Department[]>([]);
//   const [chartData, setChartData] = useState<{
//     reviewTrends: ChartData[];
//     ratingDistribution: ChartData[];
//     departmentPerformance: ChartData[];
//     dailyActivity: ChartData[];
//   }>({
//     reviewTrends: [],
//     ratingDistribution: [],
//     departmentPerformance: [],
//     dailyActivity: [],
//   });

//   const [widgets, setWidgets] = useState<DashboardWidget[]>([
//     {
//       id: "total-reviews",
//       type: "stats",
//       title: "Total Reviews",
//       position: { x: 0, y: 0 },
//       size: { width: 1, height: 1 },
//       config: { metric: "totalReviews", icon: "Star" },
//       isVisible: true,
//     },
//     {
//       id: "avg-rating",
//       type: "stats",
//       title: "Average Rating",
//       position: { x: 1, y: 0 },
//       size: { width: 1, height: 1 },
//       config: { metric: "avgRating", icon: "TrendingUp" },
//       isVisible: true,
//     },
//     {
//       id: "team-members",
//       type: "stats",
//       title: "Team Members",
//       position: { x: 2, y: 0 },
//       size: { width: 1, height: 1 },
//       config: { metric: "teamMembers", icon: "Users" },
//       isVisible: true,
//     },
//     {
//       id: "qr-scans",
//       type: "stats",
//       title: "QR Scans",
//       position: { x: 3, y: 0 },
//       size: { width: 1, height: 1 },
//       config: { metric: "qrCodeScans", icon: "QrCode" },
//       isVisible: true,
//     },
//     {
//       id: "review-trends",
//       type: "chart",
//       title: "Review Trends",
//       position: { x: 0, y: 1 },
//       size: { width: 2, height: 2 },
//       config: { chartType: "line", dataKey: "reviewTrends" },
//       isVisible: true,
//     },
//     {
//       id: "rating-distribution",
//       type: "chart",
//       title: "Rating Distribution",
//       position: { x: 2, y: 1 },
//       size: { width: 2, height: 2 },
//       config: { chartType: "pie", dataKey: "ratingDistribution" },
//       isVisible: true,
//     },
//   ]);

//   const handleLogout = async () => {
//     try {
//       await signOut();
//       toast.success("Logged out successfully");
//       navigate("/login");
//     } catch (error) {
//       toast.error("Failed to logout");
//     }
//   };

//   const getUserInitials = () => {
//     if (!user?.email) return "U";
//     return user.email.charAt(0).toUpperCase();
//   };

//   useEffect(() => {
//     if (user) {
//       fetchDashboardData();
//     }
//   }, [user, timeRange, selectedDepartment]);

//   useEffect(() => {
//     if (user && realTimeEnabled) {
//       setupRealTimeSubscriptions();
//     }

//     return () => {
//       // Cleanup all subscriptions
//       subscriptionsRef.current.forEach((subscription) => {
//         subscription.unsubscribe();
//       });
//       subscriptionsRef.current = [];
//     };
//   }, [user, realTimeEnabled]); // Remove timeRange and selectedDepartment

//   const setupRealTimeSubscriptions = useCallback(() => {
//     if (!realTimeEnabled || !user) return;

//     // Clear existing subscriptions first
//     subscriptionsRef.current.forEach((subscription) => {
//       subscription.unsubscribe();
//     });
//     subscriptionsRef.current = [];

//     // Subscribe to reviews changes with unique channel names
//     const reviewsSubscription = supabase
//       .channel(`reviews-changes-${user.id}-${Date.now()}`)
//       .on(
//         "postgres_changes",
//         {
//           event: "*",
//           schema: "public",
//           table: "reviews",
//           filter: `company_id=eq.${user.id}`,
//         },
//         (payload) => {
//           console.log("Real-time review update:", payload);
//           fetchDashboardData();

//           if (payload.eventType === "INSERT") {
//             toast.success("New review received!");
//           }
//         }
//       )
//       .subscribe();

//     // In the useEffect for real-time subscriptions (around line 300-340), add this subscription:

//     // Subscribe to QR code scans changes with unique channel names
//     const qrScansSubscription = supabase
//       .channel(`qr-scans-changes-${user.id}-${Date.now()}`)
//       .on(
//         "postgres_changes",
//         {
//           event: "*",
//           schema: "public",
//           table: "qr_code_scans",
//           filter: `company_id=eq.${user.id}`,
//         },
//         (payload) => {
//           console.log("Real-time QR scan update:", payload);
//           fetchDashboardData();

//           if (payload.eventType === "INSERT") {
//             toast.success("QR code scanned!");
//           }
//         }
//       )
//       .subscribe();

//     // Subscribe to employees changes with unique channel names
//     const employeesSubscription = supabase
//       .channel(`employees-changes-${user.id}-${Date.now()}`)
//       .on(
//         "postgres_changes",
//         {
//           event: "*",
//           schema: "public",
//           table: "employees",
//           filter: `company_id=eq.${user.id}`,
//         },
//         (payload) => {
//           console.log("Real-time employee update:", payload);
//           fetchDashboardData();
//         }
//       )
//       .subscribe();

//     // Store subscriptions for cleanup
//     subscriptionsRef.current = [
//       reviewsSubscription,
//       employeesSubscription,
//       qrScansSubscription,
//     ];
//   }, [realTimeEnabled, user]);

//   const fetchDashboardData = async () => {
//     if (!user) return;

//     try {
//       setRefreshing(true);

//       // Calculate date range
//       const now = new Date();
//       const daysBack = timeRange === "7d" ? 7 : timeRange === "30d" ? 30 : 90;
//       const startDate = new Date(
//         now.getTime() - daysBack * 24 * 60 * 60 * 1000
//       );

//       // Fetch reviews with employee data (fix relationship embedding)
//       let reviewsQuery = supabase
//         .from("reviews")
//         .select(
//           `
//           *,
//           employee:employees!reviews_employee_id_fkey(name, position, department_id, photo_url)
//         `
//         )
//         .eq("company_id", user.id)
//         .gte("created_at", startDate.toISOString())
//         .order("created_at", { ascending: false });

//       const { data: reviews, error: reviewsError } = await reviewsQuery;

//       // Fetch employees with department data (fix relationship embedding)
//       const { data: employees, error: employeesError } = await supabase
//         .from("employees")
//         .select(
//           `
//           *,
//           department:departments!employees_department_id_fkey(name)
//         `
//         )
//         .eq("company_id", user.id);

//       // Fetch departments
//       const { data: departments, error: departmentsError } = await supabase
//         .from("departments")
//         .select("*")
//         .eq("company_id", user.id);

//       // Fetch QR code scans
//       const { data: qrScans, error: qrScansError } = await supabase
//         .from("qr_code_scans")
//         .select("*")
//         .eq("company_id", user.id)
//         .gte("created_at", startDate.toISOString());

//       if (reviewsError) throw reviewsError;
//       if (employeesError) throw employeesError;
//       if (departmentsError) throw departmentsError;
//       if (qrScansError) throw qrScansError;

//       // ... existing stats calculations ...
//       // Calculate enhanced stats
//       const totalReviews = reviews?.length || 0;
//       const avgRating =
//         totalReviews > 0
//           ? reviews.reduce((sum, review) => sum + review.rating, 0) /
//             totalReviews
//           : 0;
//       const teamMembers = employees?.length || 0;
//       const departmentCount = departments?.length || 0;

//       // Calculate this month's reviews
//       const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
//       const reviewsThisMonth =
//         reviews?.filter((review) => new Date(review.created_at) >= thisMonth)
//           .length || 0;

//       // Calculate pending and approved reviews
//       const pendingReviews =
//         reviews?.filter((review) => !review.is_approved).length || 0;
//       const approvedReviews =
//         reviews?.filter((review) => review.is_approved).length || 0;

//       // Calculate growth metrics
//       const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
//       const twoMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 2, 1);

//       const lastMonthReviews =
//         reviews?.filter((review) => {
//           const date = new Date(review.created_at);
//           return date >= lastMonth && date < thisMonth;
//         }).length || 0;

//       const twoMonthsAgoReviews =
//         reviews?.filter((review) => {
//           const date = new Date(review.created_at);
//           return date >= twoMonthsAgo && date < lastMonth;
//         }).length || 0;

//       const reviewGrowth =
//         twoMonthsAgoReviews > 0
//           ? ((lastMonthReviews - twoMonthsAgoReviews) / twoMonthsAgoReviews) *
//             100
//           : 0;

//       // Calculate customer satisfaction (4-5 star reviews)
//       const highRatingReviews =
//         reviews?.filter((review) => review.rating >= 4).length || 0;
//       const customerSatisfaction =
//         totalReviews > 0 ? (highRatingReviews / totalReviews) * 100 : 0;

//       // Calculate response rate and average response time
//       const responseRate = 85; // Mock calculation - would need actual response tracking
//       const avgResponseTime = 2.5; // Mock - hours to respond

//       // Find top rated employee
//       const employeePerformance =
//         employees?.map((employee) => {
//           const employeeReviews =
//             reviews?.filter((review) => review.employee_id === employee.id) ||
//             [];
//           const reviewsCount = employeeReviews.length;
//           const totalRating = employeeReviews.reduce(
//             (sum, review) => sum + review.rating,
//             0
//           );
//           const avgRating = reviewsCount > 0 ? totalRating / reviewsCount : 0;

//           return {
//             ...employee,
//             reviews_count: reviewsCount,
//             avg_rating: Number(avgRating.toFixed(1)),
//           };
//         }) || [];

//       const topRatedEmployee =
//         employeePerformance
//           .filter((emp) => emp.reviews_count > 0)
//           .sort((a, b) => b.avg_rating! - a.avg_rating!)[0]?.name || "N/A";

//       // Set stats
//       setStats({
//         totalReviews,
//         avgRating: Number(avgRating.toFixed(1)),
//         teamMembers,
//         thisMonth: reviewsThisMonth,
//         qrCodeScans: qrScans?.length || 0,
//         pendingReviews,
//         approvedReviews,
//         reviewGrowth: Number(reviewGrowth.toFixed(0)),
//         customerSatisfaction: Number(customerSatisfaction.toFixed(0)),
//         responseRate,
//         avgResponseTime,
//         topRatedEmployee,
//         departmentCount,
//       });

//       // Set recent reviews (latest 5)
//       setRecentReviews(reviews?.slice(0, 5) || []);

//       // Set top performers (top 3)
//       const sortedPerformers = employeePerformance
//         .sort((a, b) => {
//           if (b.reviews_count !== a.reviews_count) {
//             return b.reviews_count! - a.reviews_count!;
//           }
//           return b.avg_rating! - a.avg_rating!;
//         })
//         .slice(0, 3);

//       setTopPerformers(sortedPerformers);
//       setDepartments(departments || []);

//       // Generate chart data
//       generateChartData(reviews || [], employees || [], departments || []);
//     } catch (error) {
//       console.error("Error fetching dashboard data:", error);
//       toast.error("Failed to load dashboard data");
//     } finally {
//       setLoading(false);
//       setRefreshing(false);
//     }
//   };

//   const generateChartData = (
//     reviews: Review[],
//     employees: Employee[],
//     departments: Department[]
//   ) => {
//     // Review trends over time
//     const reviewTrends = [];
//     const daysBack = timeRange === "7d" ? 7 : timeRange === "30d" ? 30 : 90;

//     for (let i = daysBack - 1; i >= 0; i--) {
//       const date = new Date();
//       date.setDate(date.getDate() - i);
//       const dayReviews = reviews.filter((review) => {
//         const reviewDate = new Date(review.created_at);
//         return reviewDate.toDateString() === date.toDateString();
//       });

//       reviewTrends.push({
//         name: date.toLocaleDateString("en-US", {
//           month: "short",
//           day: "numeric",
//         }),
//         value: dayReviews.length,
//         rating:
//           dayReviews.length > 0
//             ? dayReviews.reduce((sum, r) => sum + r.rating, 0) /
//               dayReviews.length
//             : 0,
//       });
//     }

//     // Rating distribution
//     const ratingDistribution = [1, 2, 3, 4, 5].map((rating) => ({
//       name: `${rating} Star${rating > 1 ? "s" : ""}`,
//       value: reviews.filter((review) => review.rating === rating).length,
//     }));

//     // Department performance
//     const departmentPerformance = departments.map((dept) => {
//       const deptEmployees = employees.filter(
//         (emp) => emp.department_id === dept.id
//       );
//       const deptReviews = reviews.filter((review) =>
//         deptEmployees.some((emp) => emp.id === review.employee_id)
//       );

//       return {
//         name: dept.name,
//         value: deptReviews.length,
//         rating:
//           deptReviews.length > 0
//             ? deptReviews.reduce((sum, r) => sum + r.rating, 0) /
//               deptReviews.length
//             : 0,
//       };
//     });

//     // Daily activity (last 7 days)
//     const dailyActivity = [];
//     for (let i = 6; i >= 0; i--) {
//       const date = new Date();
//       date.setDate(date.getDate() - i);
//       const dayReviews = reviews.filter((review) => {
//         const reviewDate = new Date(review.created_at);
//         return reviewDate.toDateString() === date.toDateString();
//       });

//       dailyActivity.push({
//         name: date.toLocaleDateString("en-US", { weekday: "short" }),
//         reviews: dayReviews.length,
//         value: dayReviews.length,
//       });
//     }

//     setChartData({
//       reviewTrends,
//       ratingDistribution,
//       departmentPerformance,
//       dailyActivity,
//     });
//   };

//   const handleRefresh = () => {
//     fetchDashboardData();
//   };

//   const formatDate = (dateString: string) => {
//     const date = new Date(dateString);
//     return date.toLocaleDateString("en-US", {
//       year: "numeric",
//       month: "short",
//       day: "numeric",
//     });
//   };

//   const getStatIcon = (iconName: string) => {
//     const icons = {
//       Star: Star,
//       TrendingUp: TrendingUp,
//       Users: Users,
//       QrCode: QrCode,
//       Target: Target,
//       Award: Award,
//       Activity: Activity,
//       Zap: Zap,
//     };
//     const IconComponent = icons[iconName as keyof typeof icons] || Star;
//     return <IconComponent className="h-4 w-4 text-muted-foreground" />;
//   };

//   const renderWidget = (widget: DashboardWidget) => {
//     if (!widget.isVisible) return null;

//     const gridCols =
//       widget.size.width === 1
//         ? "col-span-1"
//         : widget.size.width === 2
//         ? "col-span-2"
//         : "col-span-3";
//     const gridRows =
//       widget.size.height === 1
//         ? "row-span-1"
//         : widget.size.height === 2
//         ? "row-span-2"
//         : "row-span-3";

//     if (widget.type === "stats") {
//       const statValue = stats[widget.config.metric as keyof DashboardStats];
//       const isGrowth = widget.config.metric === "reviewGrowth";
//       const isPercentage = ["customerSatisfaction", "responseRate"].includes(
//         widget.config.metric
//       );

//       return (
//         <Card key={widget.id} className={`${gridCols} ${gridRows}`}>
//           <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
//             <CardTitle className="text-sm font-medium">
//               {widget.title}
//             </CardTitle>
//             {getStatIcon(widget.config.icon)}
//           </CardHeader>
//           <CardContent>
//             <div className="text-2xl font-bold">
//               {isGrowth && statValue > 0 ? "+" : ""}
//               {typeof statValue === "number"
//                 ? statValue.toFixed(
//                     widget.config.metric === "avgRating" ? 1 : 0
//                   )
//                 : statValue}
//               {isPercentage ? "%" : ""}
//             </div>
//             <p className="text-xs text-muted-foreground">
//               {widget.config.metric === "totalReviews" &&
//                 `+${stats.thisMonth} this month`}
//               {widget.config.metric === "avgRating" &&
//                 (stats.avgRating > 4.5
//                   ? "Excellent"
//                   : stats.avgRating > 4
//                   ? "Very Good"
//                   : "Good")}
//               {widget.config.metric === "teamMembers" && "Active reviewers"}
//               {widget.config.metric === "qrCodeScans" && `Last ${timeRange}`}
//             </p>
//           </CardContent>
//         </Card>
//       );
//     }

//     if (widget.type === "chart") {
//       const data = chartData[widget.config.dataKey as keyof typeof chartData];

//       return (
//         <Card key={widget.id} className={`${gridCols} ${gridRows}`}>
//           <CardHeader>
//             <CardTitle className="text-lg">{widget.title}</CardTitle>
//           </CardHeader>
//           <CardContent>
//             <div className="h-[200px]">
//               <ResponsiveContainer width="100%" height="100%">
//                 {widget.config.chartType === "line" && (
//                   <LineChart data={data}>
//                     <CartesianGrid strokeDasharray="3 3" />
//                     <XAxis dataKey="name" />
//                     <YAxis />
//                     <Tooltip />
//                     <Line
//                       type="monotone"
//                       dataKey="value"
//                       stroke="#3B82F6"
//                       strokeWidth={2}
//                     />
//                   </LineChart>
//                 )}
//                 {widget.config.chartType === "area" && (
//                   <AreaChart data={data}>
//                     <CartesianGrid strokeDasharray="3 3" />
//                     <XAxis dataKey="name" />
//                     <YAxis />
//                     <Tooltip />
//                     <Area
//                       type="monotone"
//                       dataKey="value"
//                       stroke="#3B82F6"
//                       fill="#3B82F6"
//                       fillOpacity={0.3}
//                     />
//                   </AreaChart>
//                 )}
//                 {widget.config.chartType === "bar" && (
//                   <BarChart data={data}>
//                     <CartesianGrid strokeDasharray="3 3" />
//                     <XAxis dataKey="name" />
//                     <YAxis />
//                     <Tooltip />
//                     <Bar dataKey="value" fill="#3B82F6" />
//                   </BarChart>
//                 )}
//                 {widget.config.chartType === "pie" && (
//                   <PieChart>
//                     <Pie
//                       data={data}
//                       cx="50%"
//                       cy="50%"
//                       outerRadius={80}
//                       fill="#8884d8"
//                       dataKey="value"
//                       label={({ name, value }) => `${name}: ${value}`}
//                     >
//                       {data.map((entry, index) => (
//                         <Cell
//                           key={`cell-${index}`}
//                           fill={COLORS[index % COLORS.length]}
//                         />
//                       ))}
//                     </Pie>
//                     <Tooltip />
//                   </PieChart>
//                 )}
//               </ResponsiveContainer>
//             </div>
//           </CardContent>
//         </Card>
//       );
//     }

//     return null;
//   };

//   if (loading) {
//     return (
//       <div className="min-h-screen bg-gray-50 flex items-center justify-center">
//         <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
//       </div>
//     );
//   }

//   return (
//     <div className="min-h-screen bg-gray-50">
//       {/* Enhanced Header */}
//       <header className="bg-white border-b border-gray-200">
//         <div className="px-6 py-4">
//           <div className="flex items-center justify-between">
//             <div className="flex items-center space-x-4">
//               <div className="h-8 w-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
//                 <Star className="h-5 w-5 text-white" />
//               </div>
//               <div>
//                 <h1 className="text-2xl font-bold text-gray-900">
//                   Enhanced Dashboard
//                 </h1>
//                 <p className="text-gray-600">
//                   Welcome back, {user?.user_metadata?.company_name || "User"}!
//                 </p>
//               </div>
//             </div>

//             <div className="flex items-center space-x-4">
//               {/* Time Range Selector */}
//               <Select value={timeRange} onValueChange={setTimeRange}>
//                 <SelectTrigger className="w-32">
//                   <SelectValue />
//                 </SelectTrigger>
//                 <SelectContent>
//                   <SelectItem value="7d">Last 7 days</SelectItem>
//                   <SelectItem value="30d">Last 30 days</SelectItem>
//                   <SelectItem value="90d">Last 90 days</SelectItem>
//                 </SelectContent>
//               </Select>

//               {/* Department Filter */}
//               <Select
//                 value={selectedDepartment}
//                 onValueChange={setSelectedDepartment}
//               >
//                 <SelectTrigger className="w-40">
//                   <SelectValue placeholder="All Departments" />
//                 </SelectTrigger>
//                 <SelectContent>
//                   <SelectItem value="all">All Departments</SelectItem>
//                   {departments.map((dept) => (
//                     <SelectItem key={dept.id} value={dept.id}>
//                       {dept.name}
//                     </SelectItem>
//                   ))}
//                 </SelectContent>
//               </Select>

//               {/* Real-time Toggle */}
//               <div className="flex items-center space-x-2">
//                 <Switch
//                   checked={realTimeEnabled}
//                   onCheckedChange={setRealTimeEnabled}
//                 />
//                 <span className="text-sm text-gray-600">Real-time</span>
//               </div>

//               {/* Refresh Button */}
//               <Button
//                 variant="outline"
//                 size="sm"
//                 onClick={handleRefresh}
//                 disabled={refreshing}
//               >
//                 <RefreshCw
//                   className={`h-4 w-4 mr-2 ${refreshing ? "animate-spin" : ""}`}
//                 />
//                 Refresh
//               </Button>

//               {/* Additional Navigation Dropdown */}
//               <DropdownMenu>
//                 <DropdownMenuTrigger asChild>
//                   <Button variant="outline" size="sm">
//                     <Menu className="h-4 w-4 mr-2" />
//                     More
//                   </Button>
//                 </DropdownMenuTrigger>
//                 <DropdownMenuContent className="w-56" align="end">
//                   <DropdownMenuItem onClick={() => navigate("/employees")}>
//                     <Users className="mr-2 h-4 w-4" />
//                     <span>Employees</span>
//                   </DropdownMenuItem>
//                   <DropdownMenuItem onClick={() => navigate("/qr-codes")}>
//                     <QrCode className="mr-2 h-4 w-4" />
//                     <span>QR Codes</span>
//                   </DropdownMenuItem>
//                   <DropdownMenuItem onClick={() => navigate("/reviews")}>
//                     <Eye className="mr-2 h-4 w-4" />
//                     <span>Reviews</span>
//                   </DropdownMenuItem>
//                   <DropdownMenuItem onClick={() => navigate("/notifications")}>
//                     <Bell className="mr-2 h-4 w-4" />
//                     <span>Notifications</span>
//                   </DropdownMenuItem>
//                   <DropdownMenuSeparator />
//                   <DropdownMenuItem onClick={() => navigate("/export-reports")}>
//                     <Download className="mr-2 h-4 w-4" />
//                     <span>Export Reports</span>
//                   </DropdownMenuItem>
//                   <DropdownMenuItem onClick={() => navigate("/qr-analytics")}>
//                     <BarChart3 className="mr-2 h-4 w-4" />
//                     <span>QR Analytics</span>
//                   </DropdownMenuItem>
//                   <DropdownMenuItem
//                     onClick={() => navigate("/data-management")}
//                   >
//                     <Database className="mr-2 h-4 w-4" />
//                     <span>Data Management</span>
//                   </DropdownMenuItem>
//                 </DropdownMenuContent>
//               </DropdownMenu>

//               <Button
//                 variant="outline"
//                 size="sm"
//                 onClick={() => navigate("/analytics")}
//               >
//                 <BarChart3 className="h-4 w-4 mr-2" />
//                 Analytics
//               </Button>

//               <NotificationBell />

//               <Button
//                 variant="outline"
//                 size="sm"
//                 onClick={() => navigate("/company-settings")}
//               >
//                 <Settings className="h-4 w-4 mr-2" />
//                 Settings
//               </Button>
//               {/* User Menu */}
//               <DropdownMenu>
//                 <DropdownMenuTrigger asChild>
//                   <Button
//                     variant="ghost"
//                     className="relative h-8 w-8 rounded-full"
//                   >
//                     <Avatar className="h-8 w-8">
//                       <AvatarImage src="" alt={user?.email || ""} />
//                       <AvatarFallback className="bg-blue-100 text-blue-600">
//                         {getUserInitials()}
//                       </AvatarFallback>
//                     </Avatar>
//                   </Button>
//                 </DropdownMenuTrigger>
//                 <DropdownMenuContent className="w-56" align="end" forceMount>
//                   <div className="flex flex-col space-y-1 p-2">
//                     <p className="text-sm font-medium leading-none">
//                       {user?.email}
//                     </p>
//                     <p className="text-xs leading-none text-muted-foreground">
//                       Team Administrator
//                     </p>
//                   </div>
//                   <DropdownMenuSeparator />
//                   <DropdownMenuItem onClick={() => navigate("/settings")}>
//                     <Settings className="mr-2 h-4 w-4" />
//                     <span>Settings</span>
//                   </DropdownMenuItem>
//                   <DropdownMenuItem onClick={() => navigate("/profile")}>
//                     <User className="mr-2 h-4 w-4" />
//                     <span>Profile</span>
//                   </DropdownMenuItem>
//                   <DropdownMenuSeparator />
//                   <DropdownMenuItem
//                     onClick={handleLogout}
//                     className="text-red-600"
//                   >
//                     <LogOut className="mr-2 h-4 w-4" />
//                     <span>Log out</span>
//                   </DropdownMenuItem>
//                 </DropdownMenuContent>
//               </DropdownMenu>
//             </div>
//           </div>
//         </div>
//       </header>

//       <div className="p-6">
//         {/* Enhanced Stats Grid */}
//         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
//           {widgets.filter((w) => w.type === "stats").map(renderWidget)}
//         </div>

//         {/* Additional KPI Cards */}
//         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
//           <Card>
//             <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
//               <CardTitle className="text-sm font-medium">
//                 Response Rate
//               </CardTitle>
//               <Target className="h-4 w-4 text-muted-foreground" />
//             </CardHeader>
//             <CardContent>
//               <div className="text-2xl font-bold">{stats.responseRate}%</div>
//               <p className="text-xs text-muted-foreground">
//                 Customer engagement
//               </p>
//             </CardContent>
//           </Card>

//           <Card>
//             <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
//               <CardTitle className="text-sm font-medium">
//                 Avg Response Time
//               </CardTitle>
//               <Zap className="h-4 w-4 text-muted-foreground" />
//             </CardHeader>
//             <CardContent>
//               <div className="text-2xl font-bold">{stats.avgResponseTime}h</div>
//               <p className="text-xs text-muted-foreground">Time to respond</p>
//             </CardContent>
//           </Card>

//           <Card>
//             <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
//               <CardTitle className="text-sm font-medium">
//                 Top Performer
//               </CardTitle>
//               <Award className="h-4 w-4 text-muted-foreground" />
//             </CardHeader>
//             <CardContent>
//               <div className="text-lg font-bold truncate">
//                 {stats.topRatedEmployee}
//               </div>
//               <p className="text-xs text-muted-foreground">
//                 Highest rated employee
//               </p>
//             </CardContent>
//           </Card>

//           <Card>
//             <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
//               <CardTitle className="text-sm font-medium">Departments</CardTitle>
//               <Grid className="h-4 w-4 text-muted-foreground" />
//             </CardHeader>
//             <CardContent>
//               <div className="text-2xl font-bold">{stats.departmentCount}</div>
//               <p className="text-xs text-muted-foreground">
//                 Active departments
//               </p>
//             </CardContent>
//           </Card>
//         </div>

//         {/* Charts Grid */}
//         <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
//           {widgets.filter((w) => w.type === "chart").map(renderWidget)}
//         </div>

//         {/* Enhanced Tabs */}
//         <Tabs defaultValue="overview" className="space-y-6">
//           <TabsList className="grid w-full grid-cols-5">
//             <TabsTrigger value="overview">Overview</TabsTrigger>
//             <TabsTrigger value="reviews">Reviews</TabsTrigger>
//             <TabsTrigger value="team">Team</TabsTrigger>
//             <TabsTrigger value="performance">Performance</TabsTrigger>
//             <TabsTrigger value="analytics">Analytics</TabsTrigger>
//           </TabsList>

//           <TabsContent value="overview" className="space-y-6">
//             <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
//               {/* Enhanced Recent Reviews */}
//               <Card>
//                 <CardHeader>
//                   <CardTitle>Recent Reviews</CardTitle>
//                   <CardDescription>
//                     Latest customer feedback with enhanced details
//                   </CardDescription>
//                 </CardHeader>
//                 <CardContent className="space-y-4">
//                   {recentReviews.length > 0 ? (
//                     recentReviews.map((review) => (
//                       <div
//                         key={review.id}
//                         className="border-b border-gray-100 last:border-0 pb-4 last:pb-0"
//                       >
//                         <div className="flex items-center justify-between mb-2">
//                           <div className="flex items-center space-x-2">
//                             <span className="font-medium">
//                               {review.customer_name}
//                             </span>
//                             <Badge
//                               variant={
//                                 review.review_type === "video"
//                                   ? "default"
//                                   : "secondary"
//                               }
//                             >
//                               {review.review_type}
//                             </Badge>
//                             {!review.is_approved && (
//                               <Badge variant="outline">Pending</Badge>
//                             )}
//                           </div>
//                           <div className="flex items-center">
//                             {[...Array(5)].map((_, i) => (
//                               <Star
//                                 key={i}
//                                 className={`h-4 w-4 ${
//                                   i < review.rating
//                                     ? "fill-yellow-400 text-yellow-400"
//                                     : "text-gray-300"
//                                 }`}
//                               />
//                             ))}
//                           </div>
//                         </div>
//                         <p className="text-sm text-gray-600 mb-1">
//                           {review.comment || "No comment provided"}
//                         </p>
//                         <div className="flex items-center justify-between">
//                           <p className="text-xs text-gray-500">
//                             For {review.employee?.name || "Unknown"} •{" "}
//                             {formatDate(review.created_at)}
//                           </p>
//                           {review.video_url && (
//                             <Badge variant="outline" className="text-xs">
//                               Video
//                             </Badge>
//                           )}
//                         </div>
//                       </div>
//                     ))
//                   ) : (
//                     <p className="text-center text-gray-500 py-4">
//                       No reviews yet
//                     </p>
//                   )}
//                 </CardContent>
//               </Card>

//               {/* Enhanced Top Performers */}
//               <Card>
//                 <CardHeader>
//                   <CardTitle>Top Performers</CardTitle>
//                   <CardDescription>
//                     Team members with highest ratings and performance
//                   </CardDescription>
//                 </CardHeader>
//                 <CardContent className="space-y-4">
//                   {topPerformers.length > 0 ? (
//                     topPerformers.map((performer, index) => (
//                       <div
//                         key={performer.id}
//                         className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
//                       >
//                         <div className="flex items-center space-x-3">
//                           <div className="h-10 w-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-semibold">
//                             {index + 1}
//                           </div>
//                           <div className="flex items-center space-x-2">
//                             {performer.photo_url && (
//                               <img
//                                 src={performer.photo_url}
//                                 alt={performer.name}
//                                 className="h-8 w-8 rounded-full object-cover"
//                               />
//                             )}
//                             <div>
//                               <p className="font-medium">{performer.name}</p>
//                               <p className="text-sm text-gray-600">
//                                 {performer.reviews_count || 0} reviews •{" "}
//                                 {performer.position || "N/A"}
//                               </p>
//                             </div>
//                           </div>
//                         </div>
//                         <div className="flex items-center space-x-2">
//                           <div className="text-right">
//                             <div className="flex items-center space-x-1">
//                               <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
//                               <span className="font-medium">
//                                 {performer.avg_rating || 0}
//                               </span>
//                             </div>
//                             {performer.performance_score && (
//                               <p className="text-xs text-gray-500">
//                                 Score: {performer.performance_score}
//                               </p>
//                             )}
//                           </div>
//                         </div>
//                       </div>
//                     ))
//                   ) : (
//                     <p className="text-center text-gray-500 py-4">
//                       No performance data available
//                     </p>
//                   )}
//                 </CardContent>
//               </Card>
//             </div>
//           </TabsContent>

//           <TabsContent value="reviews">
//             <Card>
//               <CardHeader className="flex flex-row items-center justify-between">
//                 <div>
//                   <CardTitle>Review Management</CardTitle>
//                   <CardDescription>
//                     Manage and moderate customer reviews with enhanced controls
//                   </CardDescription>
//                 </div>
//                 <Button onClick={() => navigate("/reviews")}>
//                   <Eye className="h-4 w-4 mr-2" />
//                   View All Reviews
//                 </Button>
//               </CardHeader>
//               <CardContent>
//                 <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
//                   <div className="text-center p-4 bg-blue-50 rounded-lg">
//                     <div className="text-2xl font-bold text-blue-600">
//                       {stats.pendingReviews}
//                     </div>
//                     <div className="text-sm text-gray-600">Pending Reviews</div>
//                   </div>
//                   <div className="text-center p-4 bg-green-50 rounded-lg">
//                     <div className="text-2xl font-bold text-green-600">
//                       {stats.approvedReviews}
//                     </div>
//                     <div className="text-sm text-gray-600">
//                       Approved Reviews
//                     </div>
//                   </div>
//                   <div className="text-center p-4 bg-yellow-50 rounded-lg">
//                     <div className="text-2xl font-bold text-yellow-600">
//                       {stats.avgRating}
//                     </div>
//                     <div className="text-sm text-gray-600">Average Rating</div>
//                   </div>
//                   <div className="text-center p-4 bg-purple-50 rounded-lg">
//                     <div className="text-2xl font-bold text-purple-600">
//                       {stats.customerSatisfaction}%
//                     </div>
//                     <div className="text-sm text-gray-600">Satisfaction</div>
//                   </div>
//                 </div>
//               </CardContent>
//             </Card>
//           </TabsContent>

//           <TabsContent value="team">
//             <Card>
//               <CardHeader className="flex flex-row items-center justify-between">
//                 <div>
//                   <CardTitle>Team Management</CardTitle>
//                   <CardDescription>
//                     Enhanced team management with department structure
//                   </CardDescription>
//                 </div>
//                 <Button onClick={() => navigate("/employees")}>
//                   <Plus className="h-4 w-4 mr-2" />
//                   Manage Team
//                 </Button>
//               </CardHeader>
//               <CardContent>
//                 <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
//                   <div className="text-center p-4 bg-blue-50 rounded-lg">
//                     <div className="text-2xl font-bold text-blue-600">
//                       {stats.teamMembers}
//                     </div>
//                     <div className="text-sm text-gray-600">Active Members</div>
//                   </div>
//                   <div className="text-center p-4 bg-green-50 rounded-lg">
//                     <div className="text-2xl font-bold text-green-600">
//                       {stats.departmentCount}
//                     </div>
//                     <div className="text-sm text-gray-600">Departments</div>
//                   </div>
//                   <div className="text-center p-4 bg-yellow-50 rounded-lg">
//                     <div className="text-2xl font-bold text-yellow-600">
//                       {stats.qrCodeScans}
//                     </div>
//                     <div className="text-sm text-gray-600">QR Code Scans</div>
//                   </div>
//                   <div className="text-center p-4 bg-purple-50 rounded-lg">
//                     <div className="text-2xl font-bold text-purple-600">
//                       {stats.responseRate}%
//                     </div>
//                     <div className="text-sm text-gray-600">Response Rate</div>
//                   </div>
//                 </div>
//               </CardContent>
//             </Card>
//           </TabsContent>

//           <TabsContent value="performance">
//             <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
//               {/* Department Performance Chart */}
//               <Card>
//                 <CardHeader>
//                   <CardTitle>Department Performance</CardTitle>
//                   <CardDescription>
//                     Review performance by department
//                   </CardDescription>
//                 </CardHeader>
//                 <CardContent>
//                   <div className="h-[300px]">
//                     <ResponsiveContainer width="100%" height="100%">
//                       <BarChart data={chartData.departmentPerformance}>
//                         <CartesianGrid strokeDasharray="3 3" />
//                         <XAxis dataKey="name" />
//                         <YAxis />
//                         <Tooltip />
//                         <Bar dataKey="value" fill="#3B82F6" />
//                       </BarChart>
//                     </ResponsiveContainer>
//                   </div>
//                 </CardContent>
//               </Card>

//               {/* Daily Activity Chart */}
//               <Card>
//                 <CardHeader>
//                   <CardTitle>Daily Activity</CardTitle>
//                   <CardDescription>
//                     Review activity over the last 7 days
//                   </CardDescription>
//                 </CardHeader>
//                 <CardContent>
//                   <div className="h-[300px]">
//                     <ResponsiveContainer width="100%" height="100%">
//                       <AreaChart data={chartData.dailyActivity}>
//                         <CartesianGrid strokeDasharray="3 3" />
//                         <XAxis dataKey="name" />
//                         <YAxis />
//                         <Tooltip />
//                         <Area
//                           type="monotone"
//                           dataKey="reviews"
//                           stroke="#10B981"
//                           fill="#10B981"
//                           fillOpacity={0.3}
//                         />
//                       </AreaChart>
//                     </ResponsiveContainer>
//                   </div>
//                 </CardContent>
//               </Card>
//             </div>
//           </TabsContent>

//           <TabsContent value="analytics">
//             <Card>
//               <CardHeader className="flex flex-row items-center justify-between">
//                 <div>
//                   <CardTitle>Advanced Analytics</CardTitle>
//                   <CardDescription>
//                     Comprehensive insights and performance metrics
//                   </CardDescription>
//                 </div>
//                 <Button onClick={() => navigate("/analytics")}>
//                   <BarChart3 className="h-4 w-4 mr-2" />
//                   View Full Analytics
//                 </Button>
//               </CardHeader>
//               <CardContent>
//                 <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
//                   <div className="text-center p-4 bg-blue-50 rounded-lg">
//                     <div className="text-2xl font-bold text-blue-600">
//                       {stats.reviewGrowth > 0 ? "+" : ""}
//                       {stats.reviewGrowth}%
//                     </div>
//                     <div className="text-sm text-gray-600">Review Growth</div>
//                   </div>
//                   <div className="text-center p-4 bg-green-50 rounded-lg">
//                     <div className="text-2xl font-bold text-green-600">
//                       {stats.avgRating}
//                     </div>
//                     <div className="text-sm text-gray-600">
//                       Avg Rating Trend
//                     </div>
//                   </div>
//                   <div className="text-center p-4 bg-purple-50 rounded-lg">
//                     <div className="text-2xl font-bold text-purple-600">
//                       {stats.customerSatisfaction}%
//                     </div>
//                     <div className="text-sm text-gray-600">
//                       Customer Satisfaction
//                     </div>
//                   </div>
//                 </div>
//               </CardContent>
//             </Card>
//           </TabsContent>
//         </Tabs>
//       </div>
//     </div>
//   );
// };

// export default Dashboard;

//======================================>>>>>>>>>>>>>>>>>>>>>==================================

import { useState, useEffect, useCallback, useRef } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Star,
  Users,
  TrendingUp,
  QrCode,
  Bell,
  Settings,
  Plus,
  Eye,
  BarChart3,
  Download,
  RefreshCw,
  Calendar,
  Target,
  Award,
  Activity,
  Zap,
  Filter,
  Grid,
  Layout,
  ChevronUp,
  ChevronDown,
  User,
  LogOut,
  Menu,
  Database,
  FileText,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import NotificationBell from "@/components/NotificationBell";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface Review {
  id: string;
  customer_name: string;
  customer_email?: string;
  rating: number;
  comment?: string;
  review_type: string;
  video_url?: string;
  is_approved: boolean;
  created_at: string;
  employee_id: string;
  employee: {
    id: string;
    name: string;
    position?: string;
    department_id: string;
    departments?: { name: string };
  };
}

interface Employee {
  id: string;
  name: string;
  email?: string;
  position?: string;
  department_id?: string;
  qr_code_id: string;
  is_active: boolean;
  created_at: string;
  reviews_count?: number;
  avg_rating?: number;
  performance_score?: number;
  photo_url?: string;
  department?: { name: string };
}

interface Department {
  id: string;
  name: string;
  description?: string;
  manager_id?: string;
  employee_count?: number;
}

interface DashboardStats {
  totalReviews: number;
  avgRating: number;
  teamMembers: number;
  thisMonth: number;
  qrCodeScans: number;
  pendingReviews: number;
  approvedReviews: number;
  reviewGrowth: number;
  customerSatisfaction: number;
  responseRate: number;
  avgResponseTime: number;
  topRatedEmployee: string;
  departmentCount: number;
}

interface DashboardWidget {
  id: string;
  type: "stats" | "chart" | "list" | "performance";
  title: string;
  position: { x: number; y: number };
  size: { width: number; height: number };
  config: any;
  isVisible: boolean;
}

interface ChartData {
  name: string;
  value: number;
  date?: string;
  reviews?: number;
  rating?: number;
}

const COLORS = [
  "#3B82F6",
  "#10B981",
  "#F59E0B",
  "#EF4444",
  "#8B5CF6",
  "#06B6D4",
];

const Dashboard = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const [loading, setLoading] = useState(true);
  const [realTimeEnabled, setRealTimeEnabled] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [timeRange, setTimeRange] = useState("30d");
  const [selectedDepartment, setSelectedDepartment] = useState("all");

  const subscriptionsRef = useRef<any[]>([]);

  const [stats, setStats] = useState<DashboardStats>({
    totalReviews: 0,
    avgRating: 0,
    teamMembers: 0,
    thisMonth: 0,
    qrCodeScans: 0,
    pendingReviews: 0,
    approvedReviews: 0,
    reviewGrowth: 0,
    customerSatisfaction: 0,
    responseRate: 0,
    avgResponseTime: 0,
    topRatedEmployee: "",
    departmentCount: 0,
  });

  const [recentReviews, setRecentReviews] = useState<Review[]>([]);
  const [topPerformers, setTopPerformers] = useState<Employee[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [chartData, setChartData] = useState<{
    reviewTrends: ChartData[];
    ratingDistribution: ChartData[];
    departmentPerformance: ChartData[];
    dailyActivity: ChartData[];
  }>({
    reviewTrends: [],
    ratingDistribution: [],
    departmentPerformance: [],
    dailyActivity: [],
  });

  const [widgets, setWidgets] = useState<DashboardWidget[]>([
    {
      id: "total-reviews",
      type: "stats",
      title: "Total Reviews",
      position: { x: 0, y: 0 },
      size: { width: 1, height: 1 },
      config: { metric: "totalReviews", icon: "Star" },
      isVisible: true,
    },
    {
      id: "avg-rating",
      type: "stats",
      title: "Average Rating",
      position: { x: 1, y: 0 },
      size: { width: 1, height: 1 },
      config: { metric: "avgRating", icon: "TrendingUp" },
      isVisible: true,
    },
    {
      id: "team-members",
      type: "stats",
      title: "Team Members",
      position: { x: 2, y: 0 },
      size: { width: 1, height: 1 },
      config: { metric: "teamMembers", icon: "Users" },
      isVisible: true,
    },
    {
      id: "qr-scans",
      type: "stats",
      title: "QR Scans",
      position: { x: 3, y: 0 },
      size: { width: 1, height: 1 },
      config: { metric: "qrCodeScans", icon: "QrCode" },
      isVisible: true,
    },
    {
      id: "review-trends",
      type: "chart",
      title: "Review Trends",
      position: { x: 0, y: 1 },
      size: { width: 2, height: 2 },
      config: { chartType: "line", dataKey: "reviewTrends" },
      isVisible: true,
    },
    {
      id: "rating-distribution",
      type: "chart",
      title: "Rating Distribution",
      position: { x: 2, y: 1 },
      size: { width: 2, height: 2 },
      config: { chartType: "pie", dataKey: "ratingDistribution" },
      isVisible: true,
    },
  ]);

  const debugDepartments = async () => {
    console.log("Current departments state:", departments);
    console.log("Departments length:", departments.length);
    console.log("Selected department:", selectedDepartment);

    // Let's also check what's actually in the database
    if (user?.id) {
      try {
        // Check total departments without any filters
        const { data: allDepts, error: allError } = await supabase
          .from("departments")
          .select("*");

        console.log("ALL departments in database:", allDepts?.length || 0);
        console.log("All departments data:", allDepts);

        // Check departments for your company specifically
        const { data: companyDepts, error: companyError } = await supabase
          .from("departments")
          .select("*")
          .eq("company_id", user.id);

        console.log("Departments for your company:", companyDepts?.length || 0);
        console.log("Company departments data:", companyDepts);

        // Check if there are departments with different company_ids
        const { data: uniqueCompanies, error: companiesError } = await supabase
          .from("departments")
          .select("company_id")
          .not("company_id", "is", null);

        const uniqueCompanyIds = [
          ...new Set(uniqueCompanies?.map((d) => d.company_id)),
        ];
        console.log("Unique company IDs in departments:", uniqueCompanyIds);
        console.log("Your company ID:", user.id);
      } catch (error) {
        console.error("Debug query error:", error);
      }
    }
  };

  useEffect(() => {
    debugDepartments();
  }, []);

  const handleLogout = async () => {
    try {
      await signOut();
      toast.success("Logged out successfully");
      navigate("/login");
    } catch (error) {
      toast.error("Failed to logout");
    }
  };

  const getUserInitials = () => {
    if (!user?.email) return "U";
    return user.email.charAt(0).toUpperCase();
  };

  const getDateRange = () => {
    const now = new Date();
    const daysBack = timeRange === "7d" ? 7 : timeRange === "30d" ? 30 : 90;
    const startDate = new Date(now.getTime() - daysBack * 24 * 60 * 60 * 1000);
    const endDate = now;
    return { startDate, endDate };
  };

  // Replace the fetchDashboardData function with this updated version:

  // Replace the fetchDashboardData function with this updated version:

  const fetchDashboardData = async () => {
    if (!user?.id) return;

    setLoading(true);
    try {
      const { startDate, endDate } = getDateRange();

      // Fetch all data without trying to embed department relationships
      const [
        reviewsResponse,
        employeesResponse,
        departmentsResponse,
        qrScansResponse,
      ] = await Promise.all([
        supabase
          .from("reviews")
          .select(
            `
        *,
        employee:employees!inner(
          id,
          name,
          position
        )
      `
          )
          .eq("company_id", user.id)
          .gte("created_at", startDate.toISOString()),

        supabase
          .from("employees")
          .select("*")
          .eq("company_id", user.id)
          .eq("is_active", true),

        // Make sure we're fetching ALL departments for this company with explicit limit removal
        supabase
          .from("departments")
          .select("*")
          .eq("company_id", user.id)
          .order("name", { ascending: true })
          .limit(1000), // Explicit high limit to ensure we get all

        supabase
          .from("qr_code_scans")
          .select("*")
          .eq("company_id", user.id)
          .gte("created_at", startDate.toISOString()),
      ]);

      if (reviewsResponse.error) {
        console.error("Reviews fetch error:", reviewsResponse.error);
        throw reviewsResponse.error;
      }
      if (employeesResponse.error) {
        console.error("Employees fetch error:", employeesResponse.error);
        throw employeesResponse.error;
      }
      if (departmentsResponse.error) {
        console.error("Departments fetch error:", departmentsResponse.error);
        throw departmentsResponse.error;
      }
      if (qrScansResponse.error) {
        console.error("QR Scans fetch error:", qrScansResponse.error);
        throw qrScansResponse.error;
      }

      let allReviews = reviewsResponse.data || [];
      let allEmployees = employeesResponse.data || [];
      const allDepartments = departmentsResponse.data || [];
      const allQrScans = qrScansResponse.data || [];

      console.log("Fetched departments:", allDepartments); // Debug log
      console.log("User ID for query:", user.id); // Debug user ID
      console.log("Total departments found:", allDepartments.length); // Debug count

      // Apply department filtering if needed
      if (selectedDepartment && selectedDepartment !== "all") {
        // Filter employees by selected department (when department_id column exists)
        allEmployees = allEmployees.filter(
          (emp) => emp.department_id === selectedDepartment
        );

        // Filter reviews to only include those from employees in the selected department
        const departmentEmployeeIds = allEmployees.map((emp) => emp.id);
        allReviews = allReviews.filter(
          (review) =>
            review.employee &&
            departmentEmployeeIds.includes(review.employee.id)
        );
      }

      // Calculate statistics based on filtered data
      const thisMonth = new Date();
      thisMonth.setMonth(thisMonth.getMonth() - 1);
      const thisMonthReviews = allReviews.filter(
        (review) => new Date(review.created_at) >= thisMonth
      );

      const lastMonth = new Date();
      lastMonth.setMonth(lastMonth.getMonth() - 2);
      const lastMonthReviews = allReviews.filter(
        (review) =>
          new Date(review.created_at) >= lastMonth &&
          new Date(review.created_at) < thisMonth
      );

      const reviewGrowth =
        lastMonthReviews.length > 0
          ? ((thisMonthReviews.length - lastMonthReviews.length) /
              lastMonthReviews.length) *
            100
          : thisMonthReviews.length > 0
          ? 100
          : 0;

      const avgRating =
        allReviews.length > 0
          ? allReviews.reduce((sum, review) => sum + review.rating, 0) /
            allReviews.length
          : 0;

      const approvedReviews = allReviews.filter((r) => r.is_approved).length;
      const pendingReviews = allReviews.filter((r) => !r.is_approved).length;
      const customerSatisfaction =
        allReviews.length > 0
          ? (allReviews.filter((r) => r.rating >= 4).length /
              allReviews.length) *
            100
          : 0;

      // Calculate employee performance for filtered employees
      const employeesWithStats = allEmployees.map((employee) => {
        const employeeReviews = allReviews.filter(
          (review) => review.employee?.id === employee.id
        );
        const avgRating =
          employeeReviews.length > 0
            ? employeeReviews.reduce((sum, review) => sum + review.rating, 0) /
              employeeReviews.length
            : 0;

        return {
          ...employee,
          reviews_count: employeeReviews.length,
          avg_rating: avgRating,
          performance_score: Math.round(avgRating * 20), // Convert to 0-100 scale
        };
      });

      // Get top performers from filtered employees
      const topPerformers = employeesWithStats
        .filter((emp) => emp.reviews_count > 0)
        .sort((a, b) => (b.avg_rating || 0) - (a.avg_rating || 0))
        .slice(0, 5);

      const topRatedEmployee =
        topPerformers.length > 0 ? topPerformers[0].name : "N/A";

      // Set filtered data
      setStats({
        totalReviews: allReviews.length,
        avgRating: Number(avgRating.toFixed(1)),
        teamMembers: allEmployees.length,
        thisMonth: thisMonthReviews.length,
        qrCodeScans: allQrScans.length,
        pendingReviews,
        approvedReviews,
        reviewGrowth: Number(reviewGrowth.toFixed(1)),
        customerSatisfaction: Number(customerSatisfaction.toFixed(1)),
        responseRate: 85, // This would need actual calculation based on your business logic
        avgResponseTime: 2.5, // This would need actual calculation
        topRatedEmployee,
        departmentCount:
          selectedDepartment === "all" ? allDepartments.length : 1,
      });

      setRecentReviews(allReviews.slice(0, 10));
      setTopPerformers(topPerformers);
      setDepartments(allDepartments); // Make sure this sets all departments

      // Generate chart data based on filtered data
      generateChartData(allReviews, allEmployees, allDepartments);
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
      toast.error("Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  };

  // const fetchDashboardData = async () => {
  //   if (!user?.id) return;

  //   setLoading(true);
  //   try {
  //     const { startDate, endDate } = getDateRange();

  //     // Fetch all data
  //     const [
  //       reviewsResponse,
  //       employeesResponse,
  //       departmentsResponse,
  //       qrScansResponse,
  //     ] = await Promise.all([
  //       supabase
  //         .from("reviews")
  //         .select(
  //           `
  //           *,
  //           employee:employees!inner(
  //             id,
  //             name,
  //             position,
  //             department_id,
  //             departments(name)
  //           )
  //         `
  //         )
  //         .eq("company_id", user.id)
  //         .gte("created_at", startDate.toISOString()),

  //       supabase
  //         .from("employees")
  //         .select(
  //           `
  //           *,
  //           departments(id, name, description)
  //         `
  //         )
  //         .eq("company_id", user.id)
  //         .eq("is_active", true),

  //       supabase.from("departments").select("*").eq("company_id", user.id),

  //       supabase
  //         .from("qr_code_scans")
  //         .select("*")
  //         .eq("company_id", user.id)
  //         .gte("created_at", startDate.toISOString()),
  //     ]);

  //     if (reviewsResponse.error) throw reviewsResponse.error;
  //     if (employeesResponse.error) throw employeesResponse.error;
  //     if (departmentsResponse.error) throw departmentsResponse.error;
  //     if (qrScansResponse.error) throw qrScansResponse.error;

  //     let allReviews = reviewsResponse.data || [];
  //     let allEmployees = employeesResponse.data || [];
  //     const allDepartments = departmentsResponse.data || [];
  //     const allQrScans = qrScansResponse.data || [];

  //     // Apply department filtering
  //     if (selectedDepartment && selectedDepartment !== "all") {
  //       // Filter employees by selected department
  //       allEmployees = allEmployees.filter(
  //         (emp) => emp.department_id === selectedDepartment
  //       );

  //       // Filter reviews to only include those from employees in the selected department
  //       const departmentEmployeeIds = allEmployees.map((emp) => emp.id);
  //       allReviews = allReviews.filter(
  //         (review) =>
  //           review.employee &&
  //           departmentEmployeeIds.includes(review.employee.id)
  //       );
  //     }

  //     // Calculate statistics based on filtered data
  //     const thisMonth = new Date();
  //     thisMonth.setMonth(thisMonth.getMonth() - 1);
  //     const thisMonthReviews = allReviews.filter(
  //       (review) => new Date(review.created_at) >= thisMonth
  //     );

  //     const lastMonth = new Date();
  //     lastMonth.setMonth(lastMonth.getMonth() - 2);
  //     const lastMonthReviews = allReviews.filter(
  //       (review) =>
  //         new Date(review.created_at) >= lastMonth &&
  //         new Date(review.created_at) < thisMonth
  //     );

  //     const reviewGrowth =
  //       lastMonthReviews.length > 0
  //         ? ((thisMonthReviews.length - lastMonthReviews.length) /
  //             lastMonthReviews.length) *
  //           100
  //         : thisMonthReviews.length > 0
  //         ? 100
  //         : 0;

  //     const avgRating =
  //       allReviews.length > 0
  //         ? allReviews.reduce((sum, review) => sum + review.rating, 0) /
  //           allReviews.length
  //         : 0;

  //     const approvedReviews = allReviews.filter((r) => r.is_approved).length;
  //     const pendingReviews = allReviews.filter((r) => !r.is_approved).length;
  //     const customerSatisfaction =
  //       allReviews.length > 0
  //         ? (allReviews.filter((r) => r.rating >= 4).length /
  //             allReviews.length) *
  //           100
  //         : 0;

  //     // Calculate employee performance for filtered employees
  //     const employeesWithStats = allEmployees.map((employee) => {
  //       const employeeReviews = allReviews.filter(
  //         (review) => review.employee?.id === employee.id
  //       );
  //       const avgRating =
  //         employeeReviews.length > 0
  //           ? employeeReviews.reduce((sum, review) => sum + review.rating, 0) /
  //             employeeReviews.length
  //           : 0;

  //       return {
  //         ...employee,
  //         reviews_count: employeeReviews.length,
  //         avg_rating: avgRating,
  //         performance_score: Math.round(avgRating * 20), // Convert to 0-100 scale
  //       };
  //     });

  //     // Get top performers from filtered employees
  //     const topPerformers = employeesWithStats
  //       .filter((emp) => emp.reviews_count > 0)
  //       .sort((a, b) => (b.avg_rating || 0) - (a.avg_rating || 0))
  //       .slice(0, 5);

  //     const topRatedEmployee =
  //       topPerformers.length > 0 ? topPerformers[0].name : "N/A";

  //     // Set filtered data
  //     setStats({
  //       totalReviews: allReviews.length,
  //       avgRating: Number(avgRating.toFixed(1)),
  //       teamMembers: allEmployees.length,
  //       thisMonth: thisMonthReviews.length,
  //       qrCodeScans: allQrScans.length,
  //       pendingReviews,
  //       approvedReviews,
  //       reviewGrowth: Number(reviewGrowth.toFixed(1)),
  //       customerSatisfaction: Number(customerSatisfaction.toFixed(1)),
  //       responseRate: 85, // This would need actual calculation based on your business logic
  //       avgResponseTime: 2.5, // This would need actual calculation
  //       topRatedEmployee,
  //       departmentCount:
  //         selectedDepartment === "all" ? allDepartments.length : 1,
  //     });

  //     setRecentReviews(allReviews.slice(0, 10));
  //     setTopPerformers(topPerformers);
  //     setDepartments(allDepartments);

  //     // Generate chart data based on filtered data
  //     generateChartData(allReviews, allEmployees, allDepartments);
  //   } catch (error) {
  //     console.error("Error fetching dashboard data:", error);
  //     toast.error("Failed to load dashboard data");
  //   } finally {
  //     setLoading(false);
  //   }
  // };

  // Update the generateChartData function to work with filtered data
  const generateChartData = (
    reviews: any[],
    employees: any[],
    departments: any[]
  ) => {
    // Review trends (last 30 days)
    const reviewTrends = [];
    for (let i = 29; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dayReviews = reviews.filter((review) => {
        const reviewDate = new Date(review.created_at);
        return reviewDate.toDateString() === date.toDateString();
      });

      reviewTrends.push({
        name: date.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        }),
        value: dayReviews.length,
        date: date.toISOString(),
      });
    }

    // Rating distribution
    const ratingCounts = [1, 2, 3, 4, 5].map((rating) => ({
      name: `${rating} Star${rating !== 1 ? "s" : ""}`,
      value: reviews.filter((review) => review.rating === rating).length,
    }));

    // Department performance (only show selected department if filtered)
    const departmentPerformance = departments
      .filter(
        (dept) => selectedDepartment === "all" || dept.id === selectedDepartment
      )
      .map((dept) => {
        const deptEmployees = employees.filter(
          (emp) => emp.department_id === dept.id
        );
        const deptReviews = reviews.filter((review) =>
          deptEmployees.some((emp) => emp.id === review.employee?.id)
        );

        return {
          name: dept.name,
          value: deptReviews.length,
          rating:
            deptReviews.length > 0
              ? deptReviews.reduce((sum, r) => sum + r.rating, 0) /
                deptReviews.length
              : 0,
        };
      });

    // Daily activity (last 7 days)
    const dailyActivity = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dayReviews = reviews.filter((review) => {
        const reviewDate = new Date(review.created_at);
        return reviewDate.toDateString() === date.toDateString();
      });

      dailyActivity.push({
        name: date.toLocaleDateString("en-US", { weekday: "short" }),
        reviews: dayReviews.length,
        value: dayReviews.length,
      });
    }

    setChartData({
      reviewTrends,
      ratingDistribution: ratingCounts,
      departmentPerformance,
      dailyActivity,
    });
  };

  // Add useEffect to refetch data when department selection changes
  useEffect(() => {
    if (user?.id) {
      fetchDashboardData();
    }
  }, [user?.id, timeRange, selectedDepartment]); // Add selectedDepartment as dependency

  useEffect(() => {
    if (user && realTimeEnabled) {
      setupRealTimeSubscriptions();
    }

    return () => {
      // Cleanup all subscriptions
      subscriptionsRef.current.forEach((subscription) => {
        subscription.unsubscribe();
      });
      subscriptionsRef.current = [];
    };
  }, [user, realTimeEnabled]);

  const setupRealTimeSubscriptions = useCallback(() => {
    if (!realTimeEnabled || !user) return;

    // Clear existing subscriptions first
    subscriptionsRef.current.forEach((subscription) => {
      subscription.unsubscribe();
    });
    subscriptionsRef.current = [];

    // Subscribe to reviews changes with unique channel names
    const reviewsSubscription = supabase
      .channel(`reviews-changes-${user.id}-${Date.now()}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "reviews",
          filter: `company_id=eq.${user.id}`,
        },
        (payload) => {
          console.log("Real-time review update:", payload);
          fetchDashboardData();

          if (payload.eventType === "INSERT") {
            toast.success("New review received!");
          }
        }
      )
      .subscribe();

    // Subscribe to QR code scans changes with unique channel names
    const qrScansSubscription = supabase
      .channel(`qr-scans-changes-${user.id}-${Date.now()}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "qr_code_scans",
          filter: `company_id=eq.${user.id}`,
        },
        (payload) => {
          console.log("Real-time QR scan update:", payload);
          fetchDashboardData();

          if (payload.eventType === "INSERT") {
            toast.success("QR code scanned!");
          }
        }
      )
      .subscribe();

    // Subscribe to employees changes with unique channel names
    const employeesSubscription = supabase
      .channel(`employees-changes-${user.id}-${Date.now()}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "employees",
          filter: `company_id=eq.${user.id}`,
        },
        (payload) => {
          console.log("Real-time employee update:", payload);
          fetchDashboardData();
        }
      )
      .subscribe();

    // Store subscriptions for cleanup
    subscriptionsRef.current = [
      reviewsSubscription,
      employeesSubscription,
      qrScansSubscription,
    ];
  }, [realTimeEnabled, user]);

  const handleRefresh = () => {
    fetchDashboardData();
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const getStatIcon = (iconName: string) => {
    const icons = {
      Star: Star,
      TrendingUp: TrendingUp,
      Users: Users,
      QrCode: QrCode,
      Target: Target,
      Award: Award,
      Activity: Activity,
      Zap: Zap,
    };
    const IconComponent = icons[iconName as keyof typeof icons] || Star;
    return <IconComponent className="h-4 w-4 text-muted-foreground" />;
  };

  const renderWidget = (widget: DashboardWidget) => {
    if (!widget.isVisible) return null;

    const gridCols =
      widget.size.width === 1
        ? "col-span-1"
        : widget.size.width === 2
        ? "col-span-2"
        : "col-span-3";
    const gridRows =
      widget.size.height === 1
        ? "row-span-1"
        : widget.size.height === 2
        ? "row-span-2"
        : "row-span-3";

    if (widget.type === "stats") {
      const statValue = stats[widget.config.metric as keyof DashboardStats];
      const isGrowth = widget.config.metric === "reviewGrowth";
      const isPercentage = ["customerSatisfaction", "responseRate"].includes(
        widget.config.metric
      );

      return (
        <Card key={widget.id} className={`${gridCols} ${gridRows}`}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {widget.title}
            </CardTitle>
            {getStatIcon(widget.config.icon)}
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isGrowth && statValue > 0 ? "+" : ""}
              {typeof statValue === "number"
                ? statValue.toFixed(
                    widget.config.metric === "avgRating" ? 1 : 0
                  )
                : statValue}
              {isPercentage ? "%" : ""}
            </div>
            <p className="text-xs text-muted-foreground">
              {widget.config.metric === "totalReviews" &&
                `+${stats.thisMonth} this month`}
              {widget.config.metric === "avgRating" &&
                (stats.avgRating > 4.5
                  ? "Excellent"
                  : stats.avgRating > 4
                  ? "Very Good"
                  : "Good")}
              {widget.config.metric === "teamMembers" && "Active reviewers"}
              {widget.config.metric === "qrCodeScans" && `Last ${timeRange}`}
            </p>
          </CardContent>
        </Card>
      );
    }

    if (widget.type === "chart") {
      const data = chartData[widget.config.dataKey as keyof typeof chartData];

      return (
        <Card key={widget.id} className={`${gridCols} ${gridRows}`}>
          <CardHeader>
            <CardTitle className="text-lg">{widget.title}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                {widget.config.chartType === "line" && (
                  <LineChart data={data}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Line
                      type="monotone"
                      dataKey="value"
                      stroke="#3B82F6"
                      strokeWidth={2}
                    />
                  </LineChart>
                )}
                {widget.config.chartType === "area" && (
                  <AreaChart data={data}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Area
                      type="monotone"
                      dataKey="value"
                      stroke="#3B82F6"
                      fill="#3B82F6"
                      fillOpacity={0.3}
                    />
                  </AreaChart>
                )}
                {widget.config.chartType === "bar" && (
                  <BarChart data={data}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="value" fill="#3B82F6" />
                  </BarChart>
                )}
                {widget.config.chartType === "pie" && (
                  <PieChart>
                    <Pie
                      data={data}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                      label={({ name, value }) => `${name}: ${value}`}
                    >
                      {data.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={COLORS[index % COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                )}
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      );
    }

    return null;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Enhanced Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="h-8 w-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                <Star className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Enhanced Dashboard
                </h1>
                <p className="text-gray-600">
                  Welcome back, {user?.user_metadata?.company_name || "User"}!
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              {/* Time Range Selector */}
              <Select value={timeRange} onValueChange={setTimeRange}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7d">Last 7 days</SelectItem>
                  <SelectItem value="30d">Last 30 days</SelectItem>
                  <SelectItem value="90d">Last 90 days</SelectItem>
                </SelectContent>
              </Select>

              {/* Department Filter with scrollable dropdown */}
              <Select
                value={selectedDepartment}
                onValueChange={setSelectedDepartment}
              >
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="All Departments" />
                </SelectTrigger>
                <SelectContent className="max-h-60 overflow-y-auto">
                  <SelectItem value="all">All Departments</SelectItem>
                  {departments.map((dept) => (
                    <SelectItem key={dept.id} value={dept.id}>
                      {dept.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {/* Enhanced Department Filter with better scrolling */}
              {/* <Select
                value={selectedDepartment}
                onValueChange={setSelectedDepartment}
              >
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="All Departments" />
                </SelectTrigger>
                <SelectContent className="max-h-[300px] overflow-y-auto w-[200px]">
                  <SelectItem
                    value="all"
                    className="sticky top-0 bg-white z-10 border-b"
                  >
                    All Departments ({departments.length})
                  </SelectItem>
                  {departments.map((dept) => (
                    <SelectItem key={dept.id} value={dept.id} className="py-2">
                      <div className="flex flex-col">
                        <span className="font-medium">{dept.name}</span>
                        {dept.description && (
                          <span className="text-xs text-gray-500 truncate max-w-[150px]">
                            {dept.description}
                          </span>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select> */}

              {/* Real-time Toggle */}
              <div className="flex items-center space-x-2">
                <Switch
                  checked={realTimeEnabled}
                  onCheckedChange={setRealTimeEnabled}
                />
                <span className="text-sm text-gray-600">Real-time</span>
              </div>

              {/* Refresh Button */}
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                disabled={refreshing}
              >
                <RefreshCw
                  className={`h-4 w-4 mr-2 ${refreshing ? "animate-spin" : ""}`}
                />
                Refresh
              </Button>

              {/* Additional Navigation Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Menu className="h-4 w-4 mr-2" />
                    More
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end">
                  <DropdownMenuItem onClick={() => navigate("/employees")}>
                    <Users className="mr-2 h-4 w-4" />
                    <span>Employees</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate("/qr-codes")}>
                    <QrCode className="mr-2 h-4 w-4" />
                    <span>QR Codes</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate("/reviews")}>
                    <Eye className="mr-2 h-4 w-4" />
                    <span>Reviews</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate("/notifications")}>
                    <Bell className="mr-2 h-4 w-4" />
                    <span>Notifications</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => navigate("/export-reports")}>
                    <Download className="mr-2 h-4 w-4" />
                    <span>Export Reports</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate("/qr-analytics")}>
                    <BarChart3 className="mr-2 h-4 w-4" />
                    <span>QR Analytics</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => navigate("/data-management")}
                  >
                    <Database className="mr-2 h-4 w-4" />
                    <span>Data Management</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate("/analytics")}
              >
                <BarChart3 className="h-4 w-4 mr-2" />
                Analytics
              </Button>

              <NotificationBell />

              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate("/company-settings")}
              >
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </Button>
              {/* User Menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="relative h-8 w-8 rounded-full"
                  >
                    <Avatar className="h-8 w-8">
                      <AvatarImage src="" alt={user?.email || ""} />
                      <AvatarFallback className="bg-blue-100 text-blue-600">
                        {getUserInitials()}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                  <div className="flex flex-col space-y-1 p-2">
                    <p className="text-sm font-medium leading-none">
                      {user?.email}
                    </p>
                    <p className="text-xs leading-none text-muted-foreground">
                      Team Administrator
                    </p>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => navigate("/settings")}>
                    <Settings className="mr-2 h-4 w-4" />
                    <span>Settings</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate("/profile")}>
                    <User className="mr-2 h-4 w-4" />
                    <span>Profile</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={handleLogout}
                    className="text-red-600"
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Log out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </header>

      <div className="p-6">
        {/* Enhanced Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {widgets.filter((w) => w.type === "stats").map(renderWidget)}
        </div>

        {/* Additional KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Response Rate
              </CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.responseRate}%</div>
              <p className="text-xs text-muted-foreground">
                Customer engagement
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Avg Response Time
              </CardTitle>
              <Zap className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.avgResponseTime}h</div>
              <p className="text-xs text-muted-foreground">Time to respond</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Top Performer
              </CardTitle>
              <Award className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-lg font-bold truncate">
                {stats.topRatedEmployee}
              </div>
              <p className="text-xs text-muted-foreground">
                Highest rated employee
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Departments</CardTitle>
              <Grid className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.departmentCount}</div>
              <p className="text-xs text-muted-foreground">
                Active departments
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {widgets.filter((w) => w.type === "chart").map(renderWidget)}
        </div>

        {/* Enhanced Tabs */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="reviews">Reviews</TabsTrigger>
            <TabsTrigger value="team">Team</TabsTrigger>
            <TabsTrigger value="performance">Performance</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Enhanced Recent Reviews */}
              <Card>
                <CardHeader>
                  <CardTitle>Recent Reviews</CardTitle>
                  <CardDescription>
                    Latest customer feedback with enhanced details
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {recentReviews.length > 0 ? (
                    recentReviews.map((review) => (
                      <div
                        key={review.id}
                        className="border-b border-gray-100 last:border-0 pb-4 last:pb-0"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center space-x-2">
                            <span className="font-medium">
                              {review.customer_name}
                            </span>
                            <Badge
                              variant={
                                review.review_type === "video"
                                  ? "default"
                                  : "secondary"
                              }
                            >
                              {review.review_type}
                            </Badge>
                            {!review.is_approved && (
                              <Badge variant="outline">Pending</Badge>
                            )}
                          </div>
                          <div className="flex items-center">
                            {[...Array(5)].map((_, i) => (
                              <Star
                                key={i}
                                className={`h-4 w-4 ${
                                  i < review.rating
                                    ? "fill-yellow-400 text-yellow-400"
                                    : "text-gray-300"
                                }`}
                              />
                            ))}
                          </div>
                        </div>
                        <p className="text-sm text-gray-600 mb-1">
                          {review.comment || "No comment provided"}
                        </p>
                        <div className="flex items-center justify-between">
                          <p className="text-xs text-gray-500">
                            For {review.employee?.name || "Unknown"} •{" "}
                            {formatDate(review.created_at)}
                          </p>
                          {review.video_url && (
                            <Badge variant="outline" className="text-xs">
                              Video
                            </Badge>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-center text-gray-500 py-4">
                      No reviews yet
                    </p>
                  )}
                </CardContent>
              </Card>

              {/* Enhanced Top Performers */}
              <Card>
                <CardHeader>
                  <CardTitle>Top Performers</CardTitle>
                  <CardDescription>
                    Team members with highest ratings and performance
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {topPerformers.length > 0 ? (
                    topPerformers.map((performer, index) => (
                      <div
                        key={performer.id}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                      >
                        <div className="flex items-center space-x-3">
                          <div className="h-10 w-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-semibold">
                            {index + 1}
                          </div>
                          <div className="flex items-center space-x-2">
                            {performer.photo_url && (
                              <img
                                src={performer.photo_url}
                                alt={performer.name}
                                className="h-8 w-8 rounded-full object-cover"
                              />
                            )}
                            <div>
                              <p className="font-medium">{performer.name}</p>
                              <p className="text-sm text-gray-600">
                                {performer.reviews_count || 0} reviews •{" "}
                                {performer.position || "N/A"}
                              </p>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <div className="text-right">
                            <div className="flex items-center space-x-1">
                              <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                              <span className="font-medium">
                                {performer.avg_rating || 0}
                              </span>
                            </div>
                            {performer.performance_score && (
                              <p className="text-xs text-gray-500">
                                Score: {performer.performance_score}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-center text-gray-500 py-4">
                      No performance data available
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="reviews">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Review Management</CardTitle>
                  <CardDescription>
                    Manage and moderate customer reviews with enhanced controls
                  </CardDescription>
                </div>
                <Button onClick={() => navigate("/reviews")}>
                  <Eye className="h-4 w-4 mr-2" />
                  View All Reviews
                </Button>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">
                      {stats.pendingReviews}
                    </div>
                    <div className="text-sm text-gray-600">Pending Reviews</div>
                  </div>
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">
                      {stats.approvedReviews}
                    </div>
                    <div className="text-sm text-gray-600">
                      Approved Reviews
                    </div>
                  </div>
                  <div className="text-center p-4 bg-yellow-50 rounded-lg">
                    <div className="text-2xl font-bold text-yellow-600">
                      {stats.avgRating}
                    </div>
                    <div className="text-sm text-gray-600">Average Rating</div>
                  </div>
                  <div className="text-center p-4 bg-purple-50 rounded-lg">
                    <div className="text-2xl font-bold text-purple-600">
                      {stats.customerSatisfaction}%
                    </div>
                    <div className="text-sm text-gray-600">Satisfaction</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="team">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Team Management</CardTitle>
                  <CardDescription>
                    Enhanced team management with department structure
                  </CardDescription>
                </div>
                <Button onClick={() => navigate("/employees")}>
                  <Plus className="h-4 w-4 mr-2" />
                  Manage Team
                </Button>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">
                      {stats.teamMembers}
                    </div>
                    <div className="text-sm text-gray-600">Active Members</div>
                  </div>
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">
                      {stats.departmentCount}
                    </div>
                    <div className="text-sm text-gray-600">Departments</div>
                  </div>
                  <div className="text-center p-4 bg-yellow-50 rounded-lg">
                    <div className="text-2xl font-bold text-yellow-600">
                      {stats.qrCodeScans}
                    </div>
                    <div className="text-sm text-gray-600">QR Code Scans</div>
                  </div>
                  <div className="text-center p-4 bg-purple-50 rounded-lg">
                    <div className="text-2xl font-bold text-purple-600">
                      {stats.responseRate}%
                    </div>
                    <div className="text-sm text-gray-600">Response Rate</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="performance">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Department Performance Chart */}
              <Card>
                <CardHeader>
                  <CardTitle>Department Performance</CardTitle>
                  <CardDescription>
                    Review performance by department
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData.departmentPerformance}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="value" fill="#3B82F6" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Daily Activity Chart */}
              <Card>
                <CardHeader>
                  <CardTitle>Daily Activity</CardTitle>
                  <CardDescription>
                    Review activity over the last 7 days
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={chartData.dailyActivity}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip />
                        <Area
                          type="monotone"
                          dataKey="reviews"
                          stroke="#10B981"
                          fill="#10B981"
                          fillOpacity={0.3}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="analytics">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Advanced Analytics</CardTitle>
                  <CardDescription>
                    Comprehensive insights and performance metrics
                  </CardDescription>
                </div>
                <Button onClick={() => navigate("/analytics")}>
                  <BarChart3 className="h-4 w-4 mr-2" />
                  View Full Analytics
                </Button>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">
                      {stats.reviewGrowth > 0 ? "+" : ""}
                      {stats.reviewGrowth}%
                    </div>
                    <div className="text-sm text-gray-600">Review Growth</div>
                  </div>
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">
                      {stats.avgRating}
                    </div>
                    <div className="text-sm text-gray-600">
                      Avg Rating Trend
                    </div>
                  </div>
                  <div className="text-center p-4 bg-purple-50 rounded-lg">
                    <div className="text-2xl font-bold text-purple-600">
                      {stats.customerSatisfaction}%
                    </div>
                    <div className="text-sm text-gray-600">
                      Customer Satisfaction
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Dashboard;
