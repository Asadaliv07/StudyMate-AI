/**
 * Centralized Data Access Layer for StudyMate AI
 * 
 * Provides consistent, type-safe, error-resilient methods for:
 * - Study Plans & Task Completion
 * - Saved Notes & AI Summaries
 * - Completed Quiz Attempts & Historical Scores
 * - Aggregated Real Progress & Analytics
 * - Data Privacy, Storage Reset, & Real-Time Event Dispatch
 */

import type {
  GeneratedStudyPlan,
  PlannerSubjectInput,
  StructuredSummary,
  CompletedQuizResult,
  StudyTask,
  UserAggregatedStats,
  UpcomingExamDeadline,
  SubjectProgressBreakdown,
  TaskPriority,
  TaskStatus,
} from '../types/index.ts';

// -----------------------------------------------------------------------------
// Storage Keys
// -----------------------------------------------------------------------------
export const STORAGE_KEYS = {
  PLAN: 'studymate_saved_plan',
  SUBJECTS: 'studymate_planner_subjects',
  COMPLETED_SESSIONS: 'studymate_completed_sessions',
  NOTES: 'studymate_saved_summaries',
  QUIZ_HISTORY: 'studymate_quiz_history',
  SHARED_NOTES: 'studymate_quiz_shared_notes',
} as const;

export const DATA_CHANGED_EVENT = 'studymate_data_changed';

// -----------------------------------------------------------------------------
// Low-Level Safe Storage Operations
// -----------------------------------------------------------------------------
function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

function safeGet<T>(key: string, fallback: T): T {
  if (!isBrowser()) return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return parsed !== null && parsed !== undefined ? (parsed as T) : fallback;
  } catch (err) {
    console.warn(`[storageService] Error parsing localStorage key "${key}":`, err);
    return fallback;
  }
}

function safeSet<T>(key: string, value: T): boolean {
  if (!isBrowser()) return false;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (err) {
    console.error(`[storageService] Failed to write key "${key}" to localStorage:`, err);
    return false;
  }
}

function safeRemove(key: string): boolean {
  if (!isBrowser()) return false;
  try {
    window.localStorage.removeItem(key);
    return true;
  } catch (err) {
    console.error(`[storageService] Failed to remove key "${key}":`, err);
    return false;
  }
}

/**
 * Dispatches an event so all listening pages (Dashboard, Progress, Planner, etc.)
 * immediately synchronize their state without requiring a browser refresh.
 */
export function notifyDataChanged(actionType?: string): void {
  if (!isBrowser()) return;
  try {
    window.dispatchEvent(
      new CustomEvent(DATA_CHANGED_EVENT, { detail: { action: actionType, timestamp: Date.now() } })
    );
  } catch (e) {
    console.warn('[storageService] Failed to dispatch storage event:', e);
  }
}

// -----------------------------------------------------------------------------
// 1. Study Plan & Subjects Persistence
// -----------------------------------------------------------------------------

export function getSavedPlan(): GeneratedStudyPlan | null {
  const plan = safeGet<GeneratedStudyPlan | null>(STORAGE_KEYS.PLAN, null);
  if (!plan || !plan.id || !Array.isArray(plan.days)) {
    return null;
  }
  return plan;
}

export function savePlan(plan: GeneratedStudyPlan): void {
  if (!plan || !plan.id) return;
  safeSet(STORAGE_KEYS.PLAN, plan);
  notifyDataChanged('plan_saved');
}

export function deletePlan(): void {
  safeRemove(STORAGE_KEYS.PLAN);
  safeRemove(STORAGE_KEYS.COMPLETED_SESSIONS);
  notifyDataChanged('plan_deleted');
}

export function getPlannerSubjects(): PlannerSubjectInput[] {
  const subjects = safeGet<PlannerSubjectInput[]>(STORAGE_KEYS.SUBJECTS, []);
  return Array.isArray(subjects) ? subjects : [];
}

export function savePlannerSubjects(subjects: PlannerSubjectInput[]): void {
  safeSet(STORAGE_KEYS.SUBJECTS, Array.isArray(subjects) ? subjects : []);
  notifyDataChanged('subjects_saved');
}

export function getCompletedSessionIds(): string[] {
  const ids = safeGet<string[]>(STORAGE_KEYS.COMPLETED_SESSIONS, []);
  return Array.isArray(ids) ? ids : [];
}

