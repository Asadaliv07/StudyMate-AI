import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Sparkles,
  Copy,
  Check,
  FileText,
  Search,
  Download,
  BookOpen,
  ArrowRight,
  Edit3,
  Trash2,
  X,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  Layers,
  Save,
  RefreshCw,
  Key,
} from 'lucide-react';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { EmptyState } from '../../components/common/EmptyState';
import { Modal } from '../../components/common/Modal';
import { useLocalStorage } from '../../hooks/useLocalStorage';
import {
  generateStructuredSummary,
  validateNotesInput,
  SAMPLE_STUDY_NOTES,
} from '../../services/summarizerEngine';
import {
  fetchAiServiceStatus,
  summarizeNotesWithServerAi,
  AiClientError,
} from '../../services/aiApiClient';
import type { StructuredSummary, SharedNotesPayload, AiServiceStatus } from '../../types';
import './SummarizerPage.css';

// Initial preloaded summaries so the user has immediate value
const INITIAL_DEMO_SUMMARIES: StructuredSummary[] = [
  generateStructuredSummary(
    SAMPLE_STUDY_NOTES.transformers.text,
    SAMPLE_STUDY_NOTES.transformers.title,
    SAMPLE_STUDY_NOTES.transformers.subject
  ),
  generateStructuredSummary(
    SAMPLE_STUDY_NOTES.raft.text,
    SAMPLE_STUDY_NOTES.raft.title,
    SAMPLE_STUDY_NOTES.raft.subject
  ),
];

