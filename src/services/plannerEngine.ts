import type {
  PlannerSubjectInput,
  PlannedStudySession,
  PlannerDaySchedule,
  FeasibilityReport,
  GeneratedStudyPlan,
  PlannerPriority,
  PlannerTaskType,
} from '../types';

/**
 * Validates a single subject input form.
 * Returns an object with field names and specific error messages.
 */
export function validateSubjectInput(
  input: Partial<PlannerSubjectInput>,
  currentDate: Date = new Date()
): Record<string, string> {
  const errors: Record<string, string> = {};

  // Subject Name
  if (!input.name || !input.name.trim()) {
    errors.name = 'Subject name is required.';
  } else if (input.name.trim().length < 2) {
    errors.name = 'Subject name must be at least 2 characters.';
  }

  // Topics
  const parsedTopics = input.rawTopics
    ? parseTopics(input.rawTopics)
    : input.topics || [];

  if (parsedTopics.length === 0) {
    errors.topics = 'Please enter at least one topic or chapter to study.';
  }

  // Exam Date
  if (!input.examDate || !input.examDate.trim()) {
    errors.examDate = 'Exam date or target date is required.';
  } else {
    const days = getDaysUntilDate(input.examDate, currentDate);
    if (isNaN(days)) {
      errors.examDate = 'Please enter a valid target date.';
    } else if (days < 0) {
      errors.examDate = 'Exam date cannot be in the past.';
    } else if (days === 0) {
      // Allowed if student is cramming today, but warn
      // We will allow 0 as today (0 days remaining)
    }
  }

  // Daily Study Hours
  if (input.dailyStudyHours === undefined || input.dailyStudyHours === null) {
    errors.dailyStudyHours = 'Available study time per day is required.';
  } else if (Number(input.dailyStudyHours) <= 0) {
    errors.dailyStudyHours = 'Study time per day must be greater than 0 hours.';
  } else if (Number(input.dailyStudyHours) > 16) {
    errors.dailyStudyHours = 'Study time cannot exceed 16 hours per day to ensure rest.';
  }

  // Preferred Session Length
  if (!input.sessionLengthMinutes || Number(input.sessionLengthMinutes) <= 0) {
    errors.sessionLengthMinutes = 'Session length must be greater than 0 minutes.';
  } else if (Number(input.sessionLengthMinutes) < 15) {
    errors.sessionLengthMinutes = 'Session length should be at least 15 minutes.';
  } else if (Number(input.sessionLengthMinutes) > 180) {
    errors.sessionLengthMinutes = 'Session length cannot exceed 180 minutes.';
  }

  // Priority
  if (!input.priority || !['High', 'Medium', 'Low'].includes(input.priority)) {
    errors.priority = 'Priority must be High, Medium, or Low.';
  }

  // Current Understanding
  if (
    !input.understandingLevel ||
    !['Beginner', 'Intermediate', 'Advanced'].includes(input.understandingLevel)
  ) {
    errors.understandingLevel = 'Understanding must be Beginner, Intermediate, or Advanced.';
  }

  return errors;
}

/**
 * Parses raw text input into clean topic strings.
 * Handles commas, newlines, semicolons, and list markers.
 */
export function parseTopics(rawText: string): string[] {
  if (!rawText) return [];
  return rawText
    .split(/[\n,;]+/)
    .map((t) => t.trim().replace(/^[-*•\d.)\s]+/, '').trim())
    .filter((t) => t.length > 0);
}

/**
 * Calculates number of calendar days between baseDate and targetDate string (YYYY-MM-DD).
 */
export function getDaysUntilDate(targetDateStr: string, baseDate: Date = new Date()): number {
  const [year, month, day] = targetDateStr.split('-').map(Number);
  if (!year || !month || !day) return NaN;

  // Compare midnight to midnight local time to avoid timezone offsets
  const target = new Date(year, month - 1, day);
  const base = new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate());

  const diffMs = target.getTime() - base.getTime();
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Formats a Date object to YYYY-MM-DD.
 */
