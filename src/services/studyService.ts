import type {
  StudyTask,
  NoteSummary,
  QuizItem,
  ProgressOverview,
  StudentProfile,
} from '../types';
import { MOCK_STUDENT } from '../utils/constants';

export const initialTasks: StudyTask[] = [
  {
    id: 'task-1',
    title: 'Review Reinforcement Learning Bellman Equations',
    subject: 'CS 234: Machine Learning',
    dueDate: '2026-10-24',
    estimatedMinutes: 50,
    priority: 'high',
    status: 'in_progress',
    aiSuggestedBreak: 'Take 10m walk after completing derivation problem #3',
  },
  {
    id: 'task-2',
    title: 'Summarize Cognitive Psychology Chapter 7 (Working Memory)',
    subject: 'PSYC 101: Cognitive Science',
    dueDate: '2026-10-25',
    estimatedMinutes: 35,
    priority: 'urgent',
    status: 'todo',
    aiSuggestedBreak: 'Use Pomodoro 25/5 rhythm for reading dense text',
  },
  {
    id: 'task-3',
    title: 'Distributed Consensus & Raft Protocol Quiz',
    subject: 'CS 244B: Distributed Systems',
    dueDate: '2026-10-26',
    estimatedMinutes: 40,
    priority: 'medium',
    status: 'todo',
  },
  {
    id: 'task-4',
    title: 'Linear Algebra SVD & Eigendecomposition practice set',
    subject: 'MATH 104: Linear Algebra',
    dueDate: '2026-10-23',
    estimatedMinutes: 60,
    priority: 'high',
    status: 'completed',
  },
];

export const initialSummaries: NoteSummary[] = [
  {
    id: 'sum-1',
    title: 'Deep Residual Learning for Image Recognition (ResNet)',
    subject: 'Computer Vision',
    createdAt: '2026-10-21',
    originalWordCount: 4200,
    summaryWordCount: 480,
    format: 'bullet_points',
    tags: ['Deep Learning', 'Skip Connections', 'Architecture'],
    excerpt:
      'Addresses degradation problem in deep neural networks via identity shortcut mappings, allowing networks with 152+ layers to train smoothly without vanishing gradients.',
    keyTakeaways: [
      'Residual representations reformulation simplifies deep optimization.',
      'Skip connections introduce no extra parameters nor computational complexity.',
      'Enables training of exceptionally deep networks (152 layers on ImageNet).',
      'Outperforms previous models on COCO object detection and segmentation benchmarks.',
    ],
  },
  {
    id: 'sum-2',
    title: 'Attention Is All You Need — Transformer Architecture',
    subject: 'Natural Language Processing',
    createdAt: '2026-10-18',
    originalWordCount: 5100,
    summaryWordCount: 520,
    format: 'concept_map',
    tags: ['NLP', 'Transformers', 'Self-Attention'],
    excerpt:
      'Replaces recurrent and convolutional layers entirely with multi-head self-attention mechanisms, drastically increasing training parallelization.',
    keyTakeaways: [
      'Eliminates sequential recurrence in favor of scaled dot-product attention.',
      'Multi-Head Attention allows joint attendance to info from different representation subspaces.',
      'Positional encodings preserve token sequential relationships.',
      'Massive reduction in training compute time with higher BLEU scores.',
    ],
  },
  {
    id: 'sum-3',
    title: 'Neurobiology of Memory Consolidation & Hippocampus',
    subject: 'Cognitive Science',
    createdAt: '2026-10-15',
    originalWordCount: 3800,
    summaryWordCount: 410,
    format: 'flashcards',
    tags: ['Neuroscience', 'LTP', 'Hippocampus'],
    excerpt:
      'Detailed mechanisms of Long-Term Potentiation (LTP) and two-stage standard consolidation theory in mammalian cerebral cortex.',
    keyTakeaways: [
      'Hippocampus acts as a temporary buffer during rapid synaptic encoding.',
      'Slow-wave sleep facilitates hippocampal-neocortical dialogue and permanent schema integration.',
      'NMDA receptors and calcium influx serve as coincidence detectors for synaptic plasticity.',
    ],
  },
];

export const initialQuizzes: QuizItem[] = [
  {
    id: 'quiz-1',
    title: 'Neural Networks: Backpropagation & Optimization',
    subject: 'CS 234: Machine Learning',
    questionCount: 15,
    estimatedMinutes: 20,
    difficulty: 'Intermediate',
    lastScore: 92,
  },
  {
    id: 'quiz-2',
    title: 'Operating Systems: Virtual Memory & Page Replacement',
    subject: 'CS 110: Principles of Computer Systems',
    questionCount: 12,
    estimatedMinutes: 15,
    difficulty: 'Advanced',
    lastScore: 84,
  },
  {
    id: 'quiz-3',
    title: 'Cognitive Biases & Heuristics in Decision Making',
    subject: 'PSYC 101: Cognitive Science',
    questionCount: 10,
    estimatedMinutes: 12,
    difficulty: 'Beginner',
    lastScore: 98,
  },
  {
    id: 'quiz-4',
    title: 'Fourier Transforms & Signal Decomposition',
    subject: 'EE 102A: Signals and Systems',
    questionCount: 14,
    estimatedMinutes: 25,
    difficulty: 'Advanced',
  },
];

