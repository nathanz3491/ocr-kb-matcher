"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import axios from "axios";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

export type JobStatus = "pending" | "processing" | "ocr_complete" | "matching" | "completed" | "failed";

export interface JobStatusResponse {
  id: string;
  status: JobStatus;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  error?: string;
}

export interface JobFullResponse {
  id: string;
  status: JobStatus;
  fileName: string;
  filePath?: string;
  ocrText?: string;
  ocrConfidence?: number;
  results?: {
    matches: Array<{
      kbEntryId: string;
      confidence: number;
      ocrTextSpan: string;
      reasoning: string;
    }>;
    unmatchedSections?: string[];
  };
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  error?: string;
}

interface UseJobStatusReturn {
  job: JobFullResponse | null;
  status: JobStatusResponse | null;
  isLoading: boolean;
  isPolling: boolean;
  error: string | null;
  refetch: () => void;
}

const POLLING_INTERVAL = 2000; // 2 seconds

export function useJobStatus(jobId: string): UseJobStatusReturn {
  const [status, setStatus] = useState<JobStatusResponse | null>(null);
  const [job, setJob] = useState<JobFullResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPolling, setIsPolling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const fetchStatus = useCallback(async () => {
    try {
      const response = await axios.get<{ success: boolean; data: JobStatusResponse }>(
        `${API_BASE_URL}/api/jobs/${jobId}/status`
      );
      setStatus(response.data.data);
      setError(null);
      return response.data.data;
    } catch (err) {
      const message = axios.isAxiosError(err) 
        ? err.response?.data?.error || err.message 
        : "Failed to fetch job status";
      setError(message);
      return null;
    }
  }, [jobId]);

  const fetchFullJob = useCallback(async () => {
    try {
      const response = await axios.get<{ success: boolean; data: JobFullResponse }>(
        `${API_BASE_URL}/api/jobs/${jobId}`
      );
      setJob(response.data.data);
      setError(null);
      return response.data.data;
    } catch (err) {
      const message = axios.isAxiosError(err)
        ? err.response?.data?.error || err.message
        : "Failed to fetch job";
      setError(message);
      return null;
    }
  }, [jobId]);

  const refetch = useCallback(async () => {
    await fetchStatus();
    await fetchFullJob();
  }, [fetchStatus, fetchFullJob]);

  // Initial fetch
  useEffect(() => {
    if (!jobId) return;

    const initFetch = async () => {
      setIsLoading(true);
      await fetchStatus();
      await fetchFullJob();
      setIsLoading(false);
    };

    initFetch();
  }, [jobId, fetchStatus, fetchFullJob]);

  // Polling effect
  useEffect(() => {
    if (!jobId || !status) return;

    // Check if we should stop polling
    const shouldStopPolling = status.status === "completed" || status.status === "failed";
    
    if (shouldStopPolling) {
      // Fetch full job data when done
      fetchFullJob();
      setIsPolling(false);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    // Start polling if not already
    if (!isPolling) {
      setIsPolling(true);
    }

    intervalRef.current = setInterval(async () => {
      const newStatus = await fetchStatus();
      if (newStatus) {
        // Fetch full job when completed or failed
        if (newStatus.status === "completed" || newStatus.status === "failed") {
          await fetchFullJob();
          setIsPolling(false);
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
          }
        }
      }
    }, POLLING_INTERVAL);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [jobId, status, isPolling, fetchStatus, fetchFullJob]);

  return {
    job,
    status,
    isLoading,
    isPolling,
    error,
    refetch,
  };
}
