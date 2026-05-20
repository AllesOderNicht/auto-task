import { describe, expect, it } from 'vitest';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');
const BIN_PATH = path.join(REPO_ROOT, 'bin', 'harness-task.js');

/**
 * Parse all occurrences of a const/var array assignment like:
 *   const SKILL_IDS = [ "a", "b", ... ];
 * Returns an array of arrays (one per match).
 */
function extractArrayLiteral(src: string, varName: string): string[][] {
  const results: string[][] = [];
  // Match both `const FOO = [...]` (top-level) and just `  const FOO = [...]` (inside function)
  const pattern = new RegExp(
    `(?:const|let|var)\\s+${varName}\\s*=\\s*\\[([\\s\\S]*?)\\]`,
    'g',
  );
  let m: RegExpExecArray | null;
  while ((m = pattern.exec(src)) !== null) {
    const inner = m[1];
    const items = inner
      .split(',')
      .map(s => s.trim().replace(/^["']|["']$/g, ''))
      .filter(s => s.length > 0);
    results.push(items);
  }
  return results;
}

/**
 * Parse COMMAND_META object keys.
 */
function extractCommandMetaKeys(src: string): string[] {
  const m = src.match(/const\s+COMMAND_META\s*=\s*\{([\s\S]*?)\};/);
  if (!m) return [];
  const inner = m[1];
  const keys: string[] = [];
  const keyPattern = /"([^"]+)"\s*:/g;
  let km: RegExpExecArray | null;
  while ((km = keyPattern.exec(inner)) !== null) {
    keys.push(km[1]);
  }
  return keys;
}

describe('bin/harness-task.js — installer consistency', () => {
  const src = fs.readFileSync(BIN_PATH, 'utf8');

  it('file is readable and non-empty', () => {
    expect(src.length).toBeGreaterThan(100);
  });

  describe('SKILL_IDS', () => {
    it('has exactly two SKILL_IDS declarations (transformText inner + top-level constant)', () => {
      const allArrays = extractArrayLiteral(src, 'SKILL_IDS');
      expect(allArrays).toHaveLength(2);
    });

    it('both SKILL_IDS declarations are identical', () => {
      const allArrays = extractArrayLiteral(src, 'SKILL_IDS');
      expect(allArrays[0]).toEqual(allArrays[1]);
    });

    it('SKILL_IDS includes "check"', () => {
      const allArrays = extractArrayLiteral(src, 'SKILL_IDS');
      expect(allArrays[0]).toContain('check');
    });

    it('every SKILL_ID has a corresponding SKILL.md file in skills/', () => {
      const allArrays = extractArrayLiteral(src, 'SKILL_IDS');
      const skillIds = allArrays[0];
      for (const id of skillIds) {
        const skillPath = path.join(REPO_ROOT, 'skills', id, 'SKILL.md');
        expect(
          fs.existsSync(skillPath),
          `skills/${id}/SKILL.md is missing but "${id}" is in SKILL_IDS`,
        ).toBe(true);
      }
    });
  });

  describe('COMMAND_IDS', () => {
    it('includes "alles-check"', () => {
      const allArrays = extractArrayLiteral(src, 'COMMAND_IDS');
      expect(allArrays.length).toBeGreaterThanOrEqual(1);
      expect(allArrays[0]).toContain('alles-check');
    });

    it('every COMMAND_ID has a corresponding .md file in commands/', () => {
      const allArrays = extractArrayLiteral(src, 'COMMAND_IDS');
      const commandIds = allArrays[0];
      for (const id of commandIds) {
        const cmdPath = path.join(REPO_ROOT, 'commands', `${id}.md`);
        expect(
          fs.existsSync(cmdPath),
          `commands/${id}.md is missing but "${id}" is in COMMAND_IDS`,
        ).toBe(true);
      }
    });
  });

  describe('COMMAND_META', () => {
    it('includes "alles-check" key', () => {
      const keys = extractCommandMetaKeys(src);
      expect(keys).toContain('alles-check');
    });

    it('COMMAND_META keys match COMMAND_IDS exactly', () => {
      const allArrays = extractArrayLiteral(src, 'COMMAND_IDS');
      const commandIds = allArrays[0].slice().sort();
      const metaKeys = extractCommandMetaKeys(src).slice().sort();
      expect(metaKeys).toEqual(commandIds);
    });
  });
});
