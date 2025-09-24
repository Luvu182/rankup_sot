import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";
import GlassCard from "./glass-card";

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: LucideIcon;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  className?: string;
}

export default function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  className
}: StatCardProps) {
  return (
    <GlassCard hover className={cn("p-6", className)}>
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-sm text-white/70">{title}</p>
          <p className="text-3xl font-light tracking-tight text-white">
            {value}
          </p>
          {subtitle && (
            <p className="text-xs text-white/50">{subtitle}</p>
          )}
          {trend && (
            <div className={cn(
              "inline-flex items-center gap-1 text-xs font-medium",
              trend.isPositive ? "text-green-400" : "text-red-400"
            )}>
              <span>{trend.isPositive ? "↑" : "↓"}</span>
              <span>{Math.abs(trend.value)}%</span>
            </div>
          )}
        </div>
        {Icon && (
          <div className="p-3 rounded-lg bg-white/5">
            <Icon className="w-5 h-5 text-white/50" />
          </div>
        )}
      </div>
    </GlassCard>
  );
}