export function formatDateISO(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Formats a date string into readable academic format: "Wed, Oct 24".
 */
export function formatFriendlyDate(dateStr: string): string {
  const [year, month, day] = dateStr.split('-').map(Number);
  if (!year || !month || !day) return dateStr;
  const d = new Date(year, month - 1, day);
  return d.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Maps task type to human-readable academic badge label.
 */
export function getTaskTypeLabel(type: PlannerTaskType): string {
  switch (type) {
    case 'initial_study':
      return 'Initial Study';
    case 'deep_dive':
      return 'Concept Deep-Dive';
    case 'spaced_revision':
      return 'Spaced Revision';
    case 'practice_quiz':
      return 'Practice & Quiz';
    case 'final_review':
      return 'Final Exam Prep';
  }
}

/**
 * Generates subject color theme for visualization badges.
 */
export function getSubjectAccentColor(index: number): string {
  const palette = [
    'var(--color-violet-600)',
    'var(--color-navy-700)',
    'var(--color-emerald-600)',
    'var(--color-amber-600)',
    'var(--color-sky-600)',
    'var(--color-rose-600)',
  ];
  return palette[index % palette.length];
}

/**
 * Core Deterministic Study Plan Generator.
 * Algorithmic scheduling without fake AI.
 */
export function generateStudyPlan(
  subjects: PlannerSubjectInput[],
  baseDate: Date = new Date()
): GeneratedStudyPlan {
  if (subjects.length === 0) {
    throw new Error('Cannot generate a study plan without at least one subject.');
  }

  // 1. Prepare and normalize subjects with parsed topics
  const preparedSubjects = subjects.map((sub, idx) => ({
    ...sub,
    topics: sub.rawTopics ? parseTopics(sub.rawTopics) : sub.topics,
    accentColor: sub.accentColor || getSubjectAccentColor(idx),
  }));

  // 2. Assess feasibility first
  const feasibility = evaluatePlanFeasibility(preparedSubjects, baseDate);

  // 3. Decompose each subject into atomic study sessions
  interface TaskQueueItem {
    id: string;
    subjectId: string;
    subjectName: string;
    topic: string;
    durationMinutes: number;
    taskType: PlannerTaskType;
    taskTypeLabel: string;
    urgencyScore: number;
    preferredDayOffset?: number; // relative minimum day offset
    notes?: string;
  }

  const allTasks: TaskQueueItem[] = [];

  // Sort subjects by urgency: deadline proximity + priority weight
  const sortedSubjects = [...preparedSubjects].sort((a, b) => {
    const daysA = Math.max(0.5, getDaysUntilDate(a.examDate, baseDate));
    const daysB = Math.max(0.5, getDaysUntilDate(b.examDate, baseDate));

    const priorityScore = (p: PlannerPriority) => (p === 'High' ? 3 : p === 'Medium' ? 2 : 1);
    const scoreA = priorityScore(a.priority) / daysA;
    const scoreB = priorityScore(b.priority) / daysB;
    return scoreB - scoreA;
  });

  sortedSubjects.forEach((sub) => {
    const sessionMins = Number(sub.sessionLengthMinutes) || 45;
    const daysToExam = Math.max(1, getDaysUntilDate(sub.examDate, baseDate));
    const priorityWeight = sub.priority === 'High' ? 1.5 : sub.priority === 'Medium' ? 1.0 : 0.8;

    // A. Initial Study Session for each topic
    sub.topics.forEach((topic, tIdx) => {
      allTasks.push({
        id: `task-${sub.id}-init-${tIdx}`,
        subjectId: sub.id,
        subjectName: sub.name,
        topic: `Study: ${topic}`,
        durationMinutes: sessionMins,
        taskType: 'initial_study',
        taskTypeLabel: getTaskTypeLabel('initial_study'),
        urgencyScore: 100 * priorityWeight - tIdx,
        notes: `Initial active reading and core formula synthesis for ${topic}`,
      });

      // B. If Beginner: Add a Deep-Dive concept session
      if (sub.understandingLevel === 'Beginner') {
        allTasks.push({
          id: `task-${sub.id}-deep-${tIdx}`,
          subjectId: sub.id,
          subjectName: sub.name,
          topic: `Deep-Dive: ${topic}`,
          durationMinutes: Math.min(sessionMins, 45),
          taskType: 'deep_dive',
          taskTypeLabel: getTaskTypeLabel('deep_dive'),
          urgencyScore: 80 * priorityWeight - tIdx,
          notes: `Reinforce fundamentals and work through guided sample problems`,
        });
      }
    });

    // C. Spaced Revision Sessions
    // For every 2-3 topics, add a spaced revision session
    const revisionCount = Math.max(1, Math.ceil(sub.topics.length / 2));
    for (let r = 0; r < revisionCount; r++) {
      const sliceTopics = sub.topics.slice(r * 2, r * 2 + 2);
      allTasks.push({
        id: `task-${sub.id}-rev-${r}`,
        subjectId: sub.id,
        subjectName: sub.name,
        topic: `Spaced Revision: ${sliceTopics.join(', ') || 'Core Modules'}`,
        durationMinutes: Math.round(sessionMins * 0.75),
        taskType: 'spaced_revision',
        taskTypeLabel: getTaskTypeLabel('spaced_revision'),
        urgencyScore: 70 * priorityWeight,
        notes: `Active recall and flashcard self-testing to consolidate memory`,
      });
    }

    // D. Practice & Quiz Session
    allTasks.push({
      id: `task-${sub.id}-prac`,
      subjectId: sub.id,
      subjectName: sub.name,
      topic: `Practice Problem Set & Mock Quiz (${sub.name})`,
      durationMinutes: sessionMins,
      taskType: 'practice_quiz',
      taskTypeLabel: getTaskTypeLabel('practice_quiz'),
      urgencyScore: 60 * priorityWeight,
      notes: `Simulate exam conditions with past papers and timing constraints`,
    });

    // E. Final Exam Prep (1-2 days before exam)
    allTasks.push({
      id: `task-${sub.id}-final`,
      subjectId: sub.id,
      subjectName: sub.name,
      topic: `Comprehensive Exam Review & Formula Sheet (${sub.name})`,
      durationMinutes: sessionMins,
      taskType: 'final_review',
      taskTypeLabel: getTaskTypeLabel('final_review'),
      urgencyScore: 50 * priorityWeight,
      preferredDayOffset: Math.max(1, daysToExam - 1),
      notes: `High-yield synthesis, summary sheet review, and confidence calibration`,
    });
  });

  // 4. Distribute into days
  // Maximum days needed across all subjects
  const maxDays = Math.max(
    1,
    ...preparedSubjects.map((s) => Math.max(1, getDaysUntilDate(s.examDate, baseDate)))
  );

  // Average daily available minutes across all subjects (or weighted by student input)
  const avgDailyHours =
    preparedSubjects.reduce((acc, s) => acc + Number(s.dailyStudyHours || 3), 0) /
    preparedSubjects.length;
  const maxDailyMinutes = Math.round(avgDailyHours * 60);

  // Prepare days buckets
  const days: PlannerDaySchedule[] = [];
  const baseMidnight = new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate());

  for (let d = 0; d < maxDays; d++) {
    const curDate = new Date(baseMidnight.getTime() + d * 86400000);
    const dateStr = formatDateISO(curDate);
    const friendly = formatFriendlyDate(dateStr);
    days.push({
      dayNumber: d + 1,
      dateString: dateStr,
      formattedDate: d === 0 ? `Today (${friendly})` : d === 1 ? `Tomorrow (${friendly})` : friendly,
      totalMinutes: 0,
      sessions: [],
    });
  }

  // Interleave and place tasks into days
  // We place initial study & deep dive early, spaced revision in middle, practice & final later
  const unassignedTasks = [...allTasks];

  // Helper: Find which day a subject exam occurs
  const subjectExamDayIndex: Record<string, number> = {};
  preparedSubjects.forEach((sub) => {
    const daysUntil = getDaysUntilDate(sub.examDate, baseDate);
    subjectExamDayIndex[sub.id] = Math.max(0, Math.min(maxDays - 1, daysUntil));
  });

  let taskIndex = 0;
  while (unassignedTasks.length > 0 && taskIndex < unassignedTasks.length * 3) {
    taskIndex++;
    const task = unassignedTasks.shift()!;
    const examDayLimit = subjectExamDayIndex[task.subjectId] ?? (maxDays - 1);

    // Determine target day for this task
    let targetDayIndex = 0;

    if (task.taskType === 'final_review') {
      // Put on the day before the exam, or exam day if only 1 day
      targetDayIndex = Math.max(0, examDayLimit - 1);
    } else if (task.taskType === 'practice_quiz') {
      // Put 2 days before exam
      targetDayIndex = Math.max(0, examDayLimit - 2);
    } else if (task.taskType === 'spaced_revision') {
      // Place in the second half of the time window before exam
      targetDayIndex = Math.min(examDayLimit, Math.max(1, Math.floor(examDayLimit * 0.6)));
    } else {
      // Initial study or deep dive: find the earliest day with capacity before exam
      let bestDay = 0;
      for (let i = 0; i <= examDayLimit; i++) {
        // Prefer day that is under maxDailyMinutes and has fewest tasks of this same subject
        const day = days[i];
        if (day.totalMinutes + task.durationMinutes <= maxDailyMinutes * 1.25) {
          bestDay = i;
          break;
        }
      }
      targetDayIndex = bestDay;
    }

    // Safety boundary
    targetDayIndex = Math.min(Math.max(0, targetDayIndex), examDayLimit);

    // If target day is packed, look forward or backward
    const targetDay = days[targetDayIndex];
    const session: PlannedStudySession = {
      id: `session-${task.id}-${days[targetDayIndex].sessions.length}`,
      dayNumber: targetDay.dayNumber,
      dateString: targetDay.dateString,
      formattedDate: targetDay.formattedDate,
      subjectId: task.subjectId,
      subjectName: task.subjectName,
      topic: task.topic,
      durationMinutes: task.durationMinutes,
      taskType: task.taskType,
      taskTypeLabel: task.taskTypeLabel,
      completed: false,
      notes: task.notes,
    };

    targetDay.sessions.push(session);
    targetDay.totalMinutes += task.durationMinutes;
  }

  // Filter out any empty trailing days beyond the latest scheduled task
  let lastNonEmptyIndex = days.length - 1;
  while (lastNonEmptyIndex > 0 && days[lastNonEmptyIndex].sessions.length === 0) {
    lastNonEmptyIndex--;
  }
  const activeDays = days.slice(0, lastNonEmptyIndex + 1);

  // Total summary
  const totalSessions = activeDays.reduce((acc, d) => acc + d.sessions.length, 0);
  const totalMinutes = activeDays.reduce((acc, d) => acc + d.totalMinutes, 0);

  return {
    id: `plan-${Date.now()}`,
    createdAt: new Date().toISOString(),
    subjects: preparedSubjects,
    days: activeDays,
    totalSessions,
    totalMinutes,
    feasibility,
  };
}

/**
 * Evaluates whether a proposed study schedule is feasible or unrealistic.
 */
export function evaluatePlanFeasibility(
  subjects: PlannerSubjectInput[],
  baseDate: Date = new Date()
): FeasibilityReport {
  if (subjects.length === 0) {
    return {
      status: 'feasible',
      totalRequiredHours: 0,
      totalAvailableHours: 0,
      availableDays: 0,
      message: 'Add subjects to evaluate plan feasibility.',
      recommendations: [],
    };
  }

  // Calculate required hours for all subjects
  let totalRequiredMinutes = 0;
  const subjectReports: { name: string; required: number; available: number; days: number }[] = [];

  subjects.forEach((sub) => {
    const topics = sub.rawTopics ? parseTopics(sub.rawTopics) : sub.topics || [];
    const sessionMins = Number(sub.sessionLengthMinutes) || 45;
    const daysUntilExam = Math.max(1, getDaysUntilDate(sub.examDate, baseDate));
    const dailyHours = Number(sub.dailyStudyHours) || 3;

    // Weight factors
    const understandingFactor =
      sub.understandingLevel === 'Beginner' ? 1.6 : sub.understandingLevel === 'Intermediate' ? 1.2 : 1.0;

    const revisionSessions = Math.max(1, Math.ceil(topics.length / 2));
    const practiceSessions = 1;
    const finalReviewSessions = 1;

    const totalSubjectSessions =
      topics.length * understandingFactor + revisionSessions + practiceSessions + finalReviewSessions;
    const subjectRequiredMinutes = totalSubjectSessions * sessionMins;

    totalRequiredMinutes += subjectRequiredMinutes;
    const subjectAvailableMinutes = daysUntilExam * (dailyHours * 60);

    subjectReports.push({
      name: sub.name,
      required: Math.round((subjectRequiredMinutes / 60) * 10) / 10,
      available: Math.round((subjectAvailableMinutes / 60) * 10) / 10,
      days: daysUntilExam,
    });
  });

  const totalRequiredHours = Math.round((totalRequiredMinutes / 60) * 10) / 10;

  // Calculate overall available hours
  const minDays = Math.min(...subjectReports.map((s) => s.days));
  const maxDays = Math.max(...subjectReports.map((s) => s.days));
  const avgDailyHours =
    subjects.reduce((sum, s) => sum + Number(s.dailyStudyHours || 3), 0) / subjects.length;
  const totalAvailableHours = Math.round(maxDays * avgDailyHours * 10) / 10;

  // Check if any individual subject has an impossible deadline
  const impossibleSubject = subjectReports.find((s) => s.required > s.available * 1.2);

  // Status decision
  const recommendations: string[] = [];

  if (impossibleSubject || totalRequiredHours > totalAvailableHours * 1.15) {
    const deficit = Math.round((totalRequiredHours - totalAvailableHours) * 10) / 10;
    recommendations.push(
      `Increase your daily study time or extend your target dates to cover the ${Math.max(1, deficit)}h shortfall.`
    );
    recommendations.push(
      'Prioritize high-yield topics and consider skipping optional background reading.'
    );
    if (impossibleSubject) {
      recommendations.push(
        `"${impossibleSubject.name}" is especially compressed (${impossibleSubject.required}h needed vs ${impossibleSubject.available}h available in ${impossibleSubject.days} days).`
      );
    }

    return {
      status: 'unrealistic',
      totalRequiredHours,
      totalAvailableHours,
      availableDays: maxDays,
      message: `Unrealistic deadline detected: This plan requires ~${totalRequiredHours} hours of focused study, but only ~${totalAvailableHours} hours are available across ${maxDays} days.`,
      recommendations,
    };
  } else if (totalRequiredHours > totalAvailableHours * 0.85) {
    recommendations.push(
      'Your schedule is very tight. Minimize multi-tasking and adhere strictly to your daily slots.'
    );
    recommendations.push(
      'Use 5-minute active recall quizzes before ending each block to maximize retention per hour.'
    );

    return {
      status: 'tight',
      totalRequiredHours,
      totalAvailableHours,
      availableDays: maxDays,
      message: `Tight schedule: Required study (~${totalRequiredHours}h) closely matches your maximum available capacity (~${totalAvailableHours}h).`,
      recommendations,
    };
  } else {
    const surplus = Math.round((totalAvailableHours - totalRequiredHours) * 10) / 10;
    recommendations.push(
      `You have a comfortable buffer of ~${surplus} surplus hours for rest or extra revision.`
    );
    recommendations.push(
      'Spacing topics across multiple days promotes stronger long-term synaptic consolidation.'
    );

    return {
      status: 'feasible',
      totalRequiredHours,
      totalAvailableHours,
      availableDays: minDays,
      message: `Realistic and achievable plan: All topics, revisions, and practice mock tests fit comfortably with a buffer.`,
      recommendations,
    };
  }
}

/**
 * High-quality preset subjects for testing and rapid 1-click loading.
 */
export const SAMPLE_PLANNER_SUBJECTS: PlannerSubjectInput[] = [
  {
    id: 'sample-sub-1',
    name: 'CS 234: Reinforcement & Machine Learning',
    topics: [
      'Bellman Optimality Equations',
      'Value Iteration & Policy Iteration',
      'Q-Learning & Function Approximation',
      'Policy Gradient & REINFORCE',
    ],
    rawTopics:
      'Bellman Optimality Equations\nValue Iteration & Policy Iteration\nQ-Learning & Function Approximation\nPolicy Gradient & REINFORCE',
    examDate: new Date(Date.now() + 86400000 * 7).toISOString().split('T')[0], // 7 days away
    dailyStudyHours: 3,
    sessionLengthMinutes: 45,
    priority: 'High',
    understandingLevel: 'Beginner',
    accentColor: 'var(--color-violet-600)',
  },
  {
    id: 'sample-sub-2',
    name: 'CS 244B: Distributed Systems',
    topics: [
      'Raft Consensus Leader Election',
      'Log Replication & Safety Proofs',
      'Byzantine Fault Tolerance (PBFT)',
    ],
    rawTopics:
      'Raft Consensus Leader Election\nLog Replication & Safety Proofs\nByzantine Fault Tolerance (PBFT)',
    examDate: new Date(Date.now() + 86400000 * 14).toISOString().split('T')[0], // 14 days away
    dailyStudyHours: 2,
    sessionLengthMinutes: 50,
    priority: 'Medium',
    understandingLevel: 'Intermediate',
    accentColor: 'var(--color-navy-700)',
  },
  {
    id: 'sample-sub-3',
    name: 'MATH 104: Linear Algebra',
    topics: [
      'Singular Value Decomposition (SVD)',
      'Orthogonal Projections & Gram-Schmidt',
      'Spectral Theorem & Symmetric Matrices',
    ],
    rawTopics:
      'Singular Value Decomposition (SVD)\nOrthogonal Projections & Gram-Schmidt\nSpectral Theorem & Symmetric Matrices',
    examDate: new Date(Date.now() + 86400000 * 21).toISOString().split('T')[0], // 21 days away
    dailyStudyHours: 2,
    sessionLengthMinutes: 45,
    priority: 'Low',
    understandingLevel: 'Advanced',
    accentColor: 'var(--color-emerald-600)',
  },
];
