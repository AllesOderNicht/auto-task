export interface DimensionWeight {
  key: string;
  label: string;
  weight: number;
}

export const REVIEW_DIMENSIONS: DimensionWeight[] = [
  { key: 'proposal_alignment', label: 'Proposal Alignment', weight: 3 },
  { key: 'code_quality', label: 'Code Quality', weight: 3 },
  { key: 'test_coverage', label: 'Test Coverage', weight: 3 },
  { key: 'security', label: 'Security & Safety', weight: 2 },
  { key: 'performance', label: 'Performance & Scalability', weight: 2 },
  { key: 'plan_compliance', label: 'Plan Compliance', weight: 1 },
];

export const TOTAL_WEIGHT = REVIEW_DIMENSIONS.reduce((sum, d) => sum + d.weight, 0);

export const DEFAULT_PASS_THRESHOLD = 7.0;
export const DEFAULT_MAX_REVIEW_ROUNDS = 3;
export const DEFAULT_LARGE_PHASE_FILE_THRESHOLD = 8;

export type ReviewVerdict = 'PASS' | 'NEEDS_FIX' | 'ESCALATE';

export interface DimensionScore {
  score: number;
  reason: string;
}

export interface ReviewScores {
  proposal_alignment: DimensionScore;
  code_quality: DimensionScore;
  test_coverage: DimensionScore;
  security: DimensionScore;
  performance: DimensionScore;
  plan_compliance: DimensionScore;
}

export interface ReviewResult {
  scores: ReviewScores;
  weighted_average: number;
  verdict: ReviewVerdict;
  critical_issues: string[];
}

export function calculateWeightedAverage(scores: ReviewScores): number {
  let weightedSum = 0;
  for (const dim of REVIEW_DIMENSIONS) {
    const ds = scores[dim.key as keyof ReviewScores];
    if (!ds || typeof ds.score !== 'number') continue;
    weightedSum += ds.score * dim.weight;
  }
  const avg = weightedSum / TOTAL_WEIGHT;
  return Math.round(avg * 100) / 100;
}

export function determineVerdict(
  weightedAverage: number,
  reviewRound: number,
  threshold: number = DEFAULT_PASS_THRESHOLD,
  maxRounds: number = DEFAULT_MAX_REVIEW_ROUNDS,
): ReviewVerdict {
  if (weightedAverage >= threshold) return 'PASS';
  if (reviewRound >= maxRounds) return 'ESCALATE';
  return 'NEEDS_FIX';
}

export function isPassingScore(
  average: number,
  threshold: number = DEFAULT_PASS_THRESHOLD,
): boolean {
  return average >= threshold;
}

function isValidDimensionScore(value: unknown): value is DimensionScore {
  if (!value || typeof value !== 'object') return false;
  const obj = value as Record<string, unknown>;
  return typeof obj.score === 'number' &&
    obj.score >= 0 &&
    obj.score <= 10 &&
    typeof obj.reason === 'string';
}

/**
 * Parse a JSON string produced by the phase-reviewer agent into a ReviewResult.
 * Throws on malformed input so callers can handle gracefully.
 */
export function parseReviewScores(jsonString: string): ReviewResult {
  const trimmed = jsonString.trim();
  if (!trimmed) {
    throw new Error('Empty review output');
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    const jsonMatch = trimmed.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON object found in review output');
    }
    parsed = JSON.parse(jsonMatch[0]);
  }

  if (!parsed || typeof parsed !== 'object') {
    throw new Error('Review output is not an object');
  }

  const obj = parsed as Record<string, unknown>;
  const scores = obj.scores;
  if (!scores || typeof scores !== 'object') {
    throw new Error('Missing or invalid "scores" field');
  }

  const scoresObj = scores as Record<string, unknown>;
  const requiredKeys = REVIEW_DIMENSIONS.map(d => d.key);
  const validatedScores: Record<string, DimensionScore> = {};

  for (const key of requiredKeys) {
    const val = scoresObj[key];
    if (!isValidDimensionScore(val)) {
      throw new Error(`Invalid or missing score for dimension "${key}"`);
    }
    validatedScores[key] = { score: val.score, reason: val.reason };
  }

  const reviewScores = validatedScores as unknown as ReviewScores;
  const weightedAvg = calculateWeightedAverage(reviewScores);

  const criticalIssues: string[] = [];
  if (Array.isArray(obj.critical_issues)) {
    for (const issue of obj.critical_issues) {
      if (typeof issue === 'string') {
        criticalIssues.push(issue);
      }
    }
  }

  const verdict = (typeof obj.verdict === 'string' &&
    ['PASS', 'NEEDS_FIX', 'ESCALATE'].includes(obj.verdict))
    ? obj.verdict as ReviewVerdict
    : (weightedAvg >= DEFAULT_PASS_THRESHOLD ? 'PASS' : 'NEEDS_FIX');

  return {
    scores: reviewScores,
    weighted_average: weightedAvg,
    verdict,
    critical_issues: criticalIssues,
  };
}
