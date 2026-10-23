import type {
  StructuredSummary,
  KeyTermDefinition,
  ExtractedFact,
} from '../types/index.ts';

/**
 * Validates raw notes before processing.
 */
export function validateNotesInput(text: string): { isValid: boolean; error?: string } {
  if (!text || !text.trim()) {
    return {
      isValid: false,
      error: 'Please paste or type study notes to summarize.',
    };
  }

  const words = text.trim().split(/\s+/).filter(Boolean);
  if (words.length < 10) {
    return {
      isValid: false,
      error: 'Notes are too short. Please provide at least 10 words for a meaningful summary.',
    };
  }

  return { isValid: true };
}

/**
 * Splits text into individual sentences while preserving sentence boundaries.
 */
export function extractSentences(text: string): string[] {
  if (!text) return [];

  return text
    .replace(/\r\n/g, '\n')
    .split(/(?<=[.?!])\s+|\n+/)
    .map((s) => s.trim().replace(/^[-*•\d.)\s]+/, '').trim())
    .filter((s) => s.length > 15);
}

/**
 * Extracts term definitions that are explicitly written in the notes.
 * Matches patterns like "Term: Definition", "Term — Definition", or "X is defined as Y".
 * Does NOT invent definitions that do not exist in the source notes.
 */
export function extractTermsAndDefinitions(text: string): KeyTermDefinition[] {
  const terms: KeyTermDefinition[] = [];
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);

  // Pattern 1: "Term: definition" or "Term — definition" or "Term - definition"
  const colonRegex = /^([A-Z][A-Za-z0-9\s/_-]{2,35})\s*(?::|—|-)\s+(.+)$/;

  for (const line of lines) {
    const match = line.match(colonRegex);
    if (match) {
      const potentialTerm = match[1].trim();
      const potentialDef = match[2].trim();

      // Ensure the term is short and definition has substance
      if (
        potentialTerm.split(/\s+/).length <= 5 &&
        potentialDef.length >= 10 &&
        !potentialTerm.toLowerCase().startsWith('note') &&
        !potentialTerm.toLowerCase().startsWith('chapter') &&
        !potentialTerm.toLowerCase().startsWith('example')
      ) {
        terms.push({
          term: potentialTerm,
          definition: potentialDef,
        });
      }
    }
  }

  // Pattern 2: "X is an attention mechanism..." or "X is a consensus algorithm..."
  const isARegex = /\b([A-Z][A-Za-z0-9\s/_-]{2,30})\s+(?:is|are|refers to|is defined as)\s+([^.?!;]+[.?!])/g;
  let isMatch: RegExpExecArray | null;
  while ((isMatch = isARegex.exec(text)) !== null) {
    const term = isMatch[1].trim();
    const def = isMatch[2].trim();

    // Check if not already added
    if (
      term.split(/\s+/).length <= 4 &&
      def.length >= 15 &&
      !terms.some((t) => t.term.toLowerCase() === term.toLowerCase())
    ) {
      terms.push({
        term,
        definition: def.endsWith('.') ? def : `${def}.`,
      });
    }
  }

  return terms.slice(0, 6);
}

/**
 * Extracts explicit formulas, dates, and quantitative facts from the notes.
 * Strictly preserves the text without hallucination.
 */
export function extractFactsAndFormulas(text: string): ExtractedFact[] {
  const extracted: ExtractedFact[] = [];
  const sentences = extractSentences(text);

  // A. Check for mathematical relations or formulas
  const formulaRegex = /([A-Za-z0-9_().\s/^*+-]+(?:\s*=\s*|\s*1\/sqrt\([a-zA-Z0-9_]+\)|\s*O\([a-zA-Z0-9^_\s]+\))[A-Za-z0-9_().\s/^*+-]+)/;
  
  // B. Check for dates or time intervals
  const dateRegex = /\b(?:(?:18|19|20)\d{2}|January|February|March|April|May|June|July|August|September|October|November|December|\d+\s*(?:hours|days|weeks|minutes|ms))\b/i;

  for (const sentence of sentences) {
    // Check formula
    if (formulaRegex.test(sentence) && sentence.length < 160) {
      extracted.push({
        type: 'formula',
        label: 'Mathematical Formulation / Invariant',
        content: sentence,
      });
      continue;
    }

    // Check date or duration
    if (dateRegex.test(sentence) && sentence.length < 160) {
      extracted.push({
        type: 'date',
        label: 'Timeline / Quantitative Metric',
        content: sentence,
      });
      continue;
    }

    // Check guarantee or theorem facts
    if (
      /\b(?:guarantees?|theorem|property|law|principle|invariant|condition|hypothesis)\b/i.test(sentence) &&
      sentence.length < 180
    ) {
      extracted.push({
        type: 'fact',
        label: 'Core Invariant / Grounded Rule',
        content: sentence,
      });
    }
  }

  // Deduplicate and return top facts
  return extracted.slice(0, 5);
}

