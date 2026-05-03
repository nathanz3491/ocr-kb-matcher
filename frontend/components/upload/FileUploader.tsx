"use client";

import { useState, useCallback, useEffect } from "react";
import { useDropzone } from "react-dropzone";
import { Upload, X, AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FilePreview } from "./FilePreview";
import { useUpload, UploadJob } from "@/hooks/useUpload";
import { cn } from "@/lib/utils";

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
const MAX_FILES = 20;
const ACCEPTED_TYPES = {
  "application/pdf": [".pdf"],
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": [".pptx"],
  "text/plain": [".txt"],
  "text/markdown": [".md"],
  "image/*": [".png", ".jpg", ".jpeg", ".gif", ".webp", ".bmp", ".tiff"],
};

interface FileWithPreview {
  file: File;
  previewUrl: string;
  id: string;
}

interface FileUploaderProps {
  onUploadComplete?: (jobs: UploadJob[]) => void;
}

export function FileUploader({ onUploadComplete }: FileUploaderProps) {
  const [files, setFiles] = useState<FileWithPreview[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const { uploadFiles, uploadState, reset } = useUpload();

  // Create preview URLs
  const createPreview = useCallback((file: File): string => {
    return URL.createObjectURL(file);
  }, []);

  // Cleanup preview URLs on unmount
  useEffect(() => {
    return () => {
      files.forEach((f) => URL.revokeObjectURL(f.previewUrl));
    };
  }, [files]);

  const onDrop = useCallback(
    (acceptedFiles: File[], rejectedFiles: any[]) => {
      setErrors([]);

      // Handle rejected files
      const newErrors: string[] = [];
      
      rejectedFiles.forEach((rejected) => {
        const { file, errors: fileErrors } = rejected;
        fileErrors.forEach((err: any) => {
          if (err.code === "file-too-large") {
            newErrors.push(`${file.name}: File exceeds 50MB limit`);
          } else if (err.code === "file-invalid-type") {
            newErrors.push(`${file.name}: Invalid file type (not an accepted format)`);
          } else {
            newErrors.push(`${file.name}: ${err.message}`);
          }
        });
      });

      // Check max files limit
      const remainingSlots = MAX_FILES - files.length;
      if (remainingSlots <= 0) {
        newErrors.push(`Maximum ${MAX_FILES} files allowed`);
        setErrors(newErrors);
        return;
      }

      const filesToAdd = acceptedFiles.slice(0, remainingSlots);
      
      if (acceptedFiles.length > remainingSlots) {
        newErrors.push(`Only ${remainingSlots} file(s) added (max ${MAX_FILES})`);
      }

      const newFiles: FileWithPreview[] = filesToAdd.map((file) => ({
        file,
        previewUrl: createPreview(file),
        id: `${file.name}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      }));

      setFiles((prev) => [...prev, ...newFiles]);
      setErrors(newErrors);
    },
    [files.length, createPreview]
  );

  const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
    onDrop,
    accept: ACCEPTED_TYPES,
    maxSize: MAX_FILE_SIZE,
    maxFiles: MAX_FILES,
    disabled: uploadState.isUploading,
  });

  const removeFile = useCallback((id: string) => {
    setFiles((prev) => {
      const fileToRemove = prev.find((f) => f.id === id);
      if (fileToRemove) {
        URL.revokeObjectURL(fileToRemove.previewUrl);
      }
      return prev.filter((f) => f.id !== id);
    });
  }, []);

  const clearAllFiles = useCallback(() => {
    files.forEach((f) => URL.revokeObjectURL(f.previewUrl));
    setFiles([]);
    setErrors([]);
    reset();
  }, [files, reset]);

  const handleUpload = useCallback(async () => {
    if (files.length === 0) return;

    const fileList = files.map((f) => f.file);
    const jobs = await uploadFiles(fileList);

    if (jobs.length > 0) {
      onUploadComplete?.(jobs);
    }
  }, [files, uploadFiles, onUploadComplete]);

  // Map upload jobs to files for status display
  const getJobForFile = (fileName: string): UploadJob | undefined => {
    return uploadState.jobs.find((job) => job.fileName === fileName);
  };

  const hasFiles = files.length > 0;
  const canUpload = hasFiles && !uploadState.isUploading;

  return (
    <div className="w-full space-y-4">
      {/* Drop Zone */}
      <div
        {...getRootProps()}
        className={cn(
          "relative cursor-pointer rounded-xl border-2 border-dashed p-8 transition-all duration-200",
          isDragActive && !isDragReject && "border-primary bg-primary/5",
          isDragReject && "border-destructive bg-destructive/5",
          !isDragActive && !uploadState.isUploading && "border-border hover:border-primary/50 hover:bg-accent/50",
          uploadState.isUploading && "cursor-not-allowed opacity-60"
        )}
      >
        <input {...getInputProps()} />
        
        <div className="flex flex-col items-center justify-center gap-3 text-center">
          <div
            className={cn(
              "flex h-14 w-14 items-center justify-center rounded-full transition-colors",
              isDragActive && !isDragReject && "bg-primary text-primary-foreground",
              isDragReject && "bg-destructive text-destructive-foreground",
              !isDragActive && !isDragReject && "bg-muted text-muted-foreground"
            )}
          >
            {isDragReject ? (
              <AlertCircle className="h-6 w-6" />
            ) : (
              <Upload className="h-6 w-6" />
            )}
          </div>
          
          <div className="space-y-1">
            <p className="text-base font-medium text-foreground">
              {isDragActive
                ? isDragReject
                  ? "Invalid files detected"
                  : "Drop files here..."
                : "Drag & drop files here"}
            </p>
            <p className="text-sm text-muted-foreground">
              or click to browse files
            </p>
          </div>
          
          <div className="text-xs text-muted-foreground">
            <p>Supports: PNG, JPG, PDF, DOCX, PPTX, TXT, MD</p>
            <p>Max size: 50MB per file • Max {MAX_FILES} files</p>
          </div>
        </div>
      </div>

      {/* Error Messages */}
      {errors.length > 0 && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3">
          <div className="flex items-start gap-2">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
            <div className="space-y-1">
              {errors.map((error, index) => (
                <p key={index} className="text-sm text-destructive">
                  {error}
                </p>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Upload Error */}
      {uploadState.error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3">
          <div className="flex items-start gap-2">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
            <p className="text-sm text-destructive">{uploadState.error}</p>
          </div>
        </div>
      )}

      {/* File List */}
      {hasFiles && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-foreground">
              {files.length} file{files.length !== 1 ? "s" : ""} selected
            </p>
            <Button
              variant="ghost"
              size="sm"
              onClick={clearAllFiles}
              disabled={uploadState.isUploading}
              className="h-auto py-1 text-xs"
            >
              <X className="mr-1 h-3 w-3" />
              Clear all
            </Button>
          </div>

          <div className="max-h-80 space-y-2 overflow-y-auto rounded-lg border border-border bg-card/50 p-2">
            {files.map((fileWithPreview) => (
              <FilePreview
                key={fileWithPreview.id}
                file={fileWithPreview.file}
                previewUrl={fileWithPreview.previewUrl}
                uploadJob={getJobForFile(fileWithPreview.file.name)}
                onRemove={() => removeFile(fileWithPreview.id)}
                isUploading={uploadState.isUploading}
              />
            ))}
          </div>
        </div>
      )}

      {/* Upload Progress */}
      {uploadState.isUploading && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Uploading...</span>
            <span className="font-medium text-primary">{uploadState.progress}%</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all duration-200"
              style={{ width: `${uploadState.progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Success State */}
      {uploadState.jobs.length > 0 && !uploadState.isUploading && (
        <div className="rounded-lg border border-green-500/50 bg-green-500/10 p-3">
          <div className="flex items-start gap-2">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />
            <p className="text-sm text-green-700 dark:text-green-400">
              Successfully uploaded {uploadState.jobs.length} file
              {uploadState.jobs.length !== 1 ? "s" : ""}. Job IDs: {" "}
              {uploadState.jobs.map((j) => j.jobId).join(", ")}
            </p>
          </div>
        </div>
      )}

      {/* Upload Button */}
      {hasFiles && uploadState.jobs.length === 0 && (
        <Button
          onClick={handleUpload}
          disabled={!canUpload}
          className="w-full"
          size="lg"
        >
          {uploadState.isUploading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Uploading...
            </>
          ) : (
            <>
              <Upload className="mr-2 h-4 w-4" />
              Upload {files.length} file{files.length !== 1 ? "s" : ""}
            </>
          )}
        </Button>
      )}
    </div>
  );
}
