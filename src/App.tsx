import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Suspense, lazy } from "react";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import { QRCodeProvider } from "./contexts/QRCodeContext";
import { DirectSubscriptionProvider } from "./contexts/DirectSubscriptionContext";
import { SupabaseSubscriptionProvider } from "@/contexts/SupabaseSubscriptionContext";
import { SubscriptionProvider } from "./contexts/SubscriptionContext";
import { SubscriptionGuard } from "@/components/SubscriptionGuard";
//import { SubscriptionErrorDialog } from "./components/SubscriptionErrorDialog";

// Lazy load components for code splitting
const Index = lazy(() => import("./pages/Index"));
const Login = lazy(() => import("./pages/Login"));
const Signup = lazy(() => import("./pages/Signup"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Employees = lazy(() => import("./pages/Employees"));
const QRCodes = lazy(() => import("./pages/QRCodes"));
const Reviews = lazy(() => import("./pages/Reviews"));
const Analytics = lazy(() => import("./pages/Analytics"));
const ReviewSubmission = lazy(() => import("./pages/ReviewSubmission"));
const Notifications = lazy(() => import("./pages/Notifications"));
const NotFound = lazy(() => import("./pages/NotFound"));
const CompanySettings = lazy(() => import("./pages/CompanySettings"));
const ExportReports = lazy(() => import("./pages/ExportReports"));
const QRCodeAnalytics = lazy(() => import("./pages/QRCodeAnalytics"));
const DataManagement = lazy(() => import("./pages/DataManagement"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const Profile = lazy(() => import("./pages/Profile"));
const PaymentSuccess = lazy(() => import("./pages/PaymentSuccess"));

// Loading component for Suspense fallback
const PageLoader = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
  </div>
);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 10 * 60 * 1000, // 10 minutes
      retry: 3, // Increase retries
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff
      refetchOnWindowFocus: true,
      refetchOnMount: true,
      refetchOnReconnect: true,
    },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <SubscriptionProvider>
        <SupabaseSubscriptionProvider>
          <DirectSubscriptionProvider>
            <QRCodeProvider>
              <TooltipProvider>
                <Toaster />
                <Sonner />
                <BrowserRouter>
                  <Suspense fallback={<PageLoader />}>
                    {/* <SubscriptionErrorDialog /> */}
                    <Routes>
                      {/* Public routes */}
                      <Route path="/" element={<Index />} />
                      <Route path="/login" element={<Login />} />
                      <Route path="/signup" element={<Signup />} />
                      <Route
                        path="/review/:qrCodeId"
                        element={<ReviewSubmission />}
                      />
                      <Route
                        path="/forgot-password"
                        element={<ForgotPassword />}
                      />
                      <Route
                        path="/reset-password"
                        element={<ResetPassword />}
                      />
                      <Route
                        path="/payment-success"
                        element={<PaymentSuccess />}
                      />

                      {/* Protected routes */}
                      <Route
                        path="/dashboard"
                        element={
                          <ProtectedRoute>
                            <SubscriptionGuard>
                              <Dashboard />
                            </SubscriptionGuard>
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/employees"
                        element={
                          <ProtectedRoute>
                            <SubscriptionGuard>
                              <Employees />
                            </SubscriptionGuard>
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/qr-codes"
                        element={
                          <ProtectedRoute>
                            <SubscriptionGuard>
                              <QRCodes />
                            </SubscriptionGuard>
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/reviews"
                        element={
                          <ProtectedRoute>
                            <SubscriptionGuard>
                              <Reviews />
                            </SubscriptionGuard>
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/analytics"
                        element={
                          <ProtectedRoute>
                            <SubscriptionGuard>
                              <Analytics />
                            </SubscriptionGuard>
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/notifications"
                        element={
                          <ProtectedRoute>
                            <SubscriptionGuard>
                              <Notifications />
                            </SubscriptionGuard>
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/profile"
                        element={
                          <ProtectedRoute requiresSubscription={false}>
                            <Profile />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/company-settings"
                        element={
                          <ProtectedRoute>
                            <CompanySettings />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/export-reports"
                        element={
                          <ProtectedRoute>
                            <SubscriptionGuard>
                              <ExportReports />
                            </SubscriptionGuard>
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/qr-analytics"
                        element={
                          <ProtectedRoute>
                            <SubscriptionGuard>
                              <QRCodeAnalytics />
                            </SubscriptionGuard>
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/data-management"
                        element={
                          <ProtectedRoute>
                            <SubscriptionGuard>
                              <DataManagement />
                            </SubscriptionGuard>
                          </ProtectedRoute>
                        }
                      />
                      <Route path="*" element={<NotFound />} />
                    </Routes>
                  </Suspense>
                </BrowserRouter>
              </TooltipProvider>
            </QRCodeProvider>
          </DirectSubscriptionProvider>
        </SupabaseSubscriptionProvider>
      </SubscriptionProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
