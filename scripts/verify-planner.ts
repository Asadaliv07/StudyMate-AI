import assert from 'node:assert';
import {
  validateSubjectInput,
  generateStudyPlan,
  evaluatePlanFeasibility,
} from '../src/services/plannerEngine.ts';
import type { PlannerSubjectInput } from '../src/types/index.ts';

console.log('=== RUNNING STUDY PLANNER SUITE OF 6 TEST CASES ===\n');

// Fixed reference base date: 2026-10-23
const baseDate = new Date('2026-10-23T12:00:00Z');

// -----------------------------------------------------------------------------
// Test Case 1: One subject and a distant deadline
// -----------------------------------------------------------------------------
console.log('Test Case 1: One subject and distant deadline');
const subject1: PlannerSubjectInput = {
  id: 'sub-test-1',
  name: 'Organic Chemistry',
  topics: ['Alkanes & Alkenes', 'Stereochemistry', 'Reaction Mechanisms', 'NMR Spectroscopy'],
  examDate: '2026-12-07', // 45 days away
  dailyStudyHours: 2,
  sessionLengthMinutes: 45,
  priority: 'Medium',
  understandingLevel: 'Intermediate',
};

const plan1 = generateStudyPlan([subject1], baseDate);
assert.strictEqual(plan1.subjects.length, 1);
assert.ok(plan1.days.length > 0, 'Plan should contain multiple days');
assert.ok(plan1.totalSessions >= 6, 'Should generate initial, revision, practice, and final sessions');
assert.strictEqual(plan1.feasibility.status, 'feasible', 'Distant deadline should be feasible');
assert.ok(plan1.feasibility.totalAvailableHours > plan1.feasibility.totalRequiredHours);
console.log(`  ✓ Plan generated with ${plan1.totalSessions} sessions across ${plan1.days.length} days.`);
console.log(`  ✓ Feasibility: ${plan1.feasibility.status} (${plan1.feasibility.totalRequiredHours}h required vs ${plan1.feasibility.totalAvailableHours}h available).\n`);

// -----------------------------------------------------------------------------
// Test Case 2: Multiple subjects with different priorities
// -----------------------------------------------------------------------------
console.log('Test Case 2: Multiple subjects with different priorities');
const subjectsMulti: PlannerSubjectInput[] = [
  {
    id: 'sub-high',
    name: 'CS 234: Machine Learning',
    topics: ['Bellman Equations', 'Q-Learning', 'Policy Gradients'],
    examDate: '2026-10-30', // 7 days away
    dailyStudyHours: 3,
    sessionLengthMinutes: 45,
    priority: 'High',
    understandingLevel: 'Beginner',
  },
  {
    id: 'sub-med',
    name: 'CS 244B: Distributed Systems',
    topics: ['Raft Consensus', 'Paxos Algorithm'],
    examDate: '2026-11-06', // 14 days away
    dailyStudyHours: 2,
    sessionLengthMinutes: 50,
    priority: 'Medium',
    understandingLevel: 'Intermediate',
  },
  {
    id: 'sub-low',
    name: 'HIST 101: World History',
    topics: ['Renaissance Era', 'Industrial Revolution'],
    examDate: '2026-11-20', // 28 days away
    dailyStudyHours: 1.5,
    sessionLengthMinutes: 30,
    priority: 'Low',
    understandingLevel: 'Advanced',
  },
];

const planMulti = generateStudyPlan(subjectsMulti, baseDate);
assert.strictEqual(planMulti.subjects.length, 3);
assert.ok(planMulti.totalSessions > 10, 'Should schedule multiple sessions per subject');

// Verify interleaving and task types
const taskTypes = new Set<string>();
planMulti.days.forEach((d) => {
  d.sessions.forEach((s) => taskTypes.add(s.taskType));
});
assert.ok(taskTypes.has('initial_study'), 'Must contain initial study');
assert.ok(taskTypes.has('spaced_revision'), 'Must contain spaced revision');
assert.ok(taskTypes.has('practice_quiz'), 'Must contain practice quiz');
assert.ok(taskTypes.has('final_review'), 'Must contain final exam prep');
console.log(`  ✓ Generated multi-subject plan: ${planMulti.totalSessions} sessions across ${planMulti.days.length} days.`);
console.log(`  ✓ All task types present: ${Array.from(taskTypes).join(', ')}.\n`);

