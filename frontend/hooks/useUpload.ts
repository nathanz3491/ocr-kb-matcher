"use client";

import { useState, useCallback } from "react";
import axios, { AxiosProgressEvent } from "axios";

export interface UploadJob {
  jobId: string;
  status: "pending" | "processing" | "completed" | "failed";
  fileName: string;
}

export interface UploadState {
  isUploading: boolean;
  progress: number;
  error: string | null;
  jobs: UploadJob[];
}

interface UseUploadReturn {
  uploadFiles: (files: File[]) => Promise<UploadJob[]>;
  uploadState: UploadState;
  reset: () => void;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

export function useUpload(): UseUploadReturn {
  const [uploadState, setUploadState] = useState<UploadState>({
    isUploading: false,
    progress: 0,
    error: null,
    jobs: [],
  });

  const uploadFiles = useCallback(async (files: File[]): Promise<UploadJob[]> => {
    if (files.length === 0) {
      setUploadState((prev) => ({
        ...prev,
        error: "No files selected",
      }));
      return [];
    }

    setUploadState({
      isUploading: true,
      progress: 0,
      error: null,
      jobs: [],
    });

    const formData = new FormData();
    const isMultiple = files.length > 1;
    files.forEach((file) => {
      formData.append(isMultiple ? "files" : "file", file);
    });

    try {
      interface UploadResponse {
        success: boolean;
        data: {
          batchId?: string;
          count?: number;
          jobs?: UploadJob[];
          jobId?: string;
          status?: string;
          fileName?: string;
          message?: string;
        };
      }

      const response = await axios.post<UploadResponse>(
        `${API_BASE_URL}/api/upload`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
            "x-upload-multiple": isMultiple ? "true" : "false",
          },
          onUploadProgress: (progressEvent: AxiosProgressEvent) => {
            if (progressEvent.total) {
              const progress = Math.round(
                (progressEvent.loaded * 100) / progressEvent.total
              );
              setUploadState((prev) => ({
                ...prev,
                progress,
              }));
            }
          },
        }
      );

      // Extract jobs from response - handle both single and multiple file uploads
      let jobs: UploadJob[];
      if (response.data.data.jobs) {
        // Multiple files
        jobs = response.data.data.jobs;
      } else if (response.data.data.jobId) {
        // Single file - wrap in array
        jobs = [{
          jobId: response.data.data.jobId,
          status: response.data.data.status as UploadJob['status'],
          fileName: response.data.data.fileName || '',
        }];
      } else {
        jobs = [];
      }

      setUploadState({
        isUploading: false,
        progress: 100,
        error: null,
        jobs,
      });

      return jobs;
    } catch (err) {
      let errorMessage = "Upload failed";
      
      if (axios.isAxiosError(err)) {
        errorMessage = err.response?.data?.detail || err.message || "Upload failed";
      } else if (err instanceof Error) {
        errorMessage = err.message;
      }

      setUploadState({
        isUploading: false,
        progress: 0,
        error: errorMessage,
        jobs: [],
      });

      return [];
    }
  }, []);

  const reset = useCallback(() => {
    setUploadState({
      isUploading: false,
      progress: 0,
      error: null,
      jobs: [],
    });
  }, []);

  return {
    uploadFiles,
    uploadState,
    reset,
  };
}
