import React from "react";
import { LoadingSpinner } from "./loading-spinner";

interface PageLoadingProps {
  text?: string;
  fullScreen?: boolean;
}

export const PageLoading: React.FC<PageLoadingProps> = ({
  text = "Loading...",
  fullScreen = false,
}) => {
  const containerClass = fullScreen
    ? "flex items-center justify-center min-h-screen"
    : "flex items-center justify-center py-12";

  return (
    <div className={containerClass}>
      <LoadingSpinner size="lg" text={text} />
    </div>
  );
};