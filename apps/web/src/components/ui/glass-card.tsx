import { cn } from "@/lib/utils";
import { ReactNode } from "react";

interface GlassCardProps {
  children: ReactNode;
  className?: string;
  variant?: "default" | "glow" | "gradient";
  hover?: boolean;
  style?: React.CSSProperties;
}

export default function GlassCard({ 
  children, 
  className,
  variant = "default",
  hover = false,
  style
}: GlassCardProps) {
  return (
    <div
      className={cn(
        "relative rounded-lg backdrop-blur-xl",
        // Base styles
        "bg-white/[0.08] border border-white/[0.18]",
        "shadow-[0_8px_32px_0_rgba(0,0,0,0.37)]",
        // Hover effects
        hover && "transition-all duration-300 hover:bg-white/[0.12] hover:border-white/25 hover:shadow-[0_8px_40px_0_rgba(0,0,0,0.4)] hover:transform hover:scale-[1.02]",
        // Variants
        variant === "glow" && "shadow-2xl shadow-white/10",
        variant === "gradient" && "bg-gradient-to-br from-white/[0.08] via-white/[0.05] to-white/[0.08]",
        className
      )}
      style={style}
    >
      {variant === "gradient" && (
        <div className="absolute inset-0 rounded-lg bg-gradient-to-br from-blue-500/10 via-purple-500/10 to-pink-500/10 opacity-50" />
      )}
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
}