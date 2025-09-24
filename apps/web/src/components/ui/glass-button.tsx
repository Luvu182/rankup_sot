import { cn } from "@/lib/utils";
import { ButtonHTMLAttributes, forwardRef } from "react";

interface GlassButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "gradient";
  size?: "sm" | "md" | "lg";
}

const GlassButton = forwardRef<HTMLButtonElement, GlassButtonProps>(
  ({ className, variant = "secondary", size = "md", children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          // Base styles
          "relative font-medium rounded-lg transition-all duration-200",
          "focus:outline-none focus:ring-2 focus:ring-white/20 focus:ring-offset-2 focus:ring-offset-black",
          
          // Size variants
          size === "sm" && "px-3 py-1.5 text-xs",
          size === "md" && "px-4 py-2 text-sm",
          size === "lg" && "px-6 py-3 text-base",
          
          // Style variants
          variant === "primary" && [
            "bg-white text-black shadow-2xl shadow-white/20",
            "hover:bg-white/90 hover:shadow-white/30"
          ],
          
          variant === "secondary" && [
            "bg-white/5 text-white border border-white/15",
            "hover:bg-white/10 hover:border-white/25"
          ],
          
          variant === "gradient" && [
            "bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500",
            "text-white shadow-2xl shadow-purple-500/20",
            "hover:shadow-purple-500/30 hover:scale-[1.02]"
          ],
          
          className
        )}
        {...props}
      >
        {variant === "gradient" && (
          <div className="absolute inset-0 rounded-lg bg-gradient-to-br from-blue-600 via-purple-600 to-pink-600 opacity-0 hover:opacity-100 transition-opacity duration-200" />
        )}
        <span className="relative z-10">{children}</span>
      </button>
    );
  }
);

GlassButton.displayName = "GlassButton";

export default GlassButton;