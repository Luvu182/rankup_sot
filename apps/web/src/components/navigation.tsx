"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Search,
  TrendingUp,
  Settings,
  FileText
} from "lucide-react";

const navItems = [
  {
    href: "/dashboard",
    label: "Dashboard",
    icon: LayoutDashboard
  },
  {
    href: "/keywords",
    label: "Từ khóa",
    icon: Search
  },
  {
    href: "/rankings",
    label: "Xếp hạng",
    icon: TrendingUp
  },
  {
    href: "/reports",
    label: "Báo cáo",
    icon: FileText
  },
  {
    href: "/settings",
    label: "Cài đặt",
    icon: Settings
  }
];

export default function Navigation() {
  const pathname = usePathname();

  return (
    <nav className="border-b">
      <div className="container flex h-14 items-center px-8">
        <div className="flex gap-6">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md transition-colors",
                  isActive 
                    ? "bg-primary/10 text-primary" 
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                )}
              >
                <Icon className="w-4 h-4" />
                {item.label}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}