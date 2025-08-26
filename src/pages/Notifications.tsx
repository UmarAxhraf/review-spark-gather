// import { useState, useEffect } from "react";
// import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
// import { Button } from "@/components/ui/button";
// import { Badge } from "@/components/ui/badge";
// import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
// import { Bell, Check, X, Star, Users, QrCode, AlertCircle, Settings } from "lucide-react";
// import { useNavigate } from "react-router-dom";
// import TeamLayout from "@/components/TeamLayout";

// interface Notification {
//   id: string;
//   type: 'review' | 'team' | 'qr' | 'system';
//   title: string;
//   message: string;
//   isRead: boolean;
//   createdAt: string;
//   priority: 'low' | 'medium' | 'high';
//   actionUrl?: string;
// }

// const Notifications = () => {
//   const navigate = useNavigate();
//   const [notifications, setNotifications] = useState<Notification[]>([
//     {
//       id: '1',
//       type: 'review',
//       title: 'New 5-Star Review',
//       message: 'Sarah Johnson left a 5-star review for John Smith',
//       isRead: false,
//       createdAt: '2024-01-15T10:30:00Z',
//       priority: 'high',
//       actionUrl: '/reviews'
//     },
//     {
//       id: '2',
//       type: 'team',
//       title: 'New Team Member Added',
//       message: 'Emma Davis has been added to your team',
//       isRead: false,
//       createdAt: '2024-01-15T09:15:00Z',
//       priority: 'medium',
//       actionUrl: '/employees'
//     },
//     {
//       id: '3',
//       type: 'qr',
//       title: 'QR Code Scanned',
//       message: 'Your QR code for Alex Brown was scanned 5 times today',
//       isRead: true,
//       createdAt: '2024-01-14T16:45:00Z',
//       priority: 'low',
//       actionUrl: '/qr-codes'
//     },
//     {
//       id: '4',
//       type: 'system',
//       title: 'System Update',
//       message: 'New analytics features are now available',
//       isRead: true,
//       createdAt: '2024-01-14T08:00:00Z',
//       priority: 'medium',
//       actionUrl: '/analytics'
//     }
//   ]);

//   const [filterType, setFilterType] = useState<'all' | 'unread' | 'review' | 'team' | 'qr' | 'system'>('all');

//   const filteredNotifications = notifications.filter(notification => {
//     if (filterType === 'all') return true;
//     if (filterType === 'unread') return !notification.isRead;
//     return notification.type === filterType;
//   });

//   const unreadCount = notifications.filter(n => !n.isRead).length;

//   const markAsRead = (id: string) => {
//     setNotifications(prev =>
//       prev.map(notification =>
//         notification.id === id
//           ? { ...notification, isRead: true }
//           : notification
//       )
//     );
//   };

//   const markAllAsRead = () => {
//     setNotifications(prev =>
//       prev.map(notification => ({ ...notification, isRead: true }))
//     );
//   };

//   const deleteNotification = (id: string) => {
//     setNotifications(prev => prev.filter(notification => notification.id !== id));
//   };

//   const getNotificationIcon = (type: string) => {
//     switch (type) {
//       case 'review': return <Star className="h-5 w-5 text-yellow-500" />;
//       case 'team': return <Users className="h-5 w-5 text-blue-500" />;
//       case 'qr': return <QrCode className="h-5 w-5 text-green-500" />;
//       case 'system': return <AlertCircle className="h-5 w-5 text-purple-500" />;
//       default: return <Bell className="h-5 w-5 text-gray-500" />;
//     }
//   };

//   const getPriorityColor = (priority: string) => {
//     switch (priority) {
//       case 'high': return 'bg-red-100 text-red-800';
//       case 'medium': return 'bg-yellow-100 text-yellow-800';
//       case 'low': return 'bg-green-100 text-green-800';
//       default: return 'bg-gray-100 text-gray-800';
//     }
//   };

//   const formatDate = (dateString: string) => {
//     const date = new Date(dateString);
//     const now = new Date();
//     const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));

//     if (diffInHours < 1) return 'Just now';
//     if (diffInHours < 24) return `${diffInHours}h ago`;
//     if (diffInHours < 48) return 'Yesterday';
//     return date.toLocaleDateString();
//   };

