"use strict";
/**
 * Parent Alert Service
 * Signal-based monitoring alerts for parent-student linked accounts.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.parentAlertService = void 0;
const fs = __importStar(require("fs/promises"));
const path = __importStar(require("path"));
const DATA_DIR = path.join(__dirname, '..', '..', '..', 'data');
// ─── Constants ────────────────────────────────────────────────────────────────
const ALERT_CAP = 100;
const DEDUP_WINDOW_MS = 24 * 60 * 60 * 1000; // 24h in ms
// ─── Signal thresholds (moderate) ─────────────────────────────────────────────
const THRESHOLDS = {
    quizAvoidanceDays: 7,
    inactivityDays: 5,
    overdueReviewsDays: 3,
    offTopicConfidence: 0.3,
};
// ─── Atomic write helper ───────────────────────────────────────────────────────
async function atomicWrite(filePath, data) {
    const tempPath = `${filePath}.tmp`;
    await fs.writeFile(tempPath, JSON.stringify(data, null, 2), 'utf-8');
    await fs.rename(tempPath, filePath);
}
// ─── Storage helpers ──────────────────────────────────────────────────────────
function getAlertFilePath(parentId) {
    return path.join(DATA_DIR, `parent-alerts-${parentId}.json`);
}
async function readAlertFile(parentId) {
    const filePath = getAlertFilePath(parentId);
    try {
        const raw = await fs.readFile(filePath, 'utf-8');
        return JSON.parse(raw);
    }
    catch {
        return [];
    }
}
async function writeAlertFile(parentId, alerts) {
    // Cap at 100: remove oldest resolved first, then oldest unread
    if (alerts.length > ALERT_CAP) {
        const resolved = alerts.filter(a => a.resolvedAt);
        const unresolved = alerts.filter(a => !a.resolvedAt);
        resolved.sort((a, b) => (a.resolvedAt > b.resolvedAt ? 1 : -1));
        unresolved.sort((a, b) => (a.createdAt > b.createdAt ? 1 : -1));
        const toRemove = alerts.length - ALERT_CAP;
        const fromResolved = Math.min(toRemove, resolved.length);
        alerts = [...resolved.slice(fromResolved), ...unresolved].slice(0, ALERT_CAP);
    }
    await atomicWrite(getAlertFilePath(parentId), alerts);
}
// ─── Signal Check Functions ───────────────────────────────────────────────────
/**
 * Check if student has avoided quizzes for more than thresholdDays.
 * Reads quiz-results-{studentId}.json, finds latest completedAt.
 */
async function checkQuizAvoidance(studentId, thresholdDays = THRESHOLDS.quizAvoidanceDays) {
    const quizFile = path.join(DATA_DIR, `quiz-results-${studentId}.json`);
    try {
        const raw = await fs.readFile(quizFile, 'utf-8');
        const results = JSON.parse(raw);
        if (!Array.isArray(results) || results.length === 0) {
            return { triggered: true, details: { reason: 'no_quizzes', message: 'No quizzes taken yet' } };
        }
        const latest = results.reduce((max, r) => (r.completedAt && r.completedAt > max.completedAt) ? r : max, { completedAt: '1970-01-01' });
        const daysSince = (Date.now() - new Date(latest.completedAt).getTime()) / (1000 * 60 * 60 * 24);
        return {
            triggered: daysSince > thresholdDays,
            details: { latestCompletedAt: latest.completedAt, daysSince, thresholdDays }
        };
    }
    catch {
        return { triggered: true, details: { reason: 'no_quiz_file', message: 'No quiz history found' } };
    }
}
/**
 * Check if student has been inactive for more than thresholdDays.
 * Checks quiz results, reviews, and uploads for latest timestamp.
 */
async function checkInactivity(studentId, thresholdDays = THRESHOLDS.inactivityDays) {
    const timestamps = [];
    // Quiz results
    try {
        const quizFile = path.join(DATA_DIR, `quiz-results-${studentId}.json`);
        const raw = await fs.readFile(quizFile, 'utf-8');
        const results = JSON.parse(raw);
        for (const r of results) {
            if (r.completedAt)
                timestamps.push(new Date(r.completedAt));
        }
    }
    catch { /* no quiz file */ }
    // Reviews (uploadedAt)
    try {
        const reviewFile = path.join(DATA_DIR, `reviews-${studentId}.json`);
        const raw = await fs.readFile(reviewFile, 'utf-8');
        const reviews = JSON.parse(raw);
        for (const r of reviews) {
            if (r.uploadedAt)
                timestamps.push(new Date(r.uploadedAt));
        }
    }
    catch { /* no review file */ }
    // Job uploads (uploadedAt)
    try {
        const jobFile = path.join(DATA_DIR, `job-results-${studentId}.json`);
        const raw = await fs.readFile(jobFile, 'utf-8');
        const jobs = JSON.parse(raw);
        for (const j of jobs) {
            if (j.uploadedAt)
                timestamps.push(new Date(j.uploadedAt));
        }
    }
    catch { /* no job file */ }
    if (timestamps.length === 0) {
        return { triggered: false, details: { reason: 'no_activity', message: 'No activity records found' } };
    }
    const latest = new Date(Math.max(...timestamps.map(t => t.getTime())));
    const daysSince = (Date.now() - latest.getTime()) / (1000 * 60 * 60 * 24);
    return {
        triggered: daysSince > thresholdDays,
        details: { latestActivityAt: latest.toISOString(), daysSince, thresholdDays }
    };
}
/**
 * Check if student has overdue reviews for more than thresholdDays.
 * Reads reviews-{studentId}.json, counts reviews where nextReviewDate is past.
 */
