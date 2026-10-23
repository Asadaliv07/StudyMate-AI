import type {
  GeneratedQuiz,
  GeneratedQuizQuestion,
  QuizDifficulty,
  QuizSetupType,
  QuizQuestionType,
} from '../types/index.ts';
import { extractSentences, extractTermsAndDefinitions } from './summarizerEngine.ts';

/**
 * Validates quiz setup input.
 */
export function validateQuizSetup(
  subject: string,
  notesText: string
): { isValid: boolean; error?: string } {
  if (!subject || !subject.trim()) {
    return { isValid: false, error: 'Please specify a subject or topic for the quiz.' };
  }

  if (!notesText || !notesText.trim()) {
    return {
      isValid: false,
      error: 'Please paste or provide study notes to generate practice questions from.',
    };
  }

  const words = notesText.trim().split(/\s+/).filter(Boolean);
  if (words.length < 15) {
    return {
      isValid: false,
      error: 'Notes must contain at least 15 words to extract reliable practice questions.',
    };
  }

  return { isValid: true };
}

/**
 * Helper to create plausible distractors for multiple choice questions
 * without inventing external trivia.
 */
function createDistractors(
  correctText: string,
  allFactSentences: string[],
  subject: string
): string[] {
  const distractors: string[] = [];

  // 1. Pull other distinct facts from the same notes as plausible alternative choices
  for (const otherFact of allFactSentences) {
    if (
      otherFact !== correctText &&
      !distractors.includes(otherFact) &&
      otherFact.length < 140
    ) {
      distractors.push(otherFact);
      if (distractors.length === 3) break;
    }
  }

  // 2. Fallbacks derived from standard conceptual contrast rules if notes are short
  const conceptualContrasts = [
    `It eliminates the need for ${subject} state validation during runtime.`,
    `It acts as an unconstrained heuristic without mathematical guarantees.`,
    `It requires manual parameter re-tuning after every sequential update.`,
    `It is limited strictly to single-threaded offline batch execution.`,
  ];

  let fallbackIdx = 0;
  while (distractors.length < 3 && fallbackIdx < conceptualContrasts.length) {
    const candidate = conceptualContrasts[fallbackIdx++];
    if (!distractors.includes(candidate) && candidate !== correctText) {
      distractors.push(candidate);
    }
  }

  return distractors.slice(0, 3);
}

/**
 * Deterministic Quiz Generation Engine.
 * Strictly grounds questions in the provided notes.
 */