//   return (
//     <TeamLayout>
//       <div className="space-y-6">
//         {/* Header */}
//         <div className="flex items-center justify-between">
//           <div>
//             <h1 className="text-3xl font-bold text-gray-900">Notifications</h1>
//             <p className="text-gray-600">
//               Stay updated with your team and review activities
//             </p>
//           </div>
//           <div className="flex items-center space-x-4">
//             {unreadCount > 0 && (
//               <Button onClick={markAllAsRead} variant="outline" size="sm">
//                 <Check className="h-4 w-4 mr-2" />
//                 Mark All Read ({unreadCount})
//               </Button>
//             )}
//             <Button variant="outline" size="sm">
//               <Settings className="h-4 w-4 mr-2" />
//               Settings
//             </Button>
//           </div>
//         </div>

//         {/* Stats */}
//         <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
//           <Card>
//             <CardContent className="pt-6">
//               <div className="flex items-center justify-between">
//                 <div>
//                   <p className="text-sm font-medium text-gray-600">Total</p>
//                   <p className="text-2xl font-bold">{notifications.length}</p>
//                 </div>
//                 <Bell className="h-8 w-8 text-blue-600" />
//               </div>
//             </CardContent>
//           </Card>
//           <Card>
//             <CardContent className="pt-6">
//               <div className="flex items-center justify-between">
//                 <div>
//                   <p className="text-sm font-medium text-gray-600">Unread</p>
//                   <p className="text-2xl font-bold text-red-600">{unreadCount}</p>
//                 </div>
//                 <AlertCircle className="h-8 w-8 text-red-600" />
//               </div>
//             </CardContent>
//           </Card>
//           <Card>
//             <CardContent className="pt-6">
//               <div className="flex items-center justify-between">
//                 <div>
//                   <p className="text-sm font-medium text-gray-600">Reviews</p>
//                   <p className="text-2xl font-bold text-yellow-600">
//                     {notifications.filter(n => n.type === 'review').length}
//                   </p>
//                 </div>
//                 <Star className="h-8 w-8 text-yellow-600" />
//               </div>
//             </CardContent>
//           </Card>
//           <Card>
//             <CardContent className="pt-6">
//               <div className="flex items-center justify-between">
//                 <div>
//                   <p className="text-sm font-medium text-gray-600">Team</p>
//                   <p className="text-2xl font-bold text-green-600">
//                     {notifications.filter(n => n.type === 'team').length}
//                   </p>
//                 </div>
//                 <Users className="h-8 w-8 text-green-600" />
//               </div>
//             </CardContent>
//           </Card>
//         </div>

//         {/* Filters */}
//         <Tabs value={filterType} onValueChange={(value: any) => setFilterType(value)}>
//           <TabsList className="grid w-full grid-cols-6">
//             <TabsTrigger value="all">All</TabsTrigger>
//             <TabsTrigger value="unread">Unread ({unreadCount})</TabsTrigger>
//             <TabsTrigger value="review">Reviews</TabsTrigger>
//             <TabsTrigger value="team">Team</TabsTrigger>
//             <TabsTrigger value="qr">QR Codes</TabsTrigger>
//             <TabsTrigger value="system">System</TabsTrigger>
//           </TabsList>

