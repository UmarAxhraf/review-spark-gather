import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Users,
  BarChart3,
  Settings,
  Home,
  QrCode,
  MessageSquare,
  Bell,
  FileText,
  LogOut,
  User,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  Menu,
  X,
  Database,
  HelpCircle,
  Crown,
  PlugZap,
  ChartArea,
  Mail,
  PanelsTopLeft,
} from "lucide-react";
import NotificationBell from "./NotificationBell";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

interface SidebarProps {
  className?: string;
}

const Sidebar = ({ className }: SidebarProps) => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isProfileExpanded, setIsProfileExpanded] = useState(false);
  const [notificationCount, setNotificationCount] = useState(0);
  const [companyName, setCompanyName] = useState<string | null>(null);

  // Ref for profile dropdown click-outside detection
  const profileDropdownRef = useRef<HTMLDivElement>(null);

  // Fetch notification count
  const fetchNotificationCount = async () => {
    if (!user) return;

    try {
      const { count, error } = await supabase
        .from("notifications")
        .select("*", { count: "exact", head: true })
        .eq("company_id", user.id)
        .eq("is_read", false);

      if (error) {
        console.error("Error fetching notification count:", error);
        return;
      }

      setNotificationCount(count || 0);
    } catch (error) {
      console.error("Error fetching notification count:", error);
    }
  };

  // Set up real-time subscription for notification count
  useEffect(() => {
    if (!user) return;

    fetchNotificationCount();

    // Set up real-time subscription for notification changes
    const subscription = supabase
      .channel("notifications-count-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
          filter: `company_id=eq.${user.id}`,
        },
        () => {
          // Refetch count when notifications change
          fetchNotificationCount();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [user]);

  // Fetch company name for display in profile dropdown
  useEffect(() => {
    const fetchCompanyName = async () => {
      if (!user?.id) return;
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("company_name")
          .eq("id", user.id)
          .single();

        if (error) {
          console.error("Error fetching company name:", error);
          return;
        }

        setCompanyName(data?.company_name ?? null);
      } catch (err) {
        console.error("Error fetching company name:", err);
      }
    };

    fetchCompanyName();
  }, [user?.id]);

  // Format notification count (9+ for counts over 9)
  const formatNotificationCount = (count: number) => {
    if (count === 0) return null;
    return count > 9 ? "9+" : count.toString();
  };

  const navigationItems = [
    {
      label: "Dashboard",
      path: "/dashboard",
      icon: Home,
    },
    {
      label: "Employee Panel",
      path: "/employees",
      icon: Users,
    },
    {
      label: "QR Codes",
      path: "/qr-codes",
      icon: QrCode,
    },
    {
      label: "Reviews",
      path: "/reviews",
      icon: MessageSquare,
    },
    {
      label: "Employee Projects",
      path: "/employee-projects",
      icon: FileText,
    },
    {
      label: "Platform Profiles",
      path: "/platforms",
      icon: PlugZap,
    },
    {
      label: "Analytics",
      path: "/analytics",
      icon: ChartArea,
    },
    {
      label: "Review Request",
      path: "/review-request",
      icon: Mail,
    },

    // {
    //   label: "Review Widget",
    //   path: "/review-widget",
    //   icon: PanelsTopLeft,
    // },

    {
      label: "Notifications",
      path: "/notifications",
      icon: Bell,
      hasNotification: true,
    },
    {
      label: "QR Analytics",
      path: "/qr-analytics",
      icon: BarChart3,
    },
  ];

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

  const toggleCollapse = () => {
    setIsCollapsed(!isCollapsed);
    setIsProfileExpanded(false); // Close profile when collapsing
  };

  const toggleMobile = () => {
    setIsMobileOpen(!isMobileOpen);
  };

  const handleNavigation = (path: string) => {
    navigate(path);
    setIsMobileOpen(false); // Close mobile menu after navigation
  };

  const handleUpgrade = () => {
    // Connect to pricing ID - you can replace this with your actual pricing logic
    navigate("/#pricing");
    toast.info("Redirecting to upgrade options...");
  };

  const handleSupport = () => {
    window.open("mailto:support@syncreviews.com", "_blank");
  };

  //   const handleSupport = () => {
  //   navigate('/support');
  // };

  // Click-outside handler for profile dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        profileDropdownRef.current &&
        !profileDropdownRef.current.contains(event.target as Node) &&
        isProfileExpanded
      ) {
        setIsProfileExpanded(false);
      }
    };

    if (isProfileExpanded) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isProfileExpanded]);

  return (
    <TooltipProvider>
      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
        <Button
          variant="ghost"
          size="sm"
          onClick={toggleMobile}
          className="p-2"
        >
          <Menu className="h-5 w-5" />
        </Button>

        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">SR</span>
          </div>
          <span className="font-semibold text-gray-900">SyncReviews</span>
        </div>

        <div className="flex items-center space-x-2">
          <NotificationBell />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-8 w-8 rounded-full">
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
                {companyName && (
                  <p className="text-sm font-bold leading-none text-blue-700">
                    {companyName}
                  </p>
                )}
                <p className="text-sm font-medium leading-none">
                  {user?.email}
                </p>
                <p className="text-xs leading-none text-muted-foreground">
                  Team Administrator
                </p>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate("/profile")}>
                <User className="mr-2 h-4 w-4" />
                <span>Profile</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate("/company-settings")}>
                <Settings className="mr-2 h-4 w-4" />
                <span>Settings</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={handleUpgrade}
                className="text-blue-600"
              >
                <Crown className="mr-2 h-4 w-4" />
                <span>Upgrade</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} className="text-red-600">
                <LogOut className="mr-2 h-4 w-4" />
                <span>Log out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Mobile Overlay */}
      {isMobileOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black bg-opacity-50"
          onClick={toggleMobile}
        />
      )}

      {/* Sidebar */}
      <div
        className={cn(
          "fixed left-0 top-0 z-50 h-full bg-white border-r border-gray-200 transition-all duration-300 ease-in-out flex flex-col",
          isCollapsed ? "w-20" : "w-64",
          isMobileOpen ? "translate-x-0" : "-translate-x-full",
          "lg:translate-x-0",
          "lg:relative lg:z-auto", // Desktop positioning
          className
        )}
      >
        {/* Sidebar Header */}
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          {!isCollapsed ? (
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">SR</span>
              </div>
              <span className="font-semibold text-gray-900">SyncReviews</span>
            </div>
          ) : (
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center mx-auto">
              <span className="text-white font-bold text-sm">SR</span>
            </div>
          )}

          {/* Desktop Collapse Button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleCollapse}
            className={cn(
              "hidden lg:flex p-1.5 h-auto",
              isCollapsed &&
                "absolute -right-3 top-4 bg-white border border-gray-200 rounded-full shadow-sm"
            )}
          >
            {isCollapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </Button>

          {/* Mobile Close Button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleMobile}
            className="lg:hidden p-1.5 h-auto"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Navigation Items */}
        <div className="flex-1 overflow-y-auto py-2.5">
          <nav className="space-y-1 px-3">
            {/* Data Tools dropdown moved to bottom */}
            {false &&
              (() => {
                const label = "Data Tools";
                const Icon = Database;
                const isGroupActive = [
                  "/export-reports",
                  "/data-management",
                ].includes(location.pathname);
                const triggerClasses = cn(
                  "w-full justify-start h-10 relative",
                  isCollapsed && "justify-center px-0",
                  !isCollapsed &&
                    (isGroupActive
                      ? "bg-blue-600 text-white hover:bg-blue-700"
                      : "text-gray-700 hover:bg-gray-100")
                );

                const trigger = (
                  <Button variant="ghost" className={triggerClasses}>
                    <Icon className={cn("h-5 w-5", !isCollapsed && "mr-3")} />
                    {!isCollapsed && (
                      <span className="flex-1 text-left">{label}</span>
                    )}
                    {!isCollapsed && (
                      <ChevronDown className="h-4 w-4 ml-auto" />
                    )}
                  </Button>
                );

                if (isCollapsed) {
                  return (
                    <DropdownMenu>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <DropdownMenuTrigger asChild>
                            {React.cloneElement(trigger as React.ReactElement, {
                              className: cn(
                                triggerClasses,
                                isGroupActive &&
                                  "bg-blue-600 text-white hover:bg-blue-700"
                              ),
                            })}
                          </DropdownMenuTrigger>
                        </TooltipTrigger>
                        <TooltipContent side="right" className="ml-2">
                          <p>{label}</p>
                        </TooltipContent>
                      </Tooltip>
                      <DropdownMenuContent
                        side="right"
                        align="start"
                        className="w-56"
                      >
                        <DropdownMenuItem
                          onClick={() => handleNavigation("/qr-analytics")}
                        >
                          <BarChart3 className="mr-2 h-4 w-4" />
                          <span>QR Analytics</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleNavigation("/export-reports")}
                        >
                          <FileText className="mr-2 h-4 w-4" />
                          <span>Export & Reports</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleNavigation("/data-management")}
                        >
                          <Database className="mr-2 h-4 w-4" />
                          <span>Data Management</span>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  );
                }

                return (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>{trigger}</DropdownMenuTrigger>
                    <DropdownMenuContent
                      side="right"
                      align="start"
                      className="w-56"
                    >
                      <DropdownMenuItem
                        onClick={() => handleNavigation("/qr-analytics")}
                      >
                        <BarChart3 className="mr-2 h-4 w-4" />
                        <span>QR Analytics</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleNavigation("/export-reports")}
                      >
                        <FileText className="mr-2 h-4 w-4" />
                        <span>Export & Reports</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleNavigation("/data-management")}
                      >
                        <Database className="mr-2 h-4 w-4" />
                        <span>Data Management</span>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                );
              })()}

            {navigationItems.map((item) => {
              // Hide flat entries that are moved to the Data Tools dropdown
              const hiddenPaths = new Set([
                "/export-reports",
                "/data-management",
                "/analytics",
              ]);
              if (hiddenPaths.has(item.path)) return null;
              // Insert Analytics dropdown in place of the flat QR Analytics item
              if (item.path === "/qr-analytics") {
                const label = "Analytics";
                const IconGroup = ChartArea;
                const isGroupActive = ["/analytics", "/qr-analytics"].includes(
                  location.pathname
                );
                const triggerClasses = cn(
                  "w-full justify-start h-10 relative",
                  isCollapsed && "justify-center px-0",
                  !isCollapsed &&
                    (isGroupActive
                      ? "bg-blue-600 text-white hover:bg-blue-700"
                      : "text-gray-700 hover:bg-gray-100")
                );

                const trigger = (
                  <Button variant="ghost" className={triggerClasses}>
                    <IconGroup
                      className={cn("h-5 w-5", !isCollapsed && "mr-3")}
                    />
                    {!isCollapsed && (
                      <span className="flex-1 text-left">{label}</span>
                    )}
                    {!isCollapsed && (
                      <ChevronDown className="h-4 w-4 ml-auto" />
                    )}
                  </Button>
                );

                if (isCollapsed) {
                  return (
                    <>
                      <DropdownMenu key={`${item.path}-analytics`}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <DropdownMenuTrigger asChild>
                              {React.cloneElement(
                                trigger as React.ReactElement,
                                {
                                  className: cn(
                                    triggerClasses,
                                    isGroupActive &&
                                      "bg-blue-600 text-white hover:bg-blue-700"
                                  ),
                                }
                              )}
                            </DropdownMenuTrigger>
                          </TooltipTrigger>
                          <TooltipContent side="right" className="ml-2">
                            <p>{label}</p>
                          </TooltipContent>
                        </Tooltip>
                        <DropdownMenuContent
                          side="bottom"
                          align="start"
                          className="w-56"
                        >
                          <DropdownMenuItem
                            onClick={() => handleNavigation("/analytics")}
                          >
                            <ChartArea className="mr-2 h-4 w-4" />
                            <span>Analytics</span>
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleNavigation("/qr-analytics")}
                          >
                            <BarChart3 className="mr-2 h-4 w-4" />
                            <span>QR Analytics</span>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>

                      {/* Data Tools directly below Analytics */}
                      {(() => {
                        const dataLabel = "Data Tools";
                        const DataIcon = Database;
                        const isDataActive = [
                          "/export-reports",
                          "/data-management",
                        ].includes(location.pathname);
                        const dataTriggerClasses = cn(
                          "w-full justify-start h-10 relative",
                          isCollapsed && "justify-center px-0",
                          !isCollapsed &&
                            (isDataActive
                              ? "bg-blue-600 text-white hover:bg-blue-700"
                              : "text-gray-700 hover:bg-gray-100")
                        );
                        const dataTrigger = (
                          <Button
                            variant="ghost"
                            className={dataTriggerClasses}
                          >
                            <DataIcon
                              className={cn("h-5 w-5", !isCollapsed && "mr-3")}
                            />
                            {!isCollapsed && (
                              <span className="flex-1 text-left">
                                {dataLabel}
                              </span>
                            )}
                            {!isCollapsed && (
                              <ChevronDown className="h-4 w-4 ml-auto" />
                            )}
                          </Button>
                        );
                        return (
                          <DropdownMenu key="data-tools-dropdown">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <DropdownMenuTrigger asChild>
                                  {React.cloneElement(
                                    dataTrigger as React.ReactElement,
                                    {
                                      className: cn(
                                        dataTriggerClasses,
                                        isDataActive &&
                                          "bg-blue-600 text-white hover:bg-blue-700"
                                      ),
                                    }
                                  )}
                                </DropdownMenuTrigger>
                              </TooltipTrigger>
                              <TooltipContent side="right" className="ml-2">
                                <p>{dataLabel}</p>
                              </TooltipContent>
                            </Tooltip>
                            <DropdownMenuContent
                              side="bottom"
                              align="start"
                              className="w-56"
                            >
                              <DropdownMenuItem
                                onClick={() =>
                                  handleNavigation("/export-reports")
                                }
                              >
                                <FileText className="mr-2 h-4 w-4" />
                                <span>Export & Reports</span>
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() =>
                                  handleNavigation("/data-management")
                                }
                              >
                                <Database className="mr-2 h-4 w-4" />
                                <span>Data Management</span>
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        );
                      })()}
                    </>
                  );
                }

                return (
                  <>
                    <DropdownMenu key={`${item.path}-analytics`}>
                      <DropdownMenuTrigger asChild>
                        {trigger}
                      </DropdownMenuTrigger>
                      <DropdownMenuContent
                        side="bottom"
                        align="start"
                        className="w-56"
                      >
                        <DropdownMenuItem
                          onClick={() => handleNavigation("/analytics")}
                        >
                          <ChartArea className="mr-2 h-4 w-4" />
                          <span>Analytics</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleNavigation("/qr-analytics")}
                        >
                          <BarChart3 className="mr-2 h-4 w-4" />
                          <span>QR Analytics</span>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>

                    {/* Data Tools directly below Analytics */}
                    {(() => {
                      const dataLabel = "Data Tools";
                      const DataIcon = Database;
                      const isDataActive = [
                        "/export-reports",
                        "/data-management",
                      ].includes(location.pathname);
                      const dataTriggerClasses = cn(
                        "w-full justify-start h-10 relative",
                        isCollapsed && "justify-center px-0",
                        !isCollapsed &&
                          (isDataActive
                            ? "bg-blue-600 text-white hover:bg-blue-700"
                            : "text-gray-700 hover:bg-gray-100")
                      );
                      const dataTrigger = (
                        <Button variant="ghost" className={dataTriggerClasses}>
                          <DataIcon
                            className={cn("h-5 w-5", !isCollapsed && "mr-3")}
                          />
                          {!isCollapsed && (
                            <span className="flex-1 text-left">
                              {dataLabel}
                            </span>
                          )}
                          {!isCollapsed && (
                            <ChevronDown className="h-4 w-4 ml-auto" />
                          )}
                        </Button>
                      );
                      return (
                        <DropdownMenu key="data-tools-dropdown">
                          <DropdownMenuTrigger asChild>
                            {dataTrigger}
                          </DropdownMenuTrigger>
                          <DropdownMenuContent
                            side="bottom"
                            align="start"
                            className="w-56"
                          >
                            <DropdownMenuItem
                              onClick={() =>
                                handleNavigation("/export-reports")
                              }
                            >
                              <FileText className="mr-2 h-4 w-4" />
                              <span>Export & Reports</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() =>
                                handleNavigation("/data-management")
                              }
                            >
                              <Database className="mr-2 h-4 w-4" />
                              <span>Data Management</span>
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      );
                    })()}
                  </>
                );
              }
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              const showNotificationBadge =
                item.hasNotification && notificationCount > 0;
              const notificationText =
                formatNotificationCount(notificationCount);

              const menuButton = (
                <Button
                  key={item.path}
                  variant={isActive ? "default" : "ghost"}
                  className={cn(
                    "w-full justify-start h-10 relative",
                    isCollapsed && "justify-center px-0",
                    isActive && "bg-blue-600 text-white hover:bg-blue-700",
                    !isActive && "text-gray-700 hover:bg-gray-100"
                  )}
                  onClick={() => handleNavigation(item.path)}
                >
                  <Icon className={cn("h-5 w-5", !isCollapsed && "mr-3")} />
                  {!isCollapsed && (
                    <>
                      <span className="flex-1 text-left">{item.label}</span>
                      {showNotificationBadge && (
                        <Badge
                          variant="destructive"
                          className="ml-auto h-5 min-w-[20px] rounded-full px-1.5 text-xs font-medium"
                        >
                          {notificationText}
                        </Badge>
                      )}
                    </>
                  )}
                  {isCollapsed && showNotificationBadge && (
                    <Badge
                      variant="destructive"
                      className="absolute -top-1 -right-1 h-4 min-w-[16px] rounded-full px-1 text-xs font-medium"
                    >
                      {notificationText}
                    </Badge>
                  )}
                </Button>
              );

              // Wrap with tooltip when collapsed
              if (isCollapsed) {
                return (
                  <Tooltip key={item.path}>
                    <TooltipTrigger asChild>{menuButton}</TooltipTrigger>
                    <TooltipContent side="right" className="ml-2">
                      <p>{item.label}</p>
                    </TooltipContent>
                  </Tooltip>
                );
              }

              return menuButton;
            })}
          </nav>
        </div>

        {/* Bottom Section - Support and Profile */}
        <div className="border-t border-gray-200 relative">
          {/* Support Button */}
          <div className="px-3 pt-1 py-1">
            {isCollapsed ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    className="w-full justify-center h-10 text-gray-700 hover:bg-gray-100 px-0"
                    onClick={handleSupport}
                  >
                    <HelpCircle className="h-5 w-5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right" className="ml-2">
                  <p>Support</p>
                </TooltipContent>
              </Tooltip>
            ) : (
              <Button
                variant="ghost"
                className="w-full justify-start h-10 text-gray-700 hover:bg-gray-100"
                onClick={handleSupport}
              >
                <HelpCircle className="h-5 w-5 mr-3" />
                <span>Support</span>
              </Button>
            )}
          </div>

          {/* Profile Section */}
          {!isCollapsed ? (
            <div className="relative" ref={profileDropdownRef}>
              {/* Profile Dropdown Content - Absolute Overlay */}
              {isProfileExpanded && (
                <div className="absolute bottom-full left-3 right-3 mb-2 bg-white border border-gray-200 rounded-lg shadow-lg p-2 space-y-1 z-50">
                  <div className="flex flex-col space-y-1 p-2">
                    {companyName && (
                      <p className="text-sm font-bold leading-none text-blue-700">
                        {companyName}
                      </p>
                    )}
                    <p className="text-sm font-medium leading-none">
                      {user?.email}
                    </p>
                    <p className="text-xs leading-none text-muted-foreground">
                      Team Administrator
                    </p>
                  </div>
                  <DropdownMenuSeparator />
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start"
                    onClick={() => {
                      navigate("/profile");
                      setIsProfileExpanded(false);
                    }}
                  >
                    <User className="h-4 w-4 mr-2" />
                    Profile
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start"
                    onClick={() => {
                      navigate("/company-settings");
                      setIsProfileExpanded(false);
                    }}
                  >
                    <Settings className="h-4 w-4 mr-2" />
                    Settings
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                    onClick={() => {
                      handleUpgrade();
                      setIsProfileExpanded(false);
                    }}
                  >
                    <Crown className="h-4 w-4 mr-2" />
                    Upgrade
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50"
                    onClick={() => {
                      handleLogout();
                      setIsProfileExpanded(false);
                    }}
                  >
                    <LogOut className="h-4 w-4 mr-2" />
                    Log out
                  </Button>
                </div>
              )}

              {/* Profile Dropdown Trigger */}
              <div className="px-3 py-1">
                <Button
                  variant="ghost"
                  className="w-full p-2 h-auto justify-between"
                  onClick={() => setIsProfileExpanded(!isProfileExpanded)}
                >
                  <div className="flex items-center space-x-3 min-w-0">
                    <Avatar className="h-8 w-8 flex-shrink-0">
                      <AvatarImage src="" alt={user?.email || ""} />
                      <AvatarFallback className="bg-blue-100 text-blue-600">
                        {getUserInitials()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0 text-left">
                      {companyName && (
                        <p className="text-xs text-gray-700 truncate">
                          {companyName}
                        </p>
                      )}
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {user?.email}
                      </p>
                      <p className="text-xs text-gray-500">
                        Team Administrator
                      </p>
                    </div>
                  </div>
                  <div className="flex-shrink-0 ml-2">
                    {isProfileExpanded ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronUp className="h-4 w-4" />
                    )}
                  </div>
                </Button>
              </div>
            </div>
          ) : (
            /* Collapsed Profile Section */
            <div className="px-3 py-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="w-full p-2 justify-center">
                    <Avatar className="h-6 w-6">
                      <AvatarImage src="" alt={user?.email || ""} />
                      <AvatarFallback className="bg-blue-100 text-blue-600 text-xs">
                        {getUserInitials()}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent side="right" align="end" className="w-56">
                  <div className="flex flex-col space-y-1 p-2">
                    {companyName && (
                      <p className="text-sm font-medium leading-none text-gray-900">
                        {companyName}
                      </p>
                    )}
                    <p className="text-sm font-medium leading-none">
                      {user?.email}
                    </p>
                    <p className="text-xs leading-none text-muted-foreground">
                      Team Administrator
                    </p>
                  </div>
                  <DropdownMenuSeparator />
                  {/* <DropdownMenuItem onClick={handleSupport}>
                    <HelpCircle className="mr-2 h-4 w-4" />
                    <span>Support</span>
                  </DropdownMenuItem> */}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => navigate("/profile")}>
                    <User className="mr-2 h-4 w-4" />
                    <span>Profile</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => navigate("/company-settings")}
                  >
                    <Settings className="mr-2 h-4 w-4" />
                    <span>Settings</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={handleUpgrade}
                    className="text-blue-600"
                  >
                    <Crown className="mr-2 h-4 w-4" />
                    <span>Upgrade</span>
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
          )}
        </div>
      </div>
    </TooltipProvider>
  );
};

export default Sidebar;
