import { join } from 'node:path';

const SAFE_SEGMENT_PATTERN = /[^A-Za-z0-9._-]+/g;
const EDGE_SEPARATOR_PATTERN = /^[_\-.]+|[_\-.]+$/g;

export function getChangeDirName(branchName: string): string {
  const normalized = branchName
    .trim()
    .replace(/[\\/]+/g, '__')
    .replace(SAFE_SEGMENT_PATTERN, '_')
    .replace(EDGE_SEPARATOR_PATTERN, '');

  return normalized || 'change';
}

export function getChangeDirPath(projectDir: string, branchName: string): string {
  return join(projectDir, '.dev-changes', getChangeDirName(branchName));
}

export function getPromptPath(changeDir: string): string {
  return join(changeDir, 'prompt.md');
}

export function createPromptTemplate(branchName: string): string {
  return [
    '# Prompt',
    '',
    `- Branch: \`${branchName}\``,
    '',
    '## Requirement',
    '<!-- Fill this file manually, or answer in chat and the assistant will write it here. -->',
    '',
  ].join('\n');
}
