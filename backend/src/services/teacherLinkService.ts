import * as fs from 'fs/promises';
import * as path from 'path';
import { getUserById, updateUser } from './userService';
import type { TeacherStudentLink, TeacherPendingVerification } from '../types/teacherLink';

const DATA_DIR = path.join(process.cwd(), 'data');
const LINKS_FILE = path.join(DATA_DIR, 'teacher-student-links.json');
const PENDING_FILE = path.join(DATA_DIR, 'pending-teacher-links.json');

// ─── Helpers ────────────────────────────────────────────────────────────────

function generate6DigitCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function generateUUID(): string {
  return require('crypto').randomUUID();
}

async function readLinks(): Promise<TeacherStudentLink[]> {
  try {
    const data = await fs.readFile(LINKS_FILE, 'utf-8');
    return JSON.parse(data);
  } catch {
    return [];
  }
}

async function writeLinks(links: TeacherStudentLink[]): Promise<void> {
  await fs.writeFile(LINKS_FILE, JSON.stringify(links, null, 2));
}

async function readPending(): Promise<TeacherPendingVerification[]> {
  try {
    const data = await fs.readFile(PENDING_FILE, 'utf-8');
    return JSON.parse(data);
  } catch {
    return [];
  }
}

async function writePending(pending: TeacherPendingVerification[]): Promise<void> {
  await fs.writeFile(PENDING_FILE, JSON.stringify(pending, null, 2));
}

// ─── Public API ─────────────────────────────────────────────────────────────

/**
 * Generate a teacher linking code for a student.
 * Stores the code on the student's user record AND creates a pending verification.
 */
export async function generateTeacherCode(
  studentId: string,
  teacherId: string,
  teacherName: string,
  teacherEmail: string
): Promise<{ code: string; codeExpires: number }> {
  const student = await getUserById(studentId);
  if (!student) throw new Error('Student not found');

  const code = generate6DigitCode();
  const codeExpires = Date.now() + 15 * 60 * 1000; // 15 minutes
  const requestId = generateUUID();

  let pending = await readPending();
  const existingIdx = pending.findIndex(
    p => p.teacherId === teacherId && p.studentId === studentId && p.codeExpires > Date.now()
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
      teacherId,
      teacherName,
      teacherEmail,
      studentId,
      studentName: student.name,
      code,
      codeExpires,
      createdAt: new Date().toISOString(),
    });
  }

  await writePending(pending);
  await updateUser(studentId, { teacherCode: code, teacherCodeExpires: codeExpires });

  return { code, codeExpires };
}

/**
 * Verify a teacher linking code and create a permanent link.
 */
export async function verifyAndLinkTeacher(
  teacherId: string,
  studentId: string,
  code: string
): Promise<{ success: boolean; link?: TeacherStudentLink; error?: string }> {
  const pending = await readPending();
  const pendingReq = pending.find(
    p => p.teacherId === teacherId &&
         p.studentId === studentId &&
         p.code === code &&
         p.codeExpires > Date.now()
  );

  const student = await getUserById(studentId);
  const studentCodeValid =
    student &&
    student.teacherCode === code &&
    student.teacherCodeExpires &&
    student.teacherCodeExpires > Date.now();

  if (!pendingReq && !studentCodeValid) {
    return { success: false, error: 'Invalid or expired code' };
  }

  const links = await readLinks();
  const alreadyLinked = links.find(l => l.teacherId === teacherId && l.studentId === studentId);
  if (alreadyLinked) {
    return { success: false, error: 'Already linked to this student' };
  }

  const newLink: TeacherStudentLink = {
    id: generateUUID(),
    teacherId,
    teacherName: pendingReq?.teacherName || 'Teacher',
    teacherEmail: pendingReq?.teacherEmail || '',
    studentId,
    studentName: student!.name,
    studentEmail: student!.email,
    createdAt: new Date().toISOString(),
  };

  links.push(newLink);
  await writeLinks(links);

  const updatedPending = pending.filter(p => !(p.teacherId === teacherId && p.studentId === studentId));
  await writePending(updatedPending);
  await updateUser(studentId, { teacherCode: null, teacherCodeExpires: null });

  return { success: true, link: newLink };
}

/**
 * Get all students linked to a teacher.
 * Alias kept for backward compatibility with teacherMonitor.ts.
 */
export async function getLinkedStudentsForTeacher(teacherId: string): Promise<TeacherStudentLink[]> {
  const links = await readLinks();
  return links.filter(l => l.teacherId === teacherId);
}

/**
 * Get all links for a teacher.
 */
export async function getLinksByTeacher(teacherId: string): Promise<TeacherStudentLink[]> {
  return getLinkedStudentsForTeacher(teacherId);
}

/**
 * Get all links for a student.
 */
export async function getLinksByStudent(studentId: string): Promise<TeacherStudentLink[]> {
  const links = await readLinks();
  return links.filter(l => l.studentId === studentId);
}

/**
 * Check if a teacher is linked to a student.
 */
export async function isTeacherLinkedToStudent(
  teacherId: string,
  studentId: string
): Promise<boolean> {
  const links = await readLinks();
  return links.some(l => l.teacherId === teacherId && l.studentId === studentId);
}

/**
 * Revoke a teacher-student link. Either party can revoke.
 * Kept backward compatible with teacherMonitor.ts (passes teacherId).
 */
export async function revokeTeacherLink(
  linkId: string,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  const links = await readLinks();
  const link = links.find(l => l.id === linkId);

  if (!link) return { success: false, error: 'Link not found' };
  if (link.teacherId !== userId && link.studentId !== userId) {
    return { success: false, error: 'Not authorized to revoke this link' };
  }

  const updated = links.filter(l => l.id !== linkId);
  await writeLinks(updated);
  return { success: true };
}

/**
 * Get teacher code status for a student.
 */
export async function getTeacherCodeStatus(
  studentId: string
): Promise<{ hasPendingCode: boolean; codeExpires?: number }> {
  const student = await getUserById(studentId);
  if (student && student.teacherCode && student.teacherCodeExpires && student.teacherCodeExpires > Date.now()) {
    return { hasPendingCode: true, codeExpires: student.teacherCodeExpires };
  }
  return { hasPendingCode: false };
}

/**
 * Read a student's dashboard data files (for teacher monitoring view).
 * Same data shape as parentLinkService's getStudentDashboardData.
 */
export async function getTeacherDashboardData(studentId: string): Promise<{
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

// ─── Route Wrapper Aliases ──────────────────────────────────────────────────
// These adapt route call signatures to the service API.

/**
 * Wrapper: generate code from student's perspective.
 * Teacher info is unknown at code generation time.
 */
export async function generateTeacherCodeForStudent(
  studentId: string
): Promise<{ code: string; codeExpires: number }> {
  return generateTeacherCode(studentId, '', '', '');
}

/**
 * Wrapper: verify code and create link.
 * Swaps argument order: route passes (studentId, code, teacherId)
 */
export async function verifyAndLinkTeacherCode(
  studentId: string,
  code: string,
  teacherId: string
): Promise<{ success: boolean; link?: TeacherStudentLink; error?: string }> {
  return verifyAndLinkTeacher(teacherId, studentId, code);
}

/**
 * Wrapper: get links for a student (student's perspective).
 */
export async function getStudentTeacherLinks(
  studentId: string
): Promise<TeacherStudentLink[]> {
  return getLinksByStudent(studentId);
}