/**
 * Deterministic Rule-Based Summarizer Engine.
 * 100% grounded in the source text.
 */
export function generateStructuredSummary(
  rawNotes: string,
  title?: string,
  subject?: string
): StructuredSummary {
  const validation = validateNotesInput(rawNotes);
  if (!validation.isValid) {
    throw new Error(validation.error || 'Invalid notes input');
  }

  const cleanText = rawNotes.trim();
  const words = cleanText.split(/\s+/).filter(Boolean);
  const sentences = extractSentences(cleanText);

  // 1. Overview Synthesis
  // Take first 1–2 key sentences from notes that encapsulate the core topic
  let overview = '';
  if (sentences.length > 0) {
    overview = sentences.slice(0, Math.min(2, sentences.length)).join(' ');
  } else {
    overview = cleanText.slice(0, 200);
  }

  // 2. Main Ideas and Key Points
  // Select distinct sentences beyond the overview that contain dense conceptual information
  const keyPoints: string[] = [];
  const candidateSentences = sentences.slice(1);

  // Score sentences by density of keywords
  const informativeSentences = candidateSentences.filter((s) => {
    return (
      s.length > 25 &&
      !s.startsWith('http') &&
      !overview.includes(s)
    );
  });

  if (informativeSentences.length > 0) {
    keyPoints.push(...informativeSentences.slice(0, 5));
  } else if (sentences.length > 0) {
    keyPoints.push(sentences[0]);
  }

  // 3. Terms and Definitions
  const terms = extractTermsAndDefinitions(cleanText);

  // 4. Facts, Formulas, and Dates
  const factsAndFormulas = extractFactsAndFormulas(cleanText);

  // 5. Revision Takeaways
  // Grounded takeaway synthesis derived from the extracted points
  const takeaways: string[] = [];
  if (terms.length > 0) {
    takeaways.push(`Review the definitions of ${terms.map((t) => `"${t.term}"`).slice(0, 3).join(', ')}.`);
  }
  if (factsAndFormulas.length > 0) {
    takeaways.push(`Commit the stated properties and invariants to memory for application questions.`);
  }
  if (keyPoints.length > 0) {
    takeaways.push(`Practice active recall on: ${keyPoints[0].slice(0, 90)}...`);
  }
  if (takeaways.length === 0) {
    takeaways.push('Review the core concepts outlined in the executive summary above.');
    takeaways.push('Test your recall using the practice quiz generator.');
  }

  // Count words in summary
  const summaryText = [
    overview,
    ...keyPoints,
    ...terms.map((t) => `${t.term} ${t.definition}`),
    ...factsAndFormulas.map((f) => f.content),
    ...takeaways,
  ].join(' ');
  const summaryWordCount = summaryText.split(/\s+/).filter(Boolean).length;

  const defaultTitle = title?.trim() || `${subject || 'Academic'} Study Notes Summary`;

  return {
    id: `summary-${Date.now()}`,
    title: defaultTitle,
    subject: subject?.trim() || 'General Studies',
    rawNotes: cleanText,
    overview,
    keyPoints,
    terms,
    factsAndFormulas,
    takeaways,
    wordCount: words.length,
    summaryWordCount,
    createdAt: new Date().toISOString().split('T')[0],
    isRuleBasedDemo: true,
    provider: 'rule_based_demo',
  };
}

/**
 * Pre-filled sample notes for instant demonstration and testing.
 */
