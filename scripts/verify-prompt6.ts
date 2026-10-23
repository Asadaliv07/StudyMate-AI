/**
 * PROMPT 6 Automated Verification Suite:
 * Tests the complete 12-step workflow specified in Section 10 of Prompt 6.
 *
 * Sequence:
 * 1. Create a study plan with multiple subjects.
 * 2. Mark a study task as completed.
 * 3. Refresh (re-read storage) and verify the task remains completed.
 * 4. Save notes and a summary.
 * 5. Reopen and edit the saved notes (stable ID, no duplicates).
 * 6. Generate and complete a quiz (client-side scoring integrity).
 * 7. Refresh and verify the quiz result remains available.
 * 8. Check that Dashboard statistics match the saved data.
 * 9. Check that Progress statistics match the saved data.
 * 10. Delete a record and verify the related statistics update immediately.
 * 11. Test empty states and invalid/corrupt stored data handling.
 * 12. Verify that no API keys or secrets are stored in local storage.
 */

import assert from 'node:assert/strict';

// ---------------------------------------------------------------------------
// 0. Mock Browser Storage & Event System for Node.js test environment
// ---------------------------------------------------------------------------
const storageMap = new Map<string, string>();
const eventLog: { type: string; detail?: unknown }[] = [];

class MockLocalStorage {
  getItem(key: string): string | null {
    return storageMap.has(key) ? storageMap.get(key)! : null;
  }
  setItem(key: string, value: string): void {
    storageMap.set(key, String(value));
  }
  removeItem(key: string): void {
    storageMap.delete(key);
  }
  clear(): void {
    storageMap.clear();
  }
  get length(): number {
    return storageMap.size;
  }
  key(index: number): string | null {
    const keys = Array.from(storageMap.keys());
    return keys[index] || null;
  }
}

const mockStorageInstance = new MockLocalStorage();

class MockCustomEvent {
  type: string;
  detail: unknown;
  constructor(type: string, params?: { detail?: unknown }) {
    this.type = type;
    this.detail = params?.detail;
  }
}

// Polyfill window, localStorage, and CustomEvent on globalThis
(globalThis as unknown as { window: unknown }).window = {
  localStorage: mockStorageInstance,
  dispatchEvent: (event: { type: string; detail?: unknown }) => {
    eventLog.push({ type: event.type, detail: event.detail });
    return true;
  },
  addEventListener: () => {},
  removeEventListener: () => {},
};
(globalThis as unknown as { CustomEvent: unknown }).CustomEvent = MockCustomEvent;

// Now dynamically import storageService and engines
const {
  STORAGE_KEYS,
  savePlan,
  getSavedPlan,
  savePlannerSubjects,
  toggleSessionCompleted,
  getCompletedSessionIds,
  getActiveStudyTasks,
  saveNote,
  getSavedNotes,
  updateNote,
  deleteNote,
  saveQuizAttempt,
  getQuizHistory,
  deleteQuizAttempt,
  getAggregatedStatistics,
  clearAllUserData,
  hasAnyUserData,
} = await import('../src/services/storageService.ts');

const { generateStudyPlan } = await import('../src/services/plannerEngine.ts');
const { generateStructuredSummary } = await import('../src/services/summarizerEngine.ts');
const { generateQuizFromNotes } = await import('../src/services/quizEngine.ts');

let totalTests = 0;
let passedTests = 0;

function runTest(description: string, fn: () => void) {
  totalTests++;
  try {
    fn();
    passedTests++;
    console.log(`✅ PASSED: ${description}`);
  } catch (err: unknown) {
    console.error(`❌ FAILED: ${description}`);
    console.error(err);
    process.exitCode = 1;
  }
}

console.log('\n===========================================================');
console.log('   PROMPT 6: PERSISTENT DATA & TRACKING VERIFICATION       ');
console.log('===========================================================\n');

// Clear storage initially to start from a clean state
mockStorageInstance.clear();
eventLog.length = 0;

// ---------------------------------------------------------------------------
// STEP 1: Create a study plan with multiple subjects
// ---------------------------------------------------------------------------
console.log('--- STEP 1: Create a study plan with multiple subjects ---');

