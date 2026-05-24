/**
 * Parent-Student Link Service
 * Manages parent monitoring codes, link creation, and dashboard data access.
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { getUserById, updateUser } from './userService';
import type { ParentStudentLink, PendingVerification } from '../types/auth';

const DATA_DIR = path.join(process.cwd(), 'data');
const LINKS_FILE = path.join(DATA_DIR, 'parent-student-links.json');
const PENDING_FILE = path.join(DATA_DIR, 'pending-verifications.json');

// ─── Helpers ────────────────────────────────────────────────────────────────

function generate6DigitCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function generateUUID(): string {
  return require('crypto').randomUUID();
}

async function readLinks(): Promise<ParentStudentLink[]> {
  try {
    const data = await fs.readFile(LINKS_FILE, 'utf-8');
    return JSON.parse(data);
  } catch {
    return [];
  }
}

async function writeLinks(links: ParentStudentLink[]): Promise<void> {
  await fs.writeFile(LINKS_FILE, JSON.stringify(links, null, 2));
}

async function readPending(): Promise<PendingVerification[]> {
  try {
    const data = await fs.readFile(PENDING_FILE, 'utf-8');
    return JSON.parse(data);
  } catch {
    return [];
  }
}

async function writePending(pending: PendingVerification[]): Promise<void> {
  await fs.writeFile(PENDING_FILE, JSON.stringify(pending, null, 2));
}

// ─── Public API ─────────────────────────────────────────────────────────────

/**
 * Generate a parent monitoring code for a student.
 * Stores the code on the student's user record AND creates a pending verification.
 */
export async function generateMonitoringCode(
  studentId: string,
  parentId: string,
  parentName: string,
  parentEmail: string
): Promise<{ code: string; codeExpires: number }> {
  const student = await getUserById(studentId);
  if (!student) throw new Error('Student not found');

  const code = generate6DigitCode();
  const codeExpires = Date.now() + 15 * 60 * 1000; // 15 minutes
  const requestId = generateUUID();

  let pending = await readPending();
  const existingIdx = pending.findIndex(
    p => p.parentId === parentId && p.studentId === studentId && p.codeExpires > Date.now()
  );

  if (existingIdx >= 0) {
    pending[existingIdx] = {
      ...pending[existingIdx],
      code,
      codeExpires,
      createdAt: new Date().toISOString(),
    };
  } else {
    pending.push({
      requestId,
      parentId,
      parentName,
      parentEmail,
      studentId,
      studentName: student.name,
      code,
      codeExpires,
      createdAt: new Date().toISOString(),
    });
  }

  await writePending(pending);
  await updateUser(studentId, { parentCode: code, parentCodeExpires: codeExpires });

  return { code, codeExpires };
}

/**
 * Verify a monitoring code and create a permanent link.
 */
export async function verifyAndLink(
  parentId: string,
  studentId: string,
  code: string
): Promise<{ success: boolean; link?: ParentStudentLink; error?: string }> {
  const pending = await readPending();
  const pendingReq = pending.find(
    p => p.parentId === parentId &&
         p.studentId === studentId &&
         p.code === code &&
         p.codeExpires > Date.now()
  );

  const student = await getUserById(studentId);
  const studentCodeValid =
    student &&
    student.parentCode === code &&
    student.parentCodeExpires &&
    student.parentCodeExpires > Date.now();

  if (!pendingReq && !studentCodeValid) {
    return { success: false, error: 'Invalid or expired code' };
  }

  if (!await canParentAddMoreStudents(parentId)) {
    return { success: false, error: 'Maximum of 3 students per parent reached' };
  }

  if (!await canStudentAcceptMoreParents(studentId)) {
    return { success: false, error: 'Maximum of 3 parents per student reached' };
  }

  const links = await readLinks();
  const alreadyLinked = links.find(l => l.parentId === parentId && l.studentId === studentId);
  if (alreadyLinked) {
    return { success: false, error: 'Already linked to this student' };
  }

  const newLink: ParentStudentLink = {
    id: generateUUID(),
    parentId,
    parentName: pendingReq?.parentName || 'Parent',
    parentEmail: pendingReq?.parentEmail || '',
    studentId,
    studentName: student!.name,
    studentEmail: student!.email,
    createdAt: new Date().toISOString(),
  };

  links.push(newLink);
  await writeLinks(links);

  const updatedPending = pending.filter(p => !(p.parentId === parentId && p.studentId === studentId));
  await writePending(updatedPending);
  await updateUser(studentId, { parentCode: null, parentCodeExpires: null });

  return { success: true, link: newLink };
}

/**
 * Check if parent can add more students (max 3).
 */
