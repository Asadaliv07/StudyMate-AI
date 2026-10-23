import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Sparkles,
  ArrowRight,
  Calendar,
  FileText,
  HelpCircle,
  TrendingUp,
  CheckCircle2,
  BookOpen,
  Zap,
  Upload,
  Brain,
  CheckSquare,
  ChevronDown,
  ChevronUp,
  Award,
} from 'lucide-react';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { Card } from '../../components/common/Card';
import { ProfileModal } from '../../components/common/ProfileModal';
import {
  DoodlePencil,
  DoodleArrow,
  DoodleSquiggle,
  DoodleStar,
  DoodleCoffee,
} from '../../components/common/DoodleIcons';
import { getUserProfile } from '../../services/storageService';
import type { StudentProfile } from '../../types';
import './HomePage.css';

interface FAQItem {
  question: string;
  answer: string;
  category: string;
}

const FAQ_ITEMS: FAQItem[] = [
  {
    category: 'Cognitive Science',
    question: 'How does StudyMate AI calculate my personalized study schedule?',
    answer:
      'StudyMate utilizes the Ebbinghaus forgetting curve combined with spaced repetition algorithms. When you add your exam dates and available hours, the engine distributes topics into optimal 25m and 50m intervals, prioritizing subjects with the highest exam weighting and lowest recent retention scores.',
  },
  {
    category: 'Academic Integrity',
    question: 'Is StudyMate AI compliant with university academic integrity and honor codes?',
    answer:
      'Yes, 100%. StudyMate AI is engineered as an active study co-pilot, not an essay generator or ghostwriter. It synthesizes your own uploaded notes into structured study guides, extracts key theorems, and tests your retention via practice quizzes—fostering genuine deep comprehension.',
  },
  {
    category: 'Features',
    question: 'What document formats are supported in the Notes Summarizer?',
    answer:
      'You can paste raw text or transcripts directly into the workspace. The engine supports lecture transcriptions, textbook chapter excerpts, paper abstracts, and syllabus files across STEM, Humanities, and Social Sciences.',
  },
  {
    category: 'Quizzes',
    question: 'How does the Quiz Generator differ from traditional flashcard apps?',
    answer:
      'Unlike static flashcards, StudyMate generates conceptual questions calibrated to Bloom’s Taxonomy (Application, Analysis, and Evaluation). Each question includes detailed cognitive rationales explaining why the correct answer holds and why distractors are invalid.',
  },
  {
    category: 'Schedule',
    question: 'Can I adjust my daily study availability and preferred focus intervals?',
    answer:
      'Yes. Through the Study Planner, you can set your target daily study budget, choose between 25/5 or 50/10 Pomodoro rhythms, and reschedule study blocks whenever extracurriculars or exams shift your week.',
  },
  {
    category: 'Pricing',
    question: 'Is StudyMate AI free for undergraduate and graduate college students?',
    answer:
      'The foundational tier is completely free for college students with a verified .edu email address, including unlimited study schedules, note summarizations, and practice quizzes.',
  },
];

