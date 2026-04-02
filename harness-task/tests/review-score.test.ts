import { describe, expect, it } from 'vitest';

import {
  REVIEW_DIMENSIONS,
  TOTAL_WEIGHT,
  DEFAULT_PASS_THRESHOLD,
  calculateWeightedAverage,
  determineVerdict,
  isPassingScore,
  parseReviewScores,
  type ReviewScores,
} from '../src/utils/review.js';

function makeScores(overrides: Partial<Record<string, { score: number; reason: string }>> = {}): ReviewScores {
  const defaults: Record<string, { score: number; reason: string }> = {
    proposal_alignment: { score: 8, reason: 'Good alignment' },
    code_quality: { score: 7, reason: 'Clean code' },
    test_coverage: { score: 6, reason: 'Covers basics' },
    security: { score: 9, reason: 'No issues' },
    performance: { score: 7, reason: 'Acceptable' },
    plan_compliance: { score: 8, reason: 'Follows plan' },
  };
  return { ...defaults, ...overrides } as unknown as ReviewScores;
}

describe('REVIEW_DIMENSIONS', () => {
  it('defines 6 dimensions', () => {
    expect(REVIEW_DIMENSIONS).toHaveLength(6);
  });

  it('total weight equals 14', () => {
    expect(TOTAL_WEIGHT).toBe(14);
  });

  it('contains expected dimension keys', () => {
    const keys = REVIEW_DIMENSIONS.map(d => d.key);
    expect(keys).toEqual([
      'proposal_alignment',
      'code_quality',
      'test_coverage',
      'security',
      'performance',
      'plan_compliance',
    ]);
  });
});

describe('calculateWeightedAverage', () => {
  it('calculates correctly for uniform scores', () => {
    const scores = makeScores({
      proposal_alignment: { score: 10, reason: '' },
      code_quality: { score: 10, reason: '' },
      test_coverage: { score: 10, reason: '' },
      security: { score: 10, reason: '' },
      performance: { score: 10, reason: '' },
      plan_compliance: { score: 10, reason: '' },
    });
    expect(calculateWeightedAverage(scores)).toBe(10);
  });

  it('calculates correctly for all zeros', () => {
    const scores = makeScores({
      proposal_alignment: { score: 0, reason: '' },
      code_quality: { score: 0, reason: '' },
      test_coverage: { score: 0, reason: '' },
      security: { score: 0, reason: '' },
      performance: { score: 0, reason: '' },
      plan_compliance: { score: 0, reason: '' },
    });
    expect(calculateWeightedAverage(scores)).toBe(0);
  });

  it('weights HIGH dimensions more than LOW', () => {
    const highOnly = makeScores({
      proposal_alignment: { score: 10, reason: '' },
      code_quality: { score: 0, reason: '' },
      test_coverage: { score: 0, reason: '' },
      security: { score: 0, reason: '' },
      performance: { score: 0, reason: '' },
      plan_compliance: { score: 0, reason: '' },
    });
    const lowOnly = makeScores({
      proposal_alignment: { score: 0, reason: '' },
      code_quality: { score: 0, reason: '' },
      test_coverage: { score: 0, reason: '' },
      security: { score: 0, reason: '' },
      performance: { score: 0, reason: '' },
      plan_compliance: { score: 10, reason: '' },
    });
    // proposal_alignment has weight 3, plan_compliance has weight 1
    expect(calculateWeightedAverage(highOnly)).toBeGreaterThan(calculateWeightedAverage(lowOnly));
    expect(calculateWeightedAverage(highOnly)).toBe(Math.round((30 / 14) * 100) / 100);
    expect(calculateWeightedAverage(lowOnly)).toBe(Math.round((10 / 14) * 100) / 100);
  });

  it('computes expected value for mixed scores', () => {
    const scores = makeScores();
    // (3*8 + 3*7 + 3*6 + 2*9 + 2*7 + 1*8) / 14
    // = (24 + 21 + 18 + 18 + 14 + 8) / 14
    // = 103 / 14 ≈ 7.36
    const expected = Math.round((103 / 14) * 100) / 100;
    expect(calculateWeightedAverage(scores)).toBe(expected);
  });
});

describe('determineVerdict', () => {
  it('returns PASS when average meets threshold', () => {
    expect(determineVerdict(7.0, 1)).toBe('PASS');
    expect(determineVerdict(8.5, 1)).toBe('PASS');
  });

  it('returns NEEDS_FIX when below threshold and rounds remain', () => {
    expect(determineVerdict(6.5, 1)).toBe('NEEDS_FIX');
    expect(determineVerdict(5.0, 2)).toBe('NEEDS_FIX');
  });

  it('returns ESCALATE when below threshold and max rounds reached', () => {
    expect(determineVerdict(6.5, 3)).toBe('ESCALATE');
    expect(determineVerdict(4.0, 3)).toBe('ESCALATE');
  });

  it('respects custom threshold', () => {
    expect(determineVerdict(7.5, 1, 8.0)).toBe('NEEDS_FIX');
    expect(determineVerdict(8.0, 1, 8.0)).toBe('PASS');
  });

  it('respects custom max rounds', () => {
    expect(determineVerdict(6.0, 2, 7.0, 2)).toBe('ESCALATE');
    expect(determineVerdict(6.0, 2, 7.0, 3)).toBe('NEEDS_FIX');
  });
});