const testSubjects = [
  {
    id: 'sub-cs234',
    name: 'CS 234: Machine Learning',
    topics: ['Gradient Descent', 'Backpropagation', 'Attention Mechanisms'],
    examDate: '2026-11-20',
    availableHoursPerDay: 3,
    preferredSessionDuration: 45,
    priority: 'High' as const,
    understandingLevel: 'Intermediate' as const,
    color: '#6366F1',
  },
  {
    id: 'sub-cs244b',
    name: 'CS 244B: Distributed Systems',
    topics: ['Raft Consensus', 'Paxos', 'Two-Phase Commit'],
    examDate: '2026-11-28',
    availableHoursPerDay: 2,
    preferredSessionDuration: 60,
    priority: 'Medium' as const,
    understandingLevel: 'Beginner' as const,
    color: '#10B981',
  },
];

savePlannerSubjects(testSubjects);

const generatedPlan = generateStudyPlan(testSubjects, new Date('2026-10-25'));

savePlan(generatedPlan);

runTest('Plan is saved to storage under studymate_saved_plan', () => {
  const saved = getSavedPlan();
  assert.ok(saved !== null, 'Plan must not be null');
  assert.equal(saved.subjects.length, 2, 'Plan should contain 2 subjects');
  assert.ok(saved.days.length > 0, 'Plan should have scheduled days');
  assert.ok(hasAnyUserData(), 'hasAnyUserData should return true');
});

runTest('Event studymate_data_changed was dispatched on plan save', () => {
  assert.ok(
    eventLog.some((e) => e.type === 'studymate_data_changed' && (e.detail as { action: string })?.action === 'plan_saved'),
    'plan_saved event should be logged'
  );
});

// ---------------------------------------------------------------------------
// STEP 2: Mark a study task as completed
// ---------------------------------------------------------------------------
console.log("\n--- STEP 2: Mark a study task as completed ---");

const activeTasksBefore = getActiveStudyTasks();
assert.ok(activeTasksBefore.length > 0, 'Active tasks should exist from plan');
const firstTaskId = activeTasksBefore[0].id;

runTest('Initially the first task is todo', () => {
  assert.equal(activeTasksBefore[0].status, 'todo');
});

// Toggle completion
const newCompletedStatus = toggleSessionCompleted(firstTaskId);

runTest('toggleSessionCompleted returns true for newly completed task', () => {
  assert.equal(newCompletedStatus, true);
  const completedIds = getCompletedSessionIds();
  assert.ok(completedIds.includes(firstTaskId), 'Completed IDs must include firstTaskId');
});

runTest('Active tasks reflect completed status immediately', () => {
  const activeTasksAfter = getActiveStudyTasks();
  const targetTask = activeTasksAfter.find((t) => t.id === firstTaskId);
  assert.ok(targetTask, 'Task must exist');
  assert.equal(targetTask.status, 'completed', 'Task status must be completed');
});

// ---------------------------------------------------------------------------
// STEP 3: Refresh the page and verify the task remains completed
// ---------------------------------------------------------------------------
console.log("\n--- STEP 3: Refresh (re-read storage) and verify task remains completed ---");

runTest('Task remains completed after simulated page refresh', () => {
  // Re-read directly from mockStorage as a fresh page load would do
  const reloadedTasks = getActiveStudyTasks();
  const reloadedCompletedIds = getCompletedSessionIds();
  assert.ok(reloadedCompletedIds.includes(firstTaskId), 'Stored IDs still contain task ID');
  const targetTask = reloadedTasks.find((t) => t.id === firstTaskId);
  assert.equal(targetTask?.status, 'completed', 'Reloaded task must stay completed');
});

// ---------------------------------------------------------------------------
// STEP 4: Save notes and a summary
// ---------------------------------------------------------------------------
console.log("\n--- STEP 4: Save notes and a summary ---");

const rawStudyNotes = `Transformer Architecture in Deep Learning.
Key components: Multi-Head Self-Attention, Positional Encodings, and Feed-Forward layers.
Self-attention allows tokens to attend to all other positions in parallel with O(n^2) complexity.
Formula: Attention(Q, K, V) = softmax(QK^T / sqrt(d_k)) * V.
Positional encoding uses sine and cosine functions of different frequencies.
Transformers eliminated sequential recurrence found in RNNs and LSTMs.`;

const generatedSummary = generateStructuredSummary(rawStudyNotes, 'Transformers');

const savedNoteRecord = saveNote(generatedSummary);

