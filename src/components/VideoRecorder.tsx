import React, { useState, useRef, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Square,
  Pause,
  Play,
  Camera,
  AlertCircle,
  Settings,
  RefreshCw,
  SwitchCamera,
  Download,
  Loader2,
  CheckCircle,
  XCircle,
  Volume2,
  VolumeX,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  retryWithBackoff,
  isOnline,
  waitForOnline,
} from "@/utils/networkUtils";

// Types
interface VideoRecorderProps {
  onVideoRecorded: (blob: Blob) => void;
  maxDuration?: number;
  initialQuality?: VideoQuality;
  autoStart?: boolean;
  className?: string;
}

type VideoQuality = "high" | "medium" | "low";
type RecordingState =
  | "idle"
  | "preparing"
  | "recording"
  | "paused"
  | "processing"
  | "completed"
  | "error";

interface CameraDevice {
  deviceId: string;
  label: string;
}

interface VideoConstraints {
  width: { ideal: number; max: number };
  height: { ideal: number; max: number };
  frameRate: { ideal: number; max: number };
}

// Add mobile-specific video constraints
const getVideoConstraints = () => {
  const isMobile =
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent
    );

  return {
    video: {
      width: isMobile ? { ideal: 640 } : { ideal: 1280 },
      height: isMobile ? { ideal: 480 } : { ideal: 720 },
      frameRate: isMobile ? { ideal: 15 } : { ideal: 30 },
      facingMode: "user",
    },
    audio: {
      echoCancellation: true,
      noiseSuppression: true,
      sampleRate: 44100,
    },
  };
};

// Quality configurations
const QUALITY_CONFIGS: Record<
  VideoQuality,
  VideoConstraints & { bitrate: number }
> = {
  high: {
    width: { ideal: 1920, max: 1920 },
    height: { ideal: 1080, max: 1080 },
    frameRate: { ideal: 30, max: 60 },
    bitrate: 2500000, // 2.5 Mbps
  },
  medium: {
    width: { ideal: 1280, max: 1280 },
    height: { ideal: 720, max: 720 },
    frameRate: { ideal: 30, max: 30 },
    bitrate: 1500000, // 1.5 Mbps
  },
  low: {
    width: { ideal: 640, max: 640 },
    height: { ideal: 480, max: 480 },
    frameRate: { ideal: 15, max: 30 },
    bitrate: 800000, // 800 Kbps
  },
};

// Supported MIME types in order of preference
const SUPPORTED_MIME_TYPES = [
  "video/webm;codecs=vp9,opus",
  "video/webm;codecs=vp8,opus",
  "video/webm;codecs=h264,opus",
  "video/mp4;codecs=h264,aac",
  "video/quicktime;codecs=h264,aac", // <-- iPhone .mov (H.264)
  "video/quicktime;codecs=hevc,aac", // <-- iPhone .mov (HEVC)
  "video/webm",
];

