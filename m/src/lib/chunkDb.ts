import * as SQLite from "expo-sqlite";
import type { LocalChunk, LocalChunkStatus } from "@repo/types";
let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;
async function db() {
    if (!dbPromise) {
        dbPromise = (async () => {
            const database = await SQLite.openDatabaseAsync("chunks.db");
            await database.execAsync(`
        PRAGMA journal_mode = WAL;
        CREATE TABLE IF NOT EXISTS chunks (
          id TEXT PRIMARY KEY NOT NULL,
          capture_id TEXT NOT NULL,
          idx INTEGER NOT NULL,
          started_at TEXT NOT NULL,
          duration_s REAL NOT NULL,
          path TEXT NOT NULL,
          status TEXT NOT NULL,
          size INTEGER NOT NULL DEFAULT 0,
          attempts INTEGER NOT NULL DEFAULT 0,
          last_error TEXT,
          created_at TEXT NOT NULL,
          UNIQUE(capture_id, idx)
        );
        CREATE INDEX IF NOT EXISTS chunks_pending_idx
          ON chunks (status, created_at);
      `);
            return database;
        })();
    }
    return dbPromise;
}
export async function insertLocalChunk(row: Omit<LocalChunk, "attempts" | "last_error" | "created_at"> & {
    attempts?: number;
    last_error?: string | null;
}): Promise<void> {
    const database = await db();
    await database.runAsync(`INSERT OR REPLACE INTO chunks
      (id, capture_id, idx, started_at, duration_s, path, status, size, attempts, last_error, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
        row.id,
        row.capture_id,
        row.idx,
        row.started_at,
        row.duration_s,
        row.path,
        row.status,
        row.size,
        row.attempts ?? 0,
        row.last_error ?? null,
        new Date().toISOString(),
    ]);
}
export async function listPendingChunks(): Promise<LocalChunk[]> {
    const database = await db();
    return database.getAllAsync<LocalChunk>(`SELECT * FROM chunks
     WHERE status IN ('pending', 'failed')
     ORDER BY created_at ASC`);
}
export async function listChunksForCapture(captureId: string): Promise<LocalChunk[]> {
    const database = await db();
    return database.getAllAsync<LocalChunk>(`SELECT * FROM chunks WHERE capture_id = ? ORDER BY idx ASC`, [captureId]);
}
export async function markChunkStatus(id: string, status: LocalChunkStatus, error?: string | null): Promise<void> {
    const database = await db();
    await database.runAsync(`UPDATE chunks
     SET status = ?, last_error = ?, attempts = attempts + CASE WHEN ? = 'failed' THEN 1 ELSE 0 END
     WHERE id = ?`, [status, error ?? null, status, id]);
}
