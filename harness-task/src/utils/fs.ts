import { readFile, writeFile, mkdir, rename, access } from 'node:fs/promises';
import { dirname, join } from 'node:path';

export async function ensureDir(dirPath: string): Promise<void> {
  await mkdir(dirPath, { recursive: true });
}

export async function fileExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

export async function readJsonSafe<T = Record<string, any>>(path: string): Promise<T | null> {
  try {
    const content = await readFile(path, 'utf-8');
    return JSON.parse(content) as T;
  } catch {
    return null;
  }
}

export async function writeJson(path: string, data: unknown, indent = 2): Promise<void> {
  await ensureDir(dirname(path));
  await writeFile(path, JSON.stringify(data, null, indent) + '\n', 'utf-8');
}

export async function readTextSafe(path: string): Promise<string | null> {
  try {
    return await readFile(path, 'utf-8');
  } catch {
    return null;
  }
}

export async function writeText(path: string, content: string): Promise<void> {
  await ensureDir(dirname(path));
  await writeFile(path, content, 'utf-8');
}

export async function moveDirectory(src: string, dest: string): Promise<void> {
  await ensureDir(dirname(dest));
  await rename(src, dest);
}

/**
 * Smart merge for .claude/settings.local.json.
 * Preserves existing permissions and hooks, only adds harness-task specific entries.
 */
export async function mergeSettingsJson(
  settingsPath: string,
  additions: {
    permissions?: { allow?: string[]; deny?: string[] };
    hooks?: Record<string, any[]>;
  }
): Promise<void> {
  const existing = await readJsonSafe<Record<string, any>>(settingsPath) || {};

  // Merge permissions
  if (additions.permissions) {
    if (!existing.permissions) existing.permissions = {};

    if (additions.permissions.allow) {
      if (!existing.permissions.allow) existing.permissions.allow = [];
      const existingSet = new Set(existing.permissions.allow);
      for (const entry of additions.permissions.allow) {
        if (!existingSet.has(entry)) {
          existing.permissions.allow.push(entry);
        }
      }
    }

    if (additions.permissions.deny) {
      if (!existing.permissions.deny) existing.permissions.deny = [];
      const existingSet = new Set(existing.permissions.deny);
      for (const entry of additions.permissions.deny) {
        if (!existingSet.has(entry)) {
          existing.permissions.deny.push(entry);
        }
      }
    }
  }

  // Merge hooks
  if (additions.hooks) {
    if (!existing.hooks) existing.hooks = {};

    for (const [eventName, hookList] of Object.entries(additions.hooks)) {
      if (!existing.hooks[eventName]) {
        existing.hooks[eventName] = hookList;
      } else {
        // Append new hook entries that don't already exist (by command string match)
        const existingCommands = new Set(
          existing.hooks[eventName].flatMap((h: any) =>
            (h.hooks || [h]).map((hk: any) => hk.command || '')
          )
        );
        for (const hook of hookList) {
          const cmds = (hook.hooks || [hook]).map((hk: any) => hk.command || '');
          if (!cmds.some((c: string) => existingCommands.has(c))) {
            existing.hooks[eventName].push(hook);
          }
        }
      }
    }
  }

  await writeJson(settingsPath, existing);
}