const VideoRecorder: React.FC<VideoRecorderProps> = ({
  onVideoRecorded,
  maxDuration = 120,
  initialQuality = "medium",
  autoStart = false,
  className = "",
}) => {
  // Core state
  const [state, setState] = useState<RecordingState>("idle");
  const [quality, setQuality] = useState<VideoQuality>(initialQuality);
  const [recordingTime, setRecordingTime] = useState(0);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showStopDialog, setShowStopDialog] = useState(false);

  // Camera state
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [cameras, setCameras] = useState<CameraDevice[]>([]);
  const [selectedCamera, setSelectedCamera] = useState<string>("");
  const [facingMode, setFacingMode] = useState<"user" | "environment">("user");
  const [isMuted, setIsMuted] = useState(false);

  // Recording state
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [mimeType, setMimeType] = useState<string>("");

  // Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const previewRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);
  const pausedTimeRef = useRef<number>(0); // Track total paused time

  const { toast } = useToast();

  // Utility functions
  const formatTime = useCallback((seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  }, []);

  const getSupportedMimeType = useCallback((): string => {
    for (const type of SUPPORTED_MIME_TYPES) {
      if (MediaRecorder.isTypeSupported(type)) {
        return type;
      }
    }
    return "";
  }, []);

  const getVideoConstraints = useCallback(() => {
    const isMobile =
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        navigator.userAgent
      );

    const config = QUALITY_CONFIGS[quality];
    const constraints: MediaTrackConstraints = {
      ...config,
      // Apply mobile optimizations
      width: isMobile ? { ideal: 640, max: 640 } : config.width,
      height: isMobile ? { ideal: 480, max: 480 } : config.height,
      frameRate: isMobile ? { ideal: 15, max: 30 } : config.frameRate,
      facingMode,
    };

    if (selectedCamera) {
      constraints.deviceId = { exact: selectedCamera };
      delete constraints.facingMode;
    }

    return constraints;
  }, [quality, facingMode, selectedCamera]);

  // Error handling
  const handleError = useCallback(
    (message: string, details?: any) => {
      console.error("VideoRecorder Error:", message, details);
      setError(message);
      setState("error");
      toast({
        title: "Recording Error",
        description: message,
        variant: "destructive",
      });
    },
    [toast]
  );

  const clearError = useCallback(() => {
    setError(null);
    if (state === "error") {
      setState("idle");
    }
  }, [state]);

  // Camera management
  const enumerateCameras = useCallback(async () => {
    try {
      if (!navigator.mediaDevices?.enumerateDevices) {
        throw new Error("Camera enumeration not supported");
      }

      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices
        .filter((device) => device.kind === "videoinput")
        .map((device) => ({
          deviceId: device.deviceId,
          label: device.label || `Camera ${device.deviceId.slice(0, 5)}`,
        }));

      setCameras(videoDevices);

      if (videoDevices.length > 0 && !selectedCamera) {
        setSelectedCamera(videoDevices[0].deviceId);
      }
    } catch (err: any) {
      console.warn("Could not enumerate cameras:", err);
    }
  }, [selectedCamera]);

  const startCamera = useCallback(async () => {
    try {
      setState("preparing");
      clearError();

      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error("Camera access not supported in this browser");
      }

      // Stop existing stream
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }

      if (!isOnline()) {
        throw new Error("No internet connection available");
      }

      const videoConstraints = getVideoConstraints();
      const constraints: MediaStreamConstraints = {
        video: videoConstraints,
        audio: true,
      };

      const mediaStream = await navigator.mediaDevices.getUserMedia(
        constraints
      );

      // Detect the supported MIME type
      const supportedMimeType = getSupportedMimeType();
      if (!supportedMimeType) {
        throw new Error("No supported video format found");
      }
      setMimeType(supportedMimeType);

      setStream(mediaStream);
      setState("idle");

      toast({
        title: "Camera Ready",
        description: "Camera initialized successfully",
      });
    } catch (err: any) {
      const message =
        err.name === "NotAllowedError"
          ? "Camera access denied. Please allow camera permissions."
          : err.name === "NotFoundError"
          ? "No camera found. Please connect a camera."
          : err.name === "NotReadableError"
          ? "Camera is already in use by another application."
          : `Camera error: ${err.message}`;

      handleError(message, err);
    }
  }, [
    stream,
    getVideoConstraints,
    getSupportedMimeType,
    handleError,
    clearError,
    toast,
  ]);

  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setState("idle");
  }, [stream]);

  const switchCamera = useCallback(async () => {
    if (state === "recording" || state === "paused") {
      toast({
        title: "Cannot Switch Camera",
        description: "Stop recording before switching cameras",
        variant: "destructive",
      });
      return;
    }

    if (cameras.length < 2) {
      toast({
        title: "No Additional Cameras",
        description: "Only one camera is available",
      });
      return;
    }

    const currentIndex = cameras.findIndex(
      (cam) => cam.deviceId === selectedCamera
    );
    const nextIndex = (currentIndex + 1) % cameras.length;
    const nextCamera = cameras[nextIndex];

    setSelectedCamera(nextCamera.deviceId);

    if (stream) {
      await startCamera();
    }

    toast({
      title: "Camera Switched",
      description: `Now using: ${nextCamera.label}`,
    });
  }, [state, cameras, selectedCamera, stream, startCamera, toast]);

  // Recording management
  const startTimer = useCallback(() => {
    startTimeRef.current = Date.now();

    timerRef.current = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
      setRecordingTime(elapsed);
      setProgress((elapsed / maxDuration) * 100);

      if (elapsed >= maxDuration) {
        // Auto-stop when max duration reached
        if (
          mediaRecorderRef.current &&
          mediaRecorderRef.current.state === "recording"
        ) {
          mediaRecorderRef.current.stop();
        }
      }
    }, 100); // Update every 100ms for smooth progress
  }, [maxDuration]);

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const startRecording = useCallback(async () => {
    try {
      if (!stream) {
        throw new Error("No camera stream available");
      }

      if (!mimeType) {
        throw new Error("No supported video format");
      }

      setState("recording");
      chunksRef.current = [];

      const config = QUALITY_CONFIGS[quality];
      const recorder = new MediaRecorder(stream, {
        mimeType,
        videoBitsPerSecond: config.bitrate,
      });

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      recorder.onstop = async () => {
        setState("processing");

        try {
          if (chunksRef.current.length === 0) {
            throw new Error("No video data recorded");
          }

          // Ensure the blob has the correct MIME type
          const blob = new Blob(chunksRef.current, { type: mimeType });

          // Debug logging
          console.log("Created blob with type:", blob.type);
          console.log("Original mimeType:", mimeType);
          console.log("Blob size:", blob.size);

          if (blob.size === 0) {
            throw new Error("Recorded video is empty");
          }

          // Verify the blob type is set correctly
          if (!blob.type || !blob.type.startsWith("video/")) {
            console.warn(
              "Blob type not set correctly, recreating with video/webm"
            );
            const correctedBlob = new Blob(chunksRef.current, {
              type: "video/webm",
            });
            setRecordedBlob(correctedBlob);
            onVideoRecorded(correctedBlob);
          } else {
            setRecordedBlob(blob);
            onVideoRecorded(blob);
          }

          setState("completed");

          toast({
            title: "Recording Complete",
            description: `Video recorded successfully (${(
              blob.size /
              1024 /
              1024
            ).toFixed(2)} MB)`,
          });
        } catch (err: any) {
          handleError(`Failed to process recording: ${err.message}`, err);
        }
      };

      // recorder.onstop = async () => {
      //   setState("processing");

      //   try {
      //     if (chunksRef.current.length === 0) {
      //       throw new Error("No video data recorded");
      //     }

      //     const blob = new Blob(chunksRef.current, { type: mimeType });

      //     if (blob.size === 0) {
      //       throw new Error("Recorded video is empty");
      //     }

      //     setRecordedBlob(blob);
      //     onVideoRecorded(blob);
      //     setState("completed");

      //     toast({
      //       title: "Recording Complete",
      //       description: `Video recorded successfully (${(
      //         blob.size /
      //         1024 /
      //         1024
      //       ).toFixed(2)} MB)`,
      //     });
      //   } catch (err: any) {
      //     handleError(`Failed to process recording: ${err.message}`, err);
      //   }
      // };

      recorder.onerror = (event: any) => {
        handleError(
          `Recording failed: ${event.error?.message || "Unknown error"}`,
          event.error
        );
      };

      mediaRecorderRef.current = recorder;
      recorder.start(1000); // Collect data every second
      startTimer();

      toast({
        title: "Recording Started",
        description: `Recording in ${quality} quality`,
      });
    } catch (err: any) {
      handleError(`Failed to start recording: ${err.message}`, err);
    }
  }, [
    stream,
    mimeType,
    quality,
    startTimer,
    onVideoRecorded,
    handleError,
    toast,
  ]);

  const pauseRecording = useCallback(() => {
    if (!mediaRecorderRef.current) return;

    try {
      if (state === "recording") {
        mediaRecorderRef.current.pause();
        setState("paused");
        stopTimer();

        toast({
          title: "Recording Paused",
          description: "Recording has been paused",
        });
      } else if (state === "paused") {
        mediaRecorderRef.current.resume();
        setState("recording");

        // Adjust the start time to account for the pause duration
        // This keeps the timer continuous from the user's perspective
        const currentTime = Date.now();
        const pauseDuration =
          currentTime - (startTimeRef.current + recordingTime * 1000);
        startTimeRef.current += pauseDuration;

        // Restart the timer to continue from current recordingTime
        timerRef.current = setInterval(() => {
          const elapsed = Math.floor(
            (Date.now() - startTimeRef.current) / 1000
          );
          setRecordingTime(elapsed);
          setProgress((elapsed / maxDuration) * 100);

          if (elapsed >= maxDuration) {
            // Auto-stop when max duration reached
            if (
              mediaRecorderRef.current &&
              mediaRecorderRef.current.state === "recording"
            ) {
              mediaRecorderRef.current.stop();
            }
          }
        }, 100);

        toast({
          title: "Recording Resumed",
          description: "Recording has been resumed",
        });
      }
    } catch (err: any) {
      handleError(`Failed to pause/resume recording: ${err.message}`, err);
    }
  }, [state, recordingTime, maxDuration, stopTimer, handleError, toast]);

  const stopRecording = useCallback(() => {
    if (
      mediaRecorderRef.current &&
      (mediaRecorderRef.current.state === "recording" ||
        mediaRecorderRef.current.state === "paused")
    ) {
      mediaRecorderRef.current.stop();
      stopTimer();
    }
    setShowStopDialog(false);
  }, [stopTimer]);

  const resetRecording = useCallback(() => {
    stopTimer();
    setRecordedBlob(null);
    setRecordingTime(0);
    setProgress(0);
    setState("idle");

    if (mediaRecorderRef.current) {
      mediaRecorderRef.current = null;
    }

    chunksRef.current = [];
  }, [stopTimer]);

  const downloadVideo = useCallback(() => {
    if (!recordedBlob) return;

    try {
      const url = URL.createObjectURL(recordedBlob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `recording-${new Date()
        .toISOString()
        .slice(0, 19)
        .replace(/:/g, "-")}.${mimeType.includes("mp4") ? "mp4" : "webm"}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: "Download Started",
        description: "Video download has started",
      });
    } catch (err: any) {
      handleError(`Failed to download video: ${err.message}`, err);
    }
  }, [recordedBlob, mimeType, handleError, toast]);

  // Effects
  useEffect(() => {
    enumerateCameras();

    if (autoStart) {
      startCamera();
    }

    return () => {
      stopCamera();
      stopTimer();
    };
  }, []);

  useEffect(() => {
    if (stream && videoRef.current) {
      videoRef.current.srcObject = stream;
      videoRef.current.muted = true; // Prevent feedback

      const video = videoRef.current;
      const handleLoadedMetadata = () => {
        video.play().catch(console.warn);
      };

      video.addEventListener("loadedmetadata", handleLoadedMetadata);

      return () => {
        video.removeEventListener("loadedmetadata", handleLoadedMetadata);
      };
    }
  }, [stream]);

  useEffect(() => {
    if (recordedBlob && previewRef.current) {
      const url = URL.createObjectURL(recordedBlob);
      previewRef.current.src = url;

      return () => {
        URL.revokeObjectURL(url);
      };
    }
  }, [recordedBlob]);

  // Render helpers
  const renderCameraView = () => {
    if (error) {
      return (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900 text-white">
          <div className="text-center p-6">
            <XCircle className="h-16 w-16 mx-auto mb-4 text-red-400" />
            <h3 className="text-lg font-semibold mb-2">Camera Error</h3>
            <p className="text-sm text-gray-300 mb-4">{error}</p>
            <Button onClick={clearError} variant="outline" size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
          </div>
        </div>
      );
    }

    if (state === "preparing") {
      return (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900 text-white">
          <div className="text-center">
            <Loader2 className="h-12 w-12 mx-auto mb-4 animate-spin text-blue-400" />
            <p className="text-sm">Initializing camera...</p>
          </div>
        </div>
      );
    }

    if (!stream) {
      return (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900 text-white">
          <div className="text-center p-6">
            <Camera className="h-16 w-16 mx-auto mb-4 text-gray-400" />
            <h3 className="text-lg font-semibold mb-2">Camera Not Started</h3>
            <p className="text-sm text-gray-300 mb-4">
              Click "Start Camera" below to begin
            </p>
          </div>
        </div>
      );
    }

    return (
      <video
        ref={videoRef}
        autoPlay
        muted
        playsInline
        className="w-full h-full object-cover"
        style={{
          transform: facingMode === "user" ? "scaleX(-1)" : "none",
        }}
        aria-label="Camera preview"
      />
    );
  };

  const renderRecordingIndicator = () => {
    if (state !== "recording" && state !== "paused") return null;

    return (
      <div className="absolute top-4 left-4 flex items-center space-x-3 bg-black/80 rounded-lg px-4 py-2 backdrop-blur-sm">
        <div
          className={`w-3 h-3 rounded-full ${
            state === "recording" ? "bg-red-500 animate-pulse" : "bg-yellow-500"
          }`}
        />
        <span className="text-white text-sm font-medium">
          {state === "recording" ? "REC" : "PAUSED"} {formatTime(recordingTime)}
        </span>
        {state === "paused" && (
          <Badge variant="secondary" className="text-xs">
            PAUSED
          </Badge>
        )}
      </div>
    );
  };

  const renderTopControls = () => (
    <div className="absolute top-4 right-4 flex items-center space-x-2">
      <Badge
        variant="outline"
        className="bg-black/50 text-white border-white/20"
      >
        Max: {formatTime(maxDuration)}
      </Badge>

      {stream && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="sm"
                variant="outline"
                className="bg-black/50 border-white/20 text-white hover:bg-black/70"
                onClick={() => setIsMuted(!isMuted)}
              >
                {isMuted ? (
                  <VolumeX className="h-4 w-4" />
                ) : (
                  <Volume2 className="h-4 w-4" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>{isMuted ? "Unmute" : "Mute"} Audio</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
    </div>
  );

  const renderProgressBar = () => {
    if (state !== "recording" && state !== "paused") return null;

    return (
      <div className="absolute bottom-4 left-4 right-4">
        <Progress
          value={progress}
          className="h-2 bg-black/50"
          aria-label={`Recording progress: ${Math.round(progress)}%`}
        />
        <div className="flex justify-between text-xs text-white mt-1">
          <span>{formatTime(recordingTime)}</span>
          <span>{formatTime(maxDuration)}</span>
        </div>
      </div>
    );
  };

  const renderProcessingOverlay = () => {
    if (state !== "processing") return null;

    return (
      <div className="absolute inset-0 flex items-center justify-center bg-black/80 backdrop-blur-sm">
        <div className="text-center text-white">
          <Loader2 className="h-12 w-12 mx-auto mb-4 animate-spin text-blue-400" />
          <h3 className="text-lg font-semibold mb-2">Processing Video</h3>
          <p className="text-sm text-gray-300">
            Please wait while we process your recording...
          </p>
        </div>
      </div>
    );
  };

  const renderMainControls = () => {
    if (state === "completed" && recordedBlob) {
      return (
        <div className="flex flex-wrap justify-center gap-3">
          <Button onClick={resetRecording} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Record Again
          </Button>
          <Button onClick={downloadVideo} variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Download
          </Button>
        </div>
      );
    }

    if (!stream) {
      return (
        <div className="flex justify-center">
          <Button
            onClick={startCamera}
            disabled={state === "preparing"}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {state === "preparing" ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Camera className="h-4 w-4 mr-2" />
            )}
            {state === "preparing" ? "Starting Camera..." : "Start Camera"}
          </Button>
        </div>
      );
    }

    return (
      <div className="flex flex-wrap justify-center gap-3">
        {state === "idle" && (
          <Button
            onClick={startRecording}
            className="bg-red-600 hover:bg-red-700"
            disabled={!stream}
          >
            <Play className="h-4 w-4 mr-2" />
            Start Recording
          </Button>
        )}

        {(state === "recording" || state === "paused") && (
          <>
            <Button
              onClick={pauseRecording}
              variant="outline"
              className="border-yellow-500 text-yellow-600 hover:bg-yellow-50"
            >
              {state === "paused" ? (
                <Play className="h-4 w-4 mr-2" />
              ) : (
                <Pause className="h-4 w-4 mr-2" />
              )}
              {state === "paused" ? "Resume" : "Pause"}
            </Button>

            <Button
              onClick={() => setShowStopDialog(true)}
              className="bg-red-600 hover:bg-red-700"
            >
              <Square className="h-4 w-4 mr-2" />
              Stop Recording
            </Button>
          </>
        )}

        {stream && state === "idle" && (
          <>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    onClick={switchCamera}
                    variant="outline"
                    size="icon"
                    disabled={cameras.length < 2}
                  >
                    <SwitchCamera className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Switch Camera</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    onClick={() => setShowSettings(!showSettings)}
                    variant="outline"
                    size="icon"
                  >
                    <Settings className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Settings</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <Button onClick={stopCamera} variant="outline">
              Stop Camera
            </Button>
          </>
        )}
      </div>
    );
  };

  const renderSettings = () => {
    if (!showSettings) return null;

    return (
      <Card className="mt-4">
        <CardContent className="pt-6">
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">
                Video Quality
              </label>
              <Select
                value={quality}
                onValueChange={(value: VideoQuality) => setQuality(value)}
                disabled={state === "recording" || state === "paused"}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="high">High (1080p) - 2.5 Mbps</SelectItem>
                  <SelectItem value="medium">
                    Medium (720p) - 1.5 Mbps
                  </SelectItem>
                  <SelectItem value="low">Low (480p) - 800 Kbps</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {cameras.length > 1 && (
              <div>
                <label className="text-sm font-medium mb-2 block">Camera</label>
                <Select
                  value={selectedCamera}
                  onValueChange={setSelectedCamera}
                  disabled={state === "recording" || state === "paused"}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {cameras.map((camera) => (
                      <SelectItem key={camera.deviceId} value={camera.deviceId}>
                        {camera.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="flex justify-end">
              <Button
                onClick={() => setShowSettings(false)}
                variant="outline"
                size="sm"
              >
                Close Settings
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderPreview = () => {
    if (!recordedBlob || state !== "completed") return null;

    return (
      <Card className="mt-4">
        <CardContent className="pt-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Recorded Video</h3>
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-5 w-5 text-green-500" />
                <Badge
                  variant="outline"
                  className="text-green-600 border-green-200"
                >
                  {(recordedBlob.size / 1024 / 1024).toFixed(2)} MB
                </Badge>
              </div>
            </div>

            <div className="relative bg-gray-900 rounded-lg overflow-hidden">
              <video
                ref={previewRef}
                controls
                preload="metadata"
                className="w-full max-h-80 object-contain"
                aria-label="Recorded video preview"
              />
            </div>

            <div className="text-sm text-gray-600">
              <p>Duration: {formatTime(recordingTime)}</p>
              <p>
                Quality: {quality} ({QUALITY_CONFIGS[quality].height.ideal}p)
              </p>
              <p>Format: {mimeType.split(";")[0]}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderStatusMessage = () => {
    if (stream && state === "idle") {
      return (
        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center space-x-2">
            <CheckCircle className="h-5 w-5 text-blue-500" />
            <p className="text-sm text-blue-700">
              Camera ready! Click "Start Recording" to begin recording.
            </p>
          </div>
        </div>
      );
    }

    if (!stream && state === "idle" && !error) {
      return (
        <div className="mt-4 p-3 bg-gray-50 border border-gray-200 rounded-lg">
          <div className="flex items-center space-x-2">
            <Camera className="h-5 w-5 text-gray-500" />
            <p className="text-sm text-gray-600">
              Click "Start Camera" to initialize your camera and begin
              recording.
            </p>
          </div>
        </div>
      );
    }

    return null;
  };

  return (
    <div className={`space-y-4 ${className}`}>
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-4">
            {/* Video Container */}
            <div className="relative bg-gray-900 rounded-lg overflow-hidden aspect-video">
              {renderCameraView()}
              {renderRecordingIndicator()}
              {renderTopControls()}
              {renderProgressBar()}
              {renderProcessingOverlay()}
            </div>

            {/* Main Controls */}
            {renderMainControls()}
          </div>
        </CardContent>
      </Card>

      {/* Settings Panel */}
      {renderSettings()}

      {/* Video Preview */}
      {renderPreview()}

      {/* Status Messages */}
      {renderStatusMessage()}

      {/* Stop Recording Confirmation Dialog */}
      <AlertDialog open={showStopDialog} onOpenChange={setShowStopDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Stop Recording?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to stop the current recording? This action
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Continue Recording</AlertDialogCancel>
            <AlertDialogAction
              onClick={stopRecording}
              className="bg-red-600 hover:bg-red-700"
            >
              Stop Recording
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default VideoRecorder;
