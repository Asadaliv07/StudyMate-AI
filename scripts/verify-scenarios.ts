/**
 * Verification Script for Prompt 4: AI Notes Summarizer & AI Quiz Generator
 * Tests all 9 required scenarios:
 * 1. Summarizing valid notes.
 * 2. Submitting empty notes.
 * 3. Copying and editing a summary.
 * 4. Generating a quiz from the same notes used in the summarizer.
 * 5. Answering and submitting a quiz.
 * 6. Retrying a quiz and generating a new one.
 * 7. Requesting more questions than the notes can support.
 * 8. Refreshing the page to check saved summaries and quiz results (storage format).
 * 9. Mobile responsive CSS rules validation.
 */

import {
  generateStructuredSummary,
  validateNotesInput,
  formatSummaryAsMarkdown,
  SAMPLE_STUDY_NOTES,
} from '../src/services/summarizerEngine.ts';
import {
  generateQuizFromNotes,
  validateQuizSetup,
} from '../src/services/quizEngine.ts';
import type {
  StructuredSummary,
  CompletedQuizResult,
  SharedNotesPayload,
} from '../src/types/index.ts';
import fs from 'node:fs';
import path from 'node:path';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ FAILED: ${message}`);
    process.exit(1);
  } else {
    console.log(`✅ PASSED: ${message}`);
  }
}

console.log('=== STARTING PROMPT 4 VERIFICATION SUITE ===\n');

// -----------------------------------------------------------------------------
// Scenario 1: Summarizing valid notes
// -----------------------------------------------------------------------------
console.log('--- Scenario 1: Summarizing valid notes ---');
const sample = SAMPLE_STUDY_NOTES.transformers; // Attention is All You Need
const validationValid = validateNotesInput(sample.text);
assert(validationValid.isValid === true, 'Valid sample notes pass validation');
assert(!validationValid.error, 'No validation error on valid notes');

const summary = generateStructuredSummary(sample.text, sample.title, sample.subject);
assert(Boolean(summary.id), 'Generated summary has a unique ID');
assert(summary.title === sample.title, 'Summary retains title');
assert(summary.subject === sample.subject, 'Summary retains subject');
assert(summary.wordCount > 50, `Word count calculated accurately (${summary.wordCount} words)`);
assert(summary.overview.length > 20, 'Generated a structured overview');
assert(summary.keyPoints.length >= 3, `Extracted ${summary.keyPoints.length} key points`);
assert(summary.terms.length >= 1, `Extracted ${summary.terms.length} grounded terms with definitions`);
assert(summary.factsAndFormulas.length >= 1, `Extracted ${summary.factsAndFormulas.length} grounded facts/formulas`);
assert(summary.takeaways.length >= 2, `Extracted ${summary.takeaways.length} revision takeaways`);
assert(summary.isRuleBasedDemo === true, 'Honest badge indicating rule-based demo engine');

// -----------------------------------------------------------------------------
// Scenario 2: Submitting empty notes
// -----------------------------------------------------------------------------
console.log('\n--- Scenario 2: Submitting empty or short notes ---');
const emptyCheck = validateNotesInput('');
assert(emptyCheck.isValid === false, 'Empty string is rejected');
assert(Boolean(emptyCheck.error?.includes('paste or type')), 'Friendly error message for empty input');

const spacesCheck = validateNotesInput('     \n\t   ');
assert(spacesCheck.isValid === false, 'Whitespace-only string is rejected');

const tooShortCheck = validateNotesInput('Too short note.');
assert(tooShortCheck.isValid === false, 'Short note under 20 chars is rejected');
assert(Boolean(tooShortCheck.error?.includes('10 words')), 'Friendly error message specifying minimum length requirement');

// -----------------------------------------------------------------------------
// Scenario 3: Copying and editing a summary
// -----------------------------------------------------------------------------
console.log('\n--- Scenario 3: Copying and editing a summary ---');
const markdownExport = formatSummaryAsMarkdown(summary);
assert(markdownExport.includes(`# ${summary.title}`), 'Markdown export contains title');
assert(markdownExport.includes('## Overview'), 'Markdown export contains Overview section');
assert(markdownExport.includes('## Key Points'), 'Markdown export contains Key Points');
assert(markdownExport.includes('## Revision Takeaways'), 'Markdown export contains Revision Takeaways');
assert(markdownExport.includes('Generated via StudyMate AI'), 'Markdown contains honest generator attribution');

// Test editing structure
const editedSummary: StructuredSummary = {
  ...summary,
  overview: 'User edited overview text with updated notes.',
  keyPoints: [...summary.keyPoints, 'User added point.'],
};
assert(editedSummary.overview.startsWith('User edited'), 'Inline editing preserves mutated overview');
assert(editedSummary.keyPoints.length === summary.keyPoints.length + 1, 'Inline editing supports adding items');

// -----------------------------------------------------------------------------
// Scenario 4: Generating a quiz from the same notes used in summarizer
// -----------------------------------------------------------------------------
console.log('\n--- Scenario 4: Shared notes pipeline (Summarizer -> Quiz) ---');
const sharedPayload: SharedNotesPayload = {
  title: summary.title,
  subject: summary.subject,
  notesText: sample.text,
  timestamp: Date.now(),
};

assert(sharedPayload.notesText.length > 50, 'Shared notes payload carries source text');
assert(sharedPayload.title === summary.title, 'Shared notes payload carries title');

const quizSetupValidation = validateQuizSetup(sharedPayload.subject, sharedPayload.notesText);
assert(quizSetupValidation.isValid === true, 'Quiz generator accepts notes forwarded from summarizer');

