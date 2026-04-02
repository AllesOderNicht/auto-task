import { join } from 'node:path';

const SAFE_SEGMENT_PATTERN = /[^A-Za-z0-9._-]+/g;
const EDGE_SEPARATOR_PATTERN = /^[_\-.]+|[_\-.]+$/g;

export type Artifact =
  | 'prompt'
  | 'refined-prompt'
  | 'proposal'
  | 'design'
  | 'tasks'
  | 'status';

const ARTIFACT_FILES: Record<Artifact, string> = {
  'prompt': 'prompt.md',
  'refined-prompt': 'refined-prompt.md',
  'proposal': 'proposal.md',
  'design': 'design.md',
  'tasks': 'tasks.md',
  'status': 'status.json',
};

export function getChangeDirName(branchName: string): string {
  const normalized = branchName
    .trim()
    .replace(/[\\/]+/g, '-')
    .replace(SAFE_SEGMENT_PATTERN, '_')
    .replace(EDGE_SEPARATOR_PATTERN, '');

  return normalized || 'change';
}

export function getChangeDirPath(projectDir: string, branchName: string): string {
  return join(projectDir, '.dev-changes', getChangeDirName(branchName));
}

export function getArtifactPath(changeDir: string, artifact: Artifact): string {
  return join(changeDir, ARTIFACT_FILES[artifact]);
}

export function getPhaseSummaryPath(changeDir: string, phaseId: string): string {
  return join(changeDir, 'phases', `${phaseId}-summary.md`);
}

export function getPhasesDir(changeDir: string): string {
  return join(changeDir, 'phases');
}

export function createPromptTemplate(branchName: string): string {
  return [
    '# Prompt',
    '',
    `- Branch: \`${branchName}\``,
    '',
    '## Requirement',
    '',
    '<!-- Describe what you want to build or change. -->',
    '',
  ].join('\n');
}

export function createPhaseSummaryTemplate(phaseId: string, phaseTitle: string): string {
  return [
    `# ${phaseId}: ${phaseTitle}`,
    '',
    '## Files Changed',
    '',
    '| File | Change |',
    '|------|--------|',
    '<!-- | path/to/file.ts | One-line description | -->',
    '',
  ].join('\n');
}
