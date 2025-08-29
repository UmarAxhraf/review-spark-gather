import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Play, Video } from "lucide-react";
import VideoPlayer from "@/components/VideoPlayer";
import { toast } from "sonner";

interface VideoDialogProps {
  videoUrl: string;
  customerName: string;
  reviewId: string;
  trigger?: React.ReactNode;
  className?: string;
}

const VideoDialog: React.FC<VideoDialogProps> = ({
  videoUrl,
  customerName,
  reviewId,
  trigger,
  className = "",
}) => {
  const handleVideoError = (error: any) => {
    console.error("Video playback error:", error);
    toast.error("Unable to load video. Please check if the file exists.");
  };

  const defaultTrigger = (
    <Button
      variant="outline"
      size="sm"
      className={`flex items-center gap-2 ${className}`}
    >
      <Play className="h-4 w-4" />
      Play Video
    </Button>
  );

  return (
    <Dialog>
      <DialogTrigger asChild>{trigger || defaultTrigger}</DialogTrigger>
      <DialogContent className="max-w-4xl w-full">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Video className="h-5 w-5" />
            Video Review from {customerName}
          </DialogTitle>
        </DialogHeader>
        <div className="mt-4">
          <VideoPlayer
            src={videoUrl}
            controls={true}
            className="w-full"
            onError={handleVideoError}
            // onPlay={() => {
            //   console.log(`Playing video review ${reviewId}`);
            // }}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default VideoDialog;
