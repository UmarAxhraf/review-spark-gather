// import { useState } from "react";
// import { Button } from "@/components/ui/button";
// import { Badge } from "@/components/ui/badge";
// import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
// import { Bell, Check, Eye } from "lucide-react";
// import { useNavigate } from "react-router-dom";

// interface Notification {
//   id: string;
//   type: 'review' | 'team' | 'qr' | 'system';
//   title: string;
//   message: string;
//   isRead: boolean;
//   createdAt: string;
//   priority: 'low' | 'medium' | 'high';
// }

// const NotificationBell = () => {
//   const navigate = useNavigate();
//   const [notifications] = useState<Notification[]>([
//     {
//       id: '1',
//       type: 'review',
//       title: 'New 5-Star Review',
//       message: 'Sarah Johnson left a 5-star review for John Smith',
//       isRead: false,
//       createdAt: '2024-01-15T10:30:00Z',
//       priority: 'high'
//     },
//     {
//       id: '2',
//       type: 'team',
//       title: 'New Team Member Added',
//       message: 'Emma Davis has been added to your team',
//       isRead: false,
//       createdAt: '2024-01-15T09:15:00Z',
//       priority: 'medium'
//     }
//   ]);

//   const unreadCount = notifications.filter(n => !n.isRead).length;

//   const formatDate = (dateString: string) => {
//     const date = new Date(dateString);
//     const now = new Date();
//     const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));

//     if (diffInHours < 1) return 'Just now';
//     if (diffInHours < 24) return `${diffInHours}h ago`;
//     return date.toLocaleDateString();
//   };

//   return (
//     <Popover>
//       <PopoverTrigger asChild>
//         <Button variant="outline" size="sm" className="relative">
//           <Bell className="h-4 w-4" />
//           {unreadCount > 0 && (
//             <Badge
//               variant="destructive"
//               className="absolute -top-2 -right-2 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
//             >
//               {unreadCount}
//             </Badge>
//           )}
//         </Button>
//       </PopoverTrigger>
//       <PopoverContent className="w-80" align="end">
//         <div className="space-y-4">
//           <div className="flex items-center justify-between">
//             <h3 className="font-semibold">Notifications</h3>
//             <Button
//               variant="ghost"
//               size="sm"
//               onClick={() => navigate('/notifications')}
//             >
//               <Eye className="h-4 w-4 mr-1" />
//               View All
//             </Button>
//           </div>

//           {notifications.length === 0 ? (
//             <p className="text-sm text-gray-500 text-center py-4">
//               No new notifications
//             </p>
//           ) : (
//             <div className="space-y-3 max-h-96 overflow-y-auto">
//               {notifications.slice(0, 5).map((notification) => (
//                 <div
//                   key={notification.id}
//                   className={`p-3 border rounded-lg ${
//                     notification.isRead ? 'bg-gray-50' : 'bg-blue-50 border-blue-200'
//                   }`}
//                 >
//                   <div className="flex items-start justify-between">
//                     <div className="flex-1 min-w-0">
//                       <div className="flex items-center space-x-2">
//                         <p className="text-sm font-medium truncate">
//                           {notification.title}
//                         </p>
//                         {!notification.isRead && (
//                           <div className="h-2 w-2 bg-blue-600 rounded-full flex-shrink-0"></div>
//                         )}
//                       </div>
//                       <p className="text-xs text-gray-600 mt-1 line-clamp-2">
//                         {notification.message}
//                       </p>
//                       <p className="text-xs text-gray-400 mt-1">
//                         {formatDate(notification.createdAt)}
//                       </p>
//                     </div>
//                   </div>
//                 </div>
//               ))}
//             </div>
//           )}

//           {notifications.length > 5 && (
//             <div className="text-center">
//               <Button
//                 variant="link"
//                 size="sm"
//                 onClick={() => navigate('/notifications')}
//               >
//                 View {notifications.length - 5} more notifications
//               </Button>
//             </div>
//           )}
//         </div>
//       </PopoverContent>
//     </Popover>
//   );
// };

// export default NotificationBell;

//======================================================>>>>>>>>>>>>>>>>>====================================

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Bell, Check, Eye } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface Notification {
  id: string;
  type: "review" | "team" | "qr" | "system";
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
  priority: "low" | "medium" | "high";
  action_url?: string;
}

const NotificationBell = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch notifications
  const fetchNotifications = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("company_id", user.id)
        .order("created_at", { ascending: false })
        .limit(10);

      if (error) {
        console.error("Error fetching notifications:", error);
        return;
      }

      setNotifications(data || []);
    } catch (error) {
      console.error("Error fetching notifications:", error);
    } finally {
      setLoading(false);
    }
  };

  // Mark notification as read
  const markAsRead = async (id: string) => {
    try {
      const { error } = await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("id", id);

      if (error) {
        console.error("Error marking notification as read:", error);
        return;
      }

      setNotifications((prev) =>
        prev.map((notification) =>
          notification.id === id
            ? { ...notification, is_read: true }
            : notification
        )
      );
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  };

  // Set up real-time subscription
  useEffect(() => {
    if (!user) return;

    fetchNotifications();

    // Set up real-time subscription for new notifications
    const subscription = supabase
      .channel("notifications-changes")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `company_id=eq.${user.id}`,
        },
        (payload) => {
          console.log("New notification received:", payload);
          const newNotification = payload.new as Notification;

          setNotifications((prev) => [newNotification, ...prev]);

          // Show toast notification
          toast.success(newNotification.title, {
            description: newNotification.message,
          });
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "notifications",
          filter: `company_id=eq.${user.id}`,
        },
        (payload) => {
          const updatedNotification = payload.new as Notification;
          setNotifications((prev) =>
            prev.map((notification) =>
              notification.id === updatedNotification.id
                ? updatedNotification
                : notification
            )
          );
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [user]);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor(
      (now.getTime() - date.getTime()) / (1000 * 60 * 60)
    );

    if (diffInHours < 1) return "Just now";
    if (diffInHours < 24) return `${diffInHours}h ago`;
    return date.toLocaleDateString();
  };

  const handleNotificationClick = (notification: Notification) => {
    // Mark as read when clicked
    if (!notification.is_read) {
      markAsRead(notification.id);
    }

    // Navigate to action URL if provided
    if (notification.action_url) {
      navigate(notification.action_url);
    }
  };

  if (loading) {
    return (
      <Button variant="outline" size="sm" disabled>
        <Bell className="h-4 w-4" />
      </Button>
    );
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="relative">
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-2 -right-2 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
            >
              {unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="end">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Notifications</h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/notifications")}
            >
              <Eye className="h-4 w-4 mr-1" />
              View All
            </Button>
          </div>

          {notifications.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-4">
              No new notifications
            </p>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {notifications.slice(0, 5).map((notification) => (
                <div
                  key={notification.id}
                  className={`p-3 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors ${
                    notification.is_read
                      ? "bg-gray-50"
                      : "bg-blue-50 border-blue-200"
                  }`}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2">
                        <p className="text-sm font-medium truncate">
                          {notification.title}
                        </p>
                        {!notification.is_read && (
                          <div className="h-2 w-2 bg-blue-600 rounded-full flex-shrink-0"></div>
                        )}
                      </div>
                      <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                        {notification.message}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        {formatDate(notification.created_at)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {notifications.length > 5 && (
            <div className="text-center">
              <Button
                variant="link"
                size="sm"
                onClick={() => navigate("/notifications")}
              >
                View {notifications.length - 5} more notifications
              </Button>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default NotificationBell;
