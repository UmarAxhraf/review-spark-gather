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
import SidebarLayout from "@/components/SidebarLayout";
import GoogleBusinessCallback from "@/components/GoogleBusinessCallback";
import FacebookCallback from "./components/FacebookCallback";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import DataDeletion from "./pages/DataDeletion";

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
const ProjectSubmission = lazy(() => import("./pages/ProjectSubmission"));
const Projects = lazy(() => import("./pages/Projects"));
const ProjectDetails = lazy(() => import("./pages/ProjectDetails"));
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
const Platform = lazy(() => import("./pages/Platform"));
const Support = lazy(() => import("./pages/Support"));
const ReviewRequest = lazy(() => import("./pages/ReviewRequest"));
const ReviewWidget = lazy(() => import("./pages/ReviewWidget"));

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
                        path="/project/:qrCodeId"
                        element={<ProjectSubmission />}
                      />
                      <Route
                        path="/review/company/:companyQrId"
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
                      <Route
                        path="/google-business-callback"
                        element={<GoogleBusinessCallback />}
                      />
                      <Route
                        path="/facebook-callback"
                        element={<FacebookCallback />}
                      />
                      <Route
                        path="/privacy-policy"
                        element={<PrivacyPolicy />}
                      />
                      <Route path="/data-deletion" element={<DataDeletion />} />

                      {/* Protected routes with sidebar */}
                      <Route
                        path="/dashboard"
                        element={
                          <ProtectedRoute>
                            <SubscriptionGuard>
                              <SidebarLayout>
                                <Dashboard />
                              </SidebarLayout>
                            </SubscriptionGuard>
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/employees"
                        element={
                          <ProtectedRoute>
                            <SubscriptionGuard>
                              <SidebarLayout>
                                <Employees />
                              </SidebarLayout>
                            </SubscriptionGuard>
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/qr-codes"
                        element={
                          <ProtectedRoute>
                            <SubscriptionGuard>
                              <SidebarLayout>
                                <QRCodes />
                              </SidebarLayout>
                            </SubscriptionGuard>
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/reviews"
                        element={
                          <ProtectedRoute>
                            <SubscriptionGuard>
                              <SidebarLayout>
                                <Reviews />
                              </SidebarLayout>
                            </SubscriptionGuard>
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/employee-projects"
                        element={
                          <ProtectedRoute>
                            <SubscriptionGuard>
                              <SidebarLayout>
                                <Projects />
                              </SidebarLayout>
                            </SubscriptionGuard>
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/employee-projects/:id"
                        element={
                          <ProtectedRoute>
                            <SubscriptionGuard>
                              <SidebarLayout>
                                <ProjectDetails />
                              </SidebarLayout>
                            </SubscriptionGuard>
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/review-request"
                        element={
                          <ProtectedRoute>
                            <SubscriptionGuard>
                              <SidebarLayout>
                                <ReviewRequest />
                              </SidebarLayout>
                            </SubscriptionGuard>
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/review-widget"
                        element={
                          <ProtectedRoute>
                            <SubscriptionGuard>
                              <SidebarLayout>
                                <ReviewWidget />
                              </SidebarLayout>
                            </SubscriptionGuard>
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/analytics"
                        element={
                          <ProtectedRoute>
                            <SubscriptionGuard>
                              <SidebarLayout>
                                <Analytics />
                              </SidebarLayout>
                            </SubscriptionGuard>
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/platforms"
                        element={
                          <ProtectedRoute>
                            <SubscriptionGuard>
                              <SidebarLayout>
                                <Platform />
                              </SidebarLayout>
                            </SubscriptionGuard>
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/notifications"
                        element={
                          <ProtectedRoute>
                            <SubscriptionGuard>
                              <SidebarLayout>
                                <Notifications />
                              </SidebarLayout>
                            </SubscriptionGuard>
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/support"
                        element={
                          <ProtectedRoute>
                            <SubscriptionGuard>
                              <SidebarLayout>
                                <Support />
                              </SidebarLayout>
                            </SubscriptionGuard>
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/profile"
                        element={
                          <ProtectedRoute requiresSubscription={false}>
                            <SidebarLayout>
                              <Profile />
                            </SidebarLayout>
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/company-settings"
                        element={
                          <ProtectedRoute>
                            <SidebarLayout>
                              <CompanySettings />
                            </SidebarLayout>
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/export-reports"
                        element={
                          <ProtectedRoute>
                            <SubscriptionGuard>
                              <SidebarLayout>
                                <ExportReports />
                              </SidebarLayout>
                            </SubscriptionGuard>
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/qr-analytics"
                        element={
                          <ProtectedRoute>
                            <SubscriptionGuard>
                              <SidebarLayout>
                                <QRCodeAnalytics />
                              </SidebarLayout>
                            </SubscriptionGuard>
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/data-management"
                        element={
                          <ProtectedRoute>
                            <SubscriptionGuard>
                              <SidebarLayout>
                                <DataManagement />
                              </SidebarLayout>
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
