import React from "react";
import { Progress } from "@/components/ui/progress";
import { Clock } from "lucide-react";

interface SubscriptionProgressProps {
  startDate: string;
  endDate: string;
  className?: string;
}

export const SubscriptionProgress: React.FC<SubscriptionProgressProps> = ({
  startDate,
  endDate,
  className = "",
}) => {
  // Calculate total subscription duration in days
  const start = new Date(startDate);
  const end = new Date(endDate);
  const totalDays = Math.ceil(
    (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)
  );

  // Calculate days elapsed
  const today = new Date();
  const daysElapsed = Math.ceil(
    (today.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)
  );

  // Calculate days remaining
  const daysRemaining = Math.max(
    0,
    Math.ceil((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
  );

  // Calculate progress percentage (inverted - 100% at start, 0% at end)
  const progressPercentage = Math.max(
    0,
    Math.min(100, (daysRemaining / totalDays) * 100)
  );

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="flex justify-between items-center text-sm text-gray-600">
        <div className="flex items-center gap-1">
          <Clock className="h-3.5 w-3.5" />
          <span>{daysRemaining} days remaining</span>
        </div>
        <span>{Math.round(progressPercentage)}%</span>
      </div>
      <Progress value={progressPercentage} className="h-2" />
      <div className="flex justify-between text-xs text-gray-500">
        <span>Day {daysElapsed}</span>
        <span>{totalDays} days total</span>
      </div>
    </div>
  );
};
