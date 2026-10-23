// Route Definitions
export type AppRoute =
  | '/'
  | '/dashboard'
  | '/planner'
  | '/summarizer'
  | '/quiz'
  | '/progress';

export interface NavItemConfig {
  label: string;
  path: string;
  description?: string;
  badge?: string;
  isExternal?: boolean;
}

// User & Academic Profile
export interface StudentProfile {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  institution: string;
  major: string;
  academicYear?: string;
  targetDailyHours?: number;
  academicGoal?: string;
  currentStreak: number;
  studyHoursThisWeek: number;
  totalCardsMastered: number;
  aiCreditsRemaining: number;
}

// Study Planner Types
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';
export type TaskStatus = 'todo' | 'in_progress' | 'completed';

export type PlannerPriority = 'High' | 'Medium' | 'Low';
export type UnderstandingLevel = 'Beginner' | 'Intermediate' | 'Advanced';
export type PlannerTaskType =
  | 'initial_study'
  | 'deep_dive'
  | 'spaced_revision'
  | 'practice_quiz'
  | 'final_review';

export interface PlannerSubjectInput {
  id: string;
  name: string;
  topics: string[];
  rawTopics?: string;
  examDate: string; // YYYY-MM-DD
  dailyStudyHours: number; // e.g. 3
  sessionLengthMinutes: number; // e.g. 45
  priority: PlannerPriority;
  understandingLevel: UnderstandingLevel;
  accentColor?: string;
}

export interface PlannedStudySession {
  id: string;
  dayNumber: number;
  dateString: string;
  formattedDate: string;
  subjectId: string;
  subjectName: string;
  topic: string;
  durationMinutes: number;
  taskType: PlannerTaskType;
  taskTypeLabel: string;
  completed: boolean;
  notes?: string;
}

export interface PlannerDaySchedule {
  dayNumber: number;
  dateString: string;
  formattedDate: string;
  totalMinutes: number;
  sessions: PlannedStudySession[];
}

export interface FeasibilityReport {
  status: 'feasible' | 'tight' | 'unrealistic';
  totalRequiredHours: number;
  totalAvailableHours: number;
  availableDays: number;
  message: string;
  recommendations: string[];
}

export interface GeneratedStudyPlan {
  id: string;
  createdAt: string;
  subjects: PlannerSubjectInput[];
  days: PlannerDaySchedule[];
  totalSessions: number;
  totalMinutes: number;
  feasibility: FeasibilityReport;
}

export interface StudyTask {
  id: string;
  title: string;
  subject: string;
  dueDate: string;
  estimatedMinutes: number;
  priority: TaskPriority;
  status: TaskStatus;
  aiSuggestedBreak?: string;
}

export interface StudyScheduleDay {
  day: string;
  date: string;
  tasks: StudyTask[];
  targetHours: number;
}

// Notes Summarizer Types
export type SummaryFormat = 'bullet_points' | 'executive' | 'flashcards' | 'concept_map';
export type ComplexityLevel = 'high_school' | 'undergraduate' | 'graduate';

export interface KeyTermDefinition {
  term: string;
  definition: string;
}

export interface ExtractedFact {
  type: 'fact' | 'formula' | 'date';
  label: string;
  content: string;
}

export interface StructuredSummary {
  id: string;
  title: string;
  subject: string;
  rawNotes: string;
  overview: string;
  keyPoints: string[];
  terms: KeyTermDefinition[];
  factsAndFormulas: ExtractedFact[];
  takeaways: string[];
  wordCount: number;
  summaryWordCount: number;
  createdAt: string;
  isRuleBasedDemo: boolean;
  provider?: 'gemini' | 'rule_based_fallback' | 'rule_based_demo';
  modelName?: string;
}

export interface NoteSummary {
  id: string;
  title: string;
  subject: string;
  createdAt: string;
  originalWordCount: number;
  summaryWordCount: number;
  keyTakeaways: string[];
  format: SummaryFormat;
  tags: string[];
  excerpt: string;
}

