/**
 * Subject Service
 * Manages multi-subject support for the knowledge platform
 */

export interface Subject {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  totalNodes: number;
  learnedNodes: number;
  status: 'active' | 'coming_soon' | 'beta';
}

// Predefined subjects for the platform
const SUBJECTS: Subject[] = [
  {
    id: 'mathematics',
    name: 'Mathematics',
    description: 'Algebra, Geometry, Calculus, and more',
    icon: 'Calculator',
    color: 'blue',
    totalNodes: 13,
    learnedNodes: 0,
    status: 'active'
  },
  {
    id: 'science',
    name: 'Science',
    description: 'Physics, Chemistry, Biology',
    icon: 'FlaskConical',
    color: 'green',
    totalNodes: 0,
    learnedNodes: 0,
    status: 'coming_soon'
  },
  {
    id: 'history',
    name: 'History',
    description: 'World History, Ancient Civilizations',
    icon: 'Scroll',
    color: 'amber',
    totalNodes: 0,
    learnedNodes: 0,
    status: 'coming_soon'
  },
  {
    id: 'languages',
    name: 'Languages',
    description: 'English, Spanish, Mandarin',
    icon: 'Languages',
    color: 'violet',
    totalNodes: 0,
    learnedNodes: 0,
    status: 'coming_soon'
  },
  {
    id: 'computer_science',
    name: 'Computer Science',
    description: 'Programming, Algorithms, Data Structures',
    icon: 'Code',
    color: 'cyan',
    totalNodes: 0,
    learnedNodes: 0,
    status: 'beta'
  }
];

let currentSubjectId = 'mathematics';

/**
 * Get all available subjects
 */
export async function getAllSubjects(userId?: string): Promise<Subject[]> {
  // In a real implementation, this would query the database
  // For now, return static list with updated progress
  const subjectsWithProgress = await Promise.all(
    SUBJECTS.map(async subject => ({
      ...subject,
      learnedNodes: subject.id === 'mathematics' ? await getLearnedCountForSubject(subject.id, userId) : 0
    }))
  );
  return subjectsWithProgress;
}

/**
 * Get the currently active subject
 */
export async function getCurrentSubject(userId?: string): Promise<Subject> {
  const subject = SUBJECTS.find(s => s.id === currentSubjectId);
  if (!subject) {
    throw new Error('Current subject not found');
  }
  return {
    ...subject,
    learnedNodes: await getLearnedCountForSubject(subject.id, userId)
  };
}

/**
 * Switch to a different subject
 */
export async function switchSubject(subjectId: string, userId?: string): Promise<Subject> {
  const subject = SUBJECTS.find(s => s.id === subjectId);
  if (!subject) {
    throw new Error('Subject not found');
  }
  if (subject.status === 'coming_soon') {
    throw new Error('This subject is coming soon');
  }
  currentSubjectId = subjectId;
  return getCurrentSubject(userId);
}

/**
 * Get learned count for a subject (placeholder)
 */
async function getLearnedCountForSubject(subjectId: string, userId?: string): Promise<number> {
  // This would query the database for actual learned count
  // For now, return 0 or use the stored value
  if (subjectId === 'mathematics') {
    // Import dynamically to avoid circular dependency
    const { userProgressService } = await import('./userProgressService');
    const learned = await userProgressService.getKnownNodeIds(userId ?? '');
    return learned.length;
  }
  return 0;
}
