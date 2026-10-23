import type { NavItemConfig, StudentProfile } from '../types';

export const APP_CONFIG = {
  name: 'StudyMate AI',
  shortName: 'StudyMate',
  tagline: 'Your Intelligent Academic Co-Pilot',
  description:
    'Empower your learning journey with AI-driven study schedules, intelligent note summarization, predictive exam quizzes, and deep cognitive retention analytics.',
  version: '1.0.0-foundation',
  supportEmail: 'support@studymate.ai',
};

export const MAIN_NAV_ITEMS: NavItemConfig[] = [
  {
    label: 'Home',
    path: '/',
    description: 'Platform overview, capabilities, and student showcase',
  },
  {
    label: 'Dashboard',
    path: '/dashboard',
    description: 'Central command for your courses, tasks, and today’s goals',
  },
  {
    label: 'Study Planner',
    path: '/planner',
    description: 'AI-balanced study calendar and spaced repetition deadlines',
    badge: 'AI Plan',
  },
  {
    label: 'Notes Summarizer',
    path: '/summarizer',
    description: 'Transform lecture transcripts and textbooks into flash summaries',
  },
  {
    label: 'Quiz Generator',
    path: '/quiz',
    description: 'Generate high-yield self-assessments from course notes',
    badge: 'Popular',
  },
  {
    label: 'Progress',
    path: '/progress',
    description: 'Cognitive retention stats, streak monitoring, and mastery curves',
  },
];

export const DEFAULT_STUDENT_PROFILE: StudentProfile = {
  id: 'usr_student_active',
  name: 'Asad Ali',
  email: 'asad.ali@university.edu',
  institution: 'Faculty of Engineering & Computer Science',
  major: 'Computer Science & AI Systems',
  academicYear: 'Final Year / Senior',
  targetDailyHours: 4,
  academicGoal: 'Master AI algorithms, machine learning models, and ace semester exams with top honors.',
  currentStreak: 14,
  studyHoursThisWeek: 26.5,
  totalCardsMastered: 480,
  aiCreditsRemaining: 1250,
};

export const MOCK_STUDENT: StudentProfile = DEFAULT_STUDENT_PROFILE;
