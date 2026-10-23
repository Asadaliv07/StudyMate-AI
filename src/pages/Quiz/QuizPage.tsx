import React, { useState, useMemo, useEffect } from 'react';
import {
  Sparkles,
  CheckCircle,
  XCircle,
  ArrowRight,
  ArrowLeft,
  RotateCcw,
  Award,
  Play,
  BookOpen,
  FileText,
  AlertTriangle,
  History,
  Check,
  Send,
  RefreshCw,
  Key,
  Layers,
  Trash2,
} from 'lucide-react';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { EmptyState } from '../../components/common/EmptyState';
import { useLocalStorage } from '../../hooks/useLocalStorage';
import {
  generateQuizFromNotes,
  validateQuizSetup,
} from '../../services/quizEngine';
import { SAMPLE_STUDY_NOTES } from '../../services/summarizerEngine';
import {
  fetchAiServiceStatus,
  generateQuizWithServerAi,
  AiClientError,
} from '../../services/aiApiClient';
import {
  saveQuizAttempt,
  deleteQuizAttempt,
} from '../../services/storageService';
import type {
  GeneratedQuiz,
  QuizDifficulty,
  QuizSetupType,
  CompletedQuizResult,
  SharedNotesPayload,
  AiServiceStatus,
} from '../../types';
import './QuizPage.css';

// Initial pre-generated demo quiz so the page has immediate content
const DEFAULT_INITIAL_QUIZ: GeneratedQuiz = generateQuizFromNotes(
  SAMPLE_STUDY_NOTES.transformers.text,
  'Natural Language Processing',
  5,
  'Medium',
  'mixed'
);

