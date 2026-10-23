import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  TrendingUp,
  Award,
  Sparkles,
  BookOpen,
  Clock,
  CheckCircle,
  HelpCircle,
  Layers,
  Trash2,
  ShieldCheck,
  AlertTriangle,
  ArrowRight,
  Plus,
} from 'lucide-react';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { StatCard } from '../../components/common/StatCard';
import { SectionHeader } from '../../components/common/SectionHeader';
import { Modal } from '../../components/common/Modal';
import { Button } from '../../components/common/Button';
import {
  getAggregatedStatistics,
  getActiveStudyTasks,
  getQuizHistory,
  clearAllUserData,
  hasAnyUserData,
  getUserProfile,
} from '../../services/storageService';
import { formatDuration, formatDate } from '../../utils/formatters';
import type {
  UserAggregatedStats,
  StudyTask,
  CompletedQuizResult,
  StudentProfile,
} from '../../types';
import './ProgressPage.css';

export const ProgressPage: React.FC = () => {
  // ---------------------------------------------------------------------------
  // Central Persistent Data State (Real data only, zero hardcoded numbers)
  // ---------------------------------------------------------------------------
  const [profile, setProfile] = useState<StudentProfile>(getUserProfile);
  const [stats, setStats] = useState<UserAggregatedStats>(getAggregatedStatistics);
  const [tasks, setTasks] = useState<StudyTask[]>(getActiveStudyTasks);
  const [quizHistory, setQuizHistory] = useState<CompletedQuizResult[]>(getQuizHistory);
  const [hasData, setHasData] = useState<boolean>(hasAnyUserData);

  // Clear data confirmation modal
  const [isClearModalOpen, setIsClearModalOpen] = useState(false);

  // Sync state with storage changes across tabs & in-page updates
  const refreshAllData = useCallback(() => {
    setProfile(getUserProfile());
    setStats(getAggregatedStatistics());
    setTasks(getActiveStudyTasks());
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

  // Handle clear all data
  const handleConfirmClearData = () => {
    clearAllUserData();
    setIsClearModalOpen(false);
    refreshAllData();
  };

  // Completed study tasks
  const completedTasks = tasks.filter((t) => t.status === 'completed');

  return (
    <div className="progress-root">
      <div className="container">
        {/* Header */}
        <div className="progress-top-header">
          <div>
            <Badge variant="violet" icon={<Sparkles size={13} />}>
              Evidence-Based Learning Analytics
            </Badge>
            <h1 className="page-heading">Progress &amp; Mastery Tracking</h1>
            <p className="page-sub">
              Empirical metrics calculated for {profile.name} ({profile.major || 'Active Student'}) from your real study plan tasks, active recall quizzes, and lecture notes.
            </p>
          </div>
        </div>

        {/* Top Analytics KPI Cards (Calculated strictly from real persistent data) */}
        <div className="progress-kpi-grid">
          <StatCard
            title="Study Tasks Completed"
            value={`${stats.completedTasksCount} / ${stats.totalTasksCount}`}
            change={
              stats.totalTasksCount > 0
                ? `${stats.taskCompletionPercentage}% plan completion rate`
                : 'No plan created yet'
            }
            changeType={stats.taskCompletionPercentage >= 50 ? 'positive' : 'neutral'}
            icon={<CheckCircle size={22} />}
            iconBg="var(--color-emerald-50)"
          />
          <StatCard
            title="Quiz Average Score"
            value={stats.averageQuizScore !== null ? `${stats.averageQuizScore}%` : 'N/A'}
            change={
              stats.quizAttemptsCount > 0
                ? `Across ${stats.quizAttemptsCount} ${stats.quizAttemptsCount === 1 ? 'attempt' : 'attempts'}`
                : 'No quizzes taken yet'
            }
            changeType={(stats.averageQuizScore ?? 0) >= 70 ? 'positive' : 'neutral'}
            icon={<Award size={22} />}
            iconBg="var(--color-violet-50)"
          />
          <StatCard
            title="Highest Quiz Score"
            value={stats.highestQuizScore !== null ? `${stats.highestQuizScore}%` : 'N/A'}
            change={
              stats.quizAttemptsCount > 0
                ? 'Best active retrieval score'
                : 'Practice quizzes to test recall'
            }
            changeType={(stats.highestQuizScore ?? 0) >= 80 ? 'positive' : 'neutral'}
            icon={<TrendingUp size={22} />}
            iconBg="var(--color-amber-50)"
          />
          <StatCard
            title="Saved Notes & Guides"
            value={stats.totalNotesCount}
            change={
              stats.totalNotesCount > 0
                ? `${stats.totalNotesCount} condensations saved`
                : 'No notes saved yet'
            }
            changeType={stats.totalNotesCount > 0 ? 'positive' : 'neutral'}
            icon={<BookOpen size={22} />}
            iconBg="var(--color-sky-50)"
          />
        </div>

        {/* Main 2-Column Analytics Layout (Clear distinction between Task Completion vs Quiz Mastery) */}
        <div className="progress-main-grid">
          {/* Column 1: Study Schedule & Task Completion Progress */}
          <div className="progress-col">
            <Card className="analytics-card">
              <SectionHeader
                title="Syllabus & Task Completion Progress"
                subtitle="Measures study routine adherence and daily focus blocks completed"
              />

              {stats.subjectBreakdown.length > 0 ? (
                <div className="subject-bars-list">
                  {stats.subjectBreakdown.map((sub) => (
                    <div key={sub.subject} className="subject-bar-item">
                      <div className="subject-bar-header">
                        <div>
                          <span className="subject-name">{sub.subject}</span>
                          <div className="subject-submeta">
                            {sub.completedTasks} of {sub.totalTasks} study blocks completed
                          </div>
                        </div>
                        <span className="mastery-pct">{sub.taskCompletionPercent}%</span>
                      </div>

                      <div className="progress-track">
                        <div
                          className="progress-fill"
                          style={{
                            width: `${sub.taskCompletionPercent}%`,
                            backgroundColor: sub.color || 'var(--color-violet-600)',
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="insufficient-data-box">
                  <Layers size={28} className="text-violet" />
                  <h4>No Subject Progress Data Available</h4>
                  <p>
                    Create a personalized study timetable in the Study Planner to track subject-by-subject syllabus coverage.
                  </p>
                  <Link to="/planner">
                    <Button variant="outline" size="sm" icon={<Plus size={14} />}>
                      Create Study Plan
                    </Button>
                  </Link>
                </div>
              )}
            </Card>

            {/* Completed Study Sessions Log */}
            <Card className="analytics-card">
              <SectionHeader
                title="Completed Study Sessions Log"
                subtitle={`Verified focus sessions marked done (${completedTasks.length})`}
              />

              {completedTasks.length > 0 ? (
                <div className="completed-sessions-list">
                  {completedTasks.map((task) => (
                    <div key={task.id} className="completed-session-row">
                      <div className="session-left">
                        <span className="badge badge-navy">{task.subject}</span>
                        <div>
                          <div className="session-topic">{task.title}</div>
                          {task.dueDate && <div className="session-date">Due: {formatDate(task.dueDate)}</div>}
                        </div>
                      </div>
                      <div className="session-right">
                        <span className="session-duration">
                          <Clock size={12} /> {formatDuration(task.estimatedMinutes)}
                        </span>
                        <span className="badge badge-emerald">Completed</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="insufficient-data-box">
                  <Clock size={28} className="text-violet" />
                  <h4>No Completed Sessions Yet</h4>
                  <p>
                    Check off study tasks on your Dashboard or Study Planner when you complete a focus block to build your verified session history.
                  </p>
                  <Link to="/planner">
                    <Button variant="outline" size="sm" icon={<ArrowRight size={14} />}>
                      View Today's Schedule
                    </Button>
                  </Link>
                </div>
              )}
            </Card>
          </div>

          {/* Column 2: Active Recall & Quiz Mastery Performance */}
          <div className="progress-col">
            <Card className="analytics-card">
              <SectionHeader
                title="Active Recall Quiz Performance"
                subtitle="Measures conceptual retention accuracy from practice quizzes"
              />

              {quizHistory.length > 0 ? (
                <div className="quiz-history-table">
                  {quizHistory.map((item) => (
                    <div key={item.id} className="quiz-history-row">
                      <div className="qh-info">
                        <div className="qh-title">{item.title}</div>
                        <div className="qh-meta">
                          {item.subject} • {item.date} • {item.difficulty} • {item.totalQuestions} Questions
                        </div>
                      </div>
                      <div className="qh-right">
                        <span className="qh-score">
                          {item.score}/{item.totalQuestions} ({item.percentage}%)
                        </span>
                        <Badge
                          variant={
                            item.percentage >= 80
                              ? 'emerald'
                              : item.percentage >= 60
                              ? 'violet'
                              : 'amber'
                          }
                        >
                          {item.percentage >= 80
                            ? 'Mastered'
                            : item.percentage >= 60
                            ? 'Passed'
                            : 'Needs Review'}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="insufficient-data-box">
                  <HelpCircle size={28} className="text-violet" />
                  <h4>No Quiz Attempts Recorded</h4>
                  <p>
                    Generate and complete self-testing practice quizzes in the Quiz Generator to measure and store your active recall scores.
                  </p>
                  <Link to="/quiz">
                    <Button variant="outline" size="sm" icon={<Plus size={14} />}>
                      Take Practice Quiz
                    </Button>
                  </Link>
                </div>
              )}
            </Card>

            {/* Subject Quiz Mastery Performance Breakdown (when quizzes exist) */}
            <Card className="analytics-card">
              <SectionHeader
                title="Subject Diagnostic Mastery"
                subtitle="Average quiz test scores grouped by subject"
              />

              {stats.subjectBreakdown.some((s) => s.quizAttempts > 0) ? (
                <div className="subject-bars-list">
                  {stats.subjectBreakdown
                    .filter((s) => s.quizAttempts > 0)
                    .map((sub) => {
                      const avg = sub.averageQuizScore ?? 0;
                      return (
                        <div key={sub.subject} className="subject-bar-item">
                          <div className="subject-bar-header">
                            <div>
                              <span className="subject-name">{sub.subject}</span>
                              <div className="subject-submeta">
                                {sub.quizAttempts} {sub.quizAttempts === 1 ? 'quiz' : 'quizzes'} taken
                              </div>
                            </div>
                            <span className="mastery-pct">{sub.averageQuizScore !== null ? `${sub.averageQuizScore}%` : 'N/A'}</span>
                          </div>

                          <div className="progress-track">
                            <div
                              className="progress-fill"
                              style={{
                                width: `${avg}%`,
                                backgroundColor:
                                  avg >= 80
                                    ? 'var(--color-emerald-500)'
                                    : avg >= 60
                                    ? 'var(--color-violet-500)'
                                    : 'var(--color-amber-500)',
                              }}
                            />
                          </div>
                        </div>
                      );
                    })}
                </div>
              ) : (
                <div className="insufficient-data-box">
                  <Award size={28} className="text-violet" />
                  <h4>Subject Diagnostic Data Needed</h4>
                  <p>
                    Complete quizzes corresponding to your course subjects to generate comparative diagnostic accuracy curves.
                  </p>
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
                All study analytics, task completion history, saved notes, and quiz metrics are computed and stored purely within your current browser.
                No personal data, academic records, or AI keys are ever stored or sent to remote databases.
                Data does not sync across different browsers or devices.
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
            <Button
              variant="accent"
              size="sm"
              icon={<Trash2 size={14} />}
              onClick={handleConfirmClearData}
            >
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
                Your Progress and Dashboard analytics will reset immediately. This action cannot be undone.
              </p>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
};