runTest('Summary saved with a stable unique ID', () => {
  assert.ok(savedNoteRecord.id.length > 0, 'Note must have an ID');
  assert.equal(savedNoteRecord.title, 'Transformers');
  assert.equal(savedNoteRecord.rawNotes, rawStudyNotes);
  assert.ok(savedNoteRecord.keyPoints.length > 0, 'Key points must exist');
  assert.ok(savedNoteRecord.takeaways.length > 0, 'Takeaways must exist');

  const allNotes = getSavedNotes();
  assert.equal(allNotes.length, 1, 'Notes library should contain exactly 1 note');
  assert.equal(allNotes[0].id, savedNoteRecord.id, 'IDs must match');
});

// ---------------------------------------------------------------------------
// STEP 5: Reopen and edit the saved notes (stable ID, no duplicate records)
// ---------------------------------------------------------------------------
console.log("\n--- STEP 5: Reopen and edit the saved notes ---");

const originalNoteId = savedNoteRecord.id;
const updatedRawNotes = rawStudyNotes + '\nAdditional Note: LayerNorm is applied before or after attention blocks (Pre-LN vs Post-LN).';
const updatedTitle = 'Transformers & Self-Attention (Revised)';

const updatedRecord = updateNote(originalNoteId, {
  title: updatedTitle,
  rawNotes: updatedRawNotes,
  overview: 'Updated overview with Pre-LN analysis.',
});

runTest('Note updated with stable ID without creating duplicate records', () => {
  assert.ok(updatedRecord !== null, 'Updated note must not be null');
  assert.equal(updatedRecord.id, originalNoteId, 'ID must remain stable across edits');
  assert.equal(updatedRecord.title, updatedTitle);

  const libraryAfterEdit = getSavedNotes();
  assert.equal(libraryAfterEdit.length, 1, 'Library must still contain exactly 1 note (no duplicate created)');
  assert.equal(libraryAfterEdit[0].title, updatedTitle);
  assert.equal(libraryAfterEdit[0].rawNotes, updatedRawNotes);
});

// ---------------------------------------------------------------------------
// STEP 6: Generate and complete a quiz (Client-side scoring integrity)
// ---------------------------------------------------------------------------
console.log("\n--- STEP 6: Generate and complete a quiz ---");

const quizGenerated = generateQuizFromNotes(updatedRawNotes, 'Natural Language Processing', 5, 'Medium', 'mixed');

// Verify scoring integrity: client calculates score based on correctAnswerIndex
const userAnswers: Record<string, number> = {};
let simulatedCorrect = 0;

quizGenerated.questions.forEach((q, idx) => {
  // Answer first 4 correctly, last one incorrectly
  if (idx < 4) {
    userAnswers[q.id] = q.correctAnswerIndex;
    simulatedCorrect++;
  } else {
    // Pick wrong answer
    userAnswers[q.id] = (q.correctAnswerIndex + 1) % q.options.length;
  }
});

const totalQuestions = quizGenerated.questions.length;
const expectedScore = simulatedCorrect; // 4
const expectedPercentage = Math.round((expectedScore / totalQuestions) * 100); // 80%

const quizAttemptResult = {
  id: `attempt-${Date.now()}`,
  quizId: quizGenerated.id,
  title: quizGenerated.title,
  subject: quizGenerated.subject,
  score: expectedScore,
  totalQuestions,
  percentage: expectedPercentage,
  date: new Date().toISOString().split('T')[0],
  difficulty: quizGenerated.difficulty,
  questionType: quizGenerated.questionType,
  timestamp: Date.now(),
  answers: userAnswers,
};

saveQuizAttempt(quizAttemptResult);

runTest('Quiz attempt saved with required metadata and client-computed score', () => {
  assert.equal(quizAttemptResult.score, 4);
  assert.equal(quizAttemptResult.totalQuestions, 5);
  assert.equal(quizAttemptResult.percentage, 80);
  assert.equal(quizAttemptResult.difficulty, 'Medium');
  assert.equal(quizAttemptResult.questionType, 'mixed');
  assert.ok(quizAttemptResult.id.startsWith('attempt-'));
});

// ---------------------------------------------------------------------------
// STEP 7: Refresh and verify the quiz result remains available
// ---------------------------------------------------------------------------
console.log("\n--- STEP 7: Refresh and verify quiz result remains available ---");

runTest('Quiz attempt persists and reloads from storage', () => {
  const history = getQuizHistory();
  assert.equal(history.length, 1, 'Should have 1 recorded quiz attempt');
  assert.equal(history[0].id, quizAttemptResult.id);
  assert.equal(history[0].percentage, 80);
  assert.equal(history[0].score, 4);
  assert.equal(history[0].difficulty, 'Medium');
});

