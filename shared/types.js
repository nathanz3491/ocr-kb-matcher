"use strict";
/**
 * Shared TypeScript type definitions for OCR-KB-Matcher
 * Used by both frontend and backend
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.JobType = exports.ProcessingStatus = void 0;
/**
 * Processing status enum
 * Tracks the state of a job through the OCR and matching pipeline
 */
var ProcessingStatus;
(function (ProcessingStatus) {
    ProcessingStatus["PENDING"] = "pending";
    ProcessingStatus["PROCESSING"] = "processing";
    ProcessingStatus["OCR_COMPLETE"] = "ocr_complete";
    ProcessingStatus["MATCHING"] = "matching";
    ProcessingStatus["COMPLETED"] = "completed";
    ProcessingStatus["FAILED"] = "failed";
})(ProcessingStatus || (exports.ProcessingStatus = ProcessingStatus = {}));
/**
 * Job type enum
 * Distinguishes between single-file and multi-question batch jobs
 */
exports.JobType = {
    SINGLE: 'SINGLE',
    MULTIPLE: 'MULTIPLE',
    WRONG_SINGLE: 'WRONG_SINGLE',
    WRONG_MULTIPLE: 'WRONG_MULTIPLE'
};
