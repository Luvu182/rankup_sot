"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Search,
  TrendingUp,
  Settings,
  FileText,
  BarChart,
  Calendar,
  Users,
  BellRing,
  ChevronRight,
  FolderOpen
} from "lucide-react";
import { ProjectSwitcher } from "@/components/projects/project-switcher";

const navigation = [
  {
    name: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
    description: "Overview & performance"
  },
  {
    name: "Rankings",
    href: "/rankings", 
    icon: TrendingUp,
    description: "Track keyword rankings"
  },
  {
    name: "Keywords",
    href: "/keywords",
    icon: Search,
    description: "Manage keywords"
  },
  {
    name: "Analytics",
    href: "/analytics",
    icon: BarChart,
    description: "Detailed analysis"
  },
  {
    name: "Reports",
    href: "/reports",
    icon: FileText,
    description: "Regular reports"
  },
  {
    name: "Schedule",
    href: "/schedule",
    icon: Calendar,
    description: "Tracking schedule"
  },
  {
    name: "Competitors",
    href: "/competitors",
    icon: Users,
    description: "Competitor analysis"
  }
];

const bottomNavigation = [
  {
    name: "Projects",
    href: "/projects",
    icon: FolderOpen,
    description: "Manage projects"
  },
  {
    name: "Notifications",
    href: "/notifications",
    icon: BellRing,
    description: "Notifications"
  },
  {
    name: "Settings",
    href: "/settings",
    icon: Settings,
    description: "Settings"
  }
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 h-full w-64 bg-black border-r border-white/10">
      {/* Logo */}
      <div className="p-6">
        <Link href="/dashboard" className="flex items-center gap-3 group">
          <div className="relative w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 p-[1px] shadow-2xl shadow-purple-500/20">
            <div className="w-full h-full rounded-lg bg-black flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-white" />
            </div>
          </div>
          <div>
            <h1 className="text-lg font-semibold text-white group-hover:text-white/90 transition-colors">
              Rankup
            </h1>
            <p className="text-xs text-white/50">SEO Manager</p>
          </div>
        </Link>
      </div>

      {/* Project Switcher */}
      <div className="px-4 pb-4">
        <ProjectSwitcher />
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 px-3 pb-4 space-y-1">
        {navigation.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "group flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 relative overflow-hidden",
                isActive
                  ? "bg-gradient-to-r from-purple-500/10 to-purple-600/10 text-white border border-purple-500/30"
                  : "text-white/70 hover:text-white hover:bg-white/5 border border-transparent"
              )}
            >
              {isActive && (
                <>
                  {/* Left border accent */}
                  <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-gradient-to-b from-purple-400 to-purple-600" />
                  {/* Glow effect */}
                  <div className="absolute inset-0 bg-gradient-to-r from-purple-500/5 to-transparent" />
                </>
              )}
              <item.icon className={cn(
                "w-5 h-5 transition-colors relative z-10",
                isActive ? "text-white" : "text-white/50 group-hover:text-white/70"
              )} />
              <div className="flex-1 relative z-10">
                <p className={cn(
                  "text-sm font-medium",
                  isActive ? "text-white" : "text-white/70 group-hover:text-white"
                )}>
                  {item.name}
                </p>
                <p className={cn(
                  "text-xs transition-opacity duration-200",
                  isActive 
                    ? "text-white/70 opacity-100" 
                    : "text-white/40 opacity-0 group-hover:opacity-100"
                )}>
                  {item.description}
                </p>
              </div>
              {isActive && (
                <ChevronRight className="w-4 h-4 text-purple-400 relative z-10" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Divider */}
      <div className="mx-6 my-4 h-px bg-white/10" />

      {/* Bottom Navigation */}
      <nav className="px-3 pb-6 space-y-1">
        {bottomNavigation.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "group flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 relative overflow-hidden",
                isActive
                  ? "bg-gradient-to-r from-purple-500/10 to-purple-600/10 text-white border border-purple-500/30"
                  : "text-white/70 hover:text-white hover:bg-white/5 border border-transparent"
              )}
            >
              {isActive && (
                <>
                  {/* Left border accent */}
                  <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-gradient-to-b from-purple-400 to-purple-600" />
                  {/* Glow effect */}
                  <div className="absolute inset-0 bg-gradient-to-r from-purple-500/5 to-transparent" />
                </>
              )}
              <item.icon className={cn(
                "w-5 h-5 transition-colors relative z-10",
                isActive ? "text-white" : "text-white/50 group-hover:text-white/70"
              )} />
              <span className={cn(
                "text-sm font-medium relative z-10",
                isActive ? "text-white" : "text-white/70 group-hover:text-white"
              )}>
                {item.name}
              </span>
            </Link>
          );
        })}
      </nav>

      {/* User Section */}
      <div className="p-4 border-t border-white/10">
        <div className="flex items-center gap-3 px-2">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 p-[1px]">
            <div className="w-full h-full rounded-full bg-black flex items-center justify-center">
              <span className="text-xs font-medium text-white">L</span>
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">luanvu</p>
            <p className="text-xs text-white/50">Free Plan</p>
          </div>
        </div>
      </div>
    </aside>
  );
}