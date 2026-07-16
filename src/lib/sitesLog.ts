import { env } from "cloudflare:workers";
import type { SystemLogEntry } from "./types";

type D1Statement = {
  bind(...values: unknown[]): D1Statement;
  all<T>(): Promise<{ results?: T[] }>;
  run(): Promise<unknown>;
};

type RuntimeEnv = {
  DB: {
    prepare(query: string): D1Statement;
  };
};

const runtime = env as unknown as RuntimeEnv;
const MAX_LOG_ENTRIES = 500;

async function ensureSchema() {
  if (!runtime.DB) throw new Error("Sites database binding DB is unavailable.");
  await runtime.DB.prepare(`CREATE TABLE IF NOT EXISTS system_logs (
    id TEXT PRIMARY KEY,
    data TEXT NOT NULL,
    timestamp TEXT NOT NULL
  )`).run();
}

export async function listSystemLogs(limit = 200) {
  await ensureSchema();
  const safeLimit = Math.max(1, Math.min(limit, MAX_LOG_ENTRIES));
  const result = await runtime.DB.prepare(
    "SELECT data FROM system_logs ORDER BY timestamp DESC LIMIT ?",
  ).bind(safeLimit).all<{ data: string }>();

  return (result.results ?? []).flatMap((row) => {
    try {
      return [JSON.parse(row.data) as SystemLogEntry];
    } catch {
      return [];
    }
  });
}

export async function logSystemEvent(entry: Omit<SystemLogEntry, "id" | "timestamp">) {
  const record: SystemLogEntry = {
    ...entry,
    id: `log_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    timestamp: new Date().toISOString(),
  };

  const consoleMethod = record.level === "error" ? console.error : record.level === "warning" ? console.warn : console.info;
  consoleMethod("[evercrest]", JSON.stringify(record));

  try {
    await ensureSchema();
    await runtime.DB.prepare(
      "INSERT INTO system_logs (id, data, timestamp) VALUES (?, ?, ?)",
    ).bind(record.id, JSON.stringify(record), record.timestamp).run();
  } catch (error) {
    console.error("[evercrest] Unable to persist system log", error);
  }

  return record;
}