export async function canParentAddMoreStudents(parentId: string): Promise<boolean> {
  const links = await readLinks();
  const count = links.filter(l => l.parentId === parentId).length;
  return count < 3;
}

/**
 * Check if student can accept more parents (max 3).
 */
export async function canStudentAcceptMoreParents(studentId: string): Promise<boolean> {
  const links = await readLinks();
  const count = links.filter(l => l.studentId === studentId).length;
  return count < 3;
}

/**
 * Get all links for a parent.
 */
export async function getLinksByParent(parentId: string): Promise<ParentStudentLink[]> {
  const links = await readLinks();
  return links.filter(l => l.parentId === parentId);
}

/**
 * Get all links for a student.
 */
export async function getLinksByStudent(studentId: string): Promise<ParentStudentLink[]> {
  const links = await readLinks();
  return links.filter(l => l.studentId === studentId);
}

/**
 * Revoke a link. Both parent and student can revoke.
 */
export async function revokeLink(
  linkId: string,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  const links = await readLinks();
  const link = links.find(l => l.id === linkId);

  if (!link) return { success: false, error: 'Link not found' };
  if (link.parentId !== userId && link.studentId !== userId) {
    return { success: false, error: 'Not authorized to revoke this link' };
  }

  const updated = links.filter(l => l.id !== linkId);
  await writeLinks(updated);
  return { success: true };
}

/**
 * Check if a parent is linked to a student.
 */
export async function isParentLinkedToStudent(
  parentId: string,
  studentId: string
): Promise<boolean> {
  const links = await readLinks();
  return links.some(l => l.parentId === parentId && l.studentId === studentId);
}

/**
 * Get code status for a student (student perspective, one arg) or parent-student pair (two args).
 * When called with 1 arg (studentId): checks student's own code from user record.
 */
export async function getCodeStatus(
  studentId: string,
  _parentId?: string
): Promise<{ hasPendingCode: boolean; codeExpires?: number }> {
  const student = await getUserById(studentId);
  if (student && student.parentCode && student.parentCodeExpires && student.parentCodeExpires > Date.now()) {
    return { hasPendingCode: true, codeExpires: student.parentCodeExpires };
  }
  return { hasPendingCode: false };
}

/**
 * Read a student's dashboard data files (for parent monitoring view).
 * knowledgeGraph nodes/edges are stored as dicts (id->node) in the JSON file.
 * We convert them to arrays so the frontend can use .length on them.
 */
export async function getStudentDashboardData(studentId: string): Promise<{
  knowledgeGraph: { nodes: unknown[]; edges: unknown[] } | null;
  userProgress: Record<string, unknown> | null;
  reviews: Record<string, unknown> | null;
  quizResults: Record<string, unknown> | null;
  certificates: Record<string, unknown> | null;
}> {
  async function readDataFile(filename: string): Promise<Record<string, unknown> | null> {
    try {
      const filepath = path.join(DATA_DIR, filename + '-' + studentId + '.json');
      const data = await fs.readFile(filepath, 'utf-8');
      return JSON.parse(data);
    } catch {
      return null;
    }
  }

  const kg = await readDataFile('knowledge-graph');
  const knowledgeGraph = kg
    ? {
        nodes: Object.values(kg.nodes || {}),
        edges: Object.values(kg.edges || {}),
      }
    : null;

  return {
    knowledgeGraph,
    userProgress: await readDataFile('user-progress'),
    reviews: await readDataFile('reviews'),
    quizResults: await readDataFile('quiz-results'),
    certificates: await readDataFile('certificates'),
  };
}

// ─── Auth Routes Wrapper Aliases ────────────────────────────────────────────
// These wrappers adapt auth.ts call signatures to the service API.

/**
 * Wrapper for auth.ts: generate code from student's perspective.
 * Parent info is optional since the student generates the code without knowing which parent will use it.
 */
export async function generateStudentCode(
  studentId: string
): Promise<{ code: string; codeExpires: number }> {
  // Pass empty parent info — parent is unknown at code generation time.
  // The code still gets stored on the student's record.
  return generateMonitoringCode(studentId, '', '', '');
}

/**
 * Wrapper for auth.ts: verify code and create link.
 * Swaps argument order: auth.ts passes (studentId, code, parentId)
 */
export async function verifyAndLinkCode(
  studentId: string,
  code: string,
  parentId: string
): Promise<{ success: boolean; link?: ParentStudentLink; error?: string }> {
  return verifyAndLink(parentId, studentId, code);
}

/**
 * Wrapper for auth.ts: get links for a student (student's perspective).
 */
export async function getStudentLinks(
  studentId: string
): Promise<ParentStudentLink[]> {
  return getLinksByStudent(studentId);
}
