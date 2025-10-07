import React from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "./button";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";

interface BackButtonProps {
  className?: string;
  variant?: "default" | "outline" | "ghost" | "link";
  size?: "default" | "sm" | "lg" | "icon";
  to?: string; // Optional specific route to navigate to
  onClick?: () => void; // Optional custom click handler
  text?: string; // Custom text for the button
  showText?: boolean; // Whether to show text or just icon
}

export function BackButton({
  className,
  variant = "ghost",
  size = "sm",
  to,
  onClick,
  text = "Go Back",
  showText = true,
}: BackButtonProps) {
  const navigate = useNavigate();

  const handleClick = () => {
    if (onClick) {
      onClick();
    } else if (to) {
      navigate(to);
    } else {
      navigate(-1); // Go back to previous page
    }
  };

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleClick}
      className={cn(
        "group flex items-center gap-2 transition-all duration-200 ease-in-out",
        "bg-gray-100 hover:bg-gray-100 border border-gray-200 hover:border-gray-300",
        "text-gray-700 hover:text-gray-900",
        "shadow-sm hover:shadow-md",
        "rounded-lg px-3 py-2",
        className
      )}
    >
      <ArrowLeft className="h-4 w-4 transition-transform duration-200 group-hover:-translate-x-1" />
      {showText && <span className="font-medium">{text}</span>}
    </Button>
  );
}

// Default usage
//<BackButton />

// Custom text
//<BackButton text="Return to Dashboard" />

// Icon only
//<BackButton showText={false} />

// With custom styling
//<BackButton className="mb-4" text="← Previous Page" />