export function setSessionCompleted(sessionId: string, completed: boolean): void {
  const current = getCompletedSessionIds();
  let updated: string[];
  if (completed) {
    if (!current.includes(sessionId)) {
      updated = [...current, sessionId];
    } else {
      updated = current;
    }
  } else {
    updated = current.filter((id) => id !== sessionId);
  }
  safeSet(STORAGE_KEYS.COMPLETED_SESSIONS, updated);
  notifyDataChanged('session_toggled');
}

export function toggleSessionCompleted(sessionId: string): boolean {
  const current = getCompletedSessionIds();
  const isCurrentlyDone = current.includes(sessionId);
  setSessionCompleted(sessionId, !isCurrentlyDone);
  return !isCurrentlyDone;
}

/**
 * Returns flattened tasks from the active plan, augmented with completion status.
 * If no plan exists, returns empty array.
 */
export function getActiveStudyTasks(): StudyTask[] {
  const plan = getSavedPlan();
  if (!plan || !Array.isArray(plan.days)) return [];

  const completedIds = new Set(getCompletedSessionIds());
  const tasks: StudyTask[] = [];

  for (const day of plan.days) {
    if (!Array.isArray(day.sessions)) continue;
    for (const session of day.sessions) {
      const isCompleted = completedIds.has(session.id);
      const priorityMap: Record<string, TaskPriority> = {
        High: 'high',
        Medium: 'medium',
        Low: 'low',
      };
      // Look up subject priority if possible
      const sub = plan.subjects?.find((s) => s.id === session.subjectId);
      const priority: TaskPriority = sub ? priorityMap[sub.priority] || 'medium' : 'medium';
      const status: TaskStatus = isCompleted ? 'completed' : 'todo';

      tasks.push({
        id: session.id,
        title: `${session.taskTypeLabel}: ${session.topic}`,
        subject: session.subjectName,
        dueDate: session.dateString || day.dateString,
        estimatedMinutes: session.durationMinutes,
        priority,
        status,
        aiSuggestedBreak: 'Take a 5-10m active recall pause upon session completion.',
      });
    }
  }

  return tasks;
}

// -----------------------------------------------------------------------------
// 2. Saved Notes and Summaries Persistence
// -----------------------------------------------------------------------------

export function getSavedNotes(): StructuredSummary[] {
  const notes = safeGet<StructuredSummary[]>(STORAGE_KEYS.NOTES, []);
  return Array.isArray(notes) ? notes : [];
}

export function getNoteById(id: string): StructuredSummary | null {
  const notes = getSavedNotes();
  return notes.find((n) => n.id === id) || null;
}

/**
 * Saves a note or summary with a stable ID.
 * If a note with this ID already exists, it is updated in-place without duplicating records.
 */
export function saveNote(note: StructuredSummary): StructuredSummary {
  const notes = getSavedNotes();
  const existingIdx = notes.findIndex((n) => n.id === note.id);

  let updatedNotes: StructuredSummary[];
  if (existingIdx >= 0) {
    // Update existing record
    updatedNotes = [...notes];
    updatedNotes[existingIdx] = {
      ...note,
      createdAt: notes[existingIdx].createdAt || note.createdAt,
    };
  } else {
    // Insert new record at start
    updatedNotes = [note, ...notes];
  }

  safeSet(STORAGE_KEYS.NOTES, updatedNotes);
  notifyDataChanged('note_saved');
  return note;
}

export function updateNote(
  id: string,
  updates: Partial<StructuredSummary>
): StructuredSummary | null {
  const notes = getSavedNotes();
  const existingIdx = notes.findIndex((n) => n.id === id);
  if (existingIdx === -1) return null;

  const updatedNote: StructuredSummary = {
    ...notes[existingIdx],
    ...updates,
    id, // Keep stable ID
  };

  notes[existingIdx] = updatedNote;
  safeSet(STORAGE_KEYS.NOTES, notes);
  notifyDataChanged('note_updated');
  return updatedNote;
}

export function deleteNote(id: string): boolean {
  const notes = getSavedNotes();
  const filtered = notes.filter((n) => n.id !== id);
  if (filtered.length === notes.length) return false;

  safeSet(STORAGE_KEYS.NOTES, filtered);
  notifyDataChanged('note_deleted');
  return true;
}

// -----------------------------------------------------------------------------
// 3. Quiz Attempts & Results Persistence
// -----------------------------------------------------------------------------

