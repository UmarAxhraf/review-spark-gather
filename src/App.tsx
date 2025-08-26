import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Dashboard from "./pages/Dashboard";
import Employees from "./pages/Employees";
import QRCodes from "./pages/QRCodes";
import Reviews from "./pages/Reviews";
import Analytics from "./pages/Analytics";
import ReviewSubmission from "./pages/ReviewSubmission";
import Notifications from "./pages/Notifications";
import NotFound from "./pages/NotFound";
import CompanySettings from "./pages/CompanySettings";
import ExportReports from "./pages/ExportReports";
import QRCodeAnalytics from "./pages/QRCodeAnalytics";
import { QRCodeProvider } from "./contexts/QRCodeContext";
import DataManagement from "./pages/DataManagement";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <QRCodeProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              {/* Public routes - accessible without authentication */}
              <Route path="/" element={<Index />} />
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
              <Route path="/review/:qrCodeId" element={<ReviewSubmission />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              {/* Protected routes - require authentication */}
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <Dashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/employees"
                element={
                  <ProtectedRoute>
                    <Employees />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/qr-codes"
                element={
                  <ProtectedRoute>
                    <QRCodes />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/reviews"
                element={
                  <ProtectedRoute>
                    <Reviews />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/analytics"
                element={
                  <ProtectedRoute>
                    <Analytics />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/notifications"
                element={
                  <ProtectedRoute>
                    <Notifications />
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
                    <ExportReports />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/qr-analytics"
                element={
                  <ProtectedRoute>
                    <QRCodeAnalytics />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/data-management"
                element={
                  <ProtectedRoute>
                    <DataManagement />
                  </ProtectedRoute>
                }
              />
              {/* Catch-all route for 404 pages */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </QRCodeProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