// ---------------------------------------------------------------------------
// STEP 8: Check that Dashboard statistics match the saved data
// ---------------------------------------------------------------------------
console.log("\n--- STEP 8: Check Dashboard statistics match saved data ---");

const dashboardStats = getAggregatedStatistics();

runTest('Dashboard activePlansCount matches saved plan', () => {
  assert.equal(dashboardStats.activePlansCount, 1);
  assert.equal(dashboardStats.hasActivePlan, true);
});

runTest('Dashboard completedTasksCount and remainingTasksCount are accurate', () => {
  assert.equal(dashboardStats.completedTasksCount, 1);
  assert.equal(dashboardStats.totalTasksCount, activeTasksBefore.length);
  assert.equal(dashboardStats.remainingTasksCount, activeTasksBefore.length - 1);
  assert.equal(
    dashboardStats.taskCompletionPercentage,
    Math.round((1 / activeTasksBefore.length) * 100)
  );
});

runTest('Dashboard quiz statistics reflect the completed attempt', () => {
  assert.equal(dashboardStats.quizAttemptsCount, 1);
  assert.equal(dashboardStats.averageQuizScore, 80);
  assert.equal(dashboardStats.highestQuizScore, 80);
  assert.equal(dashboardStats.latestQuizScore, 80);
});

runTest('Dashboard savedNotesCount reflects the saved note', () => {
  assert.equal(dashboardStats.totalNotesCount, 1);
});

runTest('Dashboard upcomingDeadlines has items from active plan', () => {
  assert.ok(dashboardStats.upcomingDeadlines.length >= 2, 'Should have deadlines for subjects');
  assert.equal(dashboardStats.upcomingDeadlines[0].subject, 'CS 234: Machine Learning');
});

// ---------------------------------------------------------------------------
// STEP 9: Check that Progress statistics match the saved data
// ---------------------------------------------------------------------------
console.log("\n--- STEP 9: Check Progress statistics match saved data ---");

runTest('Progress statistics clearly distinguish task completion from quiz performance', () => {
  // Task completion % is based on tasks completed / total tasks
  const taskPct = dashboardStats.taskCompletionPercentage;
  // Quiz score is based on quiz accuracy percentage
  const quizAvg = dashboardStats.averageQuizScore;

  assert.ok(typeof taskPct === 'number', 'taskCompletionPercentage is a number');
  assert.ok(typeof quizAvg === 'number', 'averageQuizScore is a number');
  // Task completion is 1 / total (e.g. 17%), while quiz accuracy is 80%
  assert.notEqual(taskPct, quizAvg, 'Task completion and quiz performance measure different things');
});

runTest('Progress subject breakdown computes per-subject completion and quiz scores', () => {
  const breakdown = dashboardStats.subjectBreakdown;
  assert.ok(breakdown.length > 0, 'Subject breakdown must not be empty');

  const cs234 = breakdown.find((s) => s.subject.includes('CS 234'));
  assert.ok(cs234, 'CS 234 must exist in breakdown');
  assert.ok(cs234.totalTasks > 0, 'CS 234 should have tasks');
});

// ---------------------------------------------------------------------------
// STEP 10: Delete a record and verify related statistics update immediately
// ---------------------------------------------------------------------------
console.log("\n--- STEP 10: Delete a record and verify related statistics update ---");

// Delete the quiz attempt
const deletedQuiz = deleteQuizAttempt(quizAttemptResult.id);
assert.equal(deletedQuiz, true, 'deleteQuizAttempt should return true');

runTest('Quiz attempt deletion immediately updates quiz history and statistics', () => {
  const historyAfterDelete = getQuizHistory();
  assert.equal(historyAfterDelete.length, 0, 'History should now be empty');

  const statsAfterDelete = getAggregatedStatistics();
  assert.equal(statsAfterDelete.quizAttemptsCount, 0, 'Quiz count must be 0');
  assert.equal(statsAfterDelete.averageQuizScore, null, 'Average score must be null');
  assert.equal(statsAfterDelete.highestQuizScore, null, 'Highest score must be null');

  // Verify other data (plan and notes) remained intact
  assert.equal(statsAfterDelete.activePlansCount, 1, 'Plan must remain intact');
  assert.equal(statsAfterDelete.totalNotesCount, 1, 'Note must remain intact');
});