export function getQuizHistory(): CompletedQuizResult[] {
  const results = safeGet<CompletedQuizResult[]>(STORAGE_KEYS.QUIZ_HISTORY, []);
  return Array.isArray(results) ? results : [];
}

export function saveQuizAttempt(attempt: CompletedQuizResult): void {
  if (!attempt || !attempt.id) return;
  const history = getQuizHistory();

  // Avoid accidental duplicates of same attempt ID
  const existingIdx = history.findIndex((h) => h.id === attempt.id);
  let updatedHistory: CompletedQuizResult[];

  const validatedAttempt: CompletedQuizResult = {
    ...attempt,
    timestamp: attempt.timestamp || Date.now(),
  };

  if (existingIdx >= 0) {
    updatedHistory = [...history];
    updatedHistory[existingIdx] = validatedAttempt;
  } else {
    updatedHistory = [validatedAttempt, ...history];
  }

  safeSet(STORAGE_KEYS.QUIZ_HISTORY, updatedHistory);
  notifyDataChanged('quiz_saved');
}

export function deleteQuizAttempt(id: string): boolean {
  const history = getQuizHistory();
  const filtered = history.filter((h) => h.id !== id);
  if (filtered.length === history.length) return false;

  safeSet(STORAGE_KEYS.QUIZ_HISTORY, filtered);
  notifyDataChanged('quiz_deleted');
  return true;
}

export function clearQuizHistory(): void {
  safeSet(STORAGE_KEYS.QUIZ_HISTORY, []);
  notifyDataChanged('quiz_cleared');
}

// -----------------------------------------------------------------------------
// 4. Aggregated Real Statistics (Calculated strictly from saved data)
// -----------------------------------------------------------------------------

export function getAggregatedStatistics(): UserAggregatedStats {
  const plan = getSavedPlan();
  const completedIds = new Set(getCompletedSessionIds());
  const notes = getSavedNotes();
  const quizzes = getQuizHistory();
  const subjects = getPlannerSubjects();

  // Task statistics from plan
  let totalTasksCount = 0;
  let completedTasksCount = 0;
  const subjectTaskCounts: Record<string, { total: number; completed: number; minutes: number }> = {};

  if (plan && Array.isArray(plan.days)) {
    for (const day of plan.days) {
      if (!Array.isArray(day.sessions)) continue;
      for (const session of day.sessions) {
        totalTasksCount++;
        const isDone = completedIds.has(session.id);
        if (isDone) completedTasksCount++;

        const subName = session.subjectName || 'General';
        if (!subjectTaskCounts[subName]) {
          subjectTaskCounts[subName] = { total: 0, completed: 0, minutes: 0 };
        }
        subjectTaskCounts[subName].total++;
        if (isDone) {
          subjectTaskCounts[subName].completed++;
          subjectTaskCounts[subName].minutes += session.durationMinutes || 0;
        }
      }
    }
  }

  const remainingTasksCount = Math.max(0, totalTasksCount - completedTasksCount);
  const taskCompletionPercentage =
    totalTasksCount > 0 ? Math.round((completedTasksCount / totalTasksCount) * 100) : 0;

  // Quiz statistics
  const quizAttemptsCount = quizzes.length;
  let averageQuizScore: number | null = null;
  let highestQuizScore: number | null = null;
  let latestQuizScore: number | null = null;

  const subjectQuizCounts: Record<string, { attempts: number; totalScore: number; maxScore: number }> = {};

  if (quizzes.length > 0) {
    let totalScore = 0;
    let maxScore = 0;

    for (let i = 0; i < quizzes.length; i++) {
      const q = quizzes[i];
      totalScore += q.percentage;
      if (q.percentage > maxScore) maxScore = q.percentage;

      const subName = q.subject || 'General';
      if (!subjectQuizCounts[subName]) {
        subjectQuizCounts[subName] = { attempts: 0, totalScore: 0, maxScore: 0 };
      }
      subjectQuizCounts[subName].attempts++;
      subjectQuizCounts[subName].totalScore += q.percentage;
      if (q.percentage > subjectQuizCounts[subName].maxScore) {
        subjectQuizCounts[subName].maxScore = q.percentage;
      }
    }

    averageQuizScore = Math.round(totalScore / quizzes.length);
    highestQuizScore = maxScore;
    latestQuizScore = quizzes[0].percentage;
  }

  // Upcoming Deadlines
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  const activeSubjects = plan?.subjects && plan.subjects.length > 0 ? plan.subjects : subjects;
  const upcomingDeadlines: UpcomingExamDeadline[] = activeSubjects
    .map((sub) => {
      const examDateObj = new Date(sub.examDate);
      examDateObj.setHours(0, 0, 0, 0);
      const diffMs = examDateObj.getTime() - now.getTime();
      const daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

      let status: 'critical' | 'soon' | 'upcoming' = 'upcoming';
      if (daysRemaining <= 3) status = 'critical';
      else if (daysRemaining <= 7) status = 'soon';

      return {
        subject: sub.name,
        examDate: sub.examDate,
        daysRemaining,
        priority: sub.priority,
        status,
      };
    })
    .sort((a, b) => a.daysRemaining - b.daysRemaining);

  // Subject-wise Breakdown (Union of tasks and quizzes)
  const allSubjectNames = new Set([
    ...Object.keys(subjectTaskCounts),
    ...Object.keys(subjectQuizCounts),
    ...activeSubjects.map((s) => s.name),
  ]);

  const subjectBreakdown: SubjectProgressBreakdown[] = Array.from(allSubjectNames).map((subject) => {
    const tData = subjectTaskCounts[subject] || { total: 0, completed: 0, minutes: 0 };
    const qData = subjectQuizCounts[subject] || { attempts: 0, totalScore: 0, maxScore: 0 };

    const taskPct = tData.total > 0 ? Math.round((tData.completed / tData.total) * 100) : 0;
    const avgScore = qData.attempts > 0 ? Math.round(qData.totalScore / qData.attempts) : null;
    const maxScore = qData.attempts > 0 ? qData.maxScore : null;
    const hoursInvested = Math.round((tData.minutes / 60) * 10) / 10;

    return {
      subject,
      totalTasks: tData.total,
      completedTasks: tData.completed,
      taskCompletionPercent: taskPct,
      quizAttempts: qData.attempts,
      averageQuizScore: avgScore,
      highestQuizScore: maxScore,
      hoursInvested,
    };
  });

  return {
    activePlansCount: plan ? 1 : 0,
    hasActivePlan: Boolean(plan),
    totalTasksCount,
    completedTasksCount,
    remainingTasksCount,
    taskCompletionPercentage,
    totalNotesCount: notes.length,
    quizAttemptsCount,
    averageQuizScore,
    highestQuizScore,
    latestQuizScore,
    upcomingDeadlines,
    subjectBreakdown,
  };
}