async function checkOverdueReviews(studentId, thresholdDays = THRESHOLDS.overdueReviewsDays) {
    const reviewFile = path.join(DATA_DIR, `reviews-${studentId}.json`);
    try {
        const raw = await fs.readFile(reviewFile, 'utf-8');
        const reviews = JSON.parse(raw);
        const cutoff = new Date(Date.now() - thresholdDays * 24 * 60 * 60 * 1000);
        const overdue = reviews.filter(r => r.nextReviewDate && new Date(r.nextReviewDate) < cutoff);
        const mostOverdue = overdue.length > 0
            ? Math.max(...overdue.map(r => (Date.now() - new Date(r.nextReviewDate).getTime()) / (1000 * 60 * 60 * 24)))
            : 0;
        return {
            triggered: overdue.length > 0,
            details: { overdueCount: overdue.length, mostOverdueDays: Math.round(mostOverdue), thresholdDays }
        };
    }
    catch {
        return { triggered: false, details: { reason: 'no_reviews', message: 'No review history found' } };
    }
}
/**
 * Check if student has recent off-topic uploads.
 * Reads off-topic-jobs-{studentId}.json, checks if any entries are recent (within 7 days).
 */
async function checkOffTopicUpload(studentId) {
    const offTopicFile = path.join(DATA_DIR, `off-topic-jobs-${studentId}.json`);
    try {
        const raw = await fs.readFile(offTopicFile, 'utf-8');
        const entries = JSON.parse(raw);
        const recentCutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        const recentOffTopic = entries.filter(e => e.timestamp && new Date(e.timestamp) > recentCutoff);
        return {
            triggered: recentOffTopic.length > 0,
            details: { recentOffTopicCount: recentOffTopic.length, totalEntries: entries.length }
        };
    }
    catch {
        return { triggered: false, details: { reason: 'no_off_topic', message: 'No off-topic uploads found' } };
    }
}
// ─── Alert CRUD ───────────────────────────────────────────────────────────────
/**
 * Get alerts for a parent, optionally filtered by studentId.
 * Returns only non-dismissed alerts by default.
 */
async function getAlerts(parentId, studentId) {
    const alerts = await readAlertFile(parentId);
    let filtered = alerts.filter(a => !a.dismissedAt);
    if (studentId) {
        filtered = filtered.filter(a => a.studentId === studentId);
    }
    return filtered.sort((a, b) => (a.createdAt > b.createdAt ? -1 : 1));
}
/**
 * Create a new alert. Enforces 24h deduplication and 100-alert cap.
 */
async function createAlert(alert) {
    const alerts = await readAlertFile(alert.parentId);
    // Deduplication: skip if same type+student within 24h
    const dedupCutoff = Date.now() - DEDUP_WINDOW_MS;
    const isDuplicate = alerts.some(a => a.studentId === alert.studentId &&
        a.type === alert.type &&
        !a.resolvedAt &&
        a.lastAlertedAt &&
        new Date(a.lastAlertedAt).getTime() > dedupCutoff);
    if (isDuplicate) {
        return alerts.find(a => a.studentId === alert.studentId && a.type === alert.type && !a.resolvedAt);
    }
    const newAlert = {
        ...alert,
        id: `alert-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    };
    alerts.push(newAlert);
    await writeAlertFile(alert.parentId, alerts);
    return newAlert;
}
/**
 * Resolve an alert (student corrected behavior).
 */
async function resolveAlert(alertId, parentId) {
    const alerts = await readAlertFile(parentId);
    const idx = alerts.findIndex(a => a.id === alertId);
    if (idx === -1)
        return;
    alerts[idx] = { ...alerts[idx], resolvedAt: new Date().toISOString() };
    await writeAlertFile(parentId, alerts);
}
/**
 * Mark an alert as read.
 */
async function markAlertRead(alertId, parentId) {
    const alerts = await readAlertFile(parentId);
    const idx = alerts.findIndex(a => a.id === alertId);
    if (idx === -1)
        return;
    alerts[idx] = { ...alerts[idx], readAt: new Date().toISOString() };
    await writeAlertFile(parentId, alerts);
}
/**
 * Dismiss an alert (soft delete — hidden from default view).
 */
async function dismissAlert(alertId, parentId) {
    const alerts = await readAlertFile(parentId);
    const idx = alerts.findIndex(a => a.id === alertId);
    if (idx === -1)
        return;
    alerts[idx] = { ...alerts[idx], dismissedAt: new Date().toISOString() };
    await writeAlertFile(parentId, alerts);
}
// ─── Service Export ───────────────────────────────────────────────────────────
exports.parentAlertService = {
    // Signal checks
    checkQuizAvoidance,
    checkInactivity,
    checkOverdueReviews,
    checkOffTopicUpload,
    // Alert CRUD
    getAlerts,
    createAlert,
    resolveAlert,
    markAlertRead,
    dismissAlert,
};
exports.default = exports.parentAlertService;