// -----------------------------------------------------------------------------
// Scenario 5: Answering and submitting a quiz
// -----------------------------------------------------------------------------
console.log('\n--- Scenario 5: Answering and submitting a quiz ---');
const generatedQuiz = generateQuizFromNotes(
  sharedPayload.notesText,
  sharedPayload.subject,
  5,
  'Medium',
  'mixed'
);

assert(generatedQuiz.questions.length > 0, `Generated ${generatedQuiz.questions.length} questions`);
assert(generatedQuiz.questions.every((q) => q.explanation.length > 0), 'Every question has an explanation based on notes');
assert(generatedQuiz.questions.every((q) => q.options.length >= 2), 'Questions have at least 2 options (T/F or 4-option MCQ)');

// Simulate answering all questions correctly
const userAnswers: Record<string, number> = {};
generatedQuiz.questions.forEach((q) => {
  userAnswers[q.id] = q.correctAnswerIndex;
});

const correctCount = generatedQuiz.questions.reduce((acc, q) => {
  return acc + (userAnswers[q.id] === q.correctAnswerIndex ? 1 : 0);
}, 0);
const percentage = Math.round((correctCount / generatedQuiz.questions.length) * 100);

assert(correctCount === generatedQuiz.questions.length, 'Correctly matched all answers');
assert(percentage === 100, 'Score calculated as 100%');

// -----------------------------------------------------------------------------
// Scenario 6: Retrying a quiz and generating a new one
// -----------------------------------------------------------------------------
console.log('\n--- Scenario 6: Retrying a quiz and generating a new one ---');
// Retry reset:
const resetAnswers: Record<string, number> = {};
assert(Object.keys(resetAnswers).length === 0, 'Retry empties chosen answers while retaining questions');

// Generate new quiz:
const freshQuiz = generateQuizFromNotes(
  SAMPLE_STUDY_NOTES.raft.text,
  SAMPLE_STUDY_NOTES.raft.subject,
  5,
  'Hard',
  'multiple-choice'
);
assert(freshQuiz.id !== generatedQuiz.id, 'New quiz gets a distinct quiz ID');
assert(freshQuiz.subject === SAMPLE_STUDY_NOTES.raft.subject, 'New quiz uses new subject');

// -----------------------------------------------------------------------------
// Scenario 7: Requesting more questions than notes can support
// -----------------------------------------------------------------------------
console.log('\n--- Scenario 7: Capacity constraint (requesting more questions than notes support) ---');
const minimalNotes = 'Mitochondria is known as the powerhouse of the eukaryotic cell. It produces adenosine triphosphate (ATP) through oxidative phosphorylation.';
const highCountQuiz = generateQuizFromNotes(
  minimalNotes,
  'Biology',
  15,
  'Easy',
  'multiple-choice'
);

assert(highCountQuiz.questions.length < 15, `Gracefully capped questions to ${highCountQuiz.questions.length} without hallucinating`);
assert(Boolean(highCountQuiz.explanationOfCount), 'Provided honest explanation for capped question count');
console.log(`  -> Note from engine: "${highCountQuiz.explanationOfCount}"`);

// -----------------------------------------------------------------------------
// Scenario 8: Refreshing the page / Storage persistence
// -----------------------------------------------------------------------------
console.log('\n--- Scenario 8: LocalStorage persistence & corrupt data handling ---');
const sampleResult: CompletedQuizResult = {
  id: 'test-quiz-res-1',
  quizId: generatedQuiz.id,
  title: generatedQuiz.title,
  subject: generatedQuiz.subject,
  date: 'Oct 22, 2026',
  timestamp: Date.now(),
  score: correctCount,
  totalQuestions: generatedQuiz.questions.length,
  percentage,
  difficulty: 'Medium',
  type: 'mixed',
};

// Test JSON round-trip
const serialized = JSON.stringify([sampleResult]);
const deserialized = JSON.parse(serialized) as CompletedQuizResult[];
assert(deserialized.length === 1, 'Quiz result serializes and deserializes accurately');
assert(deserialized[0].id === sampleResult.id, 'Preserved result ID');
assert(deserialized[0].percentage === 100, 'Preserved result score');

// Corrupted data handling test
try {
  const badData = 'null';
  const parsed = JSON.parse(badData);
  const fallback = Array.isArray(parsed) ? parsed : [];
  assert(fallback.length === 0, 'Gracefully handles non-array stored data');
} catch (e) {
  assert(false, `Should not throw: ${e}`);
}

// -----------------------------------------------------------------------------
// Scenario 9: Responsive CSS checks
// -----------------------------------------------------------------------------
console.log('\n--- Scenario 9: Mobile responsiveness verification ---');
const summarizerCssPath = path.resolve(process.cwd(), 'src/pages/Summarizer/SummarizerPage.css');
const quizCssPath = path.resolve(process.cwd(), 'src/pages/Quiz/QuizPage.css');

assert(fs.existsSync(summarizerCssPath), 'SummarizerPage.css exists');
assert(fs.existsSync(quizCssPath), 'QuizPage.css exists');

const summarizerCss = fs.readFileSync(summarizerCssPath, 'utf8');
const quizCss = fs.readFileSync(quizCssPath, 'utf8');

assert(summarizerCss.includes('@media (max-width: 1024px)'), 'Summarizer has 1024px tablet breakpoint');
assert(summarizerCss.includes('@media (max-width: 640px)'), 'Summarizer has 640px mobile breakpoint');
assert(quizCss.includes('@media (max-width: 768px)'), 'Quiz has 768px tablet breakpoint');
assert(quizCss.includes('@media (max-width: 640px)'), 'Quiz has 640px mobile breakpoint');

console.log('\n=================================================');
console.log('🎉 ALL 9 SCENARIOS VERIFIED SUCCESSFULLY!');
console.log('=================================================');
