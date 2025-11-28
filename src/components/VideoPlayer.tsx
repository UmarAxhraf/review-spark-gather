import React, { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  RotateCcw,
  Settings,
  PictureInPicture,
  SkipForward,
  SkipBack,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";

interface VideoPlayerProps {
  src: string;
  poster?: string;
  autoPlay?: boolean;
  controls?: boolean;
  className?: string;
  onPlay?: () => void;
  onPause?: () => void;
  onEnded?: () => void;
  onError?: (error: any) => void;
}

const VideoPlayer: React.FC<VideoPlayerProps> = ({
  src,
  poster,
  autoPlay = false,
  controls = true,
  className = "",
  onPlay,
  onPause,
  onEnded,
  onError,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [durationLocked, setDurationLocked] = useState(false);
  const [volume, setVolume] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isBuffering, setIsBuffering] = useState(false);
  const [showControls, setShowControls] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Use a reasonable fixed max when duration is unknown to avoid slider pinning
  const UNKNOWN_DURATION_FALLBACK_MAX = 60; // seconds

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
        onPause?.();
      } else {
        const playPromise = videoRef.current.play();
        if (playPromise !== undefined) {
          playPromise
            .then(() => {
              onPlay?.();
            })
            .catch((error) => {
              console.error("Error playing video:", error);
              onError?.(error);
              toast.error("Could not play video. Please try again.");
            });
        }
      }
      setIsPlaying(!isPlaying);
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const handleTimeUpdate = () => {
    const video = videoRef.current;
    if (video) {
      setCurrentTime(video.currentTime);
      // Do NOT recompute duration during playback to avoid jumping
    }
  };

  // Helper to compute a safe, finite duration (exclude currentTime to keep total static)
  const getSafeDuration = (video: HTMLVideoElement): number => {
    const candidates: number[] = [];
    const d = video.duration;
    if (Number.isFinite(d) && !Number.isNaN(d) && d > 0) candidates.push(d);
    try {
      if (video.seekable && video.seekable.length > 0) {
        const end = video.seekable.end(video.seekable.length - 1);
        if (Number.isFinite(end) && end > 0) candidates.push(end);
      }
      if (video.buffered && video.buffered.length > 0) {
        const end = video.buffered.end(video.buffered.length - 1);
        if (Number.isFinite(end) && end > 0) candidates.push(end);
      }
    } catch {}
    return candidates.length ? Math.max(...candidates) : 0;
  };

  const MIN_VALID_DURATION = 3; // avoid transient 0–2s metadata glitches
  const updateDuration = (lockIfValid: boolean = false) => {
    const video = videoRef.current;
    if (!video || durationLocked) return;
    const d = getSafeDuration(video);
    if (Number.isFinite(d) && d >= MIN_VALID_DURATION) {
      setDuration(d);
      if (lockIfValid) setDurationLocked(true);
    }
  };

  // Force-resolve duration for sources that report Infinity/unknown until end.
  const forceResolveDuration = () => {
    const video = videoRef.current;
    if (!video || durationLocked) return;

    // If we already have a valid duration, lock and return.
    const initial = getSafeDuration(video);
    if (Number.isFinite(initial) && initial >= MIN_VALID_DURATION) {
      setDuration(initial);
      setDurationLocked(true);
      return;
    }

    // Need metadata available to perform the seek trick.
    if (video.readyState < 1) return; // HAVE_METADATA

    const wasPaused = video.paused;
    const prevTime = video.currentTime;

    const finish = () => {
      const d = getSafeDuration(video);
      if (Number.isFinite(d) && d >= MIN_VALID_DURATION) {
        setDuration(d);
        setDurationLocked(true);
      }
      try {
        video.currentTime = prevTime;
        if (wasPaused) video.pause();
      } catch {}
      video.removeEventListener("timeupdate", onUpdateOnce);
      video.removeEventListener("seeked", onUpdateOnce);
    };

    const onUpdateOnce = () => finish();

    try {
      video.addEventListener("timeupdate", onUpdateOnce);
      video.addEventListener("seeked", onUpdateOnce);
      // Jump far ahead; browser clamps to end, revealing true duration.
      video.currentTime = 1e9;
    } catch {
      // As a fallback, try a smaller large seek.
      try {
        video.currentTime = 1e6;
      } catch {}
    }
  };

  // Parse duration hint from `src` query parameter `d` and lock if valid
  useEffect(() => {
    let hintedDuration: number | null = null;
    try {
      // Only attempt parsing for http(s) URLs
      if (src.startsWith("http")) {
        const u = new URL(src);
        const dParam = u.searchParams.get("d");
        if (dParam) {
          const val = Number(dParam);
          if (Number.isFinite(val) && val > 0) hintedDuration = val;
        }
      }
    } catch {}

    if (hintedDuration && !durationLocked) {
      setDuration(hintedDuration);
      setDurationLocked(true);
    }
    // Reset current time when source changes
    setCurrentTime(0);
    setIsPlaying(false);
  }, [src]);

  const handleLoadedMetadata = () => {
    // Capture initial duration without locking, then re-check shortly
    updateDuration(false);
    setTimeout(() => {
      if (!durationLocked) {
        updateDuration(true);
        if (!durationLocked) forceResolveDuration();
      }
    }, 300);
  };

  const handleDurationChange = () => {
    // When browser reports duration change, lock if valid to prevent jumping
    updateDuration(true);
  };

  const handleCanPlayThrough = () => {
    // At this point, browsers usually know the full duration
    updateDuration(true);
    if (!durationLocked) forceResolveDuration();
  };

  const handleEnded = () => {
    setIsPlaying(false);
    // If duration never resolved via metadata, use the final playback time
    const video = videoRef.current;
    if (video && !durationLocked) {
      const metaDuration = getSafeDuration(video);
      const finalDuration =
        Number.isFinite(metaDuration) && metaDuration > 0
          ? metaDuration
          : video.currentTime;
      if (Number.isFinite(finalDuration) && finalDuration > 0) {
        setDuration(finalDuration);
        setDurationLocked(true);
      }
    }
    onEnded?.();
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    if (videoRef.current) {
      videoRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const vol = parseFloat(e.target.value);
    if (videoRef.current) {
      videoRef.current.volume = vol;
      setVolume(vol);
      setIsMuted(vol === 0);
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement && containerRef.current) {
      containerRef.current.requestFullscreen();
      setIsFullscreen(true);
    } else if (document.exitFullscreen) {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const restart = () => {
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
      setCurrentTime(0);
    }
  };

  const formatTime = (time: number): string => {
    if (!Number.isFinite(time) || Number.isNaN(time) || time <= 0) {
      return "--:--";
    }
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  const changePlaybackRate = (rate: number) => {
    if (videoRef.current) {
      videoRef.current.playbackRate = rate;
      setPlaybackRate(rate);
      toast.success(`Playback speed: ${rate}x`);
    }
  };

  const skipForward = () => {
    if (videoRef.current) {
      const newTime = Math.min(videoRef.current.currentTime + 10, duration);
      videoRef.current.currentTime = newTime;
      setCurrentTime(newTime);
    }
  };

  const skipBackward = () => {
    if (videoRef.current) {
      const newTime = Math.max(videoRef.current.currentTime - 10, 0);
      videoRef.current.currentTime = newTime;
      setCurrentTime(newTime);
    }
  };

  const togglePictureInPicture = async () => {
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      } else if (videoRef.current) {
        await videoRef.current.requestPictureInPicture();
      }
    } catch (error) {
      console.error("Picture-in-Picture error:", error);
      toast.error("Picture-in-Picture is not supported in this browser");
    }
  };

  const handleWaiting = () => {
    setIsBuffering(true);
  };

  const handlePlaying = () => {
    setIsBuffering(false);
  };

  const handleError = (e: React.SyntheticEvent<HTMLVideoElement, Event>) => {
    const error = (e.target as HTMLVideoElement).error;
    console.error("Video error:", error);
    onError?.(error);
    toast.error(`Error playing video: ${error?.message || "Unknown error"}`);
  };

  const showControlsTemporarily = () => {
    setShowControls(true);

    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }

    controlsTimeoutRef.current = setTimeout(() => {
      if (isPlaying) {
        setShowControls(false);
      }
    }, 3000);
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
    };
  }, []);

  return (
    <Card className={className}>
      <CardContent className="p-0">
        <div
          ref={containerRef}
          className="relative bg-black rounded-lg overflow-hidden"
          onMouseMove={showControlsTemporarily}
          onMouseEnter={() => setShowControls(true)}
          onMouseLeave={() => isPlaying && setShowControls(false)}
        >
          <video
            ref={videoRef}
            src={src}
            poster={poster}
            autoPlay={autoPlay}
            preload="metadata"
            onTimeUpdate={handleTimeUpdate}
            onLoadedMetadata={handleLoadedMetadata}
            onDurationChange={handleDurationChange}
            onLoadedData={() => updateDuration(false)}
            onCanPlayThrough={handleCanPlayThrough}
            onEnded={handleEnded}
            onWaiting={handleWaiting}
            onPlaying={handlePlaying}
            onError={handleError}
            className="w-full aspect-video object-contain"
            onClick={togglePlay}
            playsInline
          />

          {/* Buffering indicator */}
          {isBuffering && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/30">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
            </div>
          )}

          {/* Custom Controls */}
          {controls && (showControls || !isPlaying) && (
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4 transition-opacity duration-300">
              {/* Progress Bar */}
              <div className="mb-3">
                <input
                  type="range"
                  min="0"
                  max={
                    Number.isFinite(duration) && duration > 0
                      ? duration
                      : Math.max(UNKNOWN_DURATION_FALLBACK_MAX, currentTime + 5)
                  }
                  value={currentTime}
                  onChange={handleSeek}
                  className="w-full h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer slider"
                  aria-label="Video progress"
                />
              </div>

              {/* Control Buttons */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Button
                    onClick={togglePlay}
                    variant="ghost"
                    size="sm"
                    className="text-white hover:bg-white/20"
                    aria-label={isPlaying ? "Pause" : "Play"}
                  >
                    {isPlaying ? (
                      <Pause className="h-5 w-5" />
                    ) : (
                      <Play className="h-5 w-5" />
                    )}
                  </Button>

                  <Button
                    onClick={skipBackward}
                    variant="ghost"
                    size="sm"
                    className="text-white hover:bg-white/20"
                    aria-label="Skip backward 10 seconds"
                  >
                    <SkipBack className="h-4 w-4" />
                  </Button>

                  <Button
                    onClick={skipForward}
                    variant="ghost"
                    size="sm"
                    className="text-white hover:bg-white/20"
                    aria-label="Skip forward 10 seconds"
                  >
                    <SkipForward className="h-4 w-4" />
                  </Button>

                  <Button
                    onClick={restart}
                    variant="ghost"
                    size="sm"
                    className="text-white hover:bg-white/20"
                    aria-label="Restart video"
                  >
                    <RotateCcw className="h-4 w-4" />
                  </Button>

                  <div className="flex items-center space-x-2">
                    <Button
                      onClick={toggleMute}
                      variant="ghost"
                      size="sm"
                      className="text-white hover:bg-white/20"
                      aria-label={isMuted ? "Unmute" : "Mute"}
                    >
                      {isMuted ? (
                        <VolumeX className="h-4 w-4" />
                      ) : (
                        <Volume2 className="h-4 w-4" />
                      )}
                    </Button>

                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.1"
                      value={volume}
                      onChange={handleVolumeChange}
                      className="w-20 h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer"
                      aria-label="Volume control"
                    />
                  </div>

                  <span className="text-white text-sm">
                    {formatTime(currentTime)} / {formatTime(duration)}
                  </span>
                </div>

                <div className="flex items-center space-x-2">
                  {/* Playback Speed */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-white hover:bg-white/20"
                        aria-label="Playback speed"
                      >
                        <span className="text-xs mr-1">{playbackRate}x</span>
                        <Settings className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {[0.5, 0.75, 1, 1.25, 1.5, 2].map((rate) => (
                        <DropdownMenuItem
                          key={rate}
                          onClick={() => changePlaybackRate(rate)}
                          className={playbackRate === rate ? "bg-gray-100" : ""}
                        >
                          {rate}x {playbackRate === rate && "✓"}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>

                  {/* Picture in Picture */}
                  <Button
                    onClick={togglePictureInPicture}
                    variant="ghost"
                    size="sm"
                    className="text-white hover:bg-white/20"
                    aria-label="Picture in picture"
                  >
                    <PictureInPicture className="h-4 w-4" />
                  </Button>

                  {/* Fullscreen */}
                  <Button
                    onClick={toggleFullscreen}
                    variant="ghost"
                    size="sm"
                    className="text-white hover:bg-white/20"
                    aria-label={
                      isFullscreen ? "Exit fullscreen" : "Enter fullscreen"
                    }
                  >
                    <Maximize className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Play button overlay */}
          {!isPlaying && !controls && (
            <div className="absolute inset-0 flex items-center justify-center">
              <Button
                onClick={togglePlay}
                className="bg-black/50 hover:bg-black/70 text-white rounded-full p-4"
                aria-label="Play video"
              >
                <Play className="h-8 w-8" />
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default VideoPlayer;

//========================================================================>>>>>>>>>>>>>
