"use client";

import { useState, useCallback, useRef } from "react";
import { createWorker, Worker } from "tesseract.js";

export interface OcrProgress {
  status: string;
  progress: number;
}

export interface UseClientOcrReturn {
  ocrFile: (file: File) => Promise<string>;
  ocrFiles: (files: File[]) => Promise<string[]>;
  ocrProgress: OcrProgress;
  isOcring: boolean;
  ocrError: string | null;
  isAvailable: boolean;
}

// Detect if client-side OCR is likely to work
function isClientOcrSupported(): boolean {
  if (typeof window === "undefined") return false;

  // Safari (all versions) and browsers without SharedArrayBuffer
  // need server-side fallback — client OCR uses multi-threaded workers
  const hasSharedArrayBuffer =
    typeof SharedArrayBuffer !== "undefined";

  // Safari private browsing or restricted IndexedDB
  try {
    const test = "__ocr_test__";
    localStorage.setItem(test, test);
    localStorage.removeItem(test);
  } catch {
    // localStorage blocked — likely Safari private browsing
    return false;
  }

  // IndexedDB availability check (Safari private browsing)
  if (typeof indexedDB === "undefined") return false;

  return hasSharedArrayBuffer;
}

let sharedWorker: Worker | null = null;
let sharedWorkerPromise: Promise<Worker> | null = null;

async function getSharedWorker(): Promise<Worker> {
  if (sharedWorker) return sharedWorker;
  if (sharedWorkerPromise) return sharedWorkerPromise;

  // Use cacheMethod "none" to avoid IndexedDB issues in Safari/private browsing
  // This re-downloads the language model each session, but is reliable
  const cacheMethod: "indexedDB" | "none" =
    typeof indexedDB !== "undefined" && typeof window !== "undefined"
      ? "indexedDB"
      : "none";

  sharedWorkerPromise = (async () => {
    const w = await createWorker("eng", 1, {
      cacheMethod,
      logger: () => {},
    });
    sharedWorker = w;
    return w;
  })();

  return sharedWorkerPromise;
}

async function getSharedWorkerOrThrow(): Promise<Worker> {
  const worker = await getSharedWorker();
  if (!worker) {
    throw new Error("OCR worker not available in this browser");
  }
  return worker;
}

export function useClientOcr(): UseClientOcrReturn {
  const [ocrProgress, setOcrProgress] = useState<OcrProgress>({
    status: "",
    progress: 0,
  });
  const [isOcring, setIsOcring] = useState(false);
  const [ocrError, setOcrError] = useState<string | null>(null);

  const isAvailable = typeof window !== "undefined" &&
    typeof Worker !== "undefined" &&
    typeof createWorker !== "undefined";

  const ocrFile = useCallback(async (file: File): Promise<string> => {
    setOcrError(null);
    setOcrProgress({ status: "Extracting text...", progress: 0 });
    setIsOcring(true);

    try {
      // Detect support dynamically — if SharedArrayBuffer is missing, fail fast
      if (typeof SharedArrayBuffer === "undefined") {
        throw new Error("BROWSER_NOT_SUPPORTED");
      }

      const w = await getSharedWorkerOrThrow();
      setOcrProgress({ status: "Extracting text...", progress: 50 });
      const { data } = await w.recognize(file);
      setOcrProgress({ status: "Done", progress: 100 });
      return data.text;
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "OCR failed";
      // Re-throw special sentinel so the caller can fall back to server
      if (msg === "BROWSER_NOT_SUPPORTED") {
        throw new Error("BROWSER_NOT_SUPPORTED");
      }
      setOcrError(msg);
      throw err;
    } finally {
      setIsOcring(false);
    }
  }, []);

  const ocrFiles = useCallback(
    async (files: File[]): Promise<string[]> => {
      setOcrError(null);
      setOcrProgress({ status: "Starting OCR...", progress: 0 });
      setIsOcring(true);

      try {
        const results: string[] = [];
        for (let i = 0; i < files.length; i++) {
          setOcrProgress({
            status: `Processing file ${i + 1} of ${files.length}...`,
            progress: Math.round((i / files.length) * 100),
          });

          // Check support per-file in case it changed
          if (typeof SharedArrayBuffer === "undefined") {
            throw new Error("BROWSER_NOT_SUPPORTED");
          }

          const text = await ocrFile(files[i]);
          results.push(text);
        }
        setOcrProgress({ status: "Done", progress: 100 });
        return results;
      } catch (err) {
        const msg =
          err instanceof Error ? err.message : "OCR failed";
        if (msg === "BROWSER_NOT_SUPPORTED") {
          throw new Error("BROWSER_NOT_SUPPORTED");
        }
        setOcrError(msg);
        throw err;
      } finally {
        setIsOcring(false);
      }
    },
    [ocrFile]
  );

  return {
    ocrFile,
    ocrFiles,
    ocrProgress,
    isOcring,
    ocrError,
    isAvailable,
  };
}
