/**
 * Teacher-Student Link types
 * Mirrors parent link types — teacher links are independent from parent links.
 * A student can have BOTH parent and teacher links simultaneously.
 */

export interface TeacherStudentLink {
  id: string;
  teacherId: string;
  teacherName: string;
  teacherEmail: string;
  studentId: string;
  studentName: string;
  studentEmail: string;
  createdAt: string;
}

export interface TeacherPendingVerification {
  requestId: string;
  teacherId: string;
  teacherName: string;
  teacherEmail: string;
  studentId: string;
  studentName: string;
  code: string;
  codeExpires: number;
  createdAt: string;
}