export const initialProgressOverview: ProgressOverview = {
  overallScore: 88,
  streakDays: 14,
  totalNotesProcessed: 28,
  quizzesCompleted: 19,
  subjects: [
    {
      subject: 'Machine Learning',
      masteryPercentage: 92,
      hoursSpent: 34,
      quizzesTaken: 8,
      color: 'var(--color-violet-600)',
    },
    {
      subject: 'Distributed Systems',
      masteryPercentage: 78,
      hoursSpent: 22,
      quizzesTaken: 4,
      color: 'var(--color-navy-700)',
    },
    {
      subject: 'Cognitive Science',
      masteryPercentage: 95,
      hoursSpent: 18,
      quizzesTaken: 5,
      color: 'var(--color-emerald-600)',
    },
    {
      subject: 'Linear Algebra',
      masteryPercentage: 86,
      hoursSpent: 28,
      quizzesTaken: 6,
      color: 'var(--color-amber-600)',
    },
  ],
  weeklyActivity: [
    { day: 'Mon', hours: 4.2, retentionRate: 91 },
    { day: 'Tue', hours: 3.8, retentionRate: 88 },
    { day: 'Wed', hours: 5.1, retentionRate: 94 },
    { day: 'Thu', hours: 2.9, retentionRate: 85 },
    { day: 'Fri', hours: 4.5, retentionRate: 89 },
    { day: 'Sat', hours: 3.0, retentionRate: 90 },
    { day: 'Sun', hours: 3.2, retentionRate: 93 },
  ],
};

import {
  getActiveStudyTasks,
  getSavedNotes,
  getQuizHistory,
  getAggregatedStatistics,
} from './storageService';

export const studyService = {
  getStudentProfile: async (): Promise<StudentProfile> => {
    const stats = getAggregatedStatistics();
    return {
      ...MOCK_STUDENT,
      totalCardsMastered: stats.completedTasksCount * 4,
      studyHoursThisWeek: Math.round(
        stats.subjectBreakdown.reduce((acc, s) => acc + s.hoursInvested, 0) * 10
      ) / 10,
    };
  },
  getTasks: async (): Promise<StudyTask[]> => {
    // Return real tasks from the student's active saved plan
    return getActiveStudyTasks();
  },
  getSummaries: async (): Promise<NoteSummary[]> => {
    // Return real notes and summaries saved in the student's library
    const realNotes = getSavedNotes();
    return realNotes.map((n) => ({
      id: n.id,
      title: n.title,
      subject: n.subject,
      createdAt: n.createdAt,
      originalWordCount: n.wordCount,
      summaryWordCount: n.summaryWordCount,
      keyTakeaways: n.takeaways || [],
      format: 'bullet_points',
      tags: [n.subject, n.provider === 'gemini' ? 'AI Generated' : 'Demo Note'],
      excerpt: n.overview,
    }));
  },
  getQuizzes: async (): Promise<QuizItem[]> => {
    // Return real completed quiz attempts
    const history = getQuizHistory();
    return history.map((q) => ({
      id: q.id,
      title: q.title,
      subject: q.subject,
      questionCount: q.totalQuestions,
      estimatedMinutes: Math.max(5, Math.round(q.totalQuestions * 1.5)),
      difficulty: (q.difficulty === 'Easy' ? 'Beginner' : q.difficulty === 'Hard' ? 'Advanced' : 'Intermediate') as 'Beginner' | 'Intermediate' | 'Advanced',
      lastScore: q.percentage,
    }));
  },
  getProgressOverview: async (): Promise<ProgressOverview> => {
    const stats = getAggregatedStatistics();
    const subjectsMap = [
      'var(--color-violet-600)',
      'var(--color-navy-700)',
      'var(--color-emerald-600)',
      'var(--color-amber-600)',
      'var(--color-blue-600)',
    ];

    const subjects = stats.subjectBreakdown.map((s, idx) => ({
      subject: s.subject,
      masteryPercentage: s.averageQuizScore ?? s.taskCompletionPercent,
      hoursSpent: s.hoursInvested,
      quizzesTaken: s.quizAttempts,
      color: subjectsMap[idx % subjectsMap.length],
    }));

    return {
      overallScore: stats.averageQuizScore ?? stats.taskCompletionPercentage,
      streakDays: stats.completedTasksCount > 0 ? Math.min(14, stats.completedTasksCount) : 0,
      totalNotesProcessed: stats.totalNotesCount,
      quizzesCompleted: stats.quizAttemptsCount,
      subjects,
      weeklyActivity: [
        { day: 'Mon', hours: 0, retentionRate: 0 },
        { day: 'Tue', hours: 0, retentionRate: 0 },
        { day: 'Wed', hours: 0, retentionRate: 0 },
        { day: 'Thu', hours: 0, retentionRate: 0 },
        { day: 'Fri', hours: 0, retentionRate: 0 },
        { day: 'Sat', hours: 0, retentionRate: 0 },
        { day: 'Sun', hours: 0, retentionRate: 0 },
      ],
    };
  },
};