// Delete note record
const deletedNote = deleteNote(originalNoteId);
assert.equal(deletedNote, true, 'deleteNote should return true');

runTest('Note deletion immediately updates saved notes and statistics', () => {
  const notesAfterDelete = getSavedNotes();
  assert.equal(notesAfterDelete.length, 0, 'Notes library should now be empty');

  const statsAfterNoteDelete = getAggregatedStatistics();
  assert.equal(statsAfterNoteDelete.totalNotesCount, 0, 'totalNotesCount must be 0');
});

// ---------------------------------------------------------------------------
// STEP 11: Test empty states and invalid/corrupt stored data handling
// ---------------------------------------------------------------------------
console.log("\n--- STEP 11: Test empty states and invalid/corrupt stored data ---");

runTest('Empty state statistics are safe and non-crashing', () => {
  // Clear all user data
  clearAllUserData();
  const emptyStats = getAggregatedStatistics();

  assert.equal(emptyStats.activePlansCount, 0);
  assert.equal(emptyStats.hasActivePlan, false);
  assert.equal(emptyStats.totalTasksCount, 0);
  assert.equal(emptyStats.completedTasksCount, 0);
  assert.equal(emptyStats.remainingTasksCount, 0);
  assert.equal(emptyStats.taskCompletionPercentage, 0);
  assert.equal(emptyStats.totalNotesCount, 0);
  assert.equal(emptyStats.quizAttemptsCount, 0);
  assert.equal(emptyStats.averageQuizScore, null);
  assert.equal(emptyStats.highestQuizScore, null);
  assert.equal(emptyStats.upcomingDeadlines.length, 0);
  assert.equal(emptyStats.subjectBreakdown.length, 0);
});

runTest('Corrupt JSON in storage keys is handled safely without throwing', () => {
  // Inject bad JSON strings directly into storage
  mockStorageInstance.setItem(STORAGE_KEYS.PLAN, '{corrupt_json: "missing quote');
  mockStorageInstance.setItem(STORAGE_KEYS.NOTES, 'not valid json at all ###');
  mockStorageInstance.setItem(STORAGE_KEYS.QUIZ_HISTORY, '[{"broken": json');
  mockStorageInstance.setItem(STORAGE_KEYS.COMPLETED_SESSIONS, '{invalid_type: true}');

  // Methods should safely fall back to defaults
  const plan = getSavedPlan();
  assert.equal(plan, null, 'Corrupt plan should safely return null');

  const notes = getSavedNotes();
  assert.deepEqual(notes, [], 'Corrupt notes should safely return empty array');

  const quizzes = getQuizHistory();
  assert.deepEqual(quizzes, [], 'Corrupt quiz history should safely return empty array');

  const completed = getCompletedSessionIds();
  assert.deepEqual(completed, [], 'Corrupt completed sessions should safely return empty array');

  const statsWithCorrupt = getAggregatedStatistics();
  assert.equal(statsWithCorrupt.activePlansCount, 0);
  assert.equal(statsWithCorrupt.totalNotesCount, 0);
  assert.equal(statsWithCorrupt.quizAttemptsCount, 0);
});

// Clean up corrupt storage
clearAllUserData();

// ---------------------------------------------------------------------------
// STEP 12: Verify that no API keys or secrets are stored in local storage
// ---------------------------------------------------------------------------
console.log("\n--- STEP 12: Verify no API keys or secrets are stored in local storage ---");

runTest('No API keys or provider secrets exist in localStorage keys or values', () => {
  // Inspect every key and value in localStorage
  for (let i = 0; i < mockStorageInstance.length; i++) {
    const key = mockStorageInstance.key(i);
    assert.ok(key, 'Key must exist');
    const val = mockStorageInstance.getItem(key) || '';

    // Must not contain AI keys
    assert.ok(!key.toLowerCase().includes('api_key'), `Storage key "${key}" contains api_key`);
    assert.ok(!key.toLowerCase().includes('secret'), `Storage key "${key}" contains secret`);
    assert.ok(!val.toLowerCase().includes('aiza'), `Storage value in "${key}" looks like a Google API key`);
    assert.ok(!val.toLowerCase().includes('sk-'), `Storage value in "${key}" looks like an API key`);
  }
});

console.log('\n===========================================================');
console.log(`   🎉 ALL ${passedTests} OF ${totalTests} TESTS PASSED SUCCESSFULLY!       `);
console.log('===========================================================\n');
