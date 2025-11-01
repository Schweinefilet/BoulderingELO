import { cn } from "@/lib/utils";
import { ButtonHTMLAttributes, forwardRef } from "react";

export const Button = forwardRef<
  HTMLButtonElement,
  ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "default" | "outline" | "ghost" }
>(({ className, variant = "default", ...props }, ref) => {
  const variants = {
    default:
      "bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white shadow-lg",
    outline:
      "border-2 border-slate-700 hover:border-slate-500 bg-transparent text-slate-300 hover:text-white",
    ghost: "hover:bg-slate-800/50 text-slate-300 hover:text-white",
  };

  return (
    <button
      ref={ref}
      className={cn(
        "px-6 py-2.5 rounded-lg font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed",
        variants[variant],
        className
      )}
      {...props}
    />
  );
});

Button.displayName = "Button";
