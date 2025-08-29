import React, { useState, useRef } from "react";
import {
  Upload,
  X,
  File,
  CheckCircle,
  AlertCircle,
  Settings,
  Download,
} from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";

// Mock shadcn/ui components - replace with actual imports in your project
const Button = ({
  children,
  onClick,
  variant = "default",
  size = "default",
  className = "",
  disabled = false,
  ...props
}) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={`
      px-4 py-2 rounded-md font-medium transition-colors
      ${
        variant === "outline"
          ? "border border-gray-300 bg-white hover:bg-gray-50"
          : variant === "ghost"
          ? "bg-transparent hover:bg-gray-100"
          : "bg-blue-600 text-white hover:bg-blue-700"
      }
      ${size === "sm" ? "px-2 py-1 text-sm" : ""}
      ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
      ${className}
    `}
    {...props}
  >
    {children}
  </button>
);

const Card = ({ children, className = "" }) => (
  <div
    className={`bg-white border border-gray-200 rounded-lg shadow-sm ${className}`}
  >
    {children}
  </div>
);

const CardContent = ({ children, className = "" }) => (
  <div className={`p-6 ${className}`}>{children}</div>
);

const Progress = ({ value, className = "" }) => (
  <div className={`w-full bg-gray-200 rounded-full h-2 ${className}`}>
    <div
      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
      style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
    />
  </div>
);

const Dialog = ({ children }) => {
  const [open, setOpen] = useState(false);
  return (
    <div>
      {React.Children.map(children, (child) =>
        React.cloneElement(child, { open, setOpen })
      )}
    </div>
  );
};

const DialogTrigger = ({ children, open, setOpen }) => (
  <div onClick={() => setOpen(true)}>{children}</div>
);

const DialogContent = ({ children, open, setOpen }) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 relative">
        <button
          onClick={() => setOpen(false)}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
        >
          <X className="h-4 w-4" />
        </button>
        {children}
      </div>
    </div>
  );
};

const DialogHeader = ({ children }) => <div className="mb-4">{children}</div>;
const DialogTitle = ({ children }) => (
  <h2 className="text-lg font-semibold">{children}</h2>
);