// AI Service API Status and Error Interfaces
export interface AiServiceStatus {
  configured: boolean;
  provider: 'gemini' | 'none';
  model: string;
  message?: string;
}

export interface AiApiErrorResponse {
  error: string;
  code: 'MISSING_API_KEY' | 'RATE_LIMIT' | 'TIMEOUT' | 'INVALID_REQUEST' | 'PROVIDER_ERROR' | 'INVALID_RESPONSE';
  message: string;
  details?: string;
  isRetryable: boolean;
}

// Quiz Generator Types
export type QuestionType = 'multiple_choice' | 'true_false' | 'short_answer';
export type QuizQuestionType = 'multiple_choice' | 'true_false';
export type QuizSetupType = 'multiple_choice' | 'true_false' | 'mixed';
export type QuizDifficulty = 'Easy' | 'Medium' | 'Hard';

export interface GeneratedQuizQuestion {
  id: string;
  type: QuizQuestionType;
  question: string;
  options: string[];
  correctAnswerIndex: number;
  explanation: string;
  groundedExcerpt: string;
  difficulty: QuizDifficulty;
}

export interface GeneratedQuiz {
  id: string;
  title: string;
  subject: string;
  sourceNotes: string;
  questions: GeneratedQuizQuestion[];
  difficulty: QuizDifficulty;
  questionType: QuizSetupType;
  requestedCount: number;
  actualCount: number;
  explanationOfCount?: string;
  createdAt: string;
  isRuleBasedDemo: boolean;
  provider?: 'gemini' | 'rule_based_fallback' | 'rule_based_demo';
  modelName?: string;
}

export interface CompletedQuizResult {
  id: string;
  quizId: string;
  title: string;
  subject: string;
  score: number;
  totalQuestions: number;
  percentage: number;
  date: string;
  difficulty: QuizDifficulty;
  questionType?: QuizSetupType;
  timestamp?: number;
  answers: Record<string, number>;
}

export interface SharedNotesPayload {
  title: string;
  subject: string;
  text: string;
  timestamp: number;
}

export interface QuizQuestion {
  id: string;
  question: string;
  options?: string[];
  correctAnswer: string | number;
  explanation: string;
  difficulty: 'easy' | 'medium' | 'hard';
}

export interface QuizItem {
  id: string;
  title: string;
  subject: string;
  questionCount: number;
  estimatedMinutes: number;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  lastScore?: number;
  questions?: QuizQuestion[];
}

// Progress & Analytics Types
export interface SubjectMastery {
  subject: string;
  masteryPercentage: number;
  hoursSpent: number;
  quizzesTaken: number;
  color: string;
}

export interface WeeklyStudyMetric {
  day: string;
  hours: number;
  retentionRate: number;
}

export interface ProgressOverview {
  overallScore: number;
  streakDays: number;
  totalNotesProcessed: number;
  quizzesCompleted: number;
  subjects: SubjectMastery[];
  weeklyActivity: WeeklyStudyMetric[];
}

export interface UpcomingExamDeadline {
  subject: string;
  examDate: string;
  daysRemaining: number;
  priority: PlannerPriority;
  status: 'critical' | 'soon' | 'upcoming';
}

export interface SubjectProgressBreakdown {
  subject: string;
  totalTasks: number;
  completedTasks: number;
  taskCompletionPercent: number;
  quizAttempts: number;
  averageQuizScore: number | null;
  highestQuizScore: number | null;
  hoursInvested: number;
  color?: string;
}

export interface UserAggregatedStats {
  activePlansCount: number;
  hasActivePlan: boolean;
  totalTasksCount: number;
  completedTasksCount: number;
  remainingTasksCount: number;
  taskCompletionPercentage: number;
  totalNotesCount: number;
  quizAttemptsCount: number;
  averageQuizScore: number | null;
  highestQuizScore: number | null;
  latestQuizScore: number | null;
  upcomingDeadlines: UpcomingExamDeadline[];
  subjectBreakdown: SubjectProgressBreakdown[];
}
