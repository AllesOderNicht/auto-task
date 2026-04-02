export declare function ensureDir(dirPath: string): Promise<void>;
export declare function fileExists(path: string): Promise<boolean>;
export declare function readJsonSafe<T = Record<string, any>>(path: string): Promise<T | null>;
export declare function writeJson(path: string, data: unknown, indent?: number): Promise<void>;
export declare function readTextSafe(path: string): Promise<string | null>;
export declare function writeText(path: string, content: string): Promise<void>;
export declare function moveDirectory(src: string, dest: string): Promise<void>;
/**
 * Smart merge for .claude/settings.local.json.
 * Preserves existing permissions and hooks, only adds harness-task specific entries.
 */
export declare function mergeSettingsJson(settingsPath: string, additions: {
    permissions?: {
        allow?: string[];
        deny?: string[];
    };
    hooks?: Record<string, any[]>;
}): Promise<void>;
//# sourceMappingURL=fs.d.ts.map