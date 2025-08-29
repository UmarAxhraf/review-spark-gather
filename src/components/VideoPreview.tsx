import React, { useState } from "react";
import { Video, AlertCircle, Play } from "lucide-react";
import VideoDialog from "@/components/VideoDialog";
import { Badge } from "@/components/ui/badge";

interface VideoPreviewProps {
  videoUrl: string;
  customerName: string;
  reviewId: string;
  className?: string;
}

const VideoPreview: React.FC<VideoPreviewProps> = ({
  videoUrl,
  customerName,
  reviewId,
  className = "",
}) => {
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  if (!videoUrl) {
    return null;
  }

  // Check if the URL looks like a valid video URL
  const isValidVideoUrl = (url: string) => {
    try {
      const urlObj = new URL(url);
      const validExtensions = [".mp4", ".webm", ".ogg", ".mov", ".avi"];
      const hasValidExtension = validExtensions.some((ext) =>
        urlObj.pathname.toLowerCase().includes(ext)
      );
      const isValidDomain =
        urlObj.protocol === "http:" || urlObj.protocol === "https:";
      return (
        isValidDomain &&
        (hasValidExtension || urlObj.hostname.includes("supabase"))
      );
    } catch {
      return false;
    }
  };

  const handleVideoError = (e: React.SyntheticEvent<HTMLVideoElement>) => {
    // Silently handle the error without logging to console
    setHasError(true);
    setIsLoading(false);
    // Prevent the error from bubbling up
    e.preventDefault();
    e.stopPropagation();
  };

  const handleVideoLoad = () => {
    setIsLoading(false);
    setHasError(false);
  };

  // If URL doesn't look valid, show fallback immediately
  const shouldShowFallback = hasError || !isValidVideoUrl(videoUrl);

  return (
    <div className={`mt-2 ${className}`}>
      <div className="flex items-center gap-2">
        <Badge variant="outline" className="text-xs">
          <Video className="h-3 w-3 mr-1" />
          Video Review
        </Badge>
      </div>

      {/* Clickable Thumbnail preview */}
      <div className="mt-2 relative">
        {!shouldShowFallback ? (
          <VideoDialog
            videoUrl={videoUrl}
            customerName={customerName}
            reviewId={reviewId}
            trigger={
              <div className="relative w-32 h-20 cursor-pointer group">
                <video
                  src={videoUrl}
                  className="w-32 h-20 object-cover rounded border"
                  controls={false}
                  preload="metadata"
                  onError={handleVideoError}
                  onLoadedData={handleVideoLoad}
                  onLoadedMetadata={handleVideoLoad}
                  style={{ display: hasError ? "none" : "block" }}
                />

                {/* Play button overlay */}
                <div className="absolute inset-0 flex items-center justify-center rounded bg-black/30 group-hover:bg-black/50 transition-colors">
                  <Play className="h-6 w-6 text-white" />
                </div>
              </div>
            }
          />
        ) : (
          // Fallback UI when video fails to load or URL is invalid
          <div className="w-32 h-20 bg-gray-100 dark:bg-gray-800 rounded border cursor-not-allowed flex flex-col items-center justify-center">
            <AlertCircle className="h-4 w-4 text-gray-400 mb-1" />
            <span className="text-xs text-gray-500">Video unavailable</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default VideoPreview;