describe('isPassingScore', () => {
  it('returns true at or above threshold', () => {
    expect(isPassingScore(7.0)).toBe(true);
    expect(isPassingScore(10)).toBe(true);
  });

  it('returns false below threshold', () => {
    expect(isPassingScore(6.99)).toBe(false);
    expect(isPassingScore(0)).toBe(false);
  });

  it('respects custom threshold', () => {
    expect(isPassingScore(7.5, 8.0)).toBe(false);
    expect(isPassingScore(8.0, 8.0)).toBe(true);
  });
});

describe('parseReviewScores', () => {
  const validJson = JSON.stringify({
    scores: {
      proposal_alignment: { score: 8, reason: 'Good' },
      code_quality: { score: 7, reason: 'Clean' },
      test_coverage: { score: 6, reason: 'Ok' },
      security: { score: 9, reason: 'Secure' },
      performance: { score: 7, reason: 'Fast' },
      plan_compliance: { score: 8, reason: 'Compliant' },
    },
    weighted_average: 7.29,
    verdict: 'PASS',
    critical_issues: ['Issue 1'],
  });

  it('parses valid JSON', () => {
    const result = parseReviewScores(validJson);
    expect(result.scores.proposal_alignment.score).toBe(8);
    expect(result.scores.code_quality.score).toBe(7);
    expect(result.verdict).toBe('PASS');
    expect(result.critical_issues).toEqual(['Issue 1']);
  });

  it('recalculates weighted average from scores', () => {
    const result = parseReviewScores(validJson);
    const expected = Math.round((103 / 14) * 100) / 100;
    expect(result.weighted_average).toBe(expected);
  });

  it('extracts JSON from surrounding text', () => {
    const withText = `Here is my review:\n${validJson}\nEnd of review.`;
    const result = parseReviewScores(withText);
    expect(result.scores.proposal_alignment.score).toBe(8);
  });

  it('throws on empty input', () => {
    expect(() => parseReviewScores('')).toThrow('Empty review output');
    expect(() => parseReviewScores('   ')).toThrow('Empty review output');
  });

  it('throws on non-JSON input', () => {
    expect(() => parseReviewScores('not json at all')).toThrow('No JSON object found');
  });

  it('throws on missing scores field', () => {
    expect(() => parseReviewScores(JSON.stringify({ verdict: 'PASS' }))).toThrow('Missing or invalid "scores"');
  });

  it('throws on missing dimension', () => {
    const partial = JSON.stringify({
      scores: {
        proposal_alignment: { score: 8, reason: 'Good' },
      },
    });
    expect(() => parseReviewScores(partial)).toThrow('Invalid or missing score for dimension');
  });

  it('throws on score out of range', () => {
    const invalid = JSON.stringify({
      scores: {
        proposal_alignment: { score: 11, reason: 'Too high' },
        code_quality: { score: 7, reason: '' },
        test_coverage: { score: 6, reason: '' },
        security: { score: 9, reason: '' },
        performance: { score: 7, reason: '' },
        plan_compliance: { score: 8, reason: '' },
      },
    });
    expect(() => parseReviewScores(invalid)).toThrow('Invalid or missing score for dimension');
  });

  it('throws on negative score', () => {
    const invalid = JSON.stringify({
      scores: {
        proposal_alignment: { score: -1, reason: 'Negative' },
        code_quality: { score: 7, reason: '' },
        test_coverage: { score: 6, reason: '' },
        security: { score: 9, reason: '' },
        performance: { score: 7, reason: '' },
        plan_compliance: { score: 8, reason: '' },
      },
    });
    expect(() => parseReviewScores(invalid)).toThrow('Invalid or missing score for dimension');
  });

  it('falls back to calculated verdict when verdict field is invalid', () => {
    const withBadVerdict = JSON.stringify({
      scores: {
        proposal_alignment: { score: 8, reason: '' },
        code_quality: { score: 8, reason: '' },
        test_coverage: { score: 8, reason: '' },
        security: { score: 8, reason: '' },
        performance: { score: 8, reason: '' },
        plan_compliance: { score: 8, reason: '' },
      },
      verdict: 'INVALID_VERDICT',
      critical_issues: [],
    });
    const result = parseReviewScores(withBadVerdict);
    expect(result.verdict).toBe('PASS');
    expect(result.weighted_average).toBe(8);
  });

  it('handles missing critical_issues gracefully', () => {
    const noCritical = JSON.stringify({
      scores: {
        proposal_alignment: { score: 5, reason: '' },
        code_quality: { score: 5, reason: '' },
        test_coverage: { score: 5, reason: '' },
        security: { score: 5, reason: '' },
        performance: { score: 5, reason: '' },
        plan_compliance: { score: 5, reason: '' },
      },
    });
    const result = parseReviewScores(noCritical);
    expect(result.critical_issues).toEqual([]);
    expect(result.verdict).toBe('NEEDS_FIX');
  });

  it('filters non-string items from critical_issues', () => {
    const mixedIssues = JSON.stringify({
      scores: {
        proposal_alignment: { score: 8, reason: '' },
        code_quality: { score: 8, reason: '' },
        test_coverage: { score: 8, reason: '' },
        security: { score: 8, reason: '' },
        performance: { score: 8, reason: '' },
        plan_compliance: { score: 8, reason: '' },
      },
      critical_issues: ['valid issue', 123, null, 'another issue'],
    });
    const result = parseReviewScores(mixedIssues);
    expect(result.critical_issues).toEqual(['valid issue', 'another issue']);
  });
});