//           <TabsContent value={filterType} className="mt-6">
//             <Card>
//               <CardHeader>
//                 <CardTitle>
//                   {filterType === 'all' ? 'All Notifications' :
//                    filterType === 'unread' ? 'Unread Notifications' :
//                    `${filterType.charAt(0).toUpperCase() + filterType.slice(1)} Notifications`}
//                 </CardTitle>
//                 <CardDescription>
//                   {filteredNotifications.length} notification{filteredNotifications.length !== 1 ? 's' : ''}
//                 </CardDescription>
//               </CardHeader>
//               <CardContent>
//                 {filteredNotifications.length === 0 ? (
//                   <div className="text-center py-8">
//                     <Bell className="h-12 w-12 text-gray-300 mx-auto mb-4" />
//                     <p className="text-gray-500">No notifications found</p>
//                   </div>
//                 ) : (
//                   <div className="space-y-4">
//                     {filteredNotifications.map((notification) => (
//                       <div
//                         key={notification.id}
//                         className={`p-4 border rounded-lg ${
//                           notification.isRead ? 'bg-gray-50' : 'bg-white border-blue-200'
//                         }`}
//                       >
//                         <div className="flex items-start justify-between">
//                           <div className="flex items-start space-x-3 flex-1">
//                             {getNotificationIcon(notification.type)}
//                             <div className="flex-1">
//                               <div className="flex items-center space-x-2 mb-1">
//                                 <h3 className={`font-medium ${
//                                   notification.isRead ? 'text-gray-700' : 'text-gray-900'
//                                 }`}>
//                                   {notification.title}
//                                 </h3>
//                                 <Badge className={getPriorityColor(notification.priority)}>
//                                   {notification.priority}
//                                 </Badge>
//                                 {!notification.isRead && (
//                                   <div className="h-2 w-2 bg-blue-600 rounded-full"></div>
//                                 )}
//                               </div>
//                               <p className={`text-sm ${
//                                 notification.isRead ? 'text-gray-500' : 'text-gray-700'
//                               }`}>
//                                 {notification.message}
//                               </p>
//                               <p className="text-xs text-gray-400 mt-1">
//                                 {formatDate(notification.createdAt)}
//                               </p>
//                             </div>
//                           </div>
//                           <div className="flex items-center space-x-2">
//                             {notification.actionUrl && (
//                               <Button
//                                 size="sm"
//                                 variant="outline"
//                                 onClick={() => navigate(notification.actionUrl!)}
//                               >
//                                 View
//                               </Button>
//                             )}
//                             {!notification.isRead && (
//                               <Button
//                                 size="sm"
//                                 variant="ghost"
//                                 onClick={() => markAsRead(notification.id)}
//                               >
//                                 <Check className="h-4 w-4" />
//                               </Button>
//                             )}
//                             <Button
//                               size="sm"
//                               variant="ghost"
//                               onClick={() => deleteNotification(notification.id)}
//                             >
//                               <X className="h-4 w-4" />
//                             </Button>
//                           </div>
//                         </div>
//                       </div>
//                     ))}
//                   </div>
//                 )}
//               </CardContent>
//             </Card>
//           </TabsContent>
//         </Tabs>
//       </div>
//     </TeamLayout>
//   );
// };

// export default Notifications;