export const SAMPLE_STUDY_NOTES = {
  transformers: {
    title: 'CS 224N: Attention Is All You Need & Transformer Architectures',
    subject: 'Natural Language Processing',
    text: `The Transformer is a neural network model architecture eschewing recurrence and instead relying entirely on an attention mechanism to draw global dependencies between input and output. The Transformer allows for significantly more parallelization and can reach a new state of the art in translation quality after being trained for as little as 12 hours on 8 P100 GPUs.

Self-Attention: An attention mechanism relating different positions of a single sequence in order to compute a representation of the sequence.
Multi-Head Attention: An architecture that allows the model to jointly attend to information from different representation subspaces at different positions.
Scaled Dot-Product Attention: Operates on query, key, and value vectors of dimension dk and dv.

The scaling factor 1/sqrt(dk) counteracts dot-product values growing large in magnitude for high dimensional keys, which would push the softmax function into regions with extremely small gradients. In 2017, Vaswani et al. demonstrated that this architecture achieves 28.4 BLEU on the WMT 2014 English-to-German translation task.`,
  },
  raft: {
    title: 'CS 244B: Raft Consensus Algorithm & Replicated Log Invariants',
    subject: 'Distributed Systems',
    text: `Raft is a consensus algorithm for managing a replicated log in distributed computer systems. It produces a result equivalent to Multi-Paxos and is as efficient, but its state machine structure is more understandable. Raft decomposes consensus into three independent subproblems: Leader Election, Log Replication, and Safety.

Election Safety: At most one leader can be elected in a given term.
Leader Append-Only: A leader never overwrites or truncates its log; it only appends new entries.
Log Matching Property: If two logs contain an entry with the same index and term, then the logs are identical in all entries up through the given index.
Leader Completeness: If a log entry is committed in a given term, then that entry will be present in the logs of the leaders for all higher-numbered terms.
State Machine Safety: If a server has applied a log entry at a given index to its state machine, no other server will ever apply a different log entry for the same index.

Followers respond to RPCs from candidates and leaders. Randomized election timeouts between 150ms and 300ms ensure that split votes are rare and quickly resolved.`,
  },
  neurobiology: {
    title: 'PSYC 101: Synaptic Plasticity & Memory Consolidation',
    subject: 'Cognitive Science',
    text: `Memory consolidation is the progressive stabilization of memory traces following initial encoding. The standard two-stage consolidation theory posits that the hippocampus acts as a fast-learning temporary buffer that gradually trains the slower neocortical network during slow-wave sleep.

Long-Term Potentiation (LTP): A persistent strengthening of synapses based on recent patterns of high-frequency activity that produces a long-lasting increase in signal transmission between two neurons.
NMDA Receptor: A glutamate receptor and ion channel protein that acts as a molecular coincidence detector.
Synaptic Plasticity: The biological ability of chemical synapses to change their strength over time in response to increases or decreases in their activity.

NMDA receptors require both glutamate binding and postsynaptic membrane depolarization to expel the magnesium ion blocking the pore. This allows calcium ion influx that initiates intracellular signaling cascades leading to AMPA receptor insertion. In 1973, Bliss and Lomo first published empirical evidence for LTP in the rabbit hippocampus.`,
  },
};

/**
 * Formats a StructuredSummary as clean, readable GitHub-flavored markdown.
 */
export function formatSummaryAsMarkdown(summary: StructuredSummary): string {
  const termsBlock = summary.terms && summary.terms.length > 0
    ? `\n\n## Important Terms & Definitions\n${summary.terms.map((t) => `- **${t.term}**: ${t.definition}`).join('\n')}`
    : '';

  const factsBlock = summary.factsAndFormulas && summary.factsAndFormulas.length > 0
    ? `\n\n## Important Facts, Formulas & Dates\n${summary.factsAndFormulas.map((f) => `- [${f.label}] ${f.content}`).join('\n')}`
    : '';

  const keyPointsBlock = summary.keyPoints && summary.keyPoints.length > 0
    ? `\n\n## Key Points & Main Ideas\n${summary.keyPoints.map((k, i) => `${i + 1}. ${k}`).join('\n')}`
    : '';

  const takeawaysBlock = summary.takeaways && summary.takeaways.length > 0
    ? `\n\n## Revision Takeaways\n${summary.takeaways.map((t) => `- ${t}`).join('\n')}`
    : '';

  return `# ${summary.title}
Subject: ${summary.subject}
Date: ${summary.createdAt}

## Overview
${summary.overview}${keyPointsBlock}${termsBlock}${factsBlock}${takeawaysBlock}

---
*Generated via StudyMate AI · Academic Notes Summarizer (Rule-Based Demo Engine)*`;
}

