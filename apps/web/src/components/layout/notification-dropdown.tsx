"use client";

import { useEffect, useRef } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@Rankup-manager/backend/convex/_generated/api";
import { formatDistanceToNow } from "date-fns";
import { vi } from "date-fns/locale";
import { Bell, CheckCircle, XCircle, Info, AlertTriangle, ExternalLink, Check } from "lucide-react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

interface NotificationDropdownProps {
  userId: string;
  onClose: () => void;
}

export default function NotificationDropdown({ userId, onClose }: NotificationDropdownProps) {
  const router = useRouter();
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  // Get notifications
  const notifications = useQuery(api.notifications.getNotifications, { userId }) || [];
  const markAsRead = useMutation(api.notifications.markAsRead);
  const markAllAsRead = useMutation(api.notifications.markAllAsRead);
  
  // Recent notifications (last 5)
  const recentNotifications = notifications.slice(0, 5);
  const unreadCount = notifications.filter(n => !n.isRead).length;

  // Click outside to close
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        onClose();
      }
    }
    
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose]);

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case "info":
        return <Info className="w-4 h-4 text-blue-500" />;
      case "warning":
        return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
      case "error":
        return <XCircle className="w-4 h-4 text-red-500" />;
      case "critical":
        return <XCircle className="w-4 h-4 text-red-600" />;
      default:
        return <Bell className="w-4 h-4 text-gray-500" />;
    }
  };

  const handleMarkAsRead = async (notificationId: any) => {
    try {
      await markAsRead({ notificationId });
    } catch (error) {
      console.error("Failed to mark as read:", error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await markAllAsRead({ userId });
    } catch (error) {
      console.error("Failed to mark all as read:", error);
    }
  };

  const viewAllNotifications = () => {
    router.push("/notifications");
    onClose();
  };

  return (
    <div 
      ref={dropdownRef}
      className="absolute top-full right-0 mt-2 w-96 bg-black/90 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl overflow-hidden z-50"
    >
      {/* Header */}
      <div className="p-4 border-b border-white/10">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-white">Thông báo</h3>
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllAsRead}
              className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1"
            >
              <Check className="w-3 h-3" />
              Đánh dấu tất cả đã đọc
            </button>
          )}
        </div>
      </div>

      {/* Notifications List */}
      <div className="max-h-[400px] overflow-y-auto">
        {recentNotifications.length === 0 ? (
          <div className="p-8 text-center">
            <Bell className="w-8 h-8 text-white/20 mx-auto mb-3" />
            <p className="text-sm text-white/50">Không có thông báo mới</p>
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {recentNotifications.map((notification) => (
              <div
                key={notification._id}
                className={cn(
                  "p-4 hover:bg-white/5 transition-colors cursor-pointer",
                  !notification.isRead && "bg-blue-500/5"
                )}
                onClick={() => {
                  if (!notification.isRead) {
                    handleMarkAsRead(notification._id);
                  }
                }}
              >
                <div className="flex items-start gap-3">
                  {getSeverityIcon(notification.severity)}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white">
                      {notification.title}
                    </p>
                    <p className="text-xs text-white/60 mt-1 line-clamp-2">
                      {notification.message}
                    </p>
                    <p className="text-xs text-white/40 mt-2">
                      {formatDistanceToNow(new Date(notification.createdAt), {
                        addSuffix: true,
                        locale: vi,
                      })}
                    </p>
                  </div>
                  {!notification.isRead && (
                    <span className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-2" />
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      {notifications.length > 0 && (
        <div className="p-3 border-t border-white/10">
          <button
            onClick={viewAllNotifications}
            className="w-full text-center text-sm text-blue-400 hover:text-blue-300 flex items-center justify-center gap-1"
          >
            Xem tất cả thông báo
            <ExternalLink className="w-3 h-3" />
          </button>
        </div>
      )}
    </div>
  );
}