// -----------------------------------------------------------------------------
// 5. Data Privacy, Storage Reset, & Diagnostics
// -----------------------------------------------------------------------------

/**
 * Completely purges all StudyMate data stored in the current browser.
 * Safe operation that does not touch third-party keys.
 */
export function clearAllUserData(): void {
  if (!isBrowser()) return;
  Object.values(STORAGE_KEYS).forEach((key) => {
    safeRemove(key);
  });
  notifyDataChanged('all_data_cleared');
}

/**
 * Returns true if the user has any saved plans, subjects, notes, or quiz attempts.
 */
export function hasAnyUserData(): boolean {
  if (!isBrowser()) return false;
  return Boolean(
    window.localStorage.getItem(STORAGE_KEYS.PLAN) ||
      window.localStorage.getItem(STORAGE_KEYS.NOTES) ||
      window.localStorage.getItem(STORAGE_KEYS.QUIZ_HISTORY) ||
      window.localStorage.getItem(STORAGE_KEYS.SUBJECTS)
  );
}

/**
 * Returns storage footprint details for diagnostics.
 */
export function getStorageDiagnostics() {
  const plan = getSavedPlan();
  const notes = getSavedNotes();
  const quizzes = getQuizHistory();
  const completedSessions = getCompletedSessionIds();

  return {
    hasPlan: Boolean(plan),
    planSessionCount: plan?.days?.reduce((acc, d) => acc + (d.sessions?.length || 0), 0) || 0,
    completedSessionsCount: completedSessions.length,
    notesCount: notes.length,
    quizAttemptsCount: quizzes.length,
    keysPresent: Object.values(STORAGE_KEYS).filter((k) =>
      isBrowser() ? Boolean(window.localStorage.getItem(k)) : false
    ),
  };
}
