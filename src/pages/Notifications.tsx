import { useState, useEffect, useRef } from "react";
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
import {
  Bell,
  Check,
  X,
  Star,
  Users,
  QrCode,
  AlertCircle,
  Settings,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { PageLoading } from "@/components/ui/page-loading";
import {
  NotificationSkeleton,
  StatsCardSkeleton,
} from "@/components/ui/skeleton-loaders";
import { Skeleton } from "@/components/ui/skeleton";
import { BackButton } from "@/components/ui/back-button";
import { useScreenReader } from "@/hooks/use-screen-reader";
import { useIsMobile } from "@/hooks/use-mobile";

interface Notification {
  id: string;
  type: "review" | "team" | "qr" | "system";
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  priority: "low" | "medium" | "high";
  actionUrl?: string;
}

const Notifications = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { announcePolite, announceAssertive } = useScreenReader();
  const isMobile = useIsMobile();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<
    "all" | "unread" | "review" | "team" | "qr" | "system"
  >("all");
  const channelRef = useRef<any>(null);

  // Fetch notifications from Supabase
  const fetchNotifications = async () => {
    try {
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching notifications:", error);
        toast({
          title: "Error",
          description: "Failed to load notifications",
          variant: "destructive",
        });
        return;
      }

      // Transform Supabase data to match our interface
      const transformedNotifications: Notification[] = (data || []).map(
        (notification) => ({
          id: notification.id,
          type: notification.type,
          title: notification.title,
          message: notification.message,
          isRead: notification.is_read,
          createdAt: notification.created_at,
          priority: notification.priority,
          actionUrl: notification.action_url,
        })
      );

      setNotifications(transformedNotifications);
      announcePolite("Notifications loaded successfully");
    } catch (error) {
      console.error("Error fetching notifications:", error);
      announceAssertive("Failed to load notifications");
      toast({
        title: "Error",
        description: "Failed to load notifications",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Set up real-time subscription
  useEffect(() => {
    fetchNotifications();

    // Clean up any existing channel before creating a new one
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    // Create a new channel with a unique name
    const channelName = `notifications-changes-${Date.now()}`;
    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
        },
        (payload) => {
          //console.log("Notification change received:", payload);

          if (payload.eventType === "INSERT") {
            const newNotification: Notification = {
              id: payload.new.id,
              type: payload.new.type,
              title: payload.new.title,
              message: payload.new.message,
              isRead: payload.new.is_read,
              createdAt: payload.new.created_at,
              priority: payload.new.priority,
              actionUrl: payload.new.action_url,
            };

            setNotifications((prev) => [newNotification, ...prev]);

            // Enhanced announcement for new notifications
            announceAssertive(
              `New ${newNotification.priority} priority notification: ${newNotification.title}`
            );

            // Show toast for new notifications
            toast({
              title: "New Notification",
              description: newNotification.title,
            });
          } else if (payload.eventType === "UPDATE") {
            setNotifications((prev) =>
              prev.map((notification) =>
                notification.id === payload.new.id
                  ? {
                      ...notification,
                      isRead: payload.new.is_read,
                      title: payload.new.title,
                      message: payload.new.message,
                      priority: payload.new.priority,
                    }
                  : notification
              )
            );
            announcePolite("Notification updated");
          } else if (payload.eventType === "DELETE") {
            setNotifications((prev) =>
              prev.filter((notification) => notification.id !== payload.old.id)
            );
            announcePolite("Notification removed");
          }
        }
      )
      .subscribe((status) => {
        //console.log("Subscription status:", status);
      });

    channelRef.current = channel;

    // Cleanup subscription on unmount
    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [announcePolite, announceAssertive]); // Added dependencies

  const filteredNotifications = notifications.filter((notification) => {
    if (filterType === "all") return true;
    if (filterType === "unread") return !notification.isRead;
    return notification.type === filterType;
  });

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  // Enhanced mark as read function
  const markAsRead = async (id: string) => {
    try {
      const { error } = await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("id", id);

      if (error) {
        console.error("Error marking notification as read:", error);
        announceAssertive("Failed to mark notification as read");
        toast({
          title: "Error",
          description: "Failed to mark notification as read",
          variant: "destructive",
        });
        return;
      }

      // Update local state immediately for better UX
      setNotifications((prev) =>
        prev.map((notification) =>
          notification.id === id
            ? { ...notification, isRead: true }
            : notification
        )
      );
      announcePolite("Notification marked as read");
    } catch (error) {
      console.error("Error marking notification as read:", error);
      announceAssertive("Failed to mark notification as read");
    }
  };

  // Enhanced mark all as read function
  const markAllAsRead = async () => {
    try {
      const unreadIds = notifications.filter((n) => !n.isRead).map((n) => n.id);

      if (unreadIds.length === 0) {
        announcePolite("No unread notifications to mark");
        return;
      }

      const { error } = await supabase
        .from("notifications")
        .update({ is_read: true })
        .in("id", unreadIds);

      if (error) {
        console.error("Error marking all notifications as read:", error);
        announceAssertive("Failed to mark all notifications as read");
        toast({
          title: "Error",
          description: "Failed to mark all notifications as read",
          variant: "destructive",
        });
        return;
      }

      // Update local state
      setNotifications((prev) =>
        prev.map((notification) => ({ ...notification, isRead: true }))
      );
      announcePolite(`${unreadCount} notifications marked as read`);
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
      announceAssertive("Failed to mark all notifications as read");
    }
  };

  const deleteNotification = async (id: string) => {
    try {
      const { error } = await supabase
        .from("notifications")
        .delete()
        .eq("id", id);

      if (error) {
        console.error("Error deleting notification:", error);
        announceAssertive("Failed to delete notification");
        toast({
          title: "Error",
          description: "Failed to delete notification",
          variant: "destructive",
        });
        return;
      }

      // Update local state
      setNotifications((prev) =>
        prev.filter((notification) => notification.id !== id)
      );
      announcePolite("Notification deleted");
    } catch (error) {
      console.error("Error deleting notification:", error);
      announceAssertive("Failed to delete notification");
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "review":
        return <Star className="h-6 w-6 text-yellow-500" />;
      case "team":
        return <Users className="h-6 w-6 text-blue-500" />;
      case "qr":
        return <QrCode className="h-6 w-6 text-green-500" />;
      case "system":
        return <Settings className="h-6 w-6 text-gray-500" />;
      default:
        return <AlertCircle className="h-6 w-6 text-gray-500" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "bg-red-100 text-red-800";
      case "medium":
        return "bg-yellow-100 text-yellow-800";
      case "low":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor(
      (now.getTime() - date.getTime()) / (1000 * 60 * 60)
    );

    if (diffInHours < 1) {
      return "Just now";
    } else if (diffInHours < 24) {
      return `${diffInHours}h ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  // Count notifications by type
  const reviewCount = notifications.filter(
    (n) => n.type === "review" && !n.isRead
  ).length;
  const teamCount = notifications.filter(
    (n) => n.type === "team" && !n.isRead
  ).length;
  const qrCount = notifications.filter(
    (n) => n.type === "qr" && !n.isRead
  ).length;
  const systemCount = notifications.filter(
    (n) => n.type === "system" && !n.isRead
  ).length;

  if (loading) {
    return (
      <div className="space-y-6 p-6">
        {/* Header skeleton */}
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-64" />
          </div>
          <div className="flex items-center space-x-4">
            <Skeleton className="h-10 w-32" />
            <Skeleton className="h-10 w-24" />
          </div>
        </div>

        {/* Stats skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <StatsCardSkeleton key={i} />
          ))}
        </div>

        {/* Notifications skeleton */}
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-32" />
          </CardHeader>
          <CardContent>
            {Array.from({ length: 5 }).map((_, i) => (
              <NotificationSkeleton key={i} />
            ))}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="mb-6">
        <BackButton />
      </div>

      {/* Responsive Header */}
      <div
        className={`${
          isMobile ? "space-y-4" : "flex items-center justify-between"
        }`}
      >
        <div>
          <h1
            className={`${
              isMobile ? "text-2xl" : "text-3xl"
            } font-bold text-gray-900`}
          >
            Notifications
          </h1>
          <p className="text-gray-600">
            Stay updated with your team and review activities
          </p>
        </div>

        {/* Responsive Button Layout */}
        <div
          className={`${
            isMobile
              ? "flex flex-col space-y-2 w-full"
              : "flex items-center space-x-4"
          }`}
        >
          {unreadCount > 0 && (
            <Button
              onClick={markAllAsRead}
              variant="outline"
              size={isMobile ? "default" : "sm"}
              className={isMobile ? "w-full" : ""}
            >
              <Check className="h-4 w-4 mr-2" />
              Mark All Read ({unreadCount})
            </Button>
          )}
          <Button
            onClick={() => navigate("/notifications")}
            variant="outline"
            size={isMobile ? "default" : "sm"}
            className={isMobile ? "w-full" : ""}
          >
            <Settings className="h-4 w-4 mr-2" />
            Settings
          </Button>
        </div>
      </div>

      {/* Stats Cards - Already responsive */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total</p>
                <p className="text-2xl font-bold">{notifications.length}</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-full">
                <Bell className="h-8 w-8 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Unread</p>
                <p className="text-2xl font-bold">{unreadCount}</p>
              </div>
              <div className="p-3 bg-red-100 rounded-full">
                <AlertCircle className="h-8 w-8 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Reviews</p>
                <p className="text-2xl font-bold">{reviewCount}</p>
              </div>
              <div className="p-3 bg-yellow-100 rounded-full">
                <Star className="h-8 w-8 text-yellow-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Team</p>
                <p className="text-2xl font-bold">{teamCount}</p>
              </div>
              <div className="p-3 bg-green-100 rounded-full">
                <Users className="h-8 w-8 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Responsive Tabs */}
      <Tabs
        value={filterType}
        onValueChange={(value: any) => setFilterType(value)}
      >
        <TabsList
          className={`${
            isMobile ? "grid grid-cols-2 h-auto" : "grid w-full grid-cols-5"
          }`}
        >
          <TabsTrigger
            value="all"
            className={`${
              isMobile ? "flex-col p-2 h-auto" : "flex items-center gap-2"
            }`}
          >
            {isMobile ? (
              <>
                <span className="text-xs">All</span>
                {unreadCount > 0 && (
                  <Badge
                    variant="destructive"
                    className="h-4 w-4 rounded-full p-0 text-xs flex items-center justify-center"
                  >
                    {unreadCount}
                  </Badge>
                )}
              </>
            ) : (
              <>
                All
                {unreadCount > 0 && (
                  <Badge
                    variant="destructive"
                    className="ml-1 h-5 w-5 rounded-full p-1.5 text-xs"
                  >
                    {unreadCount}
                  </Badge>
                )}
              </>
            )}
          </TabsTrigger>

          <TabsTrigger
            value="review"
            className={`${
              isMobile ? "flex-col p-2 h-auto" : "flex items-center gap-2"
            }`}
          >
            {isMobile ? (
              <>
                <Star className="h-3 w-3" />
                <span className="text-xs">Reviews</span>
                {reviewCount > 0 && (
                  <Badge
                    variant="destructive"
                    className="h-4 w-4 rounded-full p-0 text-xs flex items-center justify-center"
                  >
                    {reviewCount}
                  </Badge>
                )}
              </>
            ) : (
              <>
                <Star className="h-4 w-4" />
                Reviews
                {reviewCount > 0 && (
                  <Badge
                    variant="destructive"
                    className="ml-1 h-5 w-5 rounded-full p-1.5 text-xs"
                  >
                    {reviewCount}
                  </Badge>
                )}
              </>
            )}
          </TabsTrigger>

          <TabsTrigger
            value="team"
            className={`${
              isMobile ? "flex-col p-2 h-auto" : "flex items-center gap-2"
            }`}
          >
            {isMobile ? (
              <>
                <Users className="h-3 w-3" />
                <span className="text-xs">Team</span>
                {teamCount > 0 && (
                  <Badge
                    variant="destructive"
                    className="h-4 w-4 rounded-full p-0 text-xs flex items-center justify-center"
                  >
                    {teamCount}
                  </Badge>
                )}
              </>
            ) : (
              <>
                <Users className="h-4 w-4" />
                Team
                {teamCount > 0 && (
                  <Badge
                    variant="destructive"
                    className="ml-1 h-5 w-5 rounded-full p-1.5 text-xs"
                  >
                    {teamCount}
                  </Badge>
                )}
              </>
            )}
          </TabsTrigger>

          <TabsTrigger
            value="qr"
            className={`${
              isMobile ? "flex-col p-2 h-auto" : "flex items-center gap-2"
            }`}
          >
            {isMobile ? (
              <>
                <QrCode className="h-3 w-3" />
                <span className="text-xs">QR</span>
                {qrCount > 0 && (
                  <Badge
                    variant="destructive"
                    className="h-4 w-4 rounded-full p-0 text-xs flex items-center justify-center"
                  >
                    {qrCount}
                  </Badge>
                )}
              </>
            ) : (
              <>
                <QrCode className="h-4 w-4" />
                QR Codes
                {qrCount > 0 && (
                  <Badge
                    variant="destructive"
                    className="ml-1 h-5 w-5 rounded-full p-1.5 text-xs"
                  >
                    {qrCount}
                  </Badge>
                )}
              </>
            )}
          </TabsTrigger>

          <TabsTrigger
            value="system"
            className={`${
              isMobile ? "flex-col p-2 h-auto" : "flex items-center gap-2"
            }`}
          >
            {isMobile ? (
              <>
                <Settings className="h-3 w-3" />
                <span className="text-xs">System</span>
                {systemCount > 0 && (
                  <Badge
                    variant="destructive"
                    className="h-4 w-4 rounded-full p-0 text-xs flex items-center justify-center"
                  >
                    {systemCount}
                  </Badge>
                )}
              </>
            ) : (
              <>
                <Settings className="h-4 w-4" />
                System
                {systemCount > 0 && (
                  <Badge
                    variant="destructive"
                    className="ml-1 h-5 w-5 rounded-full p-1.5 text-xs"
                  >
                    {systemCount}
                  </Badge>
                )}
              </>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value={filterType} className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>
                {filterType === "all"
                  ? "All Notifications"
                  : filterType === "unread"
                  ? "Unread Notifications"
                  : `${
                      filterType.charAt(0).toUpperCase() + filterType.slice(1)
                    } Notifications`}
              </CardTitle>
              <CardDescription>
                {filteredNotifications.length} notification
                {filteredNotifications.length !== 1 ? "s" : ""}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {filteredNotifications.length === 0 ? (
                <div className="text-center py-8">
                  <Bell className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">No notifications found</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredNotifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={`p-4 border rounded-lg ${
                        notification.isRead
                          ? "bg-gray-50"
                          : "bg-white border-blue-200"
                      }`}
                    >
                      <div
                        className={`${
                          isMobile
                            ? "space-y-3"
                            : "flex items-start justify-between"
                        }`}
                      >
                        <div className="flex items-start space-x-3 flex-1">
                          {getNotificationIcon(notification.type)}
                          <div className="flex-1 min-w-0">
                            <div
                              className={`${
                                isMobile
                                  ? "space-y-2"
                                  : "flex items-center space-x-2 mb-1"
                              }`}
                            >
                              <h3
                                className={`font-medium ${
                                  notification.isRead
                                    ? "text-gray-700"
                                    : "text-gray-900"
                                }`}
                              >
                                {notification.title}
                              </h3>
                              <div
                                className={`${
                                  isMobile
                                    ? "flex items-center space-x-2"
                                    : "contents"
                                }`}
                              >
                                <Badge
                                  className={getPriorityColor(
                                    notification.priority
                                  )}
                                >
                                  {notification.priority}
                                </Badge>
                                {!notification.isRead && (
                                  <div className="h-2 w-2 bg-blue-600 rounded-full"></div>
                                )}
                              </div>
                            </div>
                            <p
                              className={`text-sm ${
                                notification.isRead
                                  ? "text-gray-500"
                                  : "text-gray-700"
                              }`}
                            >
                              {notification.message}
                            </p>
                            <p className="text-xs text-gray-400 mt-1">
                              {formatDate(notification.createdAt)}
                            </p>
                          </div>
                        </div>

                        {/* Responsive Action Buttons */}
                        <div
                          className={`${
                            isMobile
                              ? "flex justify-end space-x-2 mt-2"
                              : "flex items-center space-x-2 flex-shrink-0"
                          }`}
                        >
                          {notification.actionUrl && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => navigate(notification.actionUrl!)}
                              className={isMobile ? "text-xs px-2 py-1" : ""}
                            >
                              View
                            </Button>
                          )}
                          {!notification.isRead && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => markAsRead(notification.id)}
                              className={isMobile ? "p-1 h-8 w-8" : ""}
                              title="Mark as read"
                            >
                              <Check
                                className={isMobile ? "h-3 w-3" : "h-4 w-4"}
                              />
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => deleteNotification(notification.id)}
                            className={isMobile ? "p-1 h-8 w-8" : ""}
                            title="Delete notification"
                          >
                            <X className={isMobile ? "h-3 w-3" : "h-4 w-4"} />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Notifications;