export const QuizPage: React.FC = () => {
  // ---------------------------------------------------------------------------
  // View States: 'setup' | 'taking' | 'results'
  // ---------------------------------------------------------------------------
  const [viewMode, setViewMode] = useState<'setup' | 'taking' | 'results'>('setup');

  // ---------------------------------------------------------------------------
  // Engine & Server AI State
  // ---------------------------------------------------------------------------
  const [engineMode, setEngineMode] = useState<'ai' | 'demo'>('ai');
  const [aiServiceStatus, setAiServiceStatus] = useState<AiServiceStatus | null>(null);
  const [aiError, setAiError] = useState<{
    code: string;
    message: string;
    details?: string;
    isMissingKey: boolean;
  } | null>(null);
  const [showConfigGuide, setShowConfigGuide] = useState(false);

  // ---------------------------------------------------------------------------
  // Setup Form State
  // ---------------------------------------------------------------------------
  const [subject, setSubject] = useState('Natural Language Processing');
  const [notesText, setNotesText] = useState(SAMPLE_STUDY_NOTES.transformers.text);
  const [requestedCount, setRequestedCount] = useState<number>(5);
  const [difficulty, setDifficulty] = useState<QuizDifficulty>('Medium');
  const [questionType, setQuestionType] = useState<QuizSetupType>('mixed');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  // Check server AI status on mount
  useEffect(() => {
    let isMounted = true;
    fetchAiServiceStatus().then((status) => {
      if (isMounted) {
        setAiServiceStatus(status);
      }
    });
    return () => {
      isMounted = false;
    };
  }, []);

  // Shared notes from Notes Summarizer
  const [sharedNotes, setSharedNotes] = useState<SharedNotesPayload | null>(() => {
    try {
      const stored = window.localStorage.getItem('studymate_quiz_shared_notes');
      return stored ? JSON.parse(stored) : null;
    } catch (e) {
      console.warn('Failed to read shared notes:', e);
      return null;
    }
  });

  // ---------------------------------------------------------------------------
  // Active Quiz Runner State
  // ---------------------------------------------------------------------------
  const [activeQuiz, setActiveQuiz] = useState<GeneratedQuiz>(DEFAULT_INITIAL_QUIZ);
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, number>>({});
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);

  // ---------------------------------------------------------------------------
  // Results & History State
  // ---------------------------------------------------------------------------
  const [completedQuizHistory] = useLocalStorage<CompletedQuizResult[]>(
    'studymate_quiz_history',
    []
  );
  const [attemptToDelete, setAttemptToDelete] = useState<CompletedQuizResult | null>(null);

  const handleUseSharedNotes = () => {
    if (!sharedNotes) return;
    setSubject(sharedNotes.subject);
    setNotesText(sharedNotes.text);
    setValidationError(null);
    setAiError(null);
  };

  const handleDismissSharedNotes = () => {
    setSharedNotes(null);
    try {
      window.localStorage.removeItem('studymate_quiz_shared_notes');
    } catch (e) {
      console.warn(e);
    }
  };

  const handleLoadSample = (sampleKey: keyof typeof SAMPLE_STUDY_NOTES) => {
    const sample = SAMPLE_STUDY_NOTES[sampleKey];
    setSubject(sample.subject);
    setNotesText(sample.text);
    setValidationError(null);
    setAiError(null);
  };

  // ---------------------------------------------------------------------------
  // Quiz Generation Handler (Supports Gemini AI and Local Rule-Based Engine)
  // ---------------------------------------------------------------------------
  const handleGenerateQuiz = async (e?: React.FormEvent, forceMode?: 'ai' | 'demo') => {
    if (e) e.preventDefault();

    const targetMode = forceMode || engineMode;
    const validation = validateQuizSetup(subject, notesText);
    if (!validation.isValid) {
      setValidationError(validation.error || 'Please fill in required fields.');
      return;
    }

    setValidationError(null);
    setAiError(null);
    setIsGenerating(true);

    if (targetMode === 'ai') {
      try {
        const quiz = await generateQuizWithServerAi(
          notesText,
          subject,
          requestedCount,
          difficulty,
          questionType
        );

        setActiveQuiz(quiz);
        setCurrentQIndex(0);
        setSelectedAnswers({});
        setViewMode('taking');
        setIsGenerating(false);
      } catch (err: unknown) {
        setIsGenerating(false);
        const isClientError = err instanceof AiClientError;
        const code = isClientError ? err.code : 'UNKNOWN';
        const message = isClientError ? err.message : (err instanceof Error ? err.message : 'Error generating AI quiz');
        const details = isClientError ? err.details : undefined;

        setAiError({
          code,
          message,
          details,
          isMissingKey: code === 'MISSING_API_KEY',
        });
        if (code === 'MISSING_API_KEY') {
          setShowConfigGuide(true);
        }
      }
    } else {
      // Local rule-based demo engine
      setTimeout(() => {
        try {
          const quiz = generateQuizFromNotes(
            notesText,
            subject,
            requestedCount,
            difficulty,
            questionType
          );
          quiz.isRuleBasedDemo = true;
          quiz.provider = 'rule_based_demo';

          setActiveQuiz(quiz);
          setCurrentQIndex(0);
          setSelectedAnswers({});
          setViewMode('taking');
          setIsGenerating(false);
        } catch (err: unknown) {
          setIsGenerating(false);
          const errMsg = err instanceof Error ? err.message : 'Error generating quiz';
          setValidationError(errMsg);
        }
      }, 400);
    }
  };

  // ---------------------------------------------------------------------------
  // Interactive Taking Handlers
  // ---------------------------------------------------------------------------
  const currentQuestion = activeQuiz.questions[currentQIndex] || activeQuiz.questions[0];

  const handleSelectOption = (optionIndex: number) => {
    if (!currentQuestion) return;
    setSelectedAnswers((prev) => ({
      ...prev,
      [currentQuestion.id]: optionIndex,
    }));
  };

  const answeredCount = useMemo(() => {
    return Object.keys(selectedAnswers).length;
  }, [selectedAnswers]);

  const unansweredCount = useMemo(() => {
    return Math.max(0, activeQuiz.questions.length - answeredCount);
  }, [activeQuiz.questions.length, answeredCount]);

  const handleNext = () => {
    if (currentQIndex < activeQuiz.questions.length - 1) {
      setCurrentQIndex((prev) => prev + 1);
    }
  };

  const handlePrev = () => {
    if (currentQIndex > 0) {
      setCurrentQIndex((prev) => prev - 1);
    }
  };

  const handlePromptSubmit = () => {
    if (unansweredCount > 0) {
      setIsSubmitModalOpen(true);
    } else {
      executeSubmitQuiz();
    }
  };

  const executeSubmitQuiz = () => {
    setIsSubmitModalOpen(false);

    // Calculate score
    let correctCount = 0;
    activeQuiz.questions.forEach((q) => {
      if (selectedAnswers[q.id] === q.correctAnswerIndex) {
        correctCount++;
      }
    });

    const total = activeQuiz.questions.length;
    const percentage = total > 0 ? Math.round((correctCount / total) * 100) : 0;

    // Save result to persistence using centralized storageService
    const newResult: CompletedQuizResult = {
      id: `attempt-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      quizId: activeQuiz.id,
      title: activeQuiz.title,
      subject: activeQuiz.subject,
      score: correctCount,
      totalQuestions: total,
      percentage,
      date: new Date().toISOString().split('T')[0],
      difficulty: activeQuiz.difficulty,
      questionType: activeQuiz.questionType,
      timestamp: Date.now(),
      answers: selectedAnswers,
    };

    saveQuizAttempt(newResult);
    setViewMode('results');
  };

  const handleRetryQuiz = () => {
    setSelectedAnswers({});
    setCurrentQIndex(0);
    setViewMode('taking');
  };

  const handleStartNewQuiz = () => {
    setSelectedAnswers({});
    setCurrentQIndex(0);
    setViewMode('setup');
  };

  // Score computation for active results view
  const currentResultMetrics = useMemo(() => {
    let correctCount = 0;
    activeQuiz.questions.forEach((q) => {
      if (selectedAnswers[q.id] === q.correctAnswerIndex) {
        correctCount++;
      }
    });
    const total = activeQuiz.questions.length;
    const percent = total > 0 ? Math.round((correctCount / total) * 100) : 0;
    return { correctCount, total, percent };
  }, [activeQuiz, selectedAnswers]);

  return (
    <div className="quiz-root">
      <div className="container">
        {/* Top Header */}
        <div className="quiz-top-header">
          <div>
            <Badge variant="violet" icon={<Sparkles size={13} />}>
              Active Retrieval Practice Engine
            </Badge>
            <h1 className="page-heading">AI Quiz Generator</h1>
            <p className="page-sub">
              Generate self-testing practice quizzes directly from your study notes. Verified for factual grounding without synthetic hallucinations.
            </p>
          </div>

          <div className="header-view-actions">
            {viewMode !== 'setup' && (
              <Button
                variant="outline"
                size="sm"
                icon={<ArrowLeft size={14} />}
                onClick={() => setViewMode('setup')}
              >
                Quiz Setup
              </Button>
            )}
          </div>
        </div>

        {/* Shared Notes Banner from Summarizer (if detected) */}
        {sharedNotes && viewMode === 'setup' && (
          <div className="shared-notes-banner" role="status">
            <div className="shared-notes-info">
              <FileText size={18} className="text-violet" />
              <div>
                <strong>Shared Notes Available from Summarizer:</strong>
                <span> "{sharedNotes.title}" ({sharedNotes.subject})</span>
              </div>
            </div>
            <div className="shared-notes-actions">
              <Button
                variant="accent"
                size="sm"
                icon={<Check size={14} />}
                onClick={handleUseSharedNotes}
              >
                Use These Notes
              </Button>
              <button
                type="button"
                className="shared-dismiss-btn"
                onClick={handleDismissSharedNotes}
                title="Dismiss"
                aria-label="Dismiss shared notes"
              >
                Dismiss
              </button>
            </div>
          </div>
        )}

        {/* ==================================================================
            VIEW 1: SETUP INTERFACE
           ================================================================== */}
        {viewMode === 'setup' && (
          <div className="quiz-setup-grid">
            {/* Setup Form Card */}
            <Card className="quiz-setup-card">
              <div className="setup-card-header">
                <div>
                  <h3 className="setup-title">Generate Practice Quiz</h3>
                  <p className="setup-sub">
                    Configure question count, difficulty, and question format grounded in your lecture notes.
                  </p>
                </div>

                <div className="sample-chips-row">
                  <span className="sample-label">Prefill:</span>
                  <button
                    type="button"
                    className="sample-chip"
                    onClick={() => handleLoadSample('transformers')}
                  >
                    Transformers
                  </button>
                  <button
                    type="button"
                    className="sample-chip"
                    onClick={() => handleLoadSample('raft')}
                  >
                    Raft
                  </button>
                  <button
                    type="button"
                    className="sample-chip"
                    onClick={() => handleLoadSample('neurobiology')}
                  >
                    Neurobiology
                  </button>
                </div>
              </div>

              {/* AI Processing Engine Selector */}
              <div className="engine-mode-group">
                <span className="engine-mode-label">Quiz Generator Engine:</span>
                <div className="engine-pills">
                  <button
                    type="button"
                    className={`engine-pill ${engineMode === 'ai' ? 'active ai-active' : ''}`}
                    onClick={() => {
                      setEngineMode('ai');
                      setAiError(null);
                    }}
                  >
                    <Sparkles size={13} />
                    Google Gemini 2.5 Flash
                    {aiServiceStatus?.configured ? (
                      <span className="badge badge-emerald" style={{ padding: '2px 6px', fontSize: '10px' }}>Server Ready</span>
                    ) : (
                      <span className="badge badge-amber" style={{ padding: '2px 6px', fontSize: '10px' }}>Setup Key</span>
                    )}
                  </button>
                  <button
                    type="button"
                    className={`engine-pill ${engineMode === 'demo' ? 'active' : ''}`}
                    onClick={() => {
                      setEngineMode('demo');
                      setAiError(null);
                    }}
                  >
                    <Layers size={13} />
                    Rule-Based Engine (Demo)
                  </button>
                </div>
              </div>

              <form onSubmit={handleGenerateQuiz} className="quiz-setup-form">
                <div className="form-group">
                  <label className="form-label" htmlFor="quiz-subject-input">
                    Subject or Course Topic *
                  </label>
                  <input
                    id="quiz-subject-input"
                    type="text"
                    className="form-input"
                    placeholder="e.g. Natural Language Processing or Distributed Consensus"
                    value={subject}
                    onChange={(e) => {
                      setSubject(e.target.value);
                      if (validationError) setValidationError(null);
                    }}
                    required
                  />
                </div>

                {/* Form row: Count, Difficulty, Question Type */}
                <div className="form-row-3">
                  <div className="form-group">
                    <label className="form-label" htmlFor="quiz-count-input">
                      Question Count
                    </label>
                    <select
                      id="quiz-count-input"
                      className="form-input"
                      value={requestedCount}
                      onChange={(e) => setRequestedCount(Number(e.target.value))}
                    >
                      <option value={5}>5 Questions (Quick Check)</option>
                      <option value={10}>10 Questions (Balanced)</option>
                      <option value={15}>15 Questions (Full Exam)</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label" htmlFor="quiz-diff-input">
                      Difficulty Level
                    </label>
                    <select
                      id="quiz-diff-input"
                      className="form-input"
                      value={difficulty}
                      onChange={(e) => setDifficulty(e.target.value as QuizDifficulty)}
                    >
                      <option value="Easy">Easy (Factual Recall)</option>
                      <option value="Medium">Medium (Application)</option>
                      <option value="Hard">Hard (Deep Invariants)</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label" htmlFor="quiz-type-input">
                      Question Type
                    </label>
                    <select
                      id="quiz-type-input"
                      className="form-input"
                      value={questionType}
                      onChange={(e) => setQuestionType(e.target.value as QuizSetupType)}
                    >
                      <option value="mixed">Mixed (Multiple Choice & T/F)</option>
                      <option value="multiple_choice">Multiple Choice Only</option>
                      <option value="true_false">True / False Only</option>
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <div className="textarea-label-wrap">
                    <label className="form-label" htmlFor="quiz-notes-textarea">
                      Source Notes or Reading Excerpt *
                    </label>
                    <span className="notes-word-count">
                      {notesText.trim() ? `${notesText.trim().split(/\s+/).filter(Boolean).length} words` : '0 words'}
                    </span>
                  </div>

                  <textarea
                    id="quiz-notes-textarea"
                    rows={8}
                    className={`form-input quiz-textarea ${validationError ? 'input-error' : ''}`}
                    placeholder="Paste the notes or lecture material from which questions should be extracted..."
                    value={notesText}
                    onChange={(e) => {
                      setNotesText(e.target.value);
                      if (validationError) setValidationError(null);
                    }}
                    required
                  />

                  {validationError && (
                    <span className="form-error-text">
                      <AlertTriangle size={12} /> {validationError}
                    </span>
                  )}
                </div>

                {/* AI Error Notification & Resolution Box */}
                {aiError && (
                  <div className="ai-error-box">
                    <div className="ai-error-header">
                      <AlertTriangle size={18} />
                      <div>
                        <div className="ai-error-title">
                          {aiError.isMissingKey ? 'Gemini API Key Required' : 'Quiz Generation Failed'}
                        </div>
                        <div className="ai-error-msg">{aiError.message}</div>
                      </div>
                    </div>

                    <div className="ai-error-actions">
                      <Button
                        type="button"
                        variant="accent"
                        size="sm"
                        onClick={() => handleGenerateQuiz(undefined, 'demo')}
                        icon={<Sparkles size={13} />}
                      >
                        Generate with Rule-Based Demo Instead
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleGenerateQuiz(undefined, 'ai')}
                        icon={<RefreshCw size={13} />}
                      >
                        Retry with Gemini AI
                      </Button>
                      {aiError.isMissingKey && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setShowConfigGuide(!showConfigGuide)}
                          icon={<Key size={13} />}
                        >
                          {showConfigGuide ? 'Hide Setup Guide' : 'How to configure'}
                        </Button>
                      )}
                    </div>

                    {showConfigGuide && (
                      <div className="ai-config-helper">
                        <strong>Quick Server Key Setup:</strong>
                        <ol>
                          <li>Get a free key from <a href="https://aistudio.google.com/" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--color-violet-600)', textDecoration: 'underline' }}>Google AI Studio</a>.</li>
                          <li>Open or create <code>.env</code> in your project root (copied from <code>.env.example</code>).</li>
                          <li>Set <code>GEMINI_API_KEY=your_key_here</code>.</li>
                          <li>Restart the development server (<code>npm run dev</code>).</li>
                        </ol>
                      </div>
                    )}
                  </div>
                )}

                <div className="setup-submit-row">
                  <span className="honesty-tag">
                    <Sparkles size={13} className="text-violet" /> Grounded in provided notes only
                  </span>
                  <Button
                    type="submit"
                    variant="accent"
                    size="md"
                    isLoading={isGenerating}
                    disabled={isGenerating}
                    icon={<Play size={15} />}
                  >
                    {isGenerating
                      ? (engineMode === 'ai' ? 'Synthesizing with Gemini...' : 'Generating Practice Questions...')
                      : (engineMode === 'ai' ? 'Generate Practice Quiz with Gemini' : 'Generate Practice Quiz (Demo)')}
                  </Button>
                </div>
              </form>
            </Card>

            {/* Past Quiz Attempts Sidebar */}
            <div className="quiz-history-col">
              <Card className="quiz-history-card">
                <div className="history-header">
                  <History size={16} className="text-violet" />
                  <h4 className="history-title">Recent Quiz Results ({completedQuizHistory.length})</h4>
                </div>

                {completedQuizHistory.length > 0 ? (
                  <div className="history-list">
                    {completedQuizHistory.map((item) => (
                      <div key={item.id} className="history-item">
                        <div className="history-top">
                          <span className="hist-subject">{item.subject}</span>
                          <span className="hist-date">{item.date}</span>
                        </div>
                        <h5 className="hist-name">{item.title}</h5>
                        <div className="hist-bottom">
                          <span className="hist-score">
                            {item.score} / {item.totalQuestions} ({item.percentage}%)
                          </span>
                          <div className="hist-actions-group">
                            <Badge
                              variant={
                                item.percentage >= 80
                                  ? 'emerald'
                                  : item.percentage >= 60
                                  ? 'violet'
                                  : 'amber'
                              }
                            >
                              {item.percentage >= 80 ? 'Mastered' : item.percentage >= 60 ? 'Passed' : 'Needs Review'}
                            </Badge>
                            <button
                              type="button"
                              className="hist-delete-btn"
                              title="Delete quiz result"
                              aria-label={`Delete result for ${item.title}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                setAttemptToDelete(item);
                              }}
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <EmptyState
                    icon={<BookOpen size={24} />}
                    title="No Completed Quizzes Yet"
                    description="Generate and complete practice quizzes to track your active recall scores over time."
                  />
                )}
              </Card>
            </div>
          </div>
        )}

        {/* ==================================================================
            VIEW 2: TAKING QUIZ RUNNER (One Question at a Time)
           ================================================================== */}
        {viewMode === 'taking' && currentQuestion && (
          <div className="quiz-runner-container">
            {/* Capacity notice if fewer questions generated than requested */}
            {activeQuiz.explanationOfCount && (
              <div className="capacity-notice-banner">
                <AlertTriangle size={15} className="text-amber" />
                <span>{activeQuiz.explanationOfCount}</span>
              </div>
            )}

            <Card className="quiz-question-card">
              {/* Engine Transparency Notice */}
              {activeQuiz.provider === 'gemini' ? (
                <div className="ai-quiz-runner-notice">
                  <span className="ai-quiz-pill">
                    <Sparkles size={12} /> Gemini 2.5 Flash AI · Server Verified
                  </span>
                  <span className="ai-quiz-notice-text">
                    Practice questions and grounded explanations synthesized via server-side Google Gemini.
                  </span>
                </div>
              ) : (
                <div className="ai-quiz-runner-notice" style={{ background: 'var(--color-surface-hover)', borderColor: 'var(--color-border)' }}>
                  <span className="ai-quiz-pill" style={{ background: 'var(--color-navy-700)' }}>
                    <Layers size={12} /> Rule-Based Practice Engine
                  </span>
                  <span className="ai-quiz-notice-text">
                    Practice questions extracted via local rule-based engine.
                  </span>
                </div>
              )}

              {/* Question Header & Stepper */}
              <div className="question-runner-header">
                <div className="runner-header-left">
                  <span className="question-step-pill">
                    Question {currentQIndex + 1} of {activeQuiz.questions.length}
                  </span>
                  <Badge variant="navy">{activeQuiz.subject}</Badge>
                  <span className="q-type-label">
                    {currentQuestion.type === 'multiple_choice' ? 'Multiple Choice' : 'True / False'}
                  </span>
                </div>

                <div className="runner-header-right">
                  <span className="answered-status-text">
                    {answeredCount} of {activeQuiz.questions.length} Answered
                  </span>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="question-progress-bar-track">
                <div
                  className="question-progress-fill"
                  style={{
                    width: `${((currentQIndex + 1) / activeQuiz.questions.length) * 100}%`,
                  }}
                />
              </div>

              {/* Step indicator dots */}
              <div className="step-dots-row">
                {activeQuiz.questions.map((q, idx) => {
                  const isCurrent = idx === currentQIndex;
                  const isAnswered = selectedAnswers[q.id] !== undefined;
                  return (
                    <button
                      key={q.id}
                      type="button"
                      className={`step-dot ${isCurrent ? 'active' : ''} ${isAnswered ? 'answered' : ''}`}
                      onClick={() => setCurrentQIndex(idx)}
                      title={`Go to Question ${idx + 1}`}
                      aria-label={`Question ${idx + 1} ${isAnswered ? '(answered)' : ''}`}
                    >
                      {idx + 1}
                    </button>
                  );
                })}
              </div>

              {/* Question Title */}
              <h2 className="runner-question-title">{currentQuestion.question}</h2>

              {/* Option Selector Controls */}
              <div className="runner-options-grid">
                {currentQuestion.options.map((optText, optIdx) => {
                  const isSelected = selectedAnswers[currentQuestion.id] === optIdx;
                  return (
                    <button
                      key={optIdx}
                      type="button"
                      className={`runner-option-btn ${isSelected ? 'selected' : ''}`}
                      onClick={() => handleSelectOption(optIdx)}
                    >
                      <span className="runner-option-letter">
                        {currentQuestion.type === 'true_false'
                          ? optIdx === 0 ? 'T' : 'F'
                          : String.fromCharCode(65 + optIdx)}
                      </span>
                      <span className="runner-option-text">{optText}</span>
                      {isSelected && (
                        <div className="option-check-circle">
                          <Check size={14} />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Navigation Controls */}
              <div className="runner-navigation-bar">
                <Button
                  variant="outline"
                  size="md"
                  icon={<ArrowLeft size={16} />}
                  disabled={currentQIndex === 0}
                  onClick={handlePrev}
                >
                  Previous
                </Button>

                <div className="runner-nav-right">
                  {currentQIndex < activeQuiz.questions.length - 1 ? (
                    <Button
                      variant="primary"
                      size="md"
                      icon={<ArrowRight size={16} />}
                      iconPosition="right"
                      onClick={handleNext}
                    >
                      Next Question
                    </Button>
                  ) : (
                    <Button
                      variant="accent"
                      size="md"
                      icon={<Send size={15} />}
                      onClick={handlePromptSubmit}
                    >
                      Submit Quiz
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* ==================================================================
            VIEW 3: SUBMISSION RESULTS & EXPLANATION REVIEW
           ================================================================== */}
        {viewMode === 'results' && (
          <div className="quiz-results-container">
            {/* Score Summary Card */}
            <Card className="results-summary-card">
              <div className="results-icon-wrap">
                <Award size={48} className="text-violet" />
              </div>
              <h2 className="results-heading">Quiz Results & Conceptual Review</h2>
              <p className="results-sub">
                You completed <strong>{activeQuiz.title}</strong>
              </p>

              <div className="results-metrics-grid">
                <div className="res-stat-card">
                  <span className="res-label">Score</span>
                  <strong className="res-val text-violet">
                    {currentResultMetrics.correctCount} / {currentResultMetrics.total}
                  </strong>
                </div>
                <div className="res-stat-card">
                  <span className="res-label">Accuracy Percentage</span>
                  <strong className="res-val">
                    {currentResultMetrics.percent}%
                  </strong>
                </div>
                <div className="res-stat-card">
                  <span className="res-label">Mastery Status</span>
                  <Badge
                    variant={
                      currentResultMetrics.percent >= 80
                        ? 'emerald'
                        : currentResultMetrics.percent >= 60
                        ? 'violet'
                        : 'amber'
                    }
                  >
                    {currentResultMetrics.percent >= 80
                      ? 'Mastered (80%+)'
                      : currentResultMetrics.percent >= 60
                      ? 'Passed (60%+)'
                      : 'Needs Revision'}
                  </Badge>
                </div>
              </div>

              <div className="results-actions-row">
                <Button
                  variant="primary"
                  icon={<RotateCcw size={15} />}
                  onClick={handleRetryQuiz}
                >
                  Retry Quiz
                </Button>
                <Button
                  variant="outline"
                  icon={<Play size={15} />}
                  onClick={handleStartNewQuiz}
                >
                  Generate New Quiz
                </Button>
              </div>
            </Card>

            {/* Detailed Question Review List */}
            <div className="questions-review-list">
              <h3 className="review-section-title">Question-by-Question Factual Review</h3>
              {activeQuiz.questions.map((q, idx) => {
                const userChoice = selectedAnswers[q.id];
                const isCorrect = userChoice === q.correctAnswerIndex;
                const wasAnswered = userChoice !== undefined;

                return (
                  <Card
                    key={q.id}
                    className={`question-review-card ${isCorrect ? 'correct-border' : 'wrong-border'}`}
                  >
                    <div className="review-card-top">
                      <span className="review-q-number">Question {idx + 1}</span>
                      <div className="review-badge-wrap">
                        {isCorrect ? (
                          <span className="review-tag-correct">
                            <CheckCircle size={14} /> Correct
                          </span>
                        ) : (
                          <span className="review-tag-wrong">
                            <XCircle size={14} /> {wasAnswered ? 'Incorrect' : 'Unanswered'}
                          </span>
                        )}
                      </div>
                    </div>

                    <h4 className="review-question-text">{q.question}</h4>

                    {/* Options Review */}
                    <div className="review-options-list">
                      {q.options.map((opt, optIdx) => {
                        const isCorrectOpt = optIdx === q.correctAnswerIndex;
                        const isUserOpt = userChoice === optIdx;

                        let optReviewClass = 'review-option-item';
                        if (isCorrectOpt) optReviewClass += ' is-correct-answer';
                        if (isUserOpt && !isCorrectOpt) optReviewClass += ' is-user-wrong-answer';

                        return (
                          <div key={optIdx} className={optReviewClass}>
                            <span className="rev-letter">
                              {q.type === 'true_false'
                                ? optIdx === 0 ? 'T' : 'F'
                                : String.fromCharCode(65 + optIdx)}
                            </span>
                            <span className="rev-text">{opt}</span>
                            {isCorrectOpt && (
                              <span className="rev-flag correct-flag">Correct Answer</span>
                            )}
                            {isUserOpt && !isCorrectOpt && (
                              <span className="rev-flag wrong-flag">Your Choice</span>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* Grounded Notes Explanation */}
                    <div className="grounded-explanation-box">
                      <div className="exp-head">
                        <Sparkles size={13} className="text-violet" />
                        <strong>Grounded Notes Evidence:</strong>
                      </div>
                      <p className="exp-text">{q.explanation}</p>
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Confirmation Modal for Incomplete Quiz Submission */}
      <Modal
        isOpen={isSubmitModalOpen}
        onClose={() => setIsSubmitModalOpen(false)}
        title="Submit Incomplete Quiz?"
        subtitle="You have unanswered questions."
        footer={
          <>
            <Button variant="outline" size="sm" onClick={() => setIsSubmitModalOpen(false)}>
              Keep Answering
            </Button>
            <Button variant="accent" size="sm" onClick={executeSubmitQuiz}>
              Submit Anyway
            </Button>
          </>
        }
      >
        <div className="incomplete-modal-content">
          <div className="incomplete-warning-row">
            <AlertTriangle size={20} className="text-amber" />
            <p>
              You have answered <strong>{answeredCount}</strong> of{' '}
              <strong>{activeQuiz.questions.length}</strong> questions ({unansweredCount} remaining unanswered). Unanswered questions will be scored as incorrect.
            </p>
          </div>
        </div>
      </Modal>

      {/* Confirmation Modal for Quiz Result Deletion */}
      <Modal
        isOpen={!!attemptToDelete}
        onClose={() => setAttemptToDelete(null)}
        title="Delete Quiz Result?"
        subtitle="This action cannot be undone."
        footer={
          <>
            <Button variant="outline" size="sm" onClick={() => setAttemptToDelete(null)}>
              Cancel
            </Button>
            <Button
              variant="accent"
              size="sm"
              onClick={() => {
                if (attemptToDelete) {
                  deleteQuizAttempt(attemptToDelete.id);
                  setAttemptToDelete(null);
                }
              }}
            >
              Delete Result
            </Button>
          </>
        }
      >
        <div className="incomplete-modal-content">
          <p className="delete-modal-text">
            Are you sure you want to delete the result for <strong>{attemptToDelete?.title}</strong> ({attemptToDelete?.score}/{attemptToDelete?.totalQuestions} &mdash; {attemptToDelete?.percentage}%)?
            This will immediately update your Dashboard and Progress mastery metrics.
          </p>
        </div>
      </Modal>
    </div>
  );
};
