/**
 * Simplified spec parser for harness-task.
 * Handles both full specs (Purpose + Requirements) and delta specs (ADDED/MODIFIED/REMOVED).
 */

export interface Requirement {
  name: string;
  text: string;
  scenarios: string[];
}

export interface Spec {
  name: string;
  purpose: string;
  requirements: Requirement[];
}

export interface DeltaSpec {
  added: Requirement[];
  modified: Requirement[];
  removed: string[]; // requirement names only
}

export interface MergeResult {
  created: string[];   // new spec files created
  updated: string[];   // existing spec files updated
  removed: string[];   // requirements removed
}

function normalizeLineEndings(content: string): string {
  return content.replace(/\r\n?/g, '\n');
}

/**
 * Parse a full spec file (Purpose + Requirements sections).
 */
export function parseSpec(name: string, content: string): Spec {
  const normalized = normalizeLineEndings(content);
  const sections = splitH2Sections(normalized);

  const purpose = sections['Purpose'] || sections['purpose'] || '';
  const reqSection = sections['Requirements'] || sections['requirements'] || '';

  return {
    name,
    purpose: purpose.trim(),
    requirements: parseRequirements(reqSection),
  };
}

/**
 * Parse a delta spec file (ADDED/MODIFIED/REMOVED Requirements sections).
 */
export function parseDeltaSpec(content: string): DeltaSpec {
  const normalized = normalizeLineEndings(content);
  const sections = splitH2Sections(normalized);

  const addedBody = findSectionCaseInsensitive(sections, 'ADDED Requirements');
  const modifiedBody = findSectionCaseInsensitive(sections, 'MODIFIED Requirements');
  const removedBody = findSectionCaseInsensitive(sections, 'REMOVED Requirements');

  return {
    added: parseRequirements(addedBody),
    modified: parseRequirements(modifiedBody),
    removed: parseRemovedNames(removedBody),
  };
}

/**
 * Apply a delta spec to an existing spec, returning the updated spec.
 */
export function applyDelta(spec: Spec, delta: DeltaSpec): Spec {
  const requirements = [...spec.requirements];

  // Remove
  const removeSet = new Set(delta.removed.map(n => n.toLowerCase()));
  const filtered = requirements.filter(r => !removeSet.has(r.name.toLowerCase()));

  // Modify
  for (const mod of delta.modified) {
    const idx = filtered.findIndex(r => r.name.toLowerCase() === mod.name.toLowerCase());
    if (idx !== -1) {
      filtered[idx] = mod;
    } else {
      // If not found, treat as addition
      filtered.push(mod);
    }
  }

  // Add
  for (const add of delta.added) {
    filtered.push(add);
  }

  return {
    ...spec,
    requirements: filtered,
  };
}

/**
 * Serialize a spec back to markdown format.
 */
export function serializeSpec(spec: Spec): string {
  const lines: string[] = [];

  lines.push(`## Purpose`);
  lines.push('');
  lines.push(spec.purpose);
  lines.push('');
  lines.push(`## Requirements`);
  lines.push('');

  for (const req of spec.requirements) {
    lines.push(`### Requirement: ${req.name}`);
    lines.push('');
    lines.push(req.text);
    lines.push('');

    for (const scenario of req.scenarios) {
      lines.push(`#### Scenario: ${scenario.split('\n')[0]}`);
      lines.push('');
      lines.push(scenario);
      lines.push('');
    }
  }

  return lines.join('\n').trimEnd() + '\n';
}

// --- Internal helpers ---

function splitH2Sections(content: string): Record<string, string> {
  const lines = content.split('\n');
  const sections: Record<string, string> = {};
  const indices: { title: string; index: number }[] = [];

  for (let i = 0; i < lines.length; i++) {
    const match = lines[i].match(/^##\s+(.+)$/);
    if (match) {
      indices.push({ title: match[1].trim(), index: i });
    }
  }

  for (let i = 0; i < indices.length; i++) {
    const current = indices[i];
    const next = indices[i + 1];
    const body = lines.slice(current.index + 1, next ? next.index : lines.length).join('\n');
    sections[current.title] = body;
  }

  return sections;
}

function findSectionCaseInsensitive(sections: Record<string, string>, desired: string): string {
  const target = desired.toLowerCase();
  for (const [title, body] of Object.entries(sections)) {
    if (title.toLowerCase() === target) return body;
  }
  return '';
}

function parseRequirements(sectionBody: string): Requirement[] {
  if (!sectionBody.trim()) return [];

  const lines = sectionBody.split('\n');
  const requirements: Requirement[] = [];
  let i = 0;

  while (i < lines.length) {
    // Find next ### Requirement: header
    const match = lines[i].match(/^###\s+Requirement:\s+(.+)$/);
    if (!match) {
      i++;
      continue;
    }

    const name = match[1].trim();
    i++;

    // Gather content until next ### or ## header
    const contentLines: string[] = [];
    const scenarios: string[] = [];
    let currentScenario: string[] | null = null;

    while (i < lines.length && !lines[i].match(/^###\s+Requirement:/)) {
      if (lines[i].match(/^##\s+/)) break;

      const scenarioMatch = lines[i].match(/^####\s+Scenario:\s+(.+)$/);
      if (scenarioMatch) {
        if (currentScenario) {
          scenarios.push(currentScenario.join('\n').trim());
        }
        currentScenario = [];
        i++;
        continue;
      }

      if (currentScenario !== null) {
        currentScenario.push(lines[i]);
      } else {
        contentLines.push(lines[i]);
      }
      i++;
    }

    if (currentScenario) {
      scenarios.push(currentScenario.join('\n').trim());
    }

    requirements.push({
      name,
      text: contentLines.join('\n').trim(),
      scenarios,
    });
  }

  return requirements;
}

function parseRemovedNames(sectionBody: string): string[] {
  if (!sectionBody.trim()) return [];

  const names: string[] = [];
  const lines = sectionBody.split('\n');

  for (const line of lines) {
    const match = line.match(/^###\s+Requirement:\s+(.+)$/);
    if (match) {
      names.push(match[1].trim());
      continue;
    }
    // Also support bullet list format
    const bullet = line.match(/^\s*-\s+(.+)$/);
    if (bullet) {
      names.push(bullet[1].trim());
    }
  }

  return names;
}
