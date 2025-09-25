"use client";

import { ReactNode, useState } from "react";
import { UserButton, useUser, useAuth } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { api } from "@Rankup-manager/backend/convex/_generated/api";
import Sidebar from "./sidebar";
import { cn } from "@/lib/utils";
import { Bell, Search } from "lucide-react";
import NotificationDropdown from "@/components/layout/notification-dropdown";

interface AppLayoutProps {
  children: ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  const { user } = useUser();
  const { userId } = useAuth();
  const [showNotifications, setShowNotifications] = useState(false);
  
  // Get unread notification count
  const unreadCount = useQuery(api.notifications.getUnreadCount, 
    userId ? { userId } : "skip"
  ) || 0;
  
  return (
    <div className="min-h-screen bg-black">
      {/* Background gradient effects - simplified to single color */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[20%] -right-[20%] w-[60%] h-[60%] rounded-full bg-purple-500/10 blur-[120px]" />
      </div>

      {/* Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <div className="ml-64 relative">
        {/* Top Bar */}
        <header className="sticky top-0 z-50 h-16 bg-black/50 backdrop-blur-xl border-b border-white/10">
          <div className="h-full px-6 flex items-center justify-between">
            {/* Search */}
            <div className="flex-1 max-w-md">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                <input
                  type="text"
                  placeholder="Tìm kiếm từ khóa, báo cáo..."
                  className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder:text-white/40 focus:outline-none focus:bg-white/10 focus:border-white/20 transition-all"
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-4">
              {/* Notifications */}
              <div className="relative">
                <button 
                  onClick={() => setShowNotifications(!showNotifications)}
                  className="relative p-2 rounded-lg hover:bg-white/5 transition-colors"
                >
                  <Bell className="w-5 h-5 text-white/70" />
                  {unreadCount > 0 && (
                    <>
                      <span className="absolute top-1 right-1 w-2 h-2 bg-gradient-to-br from-pink-500 to-purple-500 rounded-full" />
                      <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-gradient-to-br from-pink-500 to-purple-500 rounded-full flex items-center justify-center text-[10px] font-bold text-white px-1">
                        {unreadCount > 99 ? '99+' : unreadCount}
                      </span>
                    </>
                  )}
                </button>
                
                {/* Notification Dropdown */}
                {showNotifications && (
                  <NotificationDropdown 
                    userId={userId!}
                    onClose={() => setShowNotifications(false)}
                  />
                )}
              </div>

              {/* User */}
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <p className="text-sm font-medium text-white">
                    {user?.firstName || user?.username || "User"}
                  </p>
                  <p className="text-xs text-white/50">Free Plan</p>
                </div>
                <UserButton
                  appearance={{
                    elements: {
                      avatarBox: "w-9 h-9 ring-2 ring-white/10"
                    }
                  }}
                />
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="relative">
          {children}
        </main>
      </div>
    </div>
  );
}