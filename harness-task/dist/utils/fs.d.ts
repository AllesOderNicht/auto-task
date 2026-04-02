export declare function ensureDir(dirPath: string): Promise<void>;
export declare function fileExists(path: string): Promise<boolean>;
export declare function readJsonSafe<T = Record<string, any>>(path: string): Promise<T | null>;
export declare function writeJson(path: string, data: unknown, indent?: number): Promise<void>;
export declare function readTextSafe(path: string): Promise<string | null>;
export declare function writeText(path: string, content: string): Promise<void>;
export declare function moveDirectory(src: string, dest: string): Promise<void>;
//# sourceMappingURL=fs.d.ts.map