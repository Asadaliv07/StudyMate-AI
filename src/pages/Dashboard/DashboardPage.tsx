import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Calendar,
  Clock,
  BookCheck,
  Plus,
  ArrowRight,
  Sparkles,
  FileText,
  CheckCircle,
  HelpCircle,
  CheckCircle2,
  Trash2,
  ShieldCheck,
  AlertTriangle,
  User,
} from 'lucide-react';
import { StatCard } from '../../components/common/StatCard';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { SectionHeader } from '../../components/common/SectionHeader';
import { Modal } from '../../components/common/Modal';
import { EmptyState } from '../../components/common/EmptyState';
import { ProfileModal } from '../../components/common/ProfileModal';
import {
  getAggregatedStatistics,
  getActiveStudyTasks,
  getSavedNotes,
  getQuizHistory,
  toggleSessionCompleted,
  clearAllUserData,
  hasAnyUserData,
  getUserProfile,
} from '../../services/storageService';
import { formatDuration, formatDate, getPriorityBadgeColor } from '../../utils/formatters';
import type {
  StudyTask,
  StructuredSummary,
  CompletedQuizResult,
  UserAggregatedStats,
  StudentProfile,
} from '../../types';
import './DashboardPage.css';

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();

  // ---------------------------------------------------------------------------
  // Central Persistent Data State (Real data only, zero hardcoded numbers)
  // ---------------------------------------------------------------------------
  const [profile, setProfile] = useState<StudentProfile>(getUserProfile);
  const [stats, setStats] = useState<UserAggregatedStats>(getAggregatedStatistics);
  const [tasks, setTasks] = useState<StudyTask[]>(getActiveStudyTasks);
  const [notes, setNotes] = useState<StructuredSummary[]>(getSavedNotes);
  const [quizHistory, setQuizHistory] = useState<CompletedQuizResult[]>(getQuizHistory);
  const [hasData, setHasData] = useState<boolean>(hasAnyUserData);

  // Filter state for tasks
  const [taskFilter, setTaskFilter] = useState<'all' | 'in_progress' | 'completed' | 'urgent'>('all');

  // Modals
  const [isClearModalOpen, setIsClearModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  // Sync state with storage changes across tabs & in-page updates
  const refreshAllData = useCallback(() => {
    setProfile(getUserProfile());
    setStats(getAggregatedStatistics());
    setTasks(getActiveStudyTasks());
    setNotes(getSavedNotes());
    setQuizHistory(getQuizHistory());
    setHasData(hasAnyUserData());
  }, []);

  useEffect(() => {
    const handleStorageUpdate = () => {
      refreshAllData();
    };

    window.addEventListener('studymate_data_changed', handleStorageUpdate);
    window.addEventListener('storage', handleStorageUpdate);

    return () => {
      window.removeEventListener('studymate_data_changed', handleStorageUpdate);
      window.removeEventListener('storage', handleStorageUpdate);
    };
  }, [refreshAllData]);

  // Handle task checkmark toggle
  const handleToggleTask = (taskId: string) => {
    toggleSessionCompleted(taskId);
    refreshAllData();
  };

  // Handle clear all data
  const handleConfirmClearData = () => {
    clearAllUserData();
    setIsClearModalOpen(false);
    refreshAllData();
  };

  const filteredTasks = tasks.filter((t) => {
    if (taskFilter === 'all') return true;
    if (taskFilter === 'in_progress') return t.status === 'in_progress' || t.status === 'todo';
    if (taskFilter === 'completed') return t.status === 'completed';
    if (taskFilter === 'urgent') return t.priority === 'urgent' || t.priority === 'high';
    return true;
  });

  return (
    <div className="dashboard-root">
      <div className="container">
        {/* Top Academic Welcome Banner */}
        <div className="dashboard-header-card">
          <div className="dashboard-welcome">
            <div className="welcome-tag">
              <Badge variant="violet" icon={<Sparkles size={13} />}>
                {profile.institution || 'Local Academic Workspace'} • Browser Persistent
              </Badge>
            </div>
            <h1 className="welcome-name">
              Welcome back, {profile.name || 'Scholar'} 🎓
            </h1>
            <p className="welcome-sub">
              {profile.major ? `${profile.major} • ` : ''}Real-time progress aggregated directly from your active study plan, notes library, and quiz evaluations.
            </p>
            {profile.academicGoal && (
              <div style={{ marginTop: '0.5rem', display: 'inline-flex', alignItems: 'center', gap: '0.4rem', background: '#FFF9E6', border: '1.5px dashed #1E2022', borderRadius: '10px', padding: '0.25rem 0.65rem', fontSize: '0.88rem', fontFamily: 'var(--font-doodle)', color: '#1E2022' }}>
                <span>🎯 Goal: {profile.academicGoal}</span>
              </div>
            )}
          </div>

          <div className="dashboard-quick-actions">
            <Button
              variant="outline"
              size="sm"
              icon={<User size={15} />}
              onClick={() => setIsProfileModalOpen(true)}
            >
              Edit Profile
            </Button>
            <Link to="/planner">
              <Button variant="accent" size="sm" icon={<Plus size={15} />}>
                {stats.activePlansCount > 0 ? 'Manage Plan' : 'Create Study Plan'}
              </Button>
            </Link>
            <Link to="/summarizer">
              <Button variant="outline" size="sm" icon={<FileText size={15} />}>
                Summarize Notes
              </Button>
            </Link>
            <Link to="/quiz">
              <Button variant="outline" size="sm" icon={<HelpCircle size={15} />}>
                Practice Quiz
              </Button>
            </Link>
          </div>
        </div>

        {/* Key Academic Metrics (Calculated strictly from real persistent data) */}
        <div className="dashboard-stats-grid">
          <StatCard
            title="Active Study Plans"
            value={stats.activePlansCount}
            change={
              stats.activePlansCount > 0
                ? `${stats.totalTasksCount} study sessions scheduled`
                : 'No plan created yet'
            }
            changeType={stats.activePlansCount > 0 ? 'positive' : 'neutral'}
            icon={<Calendar size={22} />}
            iconBg="var(--color-violet-50)"
          />
          <StatCard
            title="Tasks Completed"
            value={`${stats.completedTasksCount} / ${stats.totalTasksCount}`}
            change={
              stats.totalTasksCount > 0
                ? `${stats.taskCompletionPercentage}% completed (${stats.remainingTasksCount} remaining)`
                : 'Create a plan to start'
            }
            changeType={stats.taskCompletionPercentage >= 50 ? 'positive' : 'neutral'}
            icon={<CheckCircle size={22} />}
            iconBg="var(--color-emerald-50)"
          />
          <StatCard
            title="Quiz Mastery"
            value={stats.averageQuizScore !== null ? `${stats.averageQuizScore}% Avg` : '0%'}
            change={
              stats.quizAttemptsCount > 0
                ? `${stats.quizAttemptsCount} ${stats.quizAttemptsCount === 1 ? 'attempt' : 'attempts'} • Best: ${stats.highestQuizScore ?? 0}%`
                : 'No quizzes taken yet'
            }
            changeType={(stats.averageQuizScore ?? 0) >= 70 ? 'positive' : 'neutral'}
            icon={<BookCheck size={22} />}
            iconBg="var(--color-amber-50)"
          />
          <StatCard
            title="Saved Notes"
            value={stats.totalNotesCount}
            change={
              stats.totalNotesCount > 0
                ? `${stats.totalNotesCount} condensations stored`
                : 'No notes saved yet'
            }
            changeType={stats.totalNotesCount > 0 ? 'positive' : 'neutral'}
            icon={<FileText size={22} />}
            iconBg="var(--color-sky-50)"
          />
        </div>

        {/* Main Dashboard Workspace Grid */}
        <div className="dashboard-main-grid">
          {/* Left Column: Today's Tasks & Overview */}
          <div className="dashboard-tasks-col">
            <div className="tasks-header-wrapper">
              <SectionHeader
                title="Active Study Tasks"
                subtitle={
                  stats.activePlansCount > 0
                    ? `Live sessions from your active timetable (${stats.completedTasksCount} of ${stats.totalTasksCount} completed)`
                    : 'Personalized study schedule generated by Study Planner'
                }
                action={
                  tasks.length > 0 ? (
                    <div className="task-filter-pills">
                      <button
                        type="button"
                        className={`filter-pill ${taskFilter === 'all' ? 'active' : ''}`}
                        onClick={() => setTaskFilter('all')}
                      >
                        All ({tasks.length})
                      </button>
                      <button
                        type="button"
                        className={`filter-pill ${taskFilter === 'in_progress' ? 'active' : ''}`}
                        onClick={() => setTaskFilter('in_progress')}
                      >
                        Pending ({tasks.filter((t) => t.status !== 'completed').length})
                      </button>
                      <button
                        type="button"
                        className={`filter-pill ${taskFilter === 'urgent' ? 'active' : ''}`}
                        onClick={() => setTaskFilter('urgent')}
                      >
                        High Priority
                      </button>
                      <button
                        type="button"
                        className={`filter-pill ${taskFilter === 'completed' ? 'active' : ''}`}
                        onClick={() => setTaskFilter('completed')}
                      >
                        Completed ({tasks.filter((t) => t.status === 'completed').length})
                      </button>
                    </div>
                  ) : undefined
                }
              />
            </div>

            <div className="tasks-list">
              {tasks.length === 0 ? (
                <EmptyState
                  icon={<Calendar size={32} />}
                  title="No Active Study Plan"
                  description="You have not created a study plan yet. Configure your subjects, daily study hours, and exam dates to generate a realistic schedule."
                  actionLabel="Go to Study Planner"
                  onAction={() => navigate('/planner')}
                  actionIcon={<Plus size={14} />}
                />
              ) : filteredTasks.length > 0 ? (
                filteredTasks.map((task) => {
                  const isDone = task.status === 'completed';
                  return (
                    <Card key={task.id} className={`task-card ${isDone ? 'task-done' : ''}`}>
                      <div className="task-row">
                        <button
                          type="button"
                          className={`task-checkbox ${isDone ? 'checked' : ''}`}
                          onClick={() => handleToggleTask(task.id)}
                          aria-label={`Mark ${task.title} as ${isDone ? 'incomplete' : 'complete'}`}
                        >
                          {isDone && <CheckCircle size={18} />}
                        </button>

                        <div className="task-details">
                          <div className="task-top-meta">
                            <span className="task-subject">{task.subject}</span>
                            <span className={`badge ${getPriorityBadgeColor(task.priority)}`}>
                              {task.priority.toUpperCase()}
                            </span>
                          </div>
                          <h4 className={`task-title ${isDone ? 'line-through' : ''}`}>{task.title}</h4>
                          <div className="task-bottom-meta">
                            <span className="meta-item">
                              <Clock size={13} /> {formatDuration(task.estimatedMinutes)}
                            </span>
                            {task.dueDate && (
                              <span className="meta-item">
                                <Calendar size={13} /> Due {formatDate(task.dueDate)}
                              </span>
                            )}
                          </div>

                          {task.aiSuggestedBreak && !isDone && (
                            <div className="task-ai-advice">
                              <Sparkles size={13} className="text-violet" />
                              <span>{task.aiSuggestedBreak}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </Card>
                  );
                })
              ) : (
                <EmptyState
                  icon={<CheckCircle2 size={28} />}
                  title="No Tasks in this Filter"
                  description="All clear for this view! Toggle your filter tabs to view more study sessions."
                />
              )}
            </div>
          </div>

          {/* Right Column: Upcoming Exams & Feeds */}
          <div className="dashboard-side-col">
            {/* Upcoming Deadlines Card */}
            <Card className="side-feed-card">
              <div className="side-feed-header">
                <div>
                  <h3 className="side-feed-title">Upcoming Study Deadlines</h3>
                  <span className="side-feed-sub">Course milestones from active plan</span>
                </div>
                <Link to="/planner" className="side-feed-link">
                  Planner <ArrowRight size={13} />
                </Link>
              </div>

              {stats.upcomingDeadlines.length > 0 ? (
                <div className="dash-exams-list">
                  {stats.upcomingDeadlines.map((exam, idx) => (
                    <div key={idx} className="dash-exam-row">
                      <div
                        className={`exam-countdown-pill ${
                          exam.daysRemaining <= 7 ? 'bg-amber' : 'bg-violet'
                        }`}
                      >
                        {exam.daysRemaining === 0
                          ? 'Today'
                          : exam.daysRemaining < 0
                          ? 'Overdue'
                          : `${exam.daysRemaining}d left`}
                      </div>
                      <div className="dash-exam-info">
                        <span className="dash-exam-name">{exam.subject}</span>
                        <span className="dash-exam-meta">
                          Target: {formatDate(exam.examDate)} • Priority: {exam.priority}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="dash-feed-empty">
                  <p>No upcoming target deadlines recorded. Add subjects with target dates in the Study Planner.</p>
                </div>
              )}
            </Card>

            {/* Recent Note Summaries Card */}
            <Card className="side-feed-card">
              <div className="side-feed-header">
                <div>
                  <h3 className="side-feed-title">Saved Notes & Summaries</h3>
                  <span className="side-feed-sub">Active lecture condensations ({notes.length})</span>
                </div>
                <Link to="/summarizer" className="side-feed-link">
                  Summarizer <ArrowRight size={13} />
                </Link>
              </div>

              {notes.length > 0 ? (
                <div className="summaries-mini-list">
                  {notes.slice(0, 3).map((item) => (
                    <div key={item.id} className="mini-summary-item">
                      <div className="mini-sum-top">
                        <span className="mini-sum-subject">{item.subject || 'General Notes'}</span>
                        <span className="badge badge-emerald">
                          -{Math.round((1 - item.summaryWordCount / (item.wordCount || 1)) * 100)}% words
                        </span>
                      </div>
                      <Link to="/summarizer" className="mini-sum-title">
                        {item.title}
                      </Link>
                      <p className="mini-sum-excerpt">
                        {item.takeaways && item.takeaways.length > 0
                          ? item.takeaways[0]
                          : item.overview || item.rawNotes.slice(0, 100) + '...'}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="dash-feed-empty">
                  <p>No notes or summaries saved yet. Paste lecture notes in the Summarizer to save organized study guides.</p>
                </div>
              )}
            </Card>

            {/* Practice Quizzes Card */}
            <Card className="side-feed-card">
              <div className="side-feed-header">
                <div>
                  <h3 className="side-feed-title">Recent Quiz Results</h3>
                  <span className="side-feed-sub">Completed practice recall sessions ({quizHistory.length})</span>
                </div>
                <Link to="/quiz" className="side-feed-link">
                  Quiz Bank <ArrowRight size={13} />
                </Link>
              </div>

              {quizHistory.length > 0 ? (
                <div className="quizzes-mini-list">
                  {quizHistory.slice(0, 3).map((item) => (
                    <div key={item.id} className="mini-quiz-item">
                      <div className="mini-quiz-info">
                        <div className="mini-quiz-title">{item.title}</div>
                        <div className="mini-quiz-meta">
                          {item.totalQuestions} Questions • {item.difficulty} • {item.date}
                        </div>
                      </div>
                      <div className="mini-quiz-score-badge">
                        <span className="mini-score-val">{item.score}/{item.totalQuestions}</span>
                        <Badge
                          variant={
                            item.percentage >= 80
                              ? 'emerald'
                              : item.percentage >= 60
                              ? 'violet'
                              : 'amber'
                          }
                        >
                          {item.percentage}%
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="dash-feed-empty">
                  <p>No practice quizzes completed yet. Test your retention in the Quiz Generator to track mastery scores.</p>
                </div>
              )}
            </Card>
          </div>
        </div>

        {/* Local Storage Privacy & Data Management Footer Card */}
        <div className="dashboard-privacy-card">
          <div className="privacy-card-left">
            <div className="privacy-icon-circle">
              <ShieldCheck size={20} className="text-emerald" />
            </div>
            <div>
              <h4 className="privacy-card-title">Local Browser Storage &amp; Privacy Notice</h4>
              <p className="privacy-card-desc">
                StudyMate AI persists your study timetable, task completion marks, notes, and quiz history locally in this browser.
                No personal data, academic records, or AI provider credentials are ever stored in remote databases.
                Local storage does not synchronize across separate devices or incognito windows.
              </p>
            </div>
          </div>

          <div className="privacy-card-actions">
            {hasData && (
              <Button
                variant="outline"
                size="sm"
                icon={<Trash2 size={14} />}
                onClick={() => setIsClearModalOpen(true)}
              >
                Clear All Saved Data
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Modal: Clear All Data Confirmation */}
      <Modal
        isOpen={isClearModalOpen}
        onClose={() => setIsClearModalOpen(false)}
        title="Clear All Saved Project Data?"
        subtitle="This action will delete all local records from this browser."
        footer={
          <>
            <Button variant="outline" size="sm" onClick={() => setIsClearModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="accent" size="sm" icon={<Trash2 size={14} />} onClick={handleConfirmClearData}>
              Permanently Clear All
            </Button>
          </>
        }
      >
        <div className="clear-modal-content">
          <div className="clear-modal-warning">
            <AlertTriangle size={24} className="text-rose" />
            <div>
              <p className="clear-warning-text">
                Are you sure you want to delete all saved data? This will immediately remove:
              </p>
              <ul className="clear-warning-list">
                <li>Active study plan schedule and subject configurations</li>
                <li>All daily task completion checkmarks</li>
                <li>All saved lecture notes and generated AI summaries</li>
                <li>All quiz evaluation results and mastery statistics</li>
              </ul>
              <p className="clear-warning-sub">
                Your Dashboard and Progress metrics will reset to zero. This cannot be undone.
              </p>
            </div>
          </div>
        </div>
      </Modal>

      {/* Modal: Edit Student Profile & Preferences */}
      <ProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        onProfileUpdated={(updated) => setProfile(updated)}
      />
    </div>
  );
};