export function generateQuizFromNotes(
  notesText: string,
  subject: string,
  requestedCount: number = 5,
  difficulty: QuizDifficulty = 'Medium',
  questionType: QuizSetupType = 'mixed'
): GeneratedQuiz {
  const validation = validateQuizSetup(subject, notesText);
  if (!validation.isValid) {
    throw new Error(validation.error || 'Invalid quiz setup inputs');
  }

  const cleanText = notesText.trim();
  const sentences = extractSentences(cleanText);
  const terms = extractTermsAndDefinitions(cleanText);

  // Pool of candidate facts from notes
  const factualStatements = sentences.filter(
    (s) => s.length >= 25 && s.length <= 220 && !s.startsWith('http')
  );

  // Maximum valid grounded questions we can construct from these notes
  const maxPossibleQuestions = Math.max(1, factualStatements.length);
  const targetCount = Math.min(requestedCount, maxPossibleQuestions);

  const questions: GeneratedQuizQuestion[] = [];
  let factIndex = 0;

  // Decide question type distribution
  const getNextType = (index: number): QuizQuestionType => {
    if (questionType === 'multiple_choice') return 'multiple_choice';
    if (questionType === 'true_false') return 'true_false';
    // Mixed: alternate between Multiple Choice and True/False
    return index % 2 === 0 ? 'multiple_choice' : 'true_false';
  };

  // Generate questions from terms first (high yield)
  for (const t of terms) {
    if (questions.length >= targetCount) break;

    const qType = getNextType(questions.length);

    if (qType === 'multiple_choice') {
      const distractors = createDistractors(t.definition, factualStatements, subject);

      // Shuffle options deterministically (place correct at index = questions.length % 4)
      const correctIndex = questions.length % 4;
      const shuffledOptions = [...distractors];
      shuffledOptions.splice(correctIndex, 0, t.definition);

      questions.push({
        id: `q-term-${questions.length + 1}`,
        type: 'multiple_choice',
        question: `According to the notes, what is the defined function or concept of "${t.term}"?`,
        options: shuffledOptions,
        correctAnswerIndex: correctIndex,
        explanation: `In the notes, "${t.term}" is explicitly defined as: "${t.definition}"`,
        groundedExcerpt: `${t.term}: ${t.definition}`,
        difficulty,
      });
    } else {
      // True/False
      const isTrueStatement = questions.length % 2 === 0;
      let statement = '';

      if (isTrueStatement) {
        statement = `According to the notes, ${t.term} is defined as: "${t.definition}"`;
      } else {
        statement = `According to the notes, ${t.term} operates without any relation to ${t.definition.slice(0, 40)}...`;
      }

      questions.push({
        id: `q-term-tf-${questions.length + 1}`,
        type: 'true_false',
        question: statement,
        options: ['True', 'False'],
        correctAnswerIndex: isTrueStatement ? 0 : 1,
        explanation: isTrueStatement
          ? `Correct. The notes explicitly confirm that ${t.term} is ${t.definition}`
          : `False. The notes actually state that ${t.term} is: "${t.definition}"`,
        groundedExcerpt: `${t.term}: ${t.definition}`,
        difficulty,
      });
    }
  }

  // Generate remaining questions from factual statements
  while (questions.length < targetCount && factIndex < factualStatements.length) {
    const fact = factualStatements[factIndex++];
    const qType = getNextType(questions.length);

    if (qType === 'multiple_choice') {
      const distractors = createDistractors(fact, factualStatements, subject);
      const correctIndex = (questions.length + 1) % 4;
      const shuffledOptions = [...distractors];
      shuffledOptions.splice(correctIndex, 0, fact);

      questions.push({
        id: `q-fact-${questions.length + 1}`,
        type: 'multiple_choice',
        question: `Based on your notes for ${subject}, which of the following is explicitly confirmed?`,
        options: shuffledOptions,
        correctAnswerIndex: correctIndex,
        explanation: `Directly supported by the notes: "${fact}"`,
        groundedExcerpt: fact,
        difficulty,
      });
    } else {
      // True/False
      const isTrueStatement = (questions.length + factIndex) % 2 === 0;
      let statement = fact;

      if (!isTrueStatement) {
        // Construct plausible inverted statement
        if (fact.includes('guarantees')) {
          statement = fact.replace(/guarantees/i, 'does not guarantee');
        } else if (fact.includes('never')) {
          statement = fact.replace(/never/i, 'frequently');
        } else if (fact.includes('allows for')) {
          statement = fact.replace(/allows for/i, 'strictly prohibits');
        } else if (fact.includes('relies entirely on')) {
          statement = fact.replace(/relies entirely on/i, 'completely avoids');
        } else if (fact.includes('requires')) {
          statement = fact.replace(/requires/i, 'does not require');
        } else {
          statement = `It is false that: ${fact}`;
        }
      }

      questions.push({
        id: `q-fact-tf-${questions.length + 1}`,
        type: 'true_false',
        question: `True or False: ${statement}`,
        options: ['True', 'False'],
        correctAnswerIndex: isTrueStatement ? 0 : 1,
        explanation: isTrueStatement
          ? `True. Confirmed in your notes: "${fact}"`
          : `False. Your notes state the opposite: "${fact}"`,
        groundedExcerpt: fact,
        difficulty,
      });
    }
  }

  // Explanation if notes could not supply the full requested question count
  let explanationOfCount: string | undefined = undefined;
  if (questions.length < requestedCount) {
    explanationOfCount = `Generated ${questions.length} grounded questions instead of ${requestedCount} because your notes contained ${questions.length} distinct factual statements. Additional synthetic questions were omitted to prevent inaccurate or ungrounded questions.`;
  }

  return {
    id: `quiz-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    title: `${subject}: Practice Exam`,
    subject,
    sourceNotes: cleanText,
    questions,
    difficulty,
    questionType,
    requestedCount,
    actualCount: questions.length,
    explanationOfCount,
    createdAt: new Date().toISOString().split('T')[0],
    isRuleBasedDemo: true,
    provider: 'rule_based_demo',
  };
}