export const HomePage: React.FC = () => {
  const [profile, setProfile] = useState<StudentProfile>(getUserProfile);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'planner' | 'summarizer' | 'quiz' | 'progress'>('planner');
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

  React.useEffect(() => {
    const handleStorageUpdate = () => {
      setProfile(getUserProfile());
    };
    window.addEventListener('studymate_data_changed', handleStorageUpdate);
    window.addEventListener('storage', handleStorageUpdate);
    return () => {
      window.removeEventListener('studymate_data_changed', handleStorageUpdate);
      window.removeEventListener('storage', handleStorageUpdate);
    };
  }, []);

  const getInitials = (name: string): string => {
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const toggleFaq = (index: number) => {
    setOpenFaqIndex(openFaqIndex === index ? null : index);
  };

  return (
    <div className="home-root">
      {/* 1. Hero Section */}
      <section className="hero-section">
        <div className="container hero-container">
          <div className="hero-content">
            <div className="hero-badge-wrap" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Badge variant="violet" icon={<DoodlePencil size={16} />}>
                Creative Doodle Edition • Notebook AI
              </Badge>
              <DoodleStar size={20} color="#FFE66D" />
            </div>

            <h1 className="hero-title">
              Master Difficult Subjects with Your Personal{' '}
              <span className="text-gradient">Doodle Study Co-Pilot</span>
            </h1>

            <div style={{ margin: '4px 0 12px' }}>
              <DoodleSquiggle width={140} height={14} color="#FFE66D" />
            </div>

            <p className="hero-subtitle">
              Turn messy lecture notes and complex textbooks into fun spaced-repetition schedules,
              hand-drawn style study summaries, interactive practice quizzes, and cognitive retention charts.
            </p>

            <div className="hero-cta-group">
              <Link to="/dashboard">
                <Button variant="accent" size="lg" icon={<ArrowRight size={18} />} iconPosition="right">
                  Open Study Notebook 📓
                </Button>
              </Link>
              <Link to="/planner">
                <Button variant="outline" size="lg" icon={<Calendar size={18} />}>
                  Explore Study Planner
                </Button>
              </Link>
              <div style={{ display: 'none', position: 'absolute', right: '-80px', top: '-15px' }} className="doodle-hero-arrow">
                <DoodleArrow size={42} color="#1E2022" />
              </div>
            </div>

            <div className="hero-social-proof">
              <div className="social-avatars">
                <span className="avatar-chip">📝</span>
                <span className="avatar-chip" title="Focus coffee"><DoodleCoffee size={16} color="#1E2022" /></span>
                <span className="avatar-chip">🎨</span>
              </div>
              <p className="social-text">
                Designed for students, thinkers, and visual learners worldwide.
              </p>
            </div>
          </div>

          {/* Hero Preview Card */}
          <div className="hero-visual">
            <Card variant="navy" className="hero-dashboard-preview">
              {/* Cute Washi Tape on Top */}
              <div className="washi-tape" />
              <div
                className="preview-header"
                style={{ cursor: 'pointer' }}
                onClick={() => setIsProfileModalOpen(true)}
                title="Click to customize your student identity"
              >
                <div className="preview-student">
                  <div className="preview-avatar">{getInitials(profile.name)}</div>
                  <div>
                    <div className="preview-name">{profile.name}</div>
                    <div className="preview-major">{profile.major || 'Academic Scholar'}</div>
                  </div>
                </div>
                <Badge variant="emerald" icon={<Zap size={12} />}>
                  {profile.currentStreak || 14} Day Streak
                </Badge>
              </div>

              <div className="preview-ai-alert">
                <div className="alert-spark-icon">
                  <Sparkles size={16} />
                </div>
                <div>
                  <div className="alert-title">AI Recommendation for Today</div>
                  <div className="alert-desc">
                    High cognitive load detected. Tackle Bellman Equations before 2 PM, followed by a 20m quiz.
                  </div>
                </div>
              </div>

              <div className="preview-stats-row">
                <div className="preview-stat-item">
                  <span className="stat-label">Retention Rate</span>
                  <span className="stat-num">92.4%</span>
                </div>
                <div className="preview-stat-item">
                  <span className="stat-label">Study Time</span>
                  <span className="stat-num">26.5 hrs</span>
                </div>
                <div className="preview-stat-item">
                  <span className="stat-label">Mastered Cards</span>
                  <span className="stat-num">480</span>
                </div>
              </div>

              <div className="preview-task-item">
                <div className="task-indicator" />
                <div className="task-info">
                  <div className="task-name">CS 234: Value Iteration & Policy Gradients</div>
                  <div className="task-sub">Due Tomorrow • 50 mins allocated</div>
                </div>
                <Badge variant="navy">In Progress</Badge>
              </div>
            </Card>
          </div>
        </div>
      </section>

      {/* 2. Feature Pillars Grid */}
      <section className="features-section">
        <div className="container">
          <div className="section-head-center">
            <Badge variant="navy">Modular Study Suite</Badge>
            <h2 className="section-title">Engineered Around Cognitive Science</h2>
            <p className="section-desc">
              Every tool in StudyMate AI is tuned to active recall, spaced repetition, and interleaving practice.
            </p>
          </div>

          <div className="grid-cards">
            {/* Planner */}
            <Card interactive className="feature-card">
              <div className="feature-icon-box bg-violet">
                <Calendar size={24} className="text-violet" />
              </div>
              <h3 className="feature-title">AI Study Planner</h3>
              <p className="feature-description">
                Dynamic schedules that adapt to your upcoming syllabus deadlines and exam weightings.
              </p>
              <ul className="feature-bullets">
                <li><CheckCircle2 size={15} /> Spaced repetition intervals</li>
                <li><CheckCircle2 size={15} /> AI Pomodoro recommendations</li>
                <li><CheckCircle2 size={15} /> Exam countdown pacing</li>
              </ul>
              <Link to="/planner" className="feature-link">
                Explore Planner <ArrowRight size={14} />
              </Link>
            </Card>

            {/* Summarizer */}
            <Card interactive className="feature-card">
              <div className="feature-icon-box bg-sky">
                <FileText size={24} className="text-sky" />
              </div>
              <h3 className="feature-title">Notes Summarizer</h3>
              <p className="feature-description">
                Paste lecture transcripts or textbook chapters. Receive structured concept maps and key takeaways.
              </p>
              <ul className="feature-bullets">
                <li><CheckCircle2 size={15} /> Key formula & theorem extraction</li>
                <li><CheckCircle2 size={15} /> Multi-level depth adjustments</li>
                <li><CheckCircle2 size={15} /> Instant flashcard conversion</li>
              </ul>
              <Link to="/summarizer" className="feature-link">
                Explore Summarizer <ArrowRight size={14} />
              </Link>
            </Card>

            {/* Quiz Generator */}
            <Card interactive className="feature-card">
              <div className="feature-icon-box bg-emerald">
                <HelpCircle size={24} className="text-emerald" />
              </div>
              <h3 className="feature-title">Quiz Generator</h3>
              <p className="feature-description">
                Generate high-yield self-tests based on Bloom’s Taxonomy to identify hidden knowledge blind spots.
              </p>
              <ul className="feature-bullets">
                <li><CheckCircle2 size={15} /> Multiple choice & short answer</li>
                <li><CheckCircle2 size={15} /> Step-by-step reasoning explanations</li>
                <li><CheckCircle2 size={15} /> Difficulty calibrated to course level</li>
              </ul>
              <Link to="/quiz" className="feature-link">
                Explore Quizzes <ArrowRight size={14} />
              </Link>
            </Card>

            {/* Progress */}
            <Card interactive className="feature-card">
              <div className="feature-icon-box bg-amber">
                <TrendingUp size={24} className="text-amber" />
              </div>
              <h3 className="feature-title">Progress & Retention</h3>
              <p className="feature-description">
                Empirical mastery tracking across each academic discipline with decay alerts before exams.
              </p>
              <ul className="feature-bullets">
                <li><CheckCircle2 size={15} /> Forgetting curve predictions</li>
                <li><CheckCircle2 size={15} /> Weekly velocity analysis</li>
                <li><CheckCircle2 size={15} /> Focus streak accountability</li>
              </ul>
              <Link to="/progress" className="feature-link">
                Explore Progress <ArrowRight size={14} />
              </Link>
            </Card>
          </div>
        </div>
      </section>

      {/* 3. How It Works Section */}
      <section className="how-it-works-section">
        <div className="container">
          <div className="section-head-center">
            <Badge variant="violet" icon={<Brain size={14} />}>
              The Scientific Method
            </Badge>
            <h2 className="section-title">How StudyMate Accelerates Your Grades</h2>
            <p className="section-desc">
              Four structured steps to transform passive reading into long-term academic mastery.
            </p>
          </div>

          <div className="workflow-steps-grid">
            <div className="workflow-step-card">
              <div className="step-number-badge">1</div>
              <div className="step-icon-wrap">
                <Upload size={22} className="text-violet" />
              </div>
              <h3 className="step-title">Sync Coursework</h3>
              <p className="step-desc">
                Paste lecture notes, textbook chapters, or problem sets into your private academic workspace.
              </p>
            </div>

            <div className="workflow-step-card">
              <div className="step-number-badge">2</div>
              <div className="step-icon-wrap">
                <Sparkles size={22} className="text-violet" />
              </div>
              <h3 className="step-title">Synthesize Insights</h3>
              <p className="step-desc">
                Receive high-yield executive summaries, theorem extractions, and core concept flashcards in seconds.
              </p>
            </div>

            <div className="workflow-step-card">
              <div className="step-number-badge">3</div>
              <div className="step-icon-wrap">
                <CheckSquare size={22} className="text-violet" />
              </div>
              <h3 className="step-title">Active Recall Quizzing</h3>
              <p className="step-desc">
                Solve diagnostic quizzes with step-by-step reasoning rationales to strengthen synaptic memory pathways.
              </p>
            </div>

            <div className="workflow-step-card">
              <div className="step-number-badge">4</div>
              <div className="step-icon-wrap">
                <Award size={22} className="text-violet" />
              </div>
              <h3 className="step-title">Mastery Retention</h3>
              <p className="step-desc">
                Track forgetting curve decay alerts and achieve peak cognitive retention right on exam day.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Interactive Module Preview Showcase */}
      <section className="showcase-section">
        <div className="container">
          <div className="showcase-box">
            <div className="showcase-header">
              <div>
                <Badge variant="violet">Interactive Live Sandbox</Badge>
                <h3 className="showcase-title">Preview Your Academic Toolkit</h3>
              </div>
              <div className="showcase-tabs">
                <button
                  type="button"
                  className={`showcase-tab ${activeTab === 'planner' ? 'active' : ''}`}
                  onClick={() => setActiveTab('planner')}
                >
                  Planner
                </button>
                <button
                  type="button"
                  className={`showcase-tab ${activeTab === 'summarizer' ? 'active' : ''}`}
                  onClick={() => setActiveTab('summarizer')}
                >
                  Summarizer
                </button>
                <button
                  type="button"
                  className={`showcase-tab ${activeTab === 'quiz' ? 'active' : ''}`}
                  onClick={() => setActiveTab('quiz')}
                >
                  Quiz Generator
                </button>
                <button
                  type="button"
                  className={`showcase-tab ${activeTab === 'progress' ? 'active' : ''}`}
                  onClick={() => setActiveTab('progress')}
                >
                  Analytics
                </button>
              </div>
            </div>

            <div className="showcase-body">
              {activeTab === 'planner' && (
                <div className="showcase-pane">
                  <div className="pane-info">
                    <h4>Smart Spaced-Repetition Calendar</h4>
                    <p>
                      StudyMate allocates your study blocks based on difficulty weight and the Ebbinghaus forgetting curve.
                    </p>
                    <Link to="/planner">
                      <Button variant="primary" icon={<ArrowRight size={16} />} iconPosition="right">
                        Open Planner
                      </Button>
                    </Link>
                  </div>
                  <div className="pane-preview">
                    <div className="mock-schedule-card">
                      <div className="mock-time">09:00 AM - 10:30 AM</div>
                      <div className="mock-title">Distributed Systems Raft Consensus</div>
                      <span className="badge badge-emerald">Optimal Focus Window</span>
                    </div>
                    <div className="mock-schedule-card">
                      <div className="mock-time">02:00 PM - 02:45 PM</div>
                      <div className="mock-title">Cognitive Psychology Chapter 7 Flashcards</div>
                      <span className="badge badge-violet">Spaced Review</span>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'summarizer' && (
                <div className="showcase-pane">
                  <div className="pane-info">
                    <h4>High-Density Note Synthesis</h4>
                    <p>
                      Reduces multi-page papers down into core claims, formula proofs, and study flashcards without losing rigor.
                    </p>
                    <Link to="/summarizer">
                      <Button variant="primary" icon={<ArrowRight size={16} />} iconPosition="right">
                        Open Summarizer
                      </Button>
                    </Link>
                  </div>
                  <div className="pane-preview">
                    <div className="mock-summary-card">
                      <div className="mock-summary-badge">Key Concept Extracted</div>
                      <p className="mock-summary-text">
                        "Residual learning reformulates layers as learning residual functions with reference to the layer inputs, addressing the vanishing gradient dilemma."
                      </p>
                      <div className="mock-tags">
                        <span className="badge badge-outline">ResNet</span>
                        <span className="badge badge-outline">Deep Learning</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'quiz' && (
                <div className="showcase-pane">
                  <div className="pane-info">
                    <h4>Adaptive Assessment Generator</h4>
                    <p>
                      Generate diagnostic quizzes directly from your course materials to stress-test your retention under exam conditions.
                    </p>
                    <Link to="/quiz">
                      <Button variant="primary" icon={<ArrowRight size={16} />} iconPosition="right">
                        Open Quiz Generator
                      </Button>
                    </Link>
                  </div>
                  <div className="pane-preview">
                    <div className="mock-quiz-card">
                      <div className="mock-question">
                        What is the primary computational benefit of Multi-Head Attention over single-head attention in Transformers?
                      </div>
                      <div className="mock-options">
                        <div className="mock-opt selected">
                          ✓ Attends to information from different representation subspaces concurrently
                        </div>
                        <div className="mock-opt">Reduces parameter count to zero</div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'progress' && (
                <div className="showcase-pane">
                  <div className="pane-info">
                    <h4>Cognitive Mastery Dashboard</h4>
                    <p>
                      Gain deep clarity on your subject velocity, exam readiness scores, and daily study habits.
                    </p>
                    <Link to="/progress">
                      <Button variant="primary" icon={<ArrowRight size={16} />} iconPosition="right">
                        Open Progress
                      </Button>
                    </Link>
                  </div>
                  <div className="pane-preview">
                    <div className="mock-progress-bars">
                      <div className="mock-bar-item">
                        <div className="mock-bar-label">
                          <span>Machine Learning</span>
                          <span>92%</span>
                        </div>
                        <div className="bar-track">
                          <div className="bar-fill" style={{ width: '92%' }} />
                        </div>
                      </div>
                      <div className="mock-bar-item">
                        <div className="mock-bar-label">
                          <span>Distributed Systems</span>
                          <span>78%</span>
                        </div>
                        <div className="bar-track">
                          <div className="bar-fill" style={{ width: '78%' }} />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* 5. Frequently Asked Questions (FAQ) Accordion */}
      <section className="faq-section">
        <div className="container container-narrow">
          <div className="section-head-center">
            <Badge variant="navy">Scholarly Inquiries</Badge>
            <h2 className="section-title">Frequently Asked Questions</h2>
            <p className="section-desc">
              Everything you need to know about our algorithms, integrity pledge, and student access.
            </p>
          </div>

          <div className="faq-accordion">
            {FAQ_ITEMS.map((item, index) => {
              const isOpen = openFaqIndex === index;
              return (
                <div key={index} className={`faq-item ${isOpen ? 'faq-item-open' : ''}`}>
                  <button
                    type="button"
                    className="faq-question-btn"
                    onClick={() => toggleFaq(index)}
                    aria-expanded={isOpen}
                  >
                    <div className="faq-question-left">
                      <span className="faq-category-tag">{item.category}</span>
                      <span className="faq-question-text">{item.question}</span>
                    </div>
                    <div className="faq-chevron">
                      {isOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                    </div>
                  </button>

                  {isOpen && (
                    <div className="faq-answer-panel">
                      <p className="faq-answer-text">{item.answer}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 6. Academic Trust & Bottom CTA */}
      <section className="cta-section">
        <div className="container">
          <Card variant="navy" className="cta-card">
            <div className="cta-content">
              <Badge variant="violet" icon={<BookOpen size={14} />}>
                Ready for Finals & Research?
              </Badge>
              <h2 className="cta-title">Build Your Personalized Academic Routine Today</h2>
              <p className="cta-desc">
                Organize your coursework, conquer heavy reading loads, and retain key concepts with StudyMate AI.
              </p>
              <div className="cta-actions">
                <Link to="/dashboard">
                  <Button variant="accent" size="lg" icon={<Sparkles size={18} />}>
                    Get Started Free
                  </Button>
                </Link>
                <Link to="/summarizer">
                  <Button variant="outline" size="lg" style={{ color: '#FFFFFF', borderColor: 'rgba(255,255,255,0.2)' }}>
                    Try Notes Summarizer
                  </Button>
                </Link>
              </div>
            </div>
          </Card>
        </div>
      </section>

      {/* Modal: Edit Student Profile & Preferences */}
      <ProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        onProfileUpdated={(updated) => setProfile(updated)}
      />
    </div>
  );
};