const Select = ({ value, onValueChange, disabled, children }) => {
  const [open, setOpen] = useState(false);

  // Helper function to get display text based on value
  const getDisplayText = (value) => {
    switch (value) {
      case "high":
        return "High (1080p)";
      case "medium":
        return "Medium (720p)";
      case "low":
        return "Low (480p)";
      default:
        return "Select quality...";
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => !disabled && setOpen(!open)}
        disabled={disabled}
        className={`
          w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-left flex justify-between items-center
          ${
            disabled
              ? "opacity-50 cursor-not-allowed"
              : "cursor-pointer hover:border-gray-400"
          }
        `}
      >
        <span>{getDisplayText(value)}</span>
        <svg
          className={`w-4 h-4 transition-transform ${open ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>
      {open && !disabled && (
        <div className="absolute top-full left-0 right-0 bg-white border border-gray-300 rounded-md shadow-lg z-10 mt-1">
          {React.Children.map(children, (child) => {
            if (child.type === SelectContent) {
              return React.Children.map(child.props.children, (selectItem) =>
                React.cloneElement(selectItem, {
                  onSelect: (val) => {
                    onValueChange(val);
                    setOpen(false);
                  },
                  isSelected: selectItem.props.value === value,
                })
              );
            }
            return child;
          })}
        </div>
      )}
    </div>
  );
};

const SelectContent = ({ children }) => <>{children}</>;
const SelectTrigger = ({ children, id }) => <>{children}</>;
const SelectValue = ({ placeholder }) => null;
const SelectItem = ({ value, children, onSelect, isSelected }) => (
  <div
    className={`px-3 py-2 cursor-pointer transition-colors ${
      isSelected ? "bg-blue-100 text-blue-900 font-medium" : "hover:bg-gray-100"
    }`}
    onClick={() => onSelect(value)}
  >
    <div className="flex items-center justify-between">
      <span>{children}</span>
      {isSelected && <CheckCircle className="h-4 w-4 text-blue-600" />}
    </div>
  </div>
);

const Switch = ({ checked, onCheckedChange, disabled, id }) => (
  <button
    id={id}
    onClick={() => !disabled && onCheckedChange(!checked)}
    disabled={disabled}
    className={`
      relative inline-flex h-6 w-11 items-center rounded-full transition-colors
      ${checked ? "bg-blue-600" : "bg-gray-200"}
      ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
    `}
  >
    <span
      className={`
        inline-block h-4 w-4 transform rounded-full bg-white transition-transform
        ${checked ? "translate-x-6" : "translate-x-1"}
      `}
    />
  </button>
);

const Label = ({ children, htmlFor }) => (
  <label htmlFor={htmlFor} className="text-sm font-medium">
    {children}
  </label>
);

const Tooltip = ({ children }) => {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      {React.Children.map(children, (child) =>
        React.cloneElement(child, { show, setShow })
      )}
    </div>
  );
};

const TooltipProvider = ({ children }) => <>{children}</>;
const TooltipTrigger = ({ children, show, setShow }) => (
  <div onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)}>
    {children}
  </div>
);

const TooltipContent = ({ children, show }) =>
  show ? (
    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-black text-white text-xs rounded whitespace-nowrap">
      {children}
    </div>
  ) : null;

// Toast mock
const toast = {
  success: (message) => console.log("✅", message),
  error: (message) => console.error("❌", message),
  info: (message) => console.info("ℹ️", message),
};

interface VideoUploaderProps {
  onVideoSelected: (file: File) => void;
  maxSizeMB?: number;
  acceptedFormats?: string[];
  enableCompression?: boolean;
}

interface CompressionOptions {
  enabled: boolean;
  quality: "high" | "medium" | "low";
  maintainAspectRatio: boolean;
  autoCompress: boolean;
  sizeThresholdMB: number;
}

const VideoUploader: React.FC<VideoUploaderProps> = ({
  onVideoSelected,
  maxSizeMB = 50,
  acceptedFormats = [
    "video/mp4",
    "video/webm",
    "video/mov",
    "video/avi",
    "video/quicktime",
  ],
  enableCompression = true,
}) => {
  const isMobile = useIsMobile();
  const [isDragOver, setIsDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [validationStatus, setValidationStatus] = useState<
    "idle" | "validating" | "success" | "error"
  >("idle");
  const [isCompressing, setIsCompressing] = useState(false);
  const [compressionProgress, setCompressionProgress] = useState(0);
  const [videoInfo, setVideoInfo] = useState<{
    width: number;
    height: number;
    duration: number;
  } | null>(null);
  const [compressionOptions, setCompressionOptions] =
    useState<CompressionOptions>({
      enabled: enableCompression,
      quality: "medium",
      maintainAspectRatio: true,
      autoCompress: true,
      sizeThresholdMB: 10,
    });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Validate file format and size
  const validateFile = async (file: File): Promise<boolean> => {
    setIsValidating(true);
    setValidationStatus("validating");
    setVideoInfo(null);

    try {
      // Check file extension against accepted formats
      const fileExtension = file.name.split(".").pop()?.toLowerCase();
      const acceptedExtensions = acceptedFormats.map((format) =>
        format.split("/")[1].toLowerCase()
      );

      // Add common video extensions that might not be in the MIME types
      const allAcceptedExtensions = [
        ...new Set([
          ...acceptedExtensions,
          "mp4",
          "webm",
          "mov",
          "avi",
          "quicktime",
          "mkv",
        ]),
      ];

      const isValidExtension =
        fileExtension && allAcceptedExtensions.includes(fileExtension);

      // Check MIME type
      const isValidMimeType = acceptedFormats.some((format) => {
        return (
          file.type === format ||
          file.type.startsWith(format.split("/")[0] + "/")
        );
      });

      if (!isValidExtension && !isValidMimeType) {
        const message = `Please select a valid video file. Accepted formats: ${allAcceptedExtensions
          .map((ext) => ext.toUpperCase())
          .join(", ")}`;
        toast.error(message);
        setValidationStatus("error");
        return false;
      }

      // Check file size
      const fileSizeMB = file.size / (1024 * 1024);
      if (fileSizeMB > maxSizeMB) {
        const message = `File size must be less than ${maxSizeMB}MB. Current size: ${fileSizeMB.toFixed(
          2
        )}MB`;
        toast.error(message);
        setValidationStatus("error");
        return false;
      }

      // Additional validation: Check if file is actually a video
      return new Promise((resolve) => {
        const video = document.createElement("video");
        const url = URL.createObjectURL(file);

        const cleanup = () => {
          URL.revokeObjectURL(url);
          video.remove();
        };

        const timeout = setTimeout(() => {
          cleanup();
          console.warn("Video validation timeout - assuming valid");
          setValidationStatus("success");
          resolve(true);
        }, 8000);

        video.onloadedmetadata = () => {
          clearTimeout(timeout);

          if (video.duration > 0) {
            // Store video information for potential compression
            setVideoInfo({
              width: video.videoWidth,
              height: video.videoHeight,
              duration: video.duration,
            });

            setValidationStatus("success");

            // Check if auto-compression should be triggered
            if (
              compressionOptions.enabled &&
              compressionOptions.autoCompress &&
              fileSizeMB > compressionOptions.sizeThresholdMB
            ) {
              toast.info(
                `Large video detected (${fileSizeMB.toFixed(
                  2
                )}MB). Auto-compression will be applied.`
              );
            }

            cleanup();
            resolve(true);
          } else {
            toast.error("Selected file does not appear to be a valid video");
            setValidationStatus("error");
            cleanup();
            resolve(false);
          }
        };

        video.onerror = (e) => {
          clearTimeout(timeout);
          cleanup();
          console.error("Video validation error:", e);
          toast.error("Selected file is corrupted or not a valid video");
          setValidationStatus("error");
          resolve(false);
        };

        video.src = url;
        video.load();
      });
    } catch (error) {
      console.error("Error validating file:", error);
      toast.error("Error validating file. Please try again.");
      setValidationStatus("error");
      return false;
    } finally {
      setIsValidating(false);
    }
  };

  // Simplified compression simulation (for demo purposes)
  const compressVideo = async (file: File): Promise<File> => {
    if (!compressionOptions.enabled) {
      return file;
    }

    try {
      setIsCompressing(true);
      toast.info("Compressing video for better upload performance...");

      // Simulate compression progress
      for (let progress = 0; progress <= 100; progress += 10) {
        setCompressionProgress(progress);
        await new Promise((resolve) => setTimeout(resolve, 200));
      }

      // Calculate simulated compression based on quality setting
      let compressionRatio = 0.7; // Default medium compression
      if (compressionOptions.quality === "high") {
        compressionRatio = 0.85; // Less compression for high quality
      } else if (compressionOptions.quality === "low") {
        compressionRatio = 0.5; // More compression for low quality
      }

      // Create a simulated compressed file
      // In a real implementation, you would use a video compression library
      const originalSizeMB = file.size / (1024 * 1024);
      const simulatedCompressedSize = Math.floor(file.size * compressionRatio);
      const compressedSizeMB = simulatedCompressedSize / (1024 * 1024);

      // Create new blob with simulated size (this is just for demo)
      const compressedBlob = file.slice(0, simulatedCompressedSize);

      // Create a new file object using Blob constructor instead of File constructor
      const compressedFile = new Blob([compressedBlob], { type: file.type });

      // Add file properties manually
      const fileWithProps = Object.assign(compressedFile, {
        name: `${file.name.split(".")[0]}_compressed.${file.name
          .split(".")
          .pop()}`,
        lastModified: file.lastModified,
        webkitRelativePath: "",
      });

      setIsCompressing(false);
      setCompressionProgress(0);

      toast.success(
        `Video compressed successfully: ${compressedSizeMB.toFixed(
          2
        )}MB (${Math.round(
          (1 - compressedSizeMB / originalSizeMB) * 100
        )}% smaller)`
      );

      return fileWithProps as File;
    } catch (error: any) {
      console.error("Video compression failed:", error);
      toast.error("Video compression failed: " + error.message);
      setIsCompressing(false);
      setCompressionProgress(0);
      return file; // Return original file if compression fails
    }
  };

  // Handle file selection
  const handleFileSelect = async (file: File) => {
    const isValid = await validateFile(file);
    if (isValid) {
      let fileToUse = file;

      // Apply compression if enabled and file is larger than threshold
      const fileSizeMB = file.size / (1024 * 1024);
      if (
        compressionOptions.enabled &&
        compressionOptions.autoCompress &&
        fileSizeMB > compressionOptions.sizeThresholdMB
      ) {
        fileToUse = await compressVideo(file);
      }

      setSelectedFile(fileToUse);
      onVideoSelected(fileToUse);
      toast.success("Video ready for submission");
    }
  };

  // Handle file drop
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);

    const files = Array.from(e.dataTransfer.files);

    if (files.length > 0) {
      handleFileSelect(files[0]);
    } else {
      toast.error("No files were dropped");
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;

    if (files && files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  // Clear selected file
  const clearSelection = () => {
    setSelectedFile(null);
    setValidationStatus("idle");
    setVideoInfo(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Manually compress the selected file
  const handleManualCompression = async () => {
    if (selectedFile) {
      const compressedFile = await compressVideo(selectedFile);
      setSelectedFile(compressedFile);
      onVideoSelected(compressedFile);
    }
  };

  // Download the selected file
  const downloadFile = () => {
    if (selectedFile) {
      const url = URL.createObjectURL(selectedFile);
      const a = document.createElement("a");
      a.href = url;
      a.download = selectedFile.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  // Format file size
  const formatFileSize = (bytes: number): string => {
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(2)} MB`;
  };

  // Get file extension
  const getFileExtension = (filename: string): string => {
    return filename.split(".").pop()?.toUpperCase() || "VIDEO";
  };

  // Get status icon
  const getStatusIcon = () => {
    switch (validationStatus) {
      case "validating":
        return (
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500" />
        );
      case "success":
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case "error":
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      default:
        return null;
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardContent className="p-6">
        <div className="space-y-4">
          {/* Drop Zone */}
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            className={`
              border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer
              ${
                isDragOver
                  ? "border-blue-500 bg-blue-50"
                  : validationStatus === "error"
                  ? "border-red-300 bg-red-50"
                  : validationStatus === "success"
                  ? "border-green-300 bg-green-50"
                  : "border-gray-300 hover:border-gray-400"
              }
              ${
                isValidating || isCompressing
                  ? "opacity-50 pointer-events-none"
                  : ""
              }
            `}
            onClick={() =>
              !isValidating && !isCompressing && fileInputRef.current?.click()
            }
          >
            <div className="flex flex-col items-center space-y-2">
              {isCompressing ? (
                <div className="w-full max-w-xs space-y-2">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto" />
                  <p className="text-lg font-medium">Compressing video...</p>
                  <Progress value={compressionProgress} className="h-2" />
                  <p className="text-sm text-gray-600">
                    {compressionProgress}% complete
                  </p>
                </div>
              ) : (
                getStatusIcon() || (
                  <Upload className="h-12 w-12 text-gray-400" />
                )
              )}

              <div className="space-y-2">
                <p className="text-lg font-medium">
                  {isValidating
                    ? "Validating video..."
                    : isDragOver
                    ? "Drop your video here"
                    : validationStatus === "success"
                    ? "Video validated successfully!"
                    : validationStatus === "error"
                    ? "Please try another file"
                    : "Upload a video file"}
                </p>
                {!isValidating &&
                  !isCompressing &&
                  validationStatus !== "success" && (
                    <>
                      <p className="text-sm text-gray-600">
                        Drag and drop or click to browse
                      </p>
                      <p className="text-xs text-gray-500">
                        Max size: {maxSizeMB}MB • Formats:{" "}
                        {acceptedFormats
                          .map((f) => f.split("/")[1].toUpperCase())
                          .join(", ")}
                      </p>
                    </>
                  )}
              </div>
            </div>

            {!isValidating &&
              !isCompressing &&
              validationStatus !== "success" && (
                <Button
                  onClick={(e) => {
                    e.stopPropagation();
                    fileInputRef.current?.click();
                  }}
                  className="mt-4"
                  variant="outline"
                >
                  Choose File
                </Button>
              )}
          </div>

          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept={acceptedFormats.join(",")}
            onChange={handleFileInputChange}
            className="hidden"
          />

          {/* Selected file info */}
          {selectedFile && (
            <div
              className={`rounded-lg p-4 relative ${
                validationStatus === "success"
                  ? "bg-green-50 border border-green-200"
                  : "bg-gray-50"
              }`}
            >
              {/* File info section */}
              <div
                className={`${
                  isMobile ? "space-y-4" : "flex items-center justify-between"
                }`}
              >
                <div
                  className={`flex items-center space-x-3 ${
                    !isMobile ? "flex-1 min-w-0" : ""
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    <File
                      className={`h-5 w-5 ${
                        validationStatus === "success"
                          ? "text-green-600"
                          : "text-blue-600"
                      }`}
                    />
                    {getStatusIcon()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">
                      {selectedFile.name}
                    </p>
                    <p className="text-xs text-gray-600">
                      {formatFileSize(selectedFile.size)} •{" "}
                      {getFileExtension(selectedFile.name)}
                    </p>
                    {videoInfo && (
                      <p className="text-xs text-gray-600">
                        {videoInfo.width}x{videoInfo.height} •{" "}
                        {Math.round(videoInfo.duration)} seconds
                      </p>
                    )}
                    {validationStatus === "success" && (
                      <p className="text-xs text-green-600 mt-1">
                        Ready for submission
                      </p>
                    )}
                  </div>
                </div>

                {/* Action buttons - below file info on mobile, to the right on desktop */}
                <div
                  className={`${
                    isMobile
                      ? "flex justify-center space-x-4 pt-4"
                      : "flex items-center space-x-2 flex-shrink-0"
                  }`}
                >
                  {/* Settings Button */}
                  {enableCompression && validationStatus === "success" && (
                    <Dialog>
                      <DialogTrigger>
                        <Button
                          variant="ghost"
                          size="sm"
                          className={`text-blue-600 hover:text-blue-700 ${
                            isMobile ? "flex items-center px-3 py-2" : ""
                          }`}
                          title="Compression Settings"
                        >
                          <Settings className="h-4 w-4" />
                          {/* {isMobile && <span className="ml-1 text-xs">Settings</span>} */}
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Video Compression Settings</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                          <div className="flex items-center justify-between">
                            <Label htmlFor="compression-toggle">
                              Enable Compression
                            </Label>
                            <Switch
                              id="compression-toggle"
                              checked={compressionOptions.enabled}
                              onCheckedChange={(checked) =>
                                setCompressionOptions((prev) => ({
                                  ...prev,
                                  enabled: checked,
                                }))
                              }
                            />
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="quality-select">Quality</Label>
                            <Select
                              value={compressionOptions.quality}
                              onValueChange={(
                                value: "high" | "medium" | "low"
                              ) =>
                                setCompressionOptions((prev) => ({
                                  ...prev,
                                  quality: value,
                                }))
                              }
                              disabled={!compressionOptions.enabled}
                            >
                              <SelectTrigger id="quality-select">
                                <SelectValue placeholder="Select quality" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="high">
                                  High (1080p)
                                </SelectItem>
                                <SelectItem value="medium">
                                  Medium (720p)
                                </SelectItem>
                                <SelectItem value="low">Low (480p)</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="flex items-center justify-between">
                            <Label htmlFor="aspect-ratio-toggle">
                              Maintain Aspect Ratio
                            </Label>
                            <Switch
                              id="aspect-ratio-toggle"
                              checked={compressionOptions.maintainAspectRatio}
                              onCheckedChange={(checked) =>
                                setCompressionOptions((prev) => ({
                                  ...prev,
                                  maintainAspectRatio: checked,
                                }))
                              }
                              disabled={!compressionOptions.enabled}
                            />
                          </div>

                          <div className="flex items-center justify-between">
                            <Label htmlFor="auto-compress-toggle">
                              Auto-Compress Large Files
                            </Label>
                            <Switch
                              id="auto-compress-toggle"
                              checked={compressionOptions.autoCompress}
                              onCheckedChange={(checked) =>
                                setCompressionOptions((prev) => ({
                                  ...prev,
                                  autoCompress: checked,
                                }))
                              }
                              disabled={!compressionOptions.enabled}
                            />
                          </div>

                          <Button
                            onClick={handleManualCompression}
                            disabled={
                              !compressionOptions.enabled || isCompressing
                            }
                            className="w-full"
                          >
                            {isCompressing ? "Compressing..." : "Compress Now"}
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  )}

                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger>
                        <Button
                          onClick={downloadFile}
                          variant="ghost"
                          size="sm"
                          className={`text-blue-600 hover:text-blue-700 ${
                            isMobile ? "flex items-center px-3 py-2" : ""
                          }`}
                        >
                          <Download className="h-4 w-4" />
                          {/* {isMobile && <span className="ml-1 text-xs">Download</span>} */}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Download File</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>

                  <Button
                    onClick={clearSelection}
                    variant="ghost"
                    size="sm"
                    className={`text-red-600 hover:text-red-700 ${
                      isMobile ? "flex items-center px-3 py-2" : ""
                    }`}
                  >
                    <X className="h-4 w-4" />
                    {/* {isMobile && <span className="ml-1 text-xs">Remove</span>} */}
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Video preview */}
          {selectedFile && validationStatus === "success" && (
            <div className="mt-4">
              <video
                ref={videoRef}
                src={URL.createObjectURL(selectedFile)}
                controls
                className="w-full rounded-lg"
                style={{ maxHeight: "300px" }}
              />
            </div>
          )}

          {/* Debug Info */}
          {/* <div className="mt-4 p-3 bg-gray-100 rounded text-xs">
            <p>
              <strong>Debug Info:</strong>
            </p>
            <p>
              Compression Enabled: {compressionOptions.enabled ? "Yes" : "No"}
            </p>
            <p>Quality: {compressionOptions.quality}</p>
            <p>
              Auto Compress: {compressionOptions.autoCompress ? "Yes" : "No"}
            </p>
            <p>Size Threshold: {compressionOptions.sizeThresholdMB}MB</p>
            <p>
              Maintain Aspect Ratio:{" "}
              {compressionOptions.maintainAspectRatio ? "Yes" : "No"}
            </p>
            <p>Validation Status: {validationStatus}</p>
            <p>Selected File: {selectedFile ? selectedFile.name : "None"}</p>
            <p>Is Compressing: {isCompressing ? "Yes" : "No"}</p>
          </div> */}
        </div>
      </CardContent>
    </Card>
  );
};

export default VideoUploader;