//======================================================>>>>>>>>>>>>>>>>>>>>==================================

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
import TeamLayout from "@/components/TeamLayout";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

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
    } catch (error) {
      console.error("Error fetching notifications:", error);
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
          } else if (payload.eventType === "DELETE") {
            setNotifications((prev) =>
              prev.filter((notification) => notification.id !== payload.old.id)
            );
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
  }, []); // Empty dependency array to run only once

  const filteredNotifications = notifications.filter((notification) => {
    if (filterType === "all") return true;
    if (filterType === "unread") return !notification.isRead;
    return notification.type === filterType;
  });

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const markAsRead = async (id: string) => {
    try {
      const { error } = await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("id", id);

      if (error) {
        console.error("Error marking notification as read:", error);
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
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const unreadIds = notifications.filter((n) => !n.isRead).map((n) => n.id);

      if (unreadIds.length === 0) return;

      const { error } = await supabase
        .from("notifications")
        .update({ is_read: true })
        .in("id", unreadIds);

      if (error) {
        console.error("Error marking all notifications as read:", error);
        toast({
          title: "Error",
          description: "Failed to mark all notifications as read",
          variant: "destructive",
        });
        return;
      }

      // Update local state immediately for better UX
      setNotifications((prev) =>
        prev.map((notification) => ({ ...notification, isRead: true }))
      );

      toast({
        title: "Success",
        description: "All notifications marked as read",
      });
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
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
        toast({
          title: "Error",
          description: "Failed to delete notification",
          variant: "destructive",
        });
        return;
      }

      // Update local state immediately for better UX
      setNotifications((prev) =>
        prev.filter((notification) => notification.id !== id)
      );

      toast({
        title: "Success",
        description: "Notification deleted",
      });
    } catch (error) {
      console.error("Error deleting notification:", error);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "review":
        return <Star className="h-5 w-5 text-yellow-500" />;
      case "team":
        return <Users className="h-5 w-5 text-blue-500" />;
      case "qr":
        return <QrCode className="h-5 w-5 text-green-500" />;
      case "system":
        return <AlertCircle className="h-5 w-5 text-purple-500" />;
      default:
        return <Bell className="h-5 w-5 text-gray-500" />;
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

  const getTabCounts = () => {
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

    return { reviewCount, teamCount, qrCount, systemCount };
  };

  const { reviewCount, teamCount, qrCount, systemCount } = getTabCounts();

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor(
      (now.getTime() - date.getTime()) / (1000 * 60 * 60)
    );

    if (diffInHours < 1) return "Just now";
    if (diffInHours < 24) return `${diffInHours}h ago`;
    if (diffInHours < 48) return "Yesterday";
    return date.toLocaleDateString();
  };

  if (loading) {
    return (
      <TeamLayout>
        <div className="space-y-6">
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-2 text-gray-600">Loading notifications...</span>
          </div>
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
            <h1 className="text-3xl font-bold text-gray-900">Notifications</h1>
            <p className="text-gray-600">
              Stay updated with your team and review activities
            </p>
          </div>
          <div className="flex items-center space-x-4">
            {unreadCount > 0 && (
              <Button onClick={markAllAsRead} variant="outline" size="sm">
                <Check className="h-4 w-4 mr-2" />
                Mark All Read ({unreadCount})
              </Button>
            )}
            <Button variant="outline" size="sm">
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total</p>
                  <p className="text-2xl font-bold">{notifications.length}</p>
                </div>
                <Bell className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Unread</p>
                  <p className="text-2xl font-bold text-red-600">
                    {unreadCount}
                  </p>
                </div>
                <AlertCircle className="h-8 w-8 text-red-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Reviews</p>
                  <p className="text-2xl font-bold text-yellow-600">
                    {notifications.filter((n) => n.type === "review").length}
                  </p>
                </div>
                <Star className="h-8 w-8 text-yellow-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Team</p>
                  <p className="text-2xl font-bold text-green-600">
                    {notifications.filter((n) => n.type === "team").length}
                  </p>
                </div>
                <Users className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Tabs
          value={filterType}
          onValueChange={(value: any) => setFilterType(value)}
        >
          {/* <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="unread">Unread ({unreadCount})</TabsTrigger>
            <TabsTrigger value="review">Reviews</TabsTrigger>
            <TabsTrigger value="team">Team</TabsTrigger>
            <TabsTrigger value="qr">QR Codes</TabsTrigger>
            <TabsTrigger value="system">System</TabsTrigger>
          </TabsList> */}

          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="all" className="flex items-center gap-2">
              All
              {unreadCount > 0 && (
                <Badge
                  variant="destructive"
                  className="ml-1 h-5 w-5 rounded-full p-1.5 text-xs"
                >
                  {unreadCount}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="review" className="flex items-center gap-2">
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
            </TabsTrigger>
            <TabsTrigger value="team" className="flex items-center gap-2">
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
            </TabsTrigger>
            <TabsTrigger value="qr" className="flex items-center gap-2">
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
            </TabsTrigger>
            <TabsTrigger value="system" className="flex items-center gap-2">
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
                        <div className="flex items-start justify-between">
                          <div className="flex items-start space-x-3 flex-1">
                            {getNotificationIcon(notification.type)}
                            <div className="flex-1">
                              <div className="flex items-center space-x-2 mb-1">
                                <h3
                                  className={`font-medium ${
                                    notification.isRead
                                      ? "text-gray-700"
                                      : "text-gray-900"
                                  }`}
                                >
                                  {notification.title}
                                </h3>
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
                          <div className="flex items-center space-x-2">
                            {notification.actionUrl && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() =>
                                  navigate(notification.actionUrl!)
                                }
                              >
                                View
                              </Button>
                            )}
                            {!notification.isRead && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => markAsRead(notification.id)}
                              >
                                <Check className="h-4 w-4" />
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() =>
                                deleteNotification(notification.id)
                              }
                            >
                              <X className="h-4 w-4" />
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
    </TeamLayout>
  );
};

export default Notifications;
