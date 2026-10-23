import React, { useState, useMemo, useEffect } from 'react';
import {
  Calendar,
  Clock,
  Sparkles,
  Plus,
  Trash2,
  Edit3,
  AlertTriangle,
  CheckCircle2,
  RotateCcw,
  Play,
  Pause,
  BookOpen,
  GraduationCap,
  RefreshCw,
  Sliders,
  X,
  Layers,
  Filter,
} from 'lucide-react';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { EmptyState } from '../../components/common/EmptyState';
import { useLocalStorage } from '../../hooks/useLocalStorage';
import {
  validateSubjectInput,
  parseTopics,
  generateStudyPlan,
  getDaysUntilDate,
  formatDateISO,
  SAMPLE_PLANNER_SUBJECTS,
  getSubjectAccentColor,
} from '../../services/plannerEngine';
import type {
  PlannerSubjectInput,
  GeneratedStudyPlan,
  PlannerPriority,
  UnderstandingLevel,
  PlannerTaskType,
} from '../../types';
import './PlannerPage.css';

export const PlannerPage: React.FC = () => {
  // ---------------------------------------------------------------------------
  // Stable Date References (Pure Render)
  // ---------------------------------------------------------------------------
  const [todayDate] = useState<Date>(() => new Date());
  const [todayISO] = useState<string>(() => formatDateISO(new Date()));
  const [defaultExamDate] = useState<string>(() => {
    const d = new Date(Date.now() + 86400000 * 10);
    return formatDateISO(d);
  });

  // ---------------------------------------------------------------------------
  // Persistent State (Local Storage)
  // ---------------------------------------------------------------------------
  const [subjects, setSubjects] = useLocalStorage<PlannerSubjectInput[]>(
    'studymate_planner_subjects',
    SAMPLE_PLANNER_SUBJECTS
  );

  const [studyPlan, setStudyPlan] = useLocalStorage<GeneratedStudyPlan | null>(
    'studymate_saved_plan',
    null
  );

  const [completedSessionIds, setCompletedSessionIds] = useLocalStorage<string[]>(
    'studymate_completed_sessions',
    []
  );

  // ---------------------------------------------------------------------------
  // Subject Form State
  // ---------------------------------------------------------------------------
  const [editingSubjectId, setEditingSubjectId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [rawTopics, setRawTopics] = useState('');
  const [examDate, setExamDate] = useState(defaultExamDate);
  const [dailyStudyHours, setDailyStudyHours] = useState<number>(3);
  const [sessionLengthMinutes, setSessionLengthMinutes] = useState<number>(45);
  const [priority, setPriority] = useState<PlannerPriority>('High');
  const [understandingLevel, setUnderstandingLevel] = useState<UnderstandingLevel>('Intermediate');
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isFormOpen, setIsFormOpen] = useState(false);

  // ---------------------------------------------------------------------------
  // Modal & Confirmation States
  // ---------------------------------------------------------------------------
  const [isRegenerateModalOpen, setIsRegenerateModalOpen] = useState(false);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [isDeletePlanModalOpen, setIsDeletePlanModalOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<{
    type: 'success' | 'info' | 'warning';
    text: string;
  } | null>(null);

  // Filter state for schedule view
  const [filterMode, setFilterMode] = useState<'all' | 'incomplete' | 'completed'>('all');
  const [selectedSubjectFilter, setSelectedSubjectFilter] = useState<string>('all');

  // ---------------------------------------------------------------------------
  // Pomodoro Interactive Station
  // ---------------------------------------------------------------------------
  const [pomodoroTime, setPomodoroTime] = useState(25 * 60);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [timerMode, setTimerMode] = useState<'focus' | 'break'>('focus');

  useEffect(() => {
    if (!isTimerRunning) return;
    const interval = setInterval(() => {
      setPomodoroTime((prev) => {
        if (prev <= 1) {
          setIsTimerRunning(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [isTimerRunning]);

  const toggleTimer = () => setIsTimerRunning(!isTimerRunning);
  const resetTimer = (mode: 'focus' | 'break' = 'focus') => {
    setIsTimerRunning(false);
    setTimerMode(mode);
    setPomodoroTime(mode === 'focus' ? 25 * 60 : 5 * 60);
  };
  const formatTimerDigits = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // ---------------------------------------------------------------------------
  // Subject Management Handlers
  // ---------------------------------------------------------------------------
  const handleOpenAddForm = () => {
    setEditingSubjectId(null);
    setName('');
    setRawTopics('');
    setExamDate(defaultExamDate);
    setDailyStudyHours(3);
    setSessionLengthMinutes(45);
    setPriority('High');
    setUnderstandingLevel('Intermediate');
    setFormErrors({});
    setIsFormOpen(true);
  };

  const handleEditSubject = (subject: PlannerSubjectInput) => {
    setEditingSubjectId(subject.id);
    setName(subject.name);
    setRawTopics(subject.rawTopics || subject.topics.join('\n'));
    setExamDate(subject.examDate);
    setDailyStudyHours(subject.dailyStudyHours);
    setSessionLengthMinutes(subject.sessionLengthMinutes);
    setPriority(subject.priority);
    setUnderstandingLevel(subject.understandingLevel);
    setFormErrors({});
    setIsFormOpen(true);
  };

  const handleDeleteSubject = (id: string) => {
    const updated = subjects.filter((s) => s.id !== id);
    setSubjects(updated);
    setFeedbackMessage({
      type: 'info',
      text: 'Subject removed. Click "Regenerate Plan" if you want to update your schedule.',
    });
  };

  const handleSaveSubject = (e: React.FormEvent) => {
    e.preventDefault();

    const subjectPayload: Partial<PlannerSubjectInput> = {
      name,
      rawTopics,
      examDate,
      dailyStudyHours: Number(dailyStudyHours),
      sessionLengthMinutes: Number(sessionLengthMinutes),
      priority,
      understandingLevel,
    };

    const errors = validateSubjectInput(subjectPayload, todayDate);
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    const parsedTopics = parseTopics(rawTopics);

    if (editingSubjectId) {
      // Update existing subject
      const updated = subjects.map((sub) =>
        sub.id === editingSubjectId
          ? {
              ...sub,
              name: name.trim(),
              topics: parsedTopics,
              rawTopics: rawTopics.trim(),
              examDate,
              dailyStudyHours: Number(dailyStudyHours),
              sessionLengthMinutes: Number(sessionLengthMinutes),
              priority,
              understandingLevel,
            }
          : sub
      );
      setSubjects(updated);
      setFeedbackMessage({
        type: 'success',
        text: `Updated subject "${name.trim()}". Regenerate your plan to reflect these changes.`,
      });
    } else {
      // Add new subject
      const newSubject: PlannerSubjectInput = {
        id: `subject-${Date.now()}`,
        name: name.trim(),
        topics: parsedTopics,
        rawTopics: rawTopics.trim(),
        examDate,
        dailyStudyHours: Number(dailyStudyHours),
        sessionLengthMinutes: Number(sessionLengthMinutes),
        priority,
        understandingLevel,
        accentColor: getSubjectAccentColor(subjects.length),
      };
      setSubjects([...subjects, newSubject]);
      setFeedbackMessage({
        type: 'success',
        text: `Added "${name.trim()}" (${parsedTopics.length} topics) to your course list.`,
      });
    }

    setIsFormOpen(false);
    setEditingSubjectId(null);
    setFormErrors({});
  };

  // ---------------------------------------------------------------------------
  // Plan Generation Handlers
  // ---------------------------------------------------------------------------
  const handleGenerateClick = () => {
    if (subjects.length === 0) {
      setFeedbackMessage({
        type: 'warning',
        text: 'Please add at least one subject with topics and target exam date before generating a schedule.',
      });
      return;
    }

    // Validate all existing subjects
    for (const sub of subjects) {
      const errors = validateSubjectInput(sub, todayDate);
      if (Object.keys(errors).length > 0) {
        setFeedbackMessage({
          type: 'warning',
          text: `Subject "${sub.name}" has invalid fields: ${Object.values(errors).join(', ')}. Please edit it first.`,
        });
        return;
      }
    }

    // If a plan already exists with completed tasks, prompt confirmation
    if (studyPlan && completedSessionIds.length > 0) {
      setIsRegenerateModalOpen(true);
      return;
    }

    executePlanGeneration();
  };

  const executePlanGeneration = () => {
    setIsGenerating(true);
    setIsRegenerateModalOpen(false);

    // Brief processing timeout for realistic feel and layout transition
    setTimeout(() => {
      try {
        const generated = generateStudyPlan(subjects, todayDate);
        setStudyPlan(generated);
        setCompletedSessionIds([]); // Reset completion state for the new plan
        setIsGenerating(false);
        setFeedbackMessage({
          type: 'success',
          text: `Study plan successfully generated! Distributed ${generated.totalSessions} sessions across ${generated.days.length} days.`,
        });
      } catch (err: unknown) {
        setIsGenerating(false);
        const errMsg = err instanceof Error ? err.message : 'Unknown generation error';
        setFeedbackMessage({
          type: 'warning',
          text: `Could not generate plan: ${errMsg}`,
        });
      }
    }, 300);
  };

  const handleResetToSamples = () => {
    setSubjects(SAMPLE_PLANNER_SUBJECTS);
    setStudyPlan(null);
    setCompletedSessionIds([]);
    setIsResetModalOpen(false);
    setFeedbackMessage({
      type: 'info',
      text: 'Reset to sample academic subjects. Click "Generate Study Plan" to build their schedule.',
    });
  };

  const handleDeletePlanConfirm = () => {
    setStudyPlan(null);
    setCompletedSessionIds([]);
    setIsDeletePlanModalOpen(false);
    setFeedbackMessage({
      type: 'info',
      text: 'Study plan deleted. Your subject definitions are preserved so you can generate a new schedule anytime.',
    });
  };

  // ---------------------------------------------------------------------------
  // Task Completion & Progress Calculation
  // ---------------------------------------------------------------------------
  const toggleSessionCompletion = (sessionId: string) => {
    setCompletedSessionIds((prev) => {
      const exists = prev.includes(sessionId);
      if (exists) {
        return prev.filter((id) => id !== sessionId);
      } else {
        return [...prev, sessionId];
      }
    });
  };

  // Progress metrics
  const progressMetrics = useMemo(() => {
    if (!studyPlan || studyPlan.days.length === 0) {
      return { total: 0, completed: 0, percent: 0, completedHours: 0, totalHours: 0 };
    }

    let total = 0;
    let completed = 0;
    let totalMins = 0;
    let completedMins = 0;

    studyPlan.days.forEach((day) => {
      day.sessions.forEach((s) => {
        total++;
        totalMins += s.durationMinutes;
        if (completedSessionIds.includes(s.id)) {
          completed++;
          completedMins += s.durationMinutes;
        }
      });
    });

    const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
    const completedHours = Math.round((completedMins / 60) * 10) / 10;
    const totalHours = Math.round((totalMins / 60) * 10) / 10;

    return { total, completed, percent, completedHours, totalHours };
  }, [studyPlan, completedSessionIds]);

  // Filtered days and sessions
  const filteredDays = useMemo(() => {
    if (!studyPlan) return [];

    return studyPlan.days
      .map((day) => {
        const filteredSessions = day.sessions.filter((s) => {
          // Subject filter
          if (selectedSubjectFilter !== 'all' && s.subjectId !== selectedSubjectFilter) {
            return false;
          }
          // Completion status filter
          const isDone = completedSessionIds.includes(s.id);
          if (filterMode === 'incomplete' && isDone) return false;
          if (filterMode === 'completed' && !isDone) return false;
          return true;
        });

        return {
          ...day,
          sessions: filteredSessions,
        };
      })
      .filter((day) => day.sessions.length > 0);
  }, [studyPlan, filterMode, selectedSubjectFilter, completedSessionIds]);

  // Helper for task type styling
  const getTaskTypeBadgeVariant = (
    type: PlannerTaskType
  ): 'violet' | 'navy' | 'emerald' | 'amber' | 'outline' => {
    switch (type) {
      case 'initial_study':
        return 'violet';
      case 'deep_dive':
        return 'navy';
      case 'spaced_revision':
        return 'outline';
      case 'practice_quiz':
        return 'emerald';
      case 'final_review':
        return 'amber';
    }
  };

  return (
    <div className="planner-root">
      <div className="container">
        {/* Top Header */}
        <div className="planner-top-header">
          <div>
            <Badge variant="violet" icon={<Sparkles size={13} />}>
              Deterministic Spaced Scheduler
            </Badge>
            <h1 className="page-heading">AI-Powered Study Planner</h1>
            <p className="page-sub">
              Build an achievable, spaced-repetition study schedule tailored to your subjects, exam deadlines, and daily availability.
            </p>
          </div>

          <div className="header-actions">
            <Button
              variant="outline"
              size="sm"
              icon={<RotateCcw size={14} />}
              onClick={() => setIsResetModalOpen(true)}
            >
              Reset to Sample
            </Button>
            <Button
              variant="accent"
              size="sm"
              icon={<Plus size={15} />}
              onClick={handleOpenAddForm}
            >
              Add Subject
            </Button>
          </div>
        </div>

        {/* Feedback Alert Banner */}
        {feedbackMessage && (
          <div
            className={`feedback-banner feedback-${feedbackMessage.type}`}
            role="status"
          >
            <div className="feedback-content">
              {feedbackMessage.type === 'success' && <CheckCircle2 size={18} />}
              {feedbackMessage.type === 'warning' && <AlertTriangle size={18} />}
              {feedbackMessage.type === 'info' && <Sparkles size={18} />}
              <span>{feedbackMessage.text}</span>
            </div>
            <button
              type="button"
              className="feedback-dismiss"
              onClick={() => setFeedbackMessage(null)}
              aria-label="Dismiss message"
            >
              <X size={14} />
            </button>
          </div>
        )}

        {/* ==================================================================
            SECTION 1: SUBJECTS MANAGEMENT & GENERATOR TRIGGER
           ================================================================== */}
        <section className="planner-section subjects-management-section">
          <div className="section-title-row">
            <div>
              <h2 className="section-title">1. Your Enrolled Subjects ({subjects.length})</h2>
              <p className="section-subtitle">
                Configure topics, exam deadlines, daily study budgets, and priorities before generating your schedule.
              </p>
            </div>
            <div className="section-actions">
              <Button
                variant="primary"
                size="md"
                icon={<RefreshCw size={15} />}
                isLoading={isGenerating}
                onClick={handleGenerateClick}
                disabled={subjects.length === 0}
              >
                {studyPlan ? 'Regenerate Study Plan' : 'Generate Study Plan'}
              </Button>
            </div>
          </div>

          {/* Subjects Grid */}
          {subjects.length > 0 ? (
            <div className="planner-subjects-cards-grid">
              {subjects.map((sub, index) => {
                const daysRemaining = getDaysUntilDate(sub.examDate, todayDate);
                const topicsCount = sub.rawTopics
                  ? parseTopics(sub.rawTopics).length
                  : sub.topics.length;
                const isUrgent = daysRemaining <= 7;

                return (
                  <Card key={sub.id} className="planner-subject-card">
                    <div className="planner-subject-card-header">
                      <div className="subject-pills">
                        <span
                          className="subject-number-badge"
                          style={{
                            backgroundColor: `${getSubjectAccentColor(index)}18`,
                            color: getSubjectAccentColor(index),
                          }}
                        >
                          Subject {index + 1}
                        </span>
                        <span className={`priority-badge priority-${sub.priority.toLowerCase()}`}>
                          {sub.priority} Priority
                        </span>
                      </div>

                      <div className="subject-actions-row">
                        <button
                          type="button"
                          className="sub-icon-btn"
                          onClick={() => handleEditSubject(sub)}
                          title="Edit Subject"
                          aria-label={`Edit ${sub.name}`}
                        >
                          <Edit3 size={15} />
                        </button>
                        <button
                          type="button"
                          className="sub-icon-btn delete-sub-btn"
                          onClick={() => handleDeleteSubject(sub.id)}
                          title="Remove Subject"
                          aria-label={`Remove ${sub.name}`}
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>

                    <h3 className="subject-title-name">{sub.name}</h3>

                    <div className="subject-details-box">
                      <div className="subject-detail-item">
                        <Calendar size={13} />
                        <span className="detail-label">Exam:</span>
                        <strong className="detail-val">{sub.examDate}</strong>
                        <span className={`countdown-tag ${isUrgent ? 'urgent' : ''}`}>
                          {daysRemaining < 0
                            ? 'Past deadline'
                            : daysRemaining === 0
                            ? 'Today!'
                            : `${daysRemaining}d left`}
                        </span>
                      </div>

                      <div className="subject-detail-item">
                        <Clock size={13} />
                        <span className="detail-label">Daily Budget:</span>
                        <span className="detail-val">
                          {sub.dailyStudyHours} hrs/day ({sub.sessionLengthMinutes}m sessions)
                        </span>
                      </div>

                      <div className="subject-detail-item">
                        <GraduationCap size={13} />
                        <span className="detail-label">Mastery:</span>
                        <span className="detail-val">{sub.understandingLevel}</span>
                      </div>
                    </div>

                    <div className="subject-topics-summary">
                      <div className="topics-header">
                        <BookOpen size={12} />
                        <span>{topicsCount} Topics Listed:</span>
                      </div>
                      <div className="topics-tags-wrap">
                        {(sub.rawTopics ? parseTopics(sub.rawTopics) : sub.topics)
                          .slice(0, 3)
                          .map((topic, tIdx) => (
                            <span key={tIdx} className="topic-pill-tag">
                              {topic}
                            </span>
                          ))}
                        {topicsCount > 3 && (
                          <span className="topic-pill-tag more-tag">+{topicsCount - 3} more</span>
                        )}
                      </div>
                    </div>
                  </Card>
                );
              })}

              {/* Add New Subject Card Button */}
              <button
                type="button"
                className="add-subject-dashed-card"
                onClick={handleOpenAddForm}
              >
                <div className="dashed-plus-icon">
                  <Plus size={24} />
                </div>
                <span className="dashed-title">Add Another Subject</span>
                <span className="dashed-sub">Define topics, target exam date, and study time</span>
              </button>
            </div>
          ) : (
            <EmptyState
              icon={<BookOpen size={32} />}
              title="No Subjects Enrolled Yet"
              description="Add at least one subject with topics and an exam date to generate an optimized study plan."
              actionLabel="Add First Subject"
              onAction={handleOpenAddForm}
              actionIcon={<Plus size={15} />}
            />
          )}
        </section>

        {/* ==================================================================
            FEASIBILITY REPORT BANNER (When a plan exists)
           ================================================================== */}
        {studyPlan && (
          <div
            className={`feasibility-card feasibility-${studyPlan.feasibility.status}`}
            role="region"
            aria-label="Study Plan Feasibility Assessment"
          >
            <div className="feasibility-header-row">
              <div className="feasibility-title-wrap">
                {studyPlan.feasibility.status === 'feasible' && (
                  <CheckCircle2 size={22} className="feasibility-icon text-emerald" />
                )}
                {studyPlan.feasibility.status === 'tight' && (
                  <AlertTriangle size={22} className="feasibility-icon text-amber" />
                )}
                {studyPlan.feasibility.status === 'unrealistic' && (
                  <AlertTriangle size={22} className="feasibility-icon text-rose" />
                )}
                <div>
                  <h3 className="feasibility-status-title">
                    {studyPlan.feasibility.status === 'feasible' && 'Feasibility Assessment: Realistic & Balanced'}
                    {studyPlan.feasibility.status === 'tight' && 'Feasibility Assessment: Tight Schedule Warning'}
                    {studyPlan.feasibility.status === 'unrealistic' && 'Feasibility Warning: Unrealistic Deadline!'}
                  </h3>
                  <p className="feasibility-message">{studyPlan.feasibility.message}</p>
                </div>
              </div>

              <div className="feasibility-metrics-pills">
                <div className="f-metric">
                  <span className="f-metric-label">Required Study</span>
                  <span className="f-metric-val">{studyPlan.feasibility.totalRequiredHours} hrs</span>
                </div>
                <div className="f-metric-divider">/</div>
                <div className="f-metric">
                  <span className="f-metric-label">Available Time</span>
                  <span className="f-metric-val">{studyPlan.feasibility.totalAvailableHours} hrs</span>
                </div>
              </div>
            </div>

            {studyPlan.feasibility.recommendations.length > 0 && (
              <div className="feasibility-recommendations">
                <span className="rec-heading">Strategic Recommendations:</span>
                <ul className="rec-list">
                  {studyPlan.feasibility.recommendations.map((rec, rIdx) => (
                    <li key={rIdx}>{rec}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* ==================================================================
            SECTION 2: SCHEDULE VIEW & SIDEBAR STATION
           ================================================================== */}
        <section className="planner-section schedule-section">
          <div className="planner-layout-grid">
            {/* Left Main Column: Schedule Cards */}
            <div className="schedule-main-col">
              {studyPlan ? (
                <>
                  {/* Progress & Controls Bar */}
                  <Card className="schedule-progress-bar-card">
                    <div className="progress-top-row">
                      <div className="progress-info">
                        <span className="progress-title">Overall Schedule Completion</span>
                        <div className="progress-sub">
                          {progressMetrics.completed} of {progressMetrics.total} tasks completed (
                          {progressMetrics.completedHours}h / {progressMetrics.totalHours}h)
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                        <div className="progress-percentage-pill">
                          {progressMetrics.percent}% Complete
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          icon={<Trash2 size={13} />}
                          onClick={() => setIsDeletePlanModalOpen(true)}
                          title="Delete current study plan"
                        >
                          Delete Plan
                        </Button>
                      </div>
                    </div>

                    <div className="progress-track" role="progressbar" aria-valuenow={progressMetrics.percent} aria-valuemin={0} aria-valuemax={100}>
                      <div
                        className="progress-fill"
                        style={{ width: `${progressMetrics.percent}%` }}
                      />
                    </div>

                    {/* Filter controls */}
                    <div className="schedule-filter-bar">
                      <div className="filter-group">
                        <Filter size={13} className="filter-icon" />
                        <span className="filter-label">Filter:</span>
                        <button
                          type="button"
                          className={`filter-btn ${filterMode === 'all' ? 'active' : ''}`}
                          onClick={() => setFilterMode('all')}
                        >
                          All ({progressMetrics.total})
                        </button>
                        <button
                          type="button"
                          className={`filter-btn ${filterMode === 'incomplete' ? 'active' : ''}`}
                          onClick={() => setFilterMode('incomplete')}
                        >
                          To Do ({progressMetrics.total - progressMetrics.completed})
                        </button>
                        <button
                          type="button"
                          className={`filter-btn ${filterMode === 'completed' ? 'active' : ''}`}
                          onClick={() => setFilterMode('completed')}
                        >
                          Done ({progressMetrics.completed})
                        </button>
                      </div>

                      {subjects.length > 1 && (
                        <div className="subject-filter-dropdown-wrap">
                          <Layers size={13} className="filter-icon" />
                          <select
                            className="subject-filter-select"
                            value={selectedSubjectFilter}
                            onChange={(e) => setSelectedSubjectFilter(e.target.value)}
                            aria-label="Filter schedule by subject"
                          >
                            <option value="all">All Subjects</option>
                            {subjects.map((sub) => (
                              <option key={sub.id} value={sub.id}>
                                {sub.name}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}
                    </div>
                  </Card>

                  {/* Daily Schedule Cards List */}
                  <div className="daily-schedule-list">
                    {filteredDays.length > 0 ? (
                      filteredDays.map((day) => {
                        const dayCompleted = day.sessions.every((s) =>
                          completedSessionIds.includes(s.id)
                        );

                        return (
                          <div key={day.dayNumber} className="day-schedule-card">
                            <div className="day-card-header">
                              <div className="day-card-left">
                                <span className="day-badge-pill">Day {day.dayNumber}</span>
                                <h3 className="day-card-date">{day.formattedDate}</h3>
                              </div>
                              <div className="day-card-right">
                                <span className="day-total-mins">
                                  <Clock size={13} /> {Math.round(day.totalMinutes / 60 * 10) / 10} hrs planned ({day.sessions.length} sessions)
                                </span>
                                {dayCompleted && (
                                  <Badge variant="emerald" icon={<CheckCircle2 size={12} />}>
                                    Day Finished
                                  </Badge>
                                )}
                              </div>
                            </div>

                            <div className="day-sessions-container">
                              {day.sessions.map((session) => {
                                const isDone = completedSessionIds.includes(session.id);
                                return (
                                  <div
                                    key={session.id}
                                    className={`session-row-item ${isDone ? 'session-completed' : ''}`}
                                  >
                                    <button
                                      type="button"
                                      className={`session-checkbox ${isDone ? 'checked' : ''}`}
                                      onClick={() => toggleSessionCompletion(session.id)}
                                      aria-label={`Mark "${session.topic}" as ${isDone ? 'incomplete' : 'completed'}`}
                                    >
                                      {isDone && <CheckCircle2 size={18} />}
                                    </button>

                                    <div className="session-main-body">
                                      <div className="session-top-meta">
                                        <span className="session-subject-tag">
                                          {session.subjectName}
                                        </span>
                                        <div className="session-type-tags">
                                          <Badge
                                            variant={getTaskTypeBadgeVariant(session.taskType)}
                                          >
                                            {session.taskTypeLabel}
                                          </Badge>
                                          <span className="session-duration-tag">
                                            <Clock size={11} /> {session.durationMinutes}m
                                          </span>
                                        </div>
                                      </div>

                                      <h4 className={`session-topic-title ${isDone ? 'struck' : ''}`}>
                                        {session.topic}
                                      </h4>

                                      {session.notes && (
                                        <p className="session-notes-text">
                                          <Sparkles size={12} className="notes-icon" />
                                          {session.notes}
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <EmptyState
                        icon={<Filter size={24} />}
                        title="No Tasks Match Current Filter"
                        description="Try switching the filter to 'All' or selecting another subject."
                        actionLabel="Show All Tasks"
                        onAction={() => {
                          setFilterMode('all');
                          setSelectedSubjectFilter('all');
                        }}
                      />
                    )}
                  </div>
                </>
              ) : (
                /* Empty State before Plan Generation */
                <Card className="no-plan-card">
                  <EmptyState
                    icon={<Calendar size={40} />}
                    title="No Study Plan Generated Yet"
                    description="Configure your subjects above with topics, target dates, and available daily hours. Click 'Generate Study Plan' to create your daily timetable with spaced revisions."
                    actionLabel="Generate Schedule Now"
                    onAction={handleGenerateClick}
                    actionIcon={<RefreshCw size={15} />}
                  />
                </Card>
              )}
            </div>

            {/* Right Column: Pomodoro Focus Station & Exam Tips */}
            <div className="planner-sidebar-col">
              {/* Pomodoro Focus Station */}
              <Card variant="navy" className="pomodoro-station">
                <div className="pomodoro-header">
                  <span className="pomodoro-label">
                    {timerMode === 'focus' ? 'Deep Focus Session' : 'Active Recovery Break'}
                  </span>
                  <Badge variant={timerMode === 'focus' ? 'violet' : 'emerald'}>
                    {timerMode === 'focus' ? '25m Focus' : '5m Rest'}
                  </Badge>
                </div>

                <div className="pomodoro-digits">{formatTimerDigits(pomodoroTime)}</div>

                <div className="pomodoro-controls">
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={toggleTimer}
                    icon={isTimerRunning ? <Pause size={15} /> : <Play size={15} />}
                  >
                    {isTimerRunning ? 'Pause' : 'Start Focus'}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => resetTimer(timerMode === 'focus' ? 'break' : 'focus')}
                  >
                    {timerMode === 'focus' ? '5m Break' : '25m Focus'}
                  </Button>
                  <button
                    type="button"
                    className="btn-icon-only"
                    onClick={() => resetTimer(timerMode)}
                    title="Reset Timer"
                    aria-label="Reset Timer"
                  >
                    <RotateCcw size={16} />
                  </button>
                </div>
              </Card>

              {/* Cognitive Science Study Tips */}
              <Card className="exams-card">
                <h3 className="exams-title">Evidence-Based Study Strategy</h3>
                <ul className="planner-tips-list">
                  <li className="planner-tip-item">
                    <span className="tip-bullet">1</span>
                    <div>
                      <strong>Cognitive Interleaving:</strong> Rotating between two distinct subjects every 90 minutes boosts retention by 34% compared to massed block practice.
                    </div>
                  </li>
                  <li className="planner-tip-item">
                    <span className="tip-bullet">2</span>
                    <div>
                      <strong>Spaced Intervals:</strong> The scheduler automatically places revision sessions 2–4 days after initial study to combat Ebbinghaus retention decay.
                    </div>
                  </li>
                  <li className="planner-tip-item">
                    <span className="tip-bullet">3</span>
                    <div>
                      <strong>Practice Quizzing:</strong> Complete practice sets before the final review day to convert passive recognition into robust synaptic retrieval.
                    </div>
                  </li>
                </ul>
              </Card>

              {/* Quick Summary of Active Courses */}
              {subjects.length > 0 && (
                <Card className="courses-quick-summary-card">
                  <div className="quick-summary-header">
                    <Sliders size={14} />
                    <span>Enrolled Course Load ({subjects.length})</span>
                  </div>
                  <div className="quick-summary-list">
                    {subjects.map((s) => {
                      const days = getDaysUntilDate(s.examDate, todayDate);
                      return (
                        <div key={s.id} className="quick-summary-item">
                          <span className="q-name">{s.name}</span>
                          <span className={`q-days ${days <= 7 ? 'urgent' : ''}`}>
                            {days < 0 ? 'Past' : `${days}d`}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </Card>
              )}
            </div>
          </div>
        </section>
      </div>

      {/* ==================================================================
          MODAL: ADD / EDIT SUBJECT FORM
         ================================================================== */}
      <Modal
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setEditingSubjectId(null);
          setFormErrors({});
        }}
        title={editingSubjectId ? 'Edit Subject Details' : 'Add Subject to Study Plan'}
        subtitle="Specify topics, target date, and daily study capacity to calibrate your schedule."
        maxWidth="620px"
        footer={
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setIsFormOpen(false);
                setEditingSubjectId(null);
                setFormErrors({});
              }}
            >
              Cancel
            </Button>
            <Button variant="accent" size="sm" onClick={handleSaveSubject}>
              {editingSubjectId ? 'Save Changes' : 'Add Subject'}
            </Button>
          </>
        }
      >
        <form onSubmit={handleSaveSubject} className="add-subject-modal-form">
          {/* Subject Name */}
          <div className="form-group">
            <label className="form-label" htmlFor="sub-name-input">
              Subject Name *
            </label>
            <input
              id="sub-name-input"
              type="text"
              className={`form-input ${formErrors.name ? 'input-error' : ''}`}
              placeholder="e.g. CS 234: Reinforcement & Machine Learning"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (formErrors.name) setFormErrors({ ...formErrors, name: '' });
              }}
              required
            />
            {formErrors.name && (
              <span className="form-error-text">
                <AlertTriangle size={12} /> {formErrors.name}
              </span>
            )}
          </div>

          {/* Topics or Chapters */}
          <div className="form-group">
            <label className="form-label" htmlFor="sub-topics-input">
              Topics or Chapters to Study *
            </label>
            <textarea
              id="sub-topics-input"
              rows={4}
              className={`form-input form-textarea ${formErrors.topics ? 'input-error' : ''}`}
              placeholder="Enter topics separated by commas or new lines, e.g.:&#10;Bellman Optimality Equations&#10;Value & Policy Iteration&#10;Q-Learning & Deep Q Networks"
              value={rawTopics}
              onChange={(e) => {
                setRawTopics(e.target.value);
                if (formErrors.topics) setFormErrors({ ...formErrors, topics: '' });
              }}
              required
            />
            <span className="form-help-hint">
              Enter one topic per line or separate by commas. Each topic will receive dedicated study and revision blocks.
            </span>
            {formErrors.topics && (
              <span className="form-error-text">
                <AlertTriangle size={12} /> {formErrors.topics}
              </span>
            )}
          </div>

          {/* Exam Date & Daily Time */}
          <div className="form-row-2">
            <div className="form-group">
              <label className="form-label" htmlFor="sub-date-input">
                Exam Date / Target Completion *
              </label>
              <input
                id="sub-date-input"
                type="date"
                min={todayISO}
                className={`form-input ${formErrors.examDate ? 'input-error' : ''}`}
                value={examDate}
                onChange={(e) => {
                  setExamDate(e.target.value);
                  if (formErrors.examDate) setFormErrors({ ...formErrors, examDate: '' });
                }}
                required
              />
              {formErrors.examDate && (
                <span className="form-error-text">
                  <AlertTriangle size={12} /> {formErrors.examDate}
                </span>
              )}
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="sub-hours-input">
                Available Daily Study Time (Hours) *
              </label>
              <input
                id="sub-hours-input"
                type="number"
                min="0.5"
                max="16"
                step="0.5"
                className={`form-input ${formErrors.dailyStudyHours ? 'input-error' : ''}`}
                value={dailyStudyHours}
                onChange={(e) => {
                  setDailyStudyHours(parseFloat(e.target.value) || 0);
                  if (formErrors.dailyStudyHours)
                    setFormErrors({ ...formErrors, dailyStudyHours: '' });
                }}
                required
              />
              {formErrors.dailyStudyHours && (
                <span className="form-error-text">
                  <AlertTriangle size={12} /> {formErrors.dailyStudyHours}
                </span>
              )}
            </div>
          </div>

          {/* Session Length & Priority & Understanding */}
          <div className="form-row-3">
            <div className="form-group">
              <label className="form-label" htmlFor="sub-session-input">
                Preferred Session Length
              </label>
              <select
                id="sub-session-input"
                className="form-input"
                value={sessionLengthMinutes}
                onChange={(e) => setSessionLengthMinutes(Number(e.target.value))}
              >
                <option value={25}>25 min (Pomodoro)</option>
                <option value={45}>45 min (Standard)</option>
                <option value={60}>60 min (In-Depth)</option>
                <option value={90}>90 min (Deep Work)</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="sub-priority-input">
                Priority Level
              </label>
              <select
                id="sub-priority-input"
                className="form-input"
                value={priority}
                onChange={(e) => setPriority(e.target.value as PlannerPriority)}
              >
                <option value="High">High</option>
                <option value="Medium">Medium</option>
                <option value="Low">Low</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="sub-level-input">
                Current Understanding
              </label>
              <select
                id="sub-level-input"
                className="form-input"
                value={understandingLevel}
                onChange={(e) => setUnderstandingLevel(e.target.value as UnderstandingLevel)}
              >
                <option value="Beginner">Beginner (1.6x depth)</option>
                <option value="Intermediate">Intermediate (1.2x)</option>
                <option value="Advanced">Advanced (1.0x)</option>
              </select>
            </div>
          </div>
        </form>
      </Modal>

      {/* ==================================================================
          MODAL: REGENERATE CONFIRMATION
         ================================================================== */}
      <Modal
        isOpen={isRegenerateModalOpen}
        onClose={() => setIsRegenerateModalOpen(false)}
        title="Regenerate Study Schedule?"
        subtitle="This action will recalculate daily sessions based on your latest subject inputs."
        footer={
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsRegenerateModalOpen(false)}
            >
              Keep Current Plan
            </Button>
            <Button
              variant="accent"
              size="sm"
              icon={<RefreshCw size={14} />}
              onClick={executePlanGeneration}
            >
              Confirm & Regenerate
            </Button>
          </>
        }
      >
        <div className="confirmation-modal-content">
          <p>
            You currently have active study tasks in progress. Generating a new plan will replace the existing schedule and reset your task completion checkboxes.
          </p>
          <div className="confirmation-warning-box">
            <AlertTriangle size={18} className="text-amber" />
            <span>
              Your subject definitions will be preserved, but previous completed checkmarks will be refreshed.
            </span>
          </div>
        </div>
      </Modal>

      {/* ==================================================================
          MODAL: RESET SAMPLES CONFIRMATION
         ================================================================== */}
      <Modal
        isOpen={isResetModalOpen}
        onClose={() => setIsResetModalOpen(false)}
        title="Reset to Sample Subjects?"
        subtitle="Replace current subjects with university example courses."
        footer={
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsResetModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleResetToSamples}
            >
              Reset to Sample
            </Button>
          </>
        }
      >
        <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>
          This will restore the 3 default courses (Machine Learning, Distributed Systems, Linear Algebra) with realistic exam deadlines and topics. Any customized subjects will be replaced.
        </p>
      </Modal>

      {/* ==================================================================
          MODAL: DELETE PLAN CONFIRMATION
         ================================================================== */}
      <Modal
        isOpen={isDeletePlanModalOpen}
        onClose={() => setIsDeletePlanModalOpen(false)}
        title="Delete Active Study Plan?"
        subtitle="Remove the generated schedule and reset task completion checkmarks."
        footer={
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsDeletePlanModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="accent"
              size="sm"
              onClick={handleDeletePlanConfirm}
            >
              Delete Schedule
            </Button>
          </>
        }
      >
        <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>
          Are you sure you want to delete this study schedule? Your configured subjects and exam dates will be preserved so you can generate a new schedule anytime.
        </p>
      </Modal>
    </div>
  );
};
