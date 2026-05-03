"use client";

import { X, FileImage, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { UploadJob } from "@/hooks/useUpload";

interface FilePreviewProps {
  file: File;
  previewUrl?: string;
  uploadJob?: UploadJob;
  onRemove: () => void;
  isUploading?: boolean;
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

function getStatusIcon(status?: UploadJob["status"]) {
  switch (status) {
    case "completed":
      return <CheckCircle2 className="h-4 w-4 text-green-500" />;
    case "failed":
      return <AlertCircle className="h-4 w-4 text-destructive" />;
    case "processing":
      return <Loader2 className="h-4 w-4 animate-spin text-primary" />;
    default:
      return null;
  }
}

function getStatusText(status?: UploadJob["status"]) {
  switch (status) {
    case "completed":
      return "Uploaded";
    case "failed":
      return "Failed";
    case "processing":
      return "Processing...";
    case "pending":
      return "Pending...";
    default:
      return "";
  }
}

export function FilePreview({
  file,
  previewUrl,
  uploadJob,
  onRemove,
  isUploading = false,
}: FilePreviewProps) {
  const isImage = file.type.startsWith("image/");

  return (
    <div className="relative flex items-center gap-3 rounded-lg border border-border bg-card p-3 transition-colors hover:bg-accent/50">
      {/* Thumbnail */}
      <div className="relative flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-md bg-muted">
        {isImage && previewUrl ? (
          <img
            src={previewUrl}
            alt={file.name}
            className="h-full w-full object-cover"
          />
        ) : (
          <FileImage className="h-8 w-8 text-muted-foreground" />
        )}
      </div>

      {/* File Info */}
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <p className="truncate text-sm font-medium text-card-foreground">
          {file.name}
        </p>
        <p className="text-xs text-muted-foreground">
          {formatFileSize(file.size)}
        </p>
        {uploadJob?.status && (
          <div className="flex items-center gap-1.5 text-xs">
            {getStatusIcon(uploadJob.status)}
            <span
              className={
                uploadJob.status === "failed"
                  ? "text-destructive"
                  : uploadJob.status === "completed"
                  ? "text-green-600"
                  : "text-muted-foreground"
              }
            >
              {getStatusText(uploadJob.status)}
            </span>
          </div>
        )}
      </div>

      {/* Remove Button */}
      <Button
        variant="ghost"
        size="icon-xs"
        onClick={onRemove}
        disabled={isUploading}
        className="shrink-0 opacity-0 transition-opacity group-hover:opacity-100 hover:opacity-100"
        aria-label={`Remove ${file.name}`}
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
}