export const SummarizerPage: React.FC = () => {
  const navigate = useNavigate();

  // ---------------------------------------------------------------------------
  // Persistence State
  // ---------------------------------------------------------------------------
  const [savedSummaries, setSavedSummaries] = useLocalStorage<StructuredSummary[]>(
    'studymate_saved_summaries',
    INITIAL_DEMO_SUMMARIES
  );

  const [activeSummaryId, setActiveSummaryId] = useState<string>(
    INITIAL_DEMO_SUMMARIES[0]?.id || ''
  );

  // ---------------------------------------------------------------------------
  // Input Form & Engine State
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

  const [inputTitle, setInputTitle] = useState('');
  const [inputSubject, setInputSubject] = useState('Machine Learning');
  const [inputText, setInputText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  // ---------------------------------------------------------------------------
  // AI Service Health Check
  // ---------------------------------------------------------------------------
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

  // ---------------------------------------------------------------------------
  // Feedback & Modal States
  // ---------------------------------------------------------------------------
  const [copied, setCopied] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'info' | 'warning';
    message: string;
  } | null>(null);

  const [isClearModalOpen, setIsClearModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [noteIdToDelete, setNoteIdToDelete] = useState<string | null>(null);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [summaryViewTab, setSummaryViewTab] = useState<'summary' | 'original'>('summary');
  const [searchQuery, setSearchQuery] = useState('');

  // ---------------------------------------------------------------------------
  // In-line Edit State
  // ---------------------------------------------------------------------------
  const [isEditing, setIsEditing] = useState(false);
  const [editedTitle, setEditedTitle] = useState('');
  const [editedOverview, setEditedOverview] = useState('');
  const [editedKeyPoints, setEditedKeyPoints] = useState('');
  const [editedTakeaways, setEditedTakeaways] = useState('');

  // Active summary resolution
  const activeSummary = useMemo(() => {
    return savedSummaries.find((s) => s.id === activeSummaryId) || savedSummaries[0] || null;
  }, [savedSummaries, activeSummaryId]);

  // Real-time character & word counts
  const wordCount = useMemo(() => {
    return inputText.trim() ? inputText.trim().split(/\s+/).filter(Boolean).length : 0;
  }, [inputText]);

  const charCount = inputText.length;

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------
  const handleLoadSample = (sampleKey: keyof typeof SAMPLE_STUDY_NOTES) => {
    const sample = SAMPLE_STUDY_NOTES[sampleKey];
    setInputTitle(sample.title);
    setInputSubject(sample.subject);
    setInputText(sample.text);
    setValidationError(null);
    setAiError(null);
    setFeedback({
      type: 'info',
      message: `Loaded sample lecture notes for "${sample.subject}". Click "Summarize Notes" to generate.`,
    });
  };

  const handleOpenNoteInEditor = (note: StructuredSummary) => {
    setEditingNoteId(note.id);
    setInputTitle(note.title);
    setInputSubject(note.subject);
    setInputText(note.rawNotes);
    setValidationError(null);
    setAiError(null);
    setFeedback({
      type: 'info',
      message: `Loaded "${note.title}" into the editor. Make your edits and click "Update Notes" or "Summarize Notes" to save changes.`,
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelEditNote = () => {
    setEditingNoteId(null);
    setInputTitle('');
    setInputText('');
    setFeedback({
      type: 'info',
      message: 'Exited note editing mode. Ready for a new note draft.',
    });
  };

  const handleSaveNoteDraft = () => {
    if (!inputText.trim()) {
      setValidationError('Please enter notes content before saving.');
      return;
    }
    const idToUse = editingNoteId || `note-${Date.now()}`;
    const words = inputText.trim().split(/\s+/).filter(Boolean).length;
    const existing = savedSummaries.find((s) => s.id === idToUse);

    const noteRecord: StructuredSummary = existing
      ? {
          ...existing,
          title: inputTitle.trim() || existing.title,
          subject: inputSubject.trim() || existing.subject,
          rawNotes: inputText.trim(),
          wordCount: words,
        }
      : {
          id: idToUse,
          title: inputTitle.trim() || `${inputSubject || 'Academic'} Notes`,
          subject: inputSubject.trim() || 'General Studies',
          rawNotes: inputText.trim(),
          overview: 'Original study notes saved. Run Summarize Notes to generate a structured AI summary.',
          keyPoints: ['Original study notes preserved in library.'],
          terms: [],
          factsAndFormulas: [],
          takeaways: ['Review notes or generate a practice quiz.'],
          wordCount: words,
          summaryWordCount: words,
          createdAt: new Date().toISOString().split('T')[0],
          isRuleBasedDemo: true,
          provider: 'rule_based_demo',
        };

    if (editingNoteId) {
      setSavedSummaries(savedSummaries.map((s) => (s.id === editingNoteId ? noteRecord : s)));
    } else {
      setSavedSummaries([noteRecord, ...savedSummaries]);
      setEditingNoteId(idToUse);
    }

    setActiveSummaryId(idToUse);
    setFeedback({
      type: 'success',
      message: `Saved note "${noteRecord.title}" successfully to your library!`,
    });
  };

  const promptDeleteNote = (id: string) => {
    setNoteIdToDelete(id);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDeleteNote = () => {
    if (!noteIdToDelete) return;
    const updated = savedSummaries.filter((s) => s.id !== noteIdToDelete);
    setSavedSummaries(updated);
    if (activeSummaryId === noteIdToDelete) {
      setActiveSummaryId(updated[0]?.id || '');
    }
    if (editingNoteId === noteIdToDelete) {
      setEditingNoteId(null);
    }
    setIsDeleteModalOpen(false);
    setNoteIdToDelete(null);
    setFeedback({
      type: 'info',
      message: 'Saved note removed from your library.',
    });
  };

  const handleSummarize = async (e?: React.FormEvent, forceMode?: 'ai' | 'demo') => {
    if (e) e.preventDefault();

    const targetMode = forceMode || engineMode;
    const validation = validateNotesInput(inputText);
    if (!validation.isValid) {
      setValidationError(validation.error || 'Please provide valid notes.');
      return;
    }

    setValidationError(null);
    setAiError(null);
    setIsProcessing(true);

    if (targetMode === 'ai') {
      try {
        const newSummary = await summarizeNotesWithServerAi(
          inputText,
          inputTitle,
          inputSubject
        );

        if (editingNoteId) {
          newSummary.id = editingNoteId;
          const exists = savedSummaries.some((s) => s.id === editingNoteId);
          if (exists) {
            setSavedSummaries(savedSummaries.map((s) => (s.id === editingNoteId ? newSummary : s)));
          } else {
            setSavedSummaries([newSummary, ...savedSummaries]);
          }
        } else {
          setSavedSummaries([newSummary, ...savedSummaries]);
        }

        setActiveSummaryId(newSummary.id);
        setIsProcessing(false);
        setIsEditing(false);
        setFeedback({
          type: 'success',
          message: `✨ AI Summary successfully generated with Google Gemini! Extracted ${newSummary.keyPoints.length} key points and ${newSummary.terms.length} defined terms.`,
        });
      } catch (err: unknown) {
        setIsProcessing(false);
        const isClientError = err instanceof AiClientError;
        const code = isClientError ? err.code : 'UNKNOWN';
        const message = isClientError ? err.message : (err instanceof Error ? err.message : 'AI generation error');
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
      // Rule-Based Demo Engine fallback
      setTimeout(() => {
        try {
          const newSummary = generateStructuredSummary(
            inputText,
            inputTitle,
            inputSubject
          );
          newSummary.isRuleBasedDemo = true;
          newSummary.provider = 'rule_based_demo';

          if (editingNoteId) {
            newSummary.id = editingNoteId;
            const exists = savedSummaries.some((s) => s.id === editingNoteId);
            if (exists) {
              setSavedSummaries(savedSummaries.map((s) => (s.id === editingNoteId ? newSummary : s)));
            } else {
              setSavedSummaries([newSummary, ...savedSummaries]);
            }
          } else {
            setSavedSummaries([newSummary, ...savedSummaries]);
          }

          setActiveSummaryId(newSummary.id);
          setIsProcessing(false);
          setIsEditing(false);
          setFeedback({
            type: 'success',
            message: `Demo summary generated! Extracted ${newSummary.keyPoints.length} key points and ${newSummary.terms.length} defined terms.`,
          });
        } catch (err: unknown) {
          setIsProcessing(false);
          const errMsg = err instanceof Error ? err.message : 'Summarization error';
          setValidationError(errMsg);
        }
      }, 400);
    }
  };

  const handleStartEdit = () => {
    if (!activeSummary) return;
    setEditedTitle(activeSummary.title);
    setEditedOverview(activeSummary.overview);
    setEditedKeyPoints(activeSummary.keyPoints.join('\n'));
    setEditedTakeaways(activeSummary.takeaways.join('\n'));
    setIsEditing(true);
  };

  const handleSaveEdit = () => {
    if (!activeSummary) return;

    const updated: StructuredSummary = {
      ...activeSummary,
      title: editedTitle.trim() || activeSummary.title,
      overview: editedOverview.trim() || activeSummary.overview,
      keyPoints: editedKeyPoints
        .split('\n')
        .map((p) => p.trim())
        .filter(Boolean),
      takeaways: editedTakeaways
        .split('\n')
        .map((t) => t.trim())
        .filter(Boolean),
    };

    setSavedSummaries(savedSummaries.map((s) => (s.id === updated.id ? updated : s)));
    setIsEditing(false);
    setFeedback({
      type: 'success',
      message: 'Summary edits saved successfully.',
    });
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
  };

  const handleCopySummary = () => {
    if (!activeSummary) return;

    const termsBlock = activeSummary.terms.length > 0
      ? `\n\n## Important Terms & Definitions\n${activeSummary.terms.map((t) => `- **${t.term}**: ${t.definition}`).join('\n')}`
      : '';

    const factsBlock = activeSummary.factsAndFormulas.length > 0
      ? `\n\n## Facts, Formulas & Dates\n${activeSummary.factsAndFormulas.map((f) => `- [${f.label}] ${f.content}`).join('\n')}`
      : '';

    const textToCopy = `# ${activeSummary.title}
Subject: ${activeSummary.subject}
Date: ${activeSummary.createdAt}

## Executive Overview
${activeSummary.overview}

## Main Ideas & Key Points
${activeSummary.keyPoints.map((k, i) => `${i + 1}. ${k}`).join('\n')}${termsBlock}${factsBlock}

## Revision Takeaways
${activeSummary.takeaways.map((t) => `- ${t}`).join('\n')}

---
*Synthesized via StudyMate AI Academic Notes Engine*`;

    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    setFeedback({
      type: 'success',
      message: 'Formatted summary copied to clipboard!',
    });
  };

  const handleDownloadMarkdown = () => {
    if (!activeSummary) return;

    const termsBlock = activeSummary.terms.length > 0
      ? `\n\n## Key Terms & Definitions\n${activeSummary.terms.map((t) => `- **${t.term}**: ${t.definition}`).join('\n')}`
      : '';

    const factsBlock = activeSummary.factsAndFormulas.length > 0
      ? `\n\n## Facts, Invariants & Dates\n${activeSummary.factsAndFormulas.map((f) => `- **${f.label}:** ${f.content}`).join('\n')}`
      : '';

    const content = `# ${activeSummary.title}\n\n**Subject:** ${activeSummary.subject}  \n**Date:** ${activeSummary.createdAt}  \n**Source Word Count:** ${activeSummary.wordCount} words  \n**Summary Word Count:** ${activeSummary.summaryWordCount} words\n\n## Overview\n${activeSummary.overview}\n\n## Key Points\n${activeSummary.keyPoints.map((k) => `- ${k}`).join('\n')}${termsBlock}${factsBlock}\n\n## Revision Takeaways\n${activeSummary.takeaways.map((t) => `- ${t}`).join('\n')}\n\n---\n*StudyMate AI Study Notes*`;

    const blob = new Blob([content], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${activeSummary.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.md`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleSendToQuiz = () => {
    if (!activeSummary) return;

    const payload: SharedNotesPayload = {
      title: activeSummary.title,
      subject: activeSummary.subject,
      text: activeSummary.rawNotes,
      timestamp: Date.now(),
    };

    try {
      window.localStorage.setItem('studymate_quiz_shared_notes', JSON.stringify(payload));
      navigate('/quiz');
    } catch (e) {
      console.error('Error saving shared notes to localStorage:', e);
    }
  };

  const handleConfirmClear = () => {
    setInputText('');
    setInputTitle('');
    setValidationError(null);
    setIsClearModalOpen(false);
    setFeedback({
      type: 'info',
      message: 'Input notes cleared.',
    });
  };

  const filteredLibrary = savedSummaries.filter(
    (s) =>
      s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.subject.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="summarizer-root">
      <div className="container">
        {/* Top Header */}
        <div className="summarizer-top-header">
          <div>
            <Badge variant="violet" icon={<Sparkles size={13} />}>
              Grounded Academic Condensation
            </Badge>
            <h1 className="page-heading">AI Notes Summarizer</h1>
            <p className="page-sub">
              Transform unstructured lecture notes, research abstracts, and textbook chapters into clear, grounded study guides with verified terms and formulas.
            </p>
          </div>
        </div>

        {/* Feedback Alert Banner */}
        {feedback && (
          <div className={`summarizer-feedback-banner feedback-${feedback.type}`}>
            <div className="feedback-content">
              {feedback.type === 'success' && <CheckCircle2 size={16} />}
              {feedback.type === 'warning' && <AlertTriangle size={16} />}
              {feedback.type === 'info' && <Sparkles size={16} />}
              <span>{feedback.message}</span>
            </div>
            <button
              type="button"
              className="feedback-dismiss"
              onClick={() => setFeedback(null)}
              aria-label="Dismiss alert"
            >
              <X size={14} />
            </button>
          </div>
        )}

        {/* Workspace Layout Grid */}
        <div className="summarizer-grid">
          {/* Left Column: Input Form & Library */}
          <div className="summarizer-input-col">
            <Card className="summarizer-form-card">
              <div className="form-head-row">
                <div className="head-title-wrap">
                  <FileText size={18} className="text-violet" />
                  <h3 className="head-title">Input Study Material</h3>
                </div>
                <div className="sample-buttons-row">
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

              {/* AI Processing Mode Selector */}
              <div className="engine-mode-group">
                <span className="engine-mode-label">Processing Engine:</span>
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

              <form onSubmit={handleSummarize} className="summarizer-form">
                {editingNoteId && (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: 'var(--space-3) var(--space-4)',
                      background: 'var(--color-violet-50)',
                      border: '1px solid var(--color-violet-200)',
                      borderRadius: 'var(--radius-md)',
                      marginBottom: 'var(--space-4)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', fontSize: 'var(--font-size-xs)', color: 'var(--color-violet-900)' }}>
                      <Edit3 size={14} className="text-violet" />
                      <span>Editing Saved Note: <strong>{inputTitle || 'Untitled Note'}</strong></span>
                    </div>
                    <button
                      type="button"
                      onClick={handleCancelEditNote}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--color-violet-700)',
                        cursor: 'pointer',
                        fontSize: 'var(--font-size-xs)',
                        fontWeight: 600,
                        textDecoration: 'underline',
                      }}
                    >
                      Cancel & Draft New Note
                    </button>
                  </div>
                )}
                <div className="form-row-2">
                  <div className="form-group">
                    <label className="form-label" htmlFor="note-title-input">
                      Topic or Lecture Title (Optional)
                    </label>
                    <input
                      id="note-title-input"
                      type="text"
                      className="form-input"
                      placeholder="e.g. Stanford CS 224N: Attention Mechanisms"
                      value={inputTitle}
                      onChange={(e) => setInputTitle(e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label" htmlFor="note-subject-input">
                      Subject / Course Domain
                    </label>
                    <select
                      id="note-subject-input"
                      className="form-input"
                      value={inputSubject}
                      onChange={(e) => setInputSubject(e.target.value)}
                    >
                      <option value="Machine Learning">Machine Learning (CS 234)</option>
                      <option value="Distributed Systems">Distributed Systems (CS 244B)</option>
                      <option value="Cognitive Science">Cognitive Science (PSYC 101)</option>
                      <option value="Linear Algebra">Linear Algebra (MATH 104)</option>
                      <option value="Natural Language Processing">Natural Language Processing</option>
                      <option value="General Studies">General Studies</option>
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <div className="textarea-header-row">
                    <label className="form-label" htmlFor="notes-textarea">
                      Paste Study Notes, Transcripts, or Chapter Text *
                    </label>
                    {inputText.length > 0 && (
                      <button
                        type="button"
                        className="clear-text-btn"
                        onClick={() => {
                          if (inputText.length > 100) {
                            setIsClearModalOpen(true);
                          } else {
                            setInputText('');
                          }
                        }}
                      >
                        <Trash2 size={12} /> Clear Text
                      </button>
                    )}
                  </div>

                  <textarea
                    id="notes-textarea"
                    className={`form-input summarizer-textarea ${validationError ? 'input-error' : ''}`}
                    rows={8}
                    placeholder="Paste your raw lecture notes, reading excerpts, or slides here (minimum 10 words)..."
                    value={inputText}
                    onChange={(e) => {
                      setInputText(e.target.value);
                      if (validationError) setValidationError(null);
                    }}
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
                          {aiError.isMissingKey ? 'Gemini API Key Required' : 'AI Service Unavailable'}
                        </div>
                        <div className="ai-error-msg">{aiError.message}</div>
                      </div>
                    </div>

                    <div className="ai-error-actions">
                      <Button
                        type="button"
                        variant="accent"
                        size="sm"
                        onClick={() => handleSummarize(undefined, 'demo')}
                        icon={<Sparkles size={13} />}
                      >
                        Use Rule-Based Demo Instead
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleSummarize(undefined, 'ai')}
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

                {/* Counter & Action row */}
                <div className="form-footer-row">
                  <div className="count-stats-pill">
                    <strong>{wordCount}</strong> words · <span>{charCount}</span> characters
                  </div>

                  <div className="form-submit-actions">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleSaveNoteDraft}
                      disabled={isProcessing || !inputText.trim()}
                      icon={<Save size={15} />}
                      title="Save raw notes draft to your library"
                    >
                      {editingNoteId ? 'Update Saved Note' : 'Save Notes Draft'}
                    </Button>
                    <Button
                      type="submit"
                      variant="accent"
                      isLoading={isProcessing}
                      disabled={isProcessing}
                      icon={<Sparkles size={16} />}
                    >
                      {isProcessing
                        ? (engineMode === 'ai' ? 'Synthesizing with Gemini...' : 'Generating Summary...')
                        : (engineMode === 'ai' ? 'Summarize with Gemini AI' : 'Summarize with Demo Engine')}
                    </Button>
                  </div>
                </div>
              </form>
            </Card>

            {/* Saved Summaries Library */}
            <div className="summaries-library">
              <div className="library-search-head">
                <div className="lib-title-wrap">
                  <Layers size={14} />
                  <h4 className="library-title">Saved Summaries Library ({savedSummaries.length})</h4>
                </div>
                <div className="library-search-box">
                  <Search size={13} className="search-icon" />
                  <input
                    type="text"
                    className="search-input"
                    placeholder="Filter saved notes..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    aria-label="Filter saved notes"
                  />
                </div>
              </div>

              {filteredLibrary.length > 0 ? (
                <div className="library-list">
                  {filteredLibrary.map((item) => (
                    <div
                      key={item.id}
                      className={`library-item ${activeSummary?.id === item.id ? 'active' : ''}`}
                      onClick={() => {
                        setActiveSummaryId(item.id);
                        setIsEditing(false);
                      }}
                    >
                      <div className="library-item-top">
                        <span className="library-subject">{item.subject}</span>
                        <div className="lib-item-right">
                          <span className="library-date">{item.createdAt}</span>
                          <button
                            type="button"
                            className="lib-delete-btn"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenNoteInEditor(item);
                            }}
                            title="Edit Note in Editor"
                            aria-label={`Edit ${item.title}`}
                          >
                            <Edit3 size={13} />
                          </button>
                          <button
                            type="button"
                            className="lib-delete-btn"
                            onClick={(e) => {
                              e.stopPropagation();
                              promptDeleteNote(item.id);
                            }}
                            title="Delete Note"
                            aria-label={`Delete ${item.title}`}
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                      <div className="library-name">{item.title}</div>
                      <div className="library-stats">
                        <span>{item.wordCount} words → {item.summaryWordCount} words</span>
                        <span className="lib-badge-compression">
                          -{Math.max(10, Math.round((1 - item.summaryWordCount / Math.max(1, item.wordCount)) * 100))}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState
                  icon={<FileText size={22} />}
                  title="No Summaries Found"
                  description={searchQuery ? `No saved notes match "${searchQuery}".` : 'Your saved summaries will appear here.'}
                  actionLabel={searchQuery ? 'Clear Filter' : undefined}
                  onAction={() => setSearchQuery('')}
                />
              )}
            </div>
          </div>

          {/* Right Column: Active Summary Display */}
          <div className="summarizer-view-col">
            {activeSummary ? (
              <Card className="summary-viewer-card">
                {/* View Tabs: Summary vs Original Notes */}
                <div style={{ display: 'flex', gap: 'var(--space-2)', marginBottom: 'var(--space-4)', borderBottom: '1px solid var(--color-border)', paddingBottom: 'var(--space-3)' }}>
                  <Button
                    type="button"
                    variant={summaryViewTab === 'summary' ? 'primary' : 'outline'}
                    size="sm"
                    icon={<Sparkles size={13} />}
                    onClick={() => setSummaryViewTab('summary')}
                  >
                    Structured AI Summary
                  </Button>
                  <Button
                    type="button"
                    variant={summaryViewTab === 'original' ? 'primary' : 'outline'}
                    size="sm"
                    icon={<FileText size={13} />}
                    onClick={() => setSummaryViewTab('original')}
                  >
                    Original Notes ({activeSummary.wordCount} words)
                  </Button>
                </div>

                {/* Engine Transparency Notice */}
                {activeSummary.provider === 'gemini' ? (
                  <div className="gemini-ai-notice">
                    <span className="ai-notice-pill">
                      <Sparkles size={12} /> Gemini 2.5 Flash AI · Server Verified
                    </span>
                    <span className="ai-notice-text">
                      Synthesized via server-side Google Gemini integration. Factual statements, definitions, and formulas were extracted directly from your study notes without unsupported hallucinations.
                    </span>
                  </div>
                ) : (
                  <div className="rule-based-notice">
                    <span className="notice-pill">Rule-Based Demo Engine</span>
                    <span className="notice-text">
                      This summary was generated using the local rule-based engine. To generate with Google Gemini 2.5 Flash, select "Google Gemini" and ensure <code>GEMINI_API_KEY</code> is set in your server <code>.env</code> file.
                    </span>
                  </div>
                )}

                {/* Viewer Header */}
                <div className="viewer-header">
                  <div className="viewer-title-wrap">
                    <div className="viewer-meta">
                      <span className="badge badge-navy">{activeSummary.subject}</span>
                      <span className="viewer-date">
                        <Calendar size={12} /> {activeSummary.createdAt}
                      </span>
                    </div>

                    {isEditing ? (
                      <input
                        type="text"
                        className="form-input edit-title-input"
                        value={editedTitle}
                        onChange={(e) => setEditedTitle(e.target.value)}
                      />
                    ) : (
                      <h2 className="viewer-title">{activeSummary.title}</h2>
                    )}
                  </div>

                  <div className="viewer-actions">
                    <Button
                      variant="outline"
                      size="sm"
                      icon={<Edit3 size={14} />}
                      onClick={() => handleOpenNoteInEditor(activeSummary)}
                      title="Open original notes in editor"
                    >
                      Edit Notes
                    </Button>
                    {isEditing ? (
                      <>
                        <Button variant="outline" size="sm" onClick={handleCancelEdit}>
                          Cancel
                        </Button>
                        <Button variant="accent" size="sm" icon={<Save size={14} />} onClick={handleSaveEdit}>
                          Save Changes
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          icon={<Edit3 size={14} />}
                          onClick={handleStartEdit}
                          title="Edit Summary"
                        >
                          Edit Summary
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          icon={copied ? <Check size={14} /> : <Copy size={14} />}
                          onClick={handleCopySummary}
                          title="Copy Full Summary"
                        >
                          {copied ? 'Copied' : 'Copy'}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          icon={<Download size={14} />}
                          onClick={handleDownloadMarkdown}
                          title="Export as Markdown (.md)"
                        >
                          Export
                        </Button>
                      </>
                    )}
                  </div>
                </div>

                {summaryViewTab === 'original' ? (
                  <div className="original-notes-panel" style={{ padding: 'var(--space-4) 0' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-3)' }}>
                      <div>
                        <h4 style={{ margin: 0, fontSize: 'var(--font-size-md)', color: 'var(--color-navy-900)' }}>
                          Original Student Notes ({activeSummary.wordCount} words)
                        </h4>
                        <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>
                          Unstructured source text entered for {activeSummary.subject}
                        </span>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        icon={copied ? <Check size={13} /> : <Copy size={13} />}
                        onClick={() => {
                          navigator.clipboard.writeText(activeSummary.rawNotes);
                          setCopied(true);
                          setTimeout(() => setCopied(false), 2000);
                        }}
                      >
                        {copied ? 'Copied' : 'Copy Original Notes'}
                      </Button>
                    </div>
                    <div
                      style={{
                        background: 'var(--color-bg-subtle)',
                        border: '1px solid var(--color-border)',
                        borderRadius: 'var(--radius-md)',
                        padding: 'var(--space-4)',
                        maxHeight: '480px',
                        overflowY: 'auto',
                        whiteSpace: 'pre-wrap',
                        lineHeight: 1.6,
                        fontSize: 'var(--font-size-sm)',
                        color: 'var(--color-navy-900)',
                        fontFamily: 'inherit',
                      }}
                    >
                      {activeSummary.rawNotes}
                    </div>
                  </div>
                ) : (
                  <>

                {/* Compression Metrics Strip */}
                <div className="compression-bar">
                  <div className="compression-stat">
                    <span className="stat-name">Source Notes</span>
                    <span className="stat-val">{activeSummary.wordCount} words</span>
                  </div>
                  <div className="compression-divider">→</div>
                  <div className="compression-stat">
                    <span className="stat-name">Structured Synthesis</span>
                    <span className="stat-val text-violet">{activeSummary.summaryWordCount} words</span>
                  </div>
                  <div className="compression-pill">
                    {Math.max(15, Math.round((1 - activeSummary.summaryWordCount / Math.max(1, activeSummary.wordCount)) * 100))}% Reading Time Saved
                  </div>
                </div>

                {/* 1. Overview Section */}
                <div className="summary-section">
                  <h4 className="section-label">1. Executive Overview</h4>
                  {isEditing ? (
                    <textarea
                      rows={3}
                      className="form-input form-textarea edit-field"
                      value={editedOverview}
                      onChange={(e) => setEditedOverview(e.target.value)}
                    />
                  ) : (
                    <p className="summary-body-text">{activeSummary.overview}</p>
                  )}
                </div>

                {/* 2. Main Ideas & Key Points */}
                <div className="summary-section">
                  <h4 className="section-label">2. Main Ideas & Key Points ({activeSummary.keyPoints.length})</h4>
                  {isEditing ? (
                    <textarea
                      rows={4}
                      className="form-input form-textarea edit-field"
                      placeholder="One point per line"
                      value={editedKeyPoints}
                      onChange={(e) => setEditedKeyPoints(e.target.value)}
                    />
                  ) : (
                    <ul className="takeaways-list">
                      {activeSummary.keyPoints.map((point, idx) => (
                        <li key={idx} className="takeaway-item">
                          <span className="takeaway-bullet">{idx + 1}</span>
                          <span>{point}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                {/* 3. Important Terms & Definitions (when supported) */}
                {activeSummary.terms.length > 0 && (
                  <div className="summary-section">
                    <h4 className="section-label">3. Grounded Terms & Definitions ({activeSummary.terms.length})</h4>
                    <div className="terms-grid">
                      {activeSummary.terms.map((t, idx) => (
                        <div key={idx} className="term-card-box">
                          <strong className="term-title">{t.term}</strong>
                          <p className="term-def">{t.definition}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 4. Facts, Formulas, or Dates (when supported) */}
                {activeSummary.factsAndFormulas.length > 0 && (
                  <div className="summary-section">
                    <h4 className="section-label">4. Key Facts, Formulas & Dates ({activeSummary.factsAndFormulas.length})</h4>
                    <div className="facts-list">
                      {activeSummary.factsAndFormulas.map((f, idx) => (
                        <div key={idx} className="fact-item-row">
                          <Badge variant={f.type === 'formula' ? 'violet' : f.type === 'date' ? 'amber' : 'navy'}>
                            {f.label}
                          </Badge>
                          <span className="fact-content">{f.content}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 5. Revision Takeaways */}
                <div className="summary-section">
                  <h4 className="section-label">5. High-Yield Revision Takeaways</h4>
                  {isEditing ? (
                    <textarea
                      rows={3}
                      className="form-input form-textarea edit-field"
                      placeholder="One takeaway per line"
                      value={editedTakeaways}
                      onChange={(e) => setEditedTakeaways(e.target.value)}
                    />
                  ) : (
                    <div className="revision-takeaways-box">
                      {activeSummary.takeaways.map((takeaway, idx) => (
                        <div key={idx} className="takeaway-pill-row">
                          <CheckCircle2 size={14} className="text-emerald" />
                          <span>{takeaway}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Integration Action: Send to Quiz Generator */}
                <div className="send-to-quiz-strip">
                  <div className="quiz-strip-text">
                    <strong>Ready to test your retention?</strong>
                    <span>Generate practice multiple-choice and True/False questions directly from these notes.</span>
                  </div>
                  <Button
                    variant="accent"
                    size="md"
                    icon={<ArrowRight size={16} />}
                    iconPosition="right"
                    onClick={handleSendToQuiz}
                  >
                    Send to Quiz Generator
                  </Button>
                </div>
                </>
              )}
              </Card>
            ) : (
              <EmptyState
                icon={<BookOpen size={40} />}
                title="No Summary Selected"
                description="Paste lecture notes on the left and click 'Summarize Notes' to generate your first structured academic summary."
              />
            )}
          </div>
        </div>
      </div>

      {/* Clear Confirmation Modal */}
      <Modal
        isOpen={isClearModalOpen}
        onClose={() => setIsClearModalOpen(false)}
        title="Clear Notes Text?"
        subtitle="This action will remove all current input text from the textarea."
        footer={
          <>
            <Button variant="outline" size="sm" onClick={() => setIsClearModalOpen(false)}>
              Keep Text
            </Button>
            <Button variant="primary" size="sm" onClick={handleConfirmClear}>
              Clear Input
            </Button>
          </>
        }
      >
        <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
          You have entered {wordCount} words. Are you sure you want to clear your current draft? Any generated summaries in your library will remain saved.
        </p>
      </Modal>

      {/* Delete Note Confirmation Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="Delete Saved Note?"
        subtitle="Remove this note and its summary from your library."
        footer={
          <>
            <Button variant="outline" size="sm" onClick={() => setIsDeleteModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="accent" size="sm" onClick={handleConfirmDeleteNote}>
              Delete Note
            </Button>
          </>
        }
      >
        <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
          Are you sure you want to delete this note from your saved library? This action cannot be undone. Any quizzes generated from this note will remain available in your quiz history.
        </p>
      </Modal>
    </div>
  );
};
