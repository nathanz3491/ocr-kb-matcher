import { getUserById } from './userService';
import { getLinksByParent } from './parentLinkService';
import { parentAlertService } from './parentAlertService';
import { sendParentDigestEmail, sendParentAlertEmail } from './emailService';
import { ParentAlert, ParentAlertStudentDigest } from '../../../shared/types';
import * as fs from 'fs/promises';
import * as path from 'path';

// ─── Exponential backoff retry helper ──────────────────────────
async function withRetry<T>(
  fn: () => Promise<T>,
  retries = 3,
  baseDelayMs = 1000
): Promise<T> {
  let lastError: Error | undefined;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err: any) {
      lastError = err;
      if (attempt < retries) {
        const delay = baseDelayMs * Math.pow(2, attempt);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  throw lastError;
}

// ─── Student stats helper ─────────────────────────────────────
async function getStudentStats(studentId: string): Promise<{
  reviewsDue: number;
  lastQuizDate?: string;
  lastActivityDate?: string;
}> {
  const reviews = await parentAlertService.checkOverdueReviews(studentId);
  let reviewsDue = 0;
  if (typeof reviews.details === 'object' && reviews.details !== null && 'overdueCount' in reviews.details) {
    reviewsDue = (reviews.details as any).overdueCount as number;
  }

  const inactivity = await parentAlertService.checkInactivity(studentId);
  let lastActivityDate: string | undefined;
  if (typeof inactivity.details === 'object' && inactivity.details !== null && 'latestActivityAt' in inactivity.details) {
    lastActivityDate = (inactivity.details as any).latestActivityAt as string;
  }

  return { reviewsDue, lastActivityDate };
}

// ─── Send daily digest ────────────────────────────────────────
/**
 * Process all parent-student links and send digest emails.
 * Called once per day by the digest timer.
 */
export async function sendDailyDigest(): Promise<{
  triggered: boolean;
  parents: number;
  emailsSent: number;
  errors: string[];
}> {
  const errors: string[] = [];
  let emailsSent = 0;

  console.log('[ParentNotification] Starting daily digest...');

  // Get all parent users with linked students
  // Read the links file directly
  const linksFile = '/home/nathan/ocr-kb-matcher/backend/data/parent-student-links.json';
  let links: Array<{ parentId: string; studentId: string }> = [];
  try {
    const raw = await fs.readFile(linksFile, 'utf-8');
    links = JSON.parse(raw);
  } catch {
    console.warn('[ParentNotification] No parent-student links file found');
    return { triggered: true, parents: 0, emailsSent: 0, errors: ['No links file'] };
  }

  if (links.length === 0) {
    return { triggered: true, parents: 0, emailsSent: 0, errors: [] };
  }

  // Group links by parentId
  const byParent = new Map<string, string[]>();
  for (const link of links) {
    if (!byParent.has(link.parentId)) byParent.set(link.parentId, []);
    byParent.get(link.parentId)!.push(link.studentId);
  }

  // Process each parent
  for (const [parentId, studentIds] of byParent) {
    try {
      await sendDailyDigestForParent(parentId, studentIds);
      emailsSent++;
    } catch (err: any) {
      errors.push(`Parent ${parentId}: ${err.message}`);
    }
  }

  console.log(`[ParentNotification] Digest complete: ${byParent.size} parents, ${emailsSent} emails, ${errors.length} errors`);
  return { triggered: true, parents: byParent.size, emailsSent, errors };
}

/**
 * Send digest email for a specific parent (used by timer + manual trigger).
 */
export async function sendDailyDigestForParent(
  parentId: string,
  studentIds?: string[]
): Promise<void> {
  const parent = await getUserById(parentId);
  if (!parent || !parent.email) {
    console.warn('[ParentNotification] Parent not found or missing email:', parentId);
    return;
  }

  const parentEmail = parent.email;
  if (!parentEmail || parentEmail.trim() === '') {
    console.warn('[ParentNotification] Empty parent email, skipping:', parentId);
    return;
  }

  // Get linked student IDs
  let studentIdList = studentIds;
  if (!studentIdList) {
    const links = await getLinksByParent(parentId);
    studentIdList = links.map(l => l.studentId);
  }

  if (studentIdList.length === 0) {
    console.log('[ParentNotification] No linked students for parent:', parentId);
    return;
  }

  const students: ParentAlertStudentDigest[] = [];

  for (const studentId of studentIdList) {
    const student = await getUserById(studentId);
    const studentName = student?.name || studentId;

    // Run all 4 signal checks
    const [quizAvoidance, inactivity, overdueReviews, offTopic] = await Promise.all([
      parentAlertService.checkQuizAvoidance(studentId),
      parentAlertService.checkInactivity(studentId),
      parentAlertService.checkOverdueReviews(studentId),
      parentAlertService.checkOffTopicUpload(studentId),
    ]);

    const triggeredAlerts: ParentAlert[] = [];

    // Build alert messages for triggered signals
    if (quizAvoidance.triggered) {
      const days = (quizAvoidance.details as any).daysSince || 0;
      const msg = `${studentName} hasn't taken a quiz in ${Math.round(days)} days`;
      const alert = await parentAlertService.createAlert({
        parentId,
        studentId,
        studentName,
        type: 'quiz_avoidance',
        severity: days > 14 ? 'critical' : 'warning',
        message: msg,
        metadata: quizAvoidance.details as Record<string, unknown>,
        createdAt: new Date().toISOString(),
        lastAlertedAt: new Date().toISOString(),
      });
      triggeredAlerts.push(alert);
    }

    if (inactivity.triggered) {
      const days = (inactivity.details as any).daysSince || 0;
      const msg = `${studentName} has been inactive for ${Math.round(days)} days`;
      const alert = await parentAlertService.createAlert({
        parentId,
        studentId,
        studentName,
        type: 'inactivity',
        severity: days > 10 ? 'critical' : 'warning',
        message: msg,
        metadata: inactivity.details as Record<string, unknown>,
        createdAt: new Date().toISOString(),
        lastAlertedAt: new Date().toISOString(),
      });
      triggeredAlerts.push(alert);
    }

    if (overdueReviews.triggered) {
      const count = (overdueReviews.details as any).overdueCount || 0;
      const days = (overdueReviews.details as any).mostOverdueDays || 0;
      const msg = `${studentName} has ${count} overdue review(s), ${Math.round(days)} days overdue`;
      const alert = await parentAlertService.createAlert({
        parentId,
        studentId,
        studentName,
        type: 'overdue_reviews',
        severity: count > 5 ? 'critical' : 'warning',
        message: msg,
        metadata: overdueReviews.details as Record<string, unknown>,
        createdAt: new Date().toISOString(),
        lastAlertedAt: new Date().toISOString(),
      });
      triggeredAlerts.push(alert);
    }

    if (offTopic.triggered) {
      const count = (offTopic.details as any).recentOffTopicCount || 0;
      const msg = `${studentName} uploaded ${count} off-topic document(s) recently`;
      const alert = await parentAlertService.createAlert({
        parentId,
        studentId,
        studentName,
        type: 'off_topic_upload',
        severity: 'critical',
        message: msg,
        metadata: offTopic.details as Record<string, unknown>,
        createdAt: new Date().toISOString(),
        lastAlertedAt: new Date().toISOString(),
      });
      triggeredAlerts.push(alert);
    }

    // Auto-resolve: check if any previously resolved alerts should be re-triggered
    await checkAndAutoResolve(parentId, studentId);

    // Build student digest
    const stats = await getStudentStats(studentId);
    students.push({
      studentId,
      studentName,
      triggeredAlerts,
      stats,
    });
  }

  // Send digest email with retry
  const result = await withRetry(async () => {
    return sendParentDigestEmail(parentEmail, parent.name || 'Parent', students);
  }, 3, 1000);

  if (result.success) {
    console.log(`[ParentNotification] Digest sent to ${parentEmail} (${students.length} students, ${students.reduce((s, st) => s + st.triggeredAlerts.length, 0)} alerts)`);
  } else {
    console.warn(`[ParentNotification] Failed to send digest to ${parentEmail}`);
  }
}

// ─── Send immediate alert ─────────────────────────────────────
/**
 * Send an immediate alert email for critical signals (e.g., off-topic upload).
 */
export async function sendImmediateAlert(
  parentId: string,
  alert: ParentAlert
): Promise<void> {
  const parent = await getUserById(parentId);
  if (!parent || !parent.email || parent.email.trim() === '') {
    console.warn('[ParentNotification] Cannot send immediate alert — no parent email:', parentId);
    return;
  }

  const result = await withRetry(async () => {
    return sendParentAlertEmail(parent.email, parent.name || 'Parent', {
      type: alert.type,
      severity: alert.severity,
      studentName: alert.studentName,
      message: alert.message,
      createdAt: alert.createdAt,
    });
  }, 3, 1000);

  if (result.success) {
    console.log(`[ParentNotification] Immediate alert sent to ${parent.email}: ${alert.type}`);
  }
}

// ─── Auto-resolve alerts ─────────────────────────────────────
/**
 * Check if any previously unresolved alerts should be auto-resolved
 * because the student corrected the behavior.
 */
export async function checkAndAutoResolve(
  parentId: string,
  studentId: string
): Promise<void> {
  const alerts = await parentAlertService.getAlerts(parentId, studentId);
  const unresolved = alerts.filter(a => !a.resolvedAt);

  for (const alert of unresolved) {
    let shouldResolve = false;

    switch (alert.type) {
      case 'quiz_avoidance': {
        const check = await parentAlertService.checkQuizAvoidance(studentId);
        shouldResolve = !check.triggered;
        break;
      }
      case 'inactivity': {
        const check = await parentAlertService.checkInactivity(studentId);
        shouldResolve = !check.triggered;
        break;
      }
      case 'overdue_reviews': {
        const check = await parentAlertService.checkOverdueReviews(studentId);
        shouldResolve = !check.triggered;
        break;
      }
      case 'off_topic_upload': {
        const check = await parentAlertService.checkOffTopicUpload(studentId);
        shouldResolve = !check.triggered;
        break;
      }
    }

    if (shouldResolve) {
      await parentAlertService.resolveAlert(alert.id, parentId);
      console.log(`[ParentNotification] Auto-resolved alert ${alert.id} (${alert.type}) for student ${studentId}`);
    }
  }
}