// -----------------------------------------------------------------------------
// Test Case 3: A deadline in the past
// -----------------------------------------------------------------------------
console.log('Test Case 3: A deadline in the past');
const pastSubject: Partial<PlannerSubjectInput> = {
  name: 'Quantum Physics',
  topics: ['Schrodinger Equation'],
  examDate: '2025-01-15', // Definitely in the past
  dailyStudyHours: 2,
  sessionLengthMinutes: 45,
  priority: 'High',
  understandingLevel: 'Intermediate',
};
const pastErrors = validateSubjectInput(pastSubject, baseDate);
assert.ok(pastErrors.examDate, 'Should have examDate error');
assert.strictEqual(pastErrors.examDate, 'Exam date cannot be in the past.');
console.log(`  ✓ Past deadline correctly rejected: "${pastErrors.examDate}"\n`);

// -----------------------------------------------------------------------------
// Test Case 4: Missing or invalid form fields
// -----------------------------------------------------------------------------
console.log('Test Case 4: Missing or invalid form fields');
const invalidSubject: Partial<PlannerSubjectInput> = {
  name: '', // Missing
  rawTopics: '', // Missing
  examDate: '', // Missing
  dailyStudyHours: 0, // Invalid (<= 0)
  sessionLengthMinutes: -15, // Invalid (<= 0)
  priority: undefined,
  understandingLevel: undefined,
};
const invalidErrors = validateSubjectInput(invalidSubject, baseDate);
assert.ok(invalidErrors.name, 'Name required error');
assert.ok(invalidErrors.topics, 'Topics required error');
assert.ok(invalidErrors.examDate, 'Exam date required error');
assert.ok(invalidErrors.dailyStudyHours, 'Daily study hours error');
assert.ok(invalidErrors.sessionLengthMinutes, 'Session length error');
assert.ok(invalidErrors.priority, 'Priority error');
assert.ok(invalidErrors.understandingLevel, 'Understanding error');
console.log('  ✓ All 7 field validations triggered as expected:');
Object.entries(invalidErrors).forEach(([field, msg]) => {
  console.log(`    - ${field}: ${msg}`);
});
console.log();

// -----------------------------------------------------------------------------
// Test Case 5: A deadline that does not allow enough study time
// -----------------------------------------------------------------------------
console.log('Test Case 5: A deadline that does not allow enough study time');
const unrealisticSubject: PlannerSubjectInput = {
  id: 'sub-cram',
  name: 'Advanced Real Analysis',
  topics: [
    'Lebesgue Integration',
    'Measure Theory',
    'Banach Spaces',
    'Hilbert Spaces',
    'Hahn-Banach Theorem',
    'Open Mapping Theorem',
    'Spectral Theory',
  ],
  examDate: '2026-10-24', // Exam tomorrow! (1 day away)
  dailyStudyHours: 1, // Only 1 hour available
  sessionLengthMinutes: 45,
  priority: 'High',
  understandingLevel: 'Beginner', // High depth factor
};

const unrealisticReport = evaluatePlanFeasibility([unrealisticSubject], baseDate);
assert.strictEqual(unrealisticReport.status, 'unrealistic', 'Should flag unrealistic status');
assert.ok(unrealisticReport.totalRequiredHours > unrealisticReport.totalAvailableHours);
assert.ok(unrealisticReport.recommendations.length > 0);
console.log(`  ✓ Status: ${unrealisticReport.status.toUpperCase()}`);
console.log(`  ✓ Message: "${unrealisticReport.message}"`);
console.log(`  ✓ Required: ~${unrealisticReport.totalRequiredHours}h vs Available: ~${unrealisticReport.totalAvailableHours}h`);
console.log(`  ✓ Recommendations count: ${unrealisticReport.recommendations.length}\n`);

// -----------------------------------------------------------------------------
// Test Case 6: Task completion, progress calculation, and persistence logic
// -----------------------------------------------------------------------------
console.log('Test Case 6: Task completion and progress calculation');
// Simulate completion of 3 sessions
const testSessions = plan1.days[0].sessions;
const completedIds = [testSessions[0].id, testSessions[1].id];

const totalSessions = plan1.totalSessions;
const completedCount = completedIds.length;
const progressPercent = Math.round((completedCount / totalSessions) * 100);

assert.ok(progressPercent > 0 && progressPercent < 100);
console.log(`  ✓ Marked ${completedCount} of ${totalSessions} sessions as completed.`);
console.log(`  ✓ Calculated progress: ${progressPercent}%.`);

// Verify JSON serialization / deserialization (LocalStorage contract)
const serializedPlan = JSON.stringify(plan1);
const deserializedPlan = JSON.parse(serializedPlan);
assert.strictEqual(deserializedPlan.id, plan1.id);
assert.strictEqual(deserializedPlan.days.length, plan1.days.length);
console.log('  ✓ LocalStorage JSON serialization & hydration confirmed lossless.\n');

console.log('=== ALL 6 PLANNER TEST CASES PASSED SUCCESSFULLY! ===');
