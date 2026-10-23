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

export const MOCK_STUDENT: StudentProfile = {
  id: 'usr_84928',
  name: 'Ritika Sharma',
  email: 'ritika.sharma@stanford.edu',
  institution: 'Stanford University',
  major: 'Computer Science & Cognitive AI',
  currentStreak: 14,
  studyHoursThisWeek: 26.5,
  totalCardsMastered: 480,
  aiCreditsRemaining: 1250,
};
