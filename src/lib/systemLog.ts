import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import type { SystemLogEntry } from "./types";

const logsPath = join(process.cwd(), "data", "system_logs.json");
const MAX_LOG_ENTRIES = 500;

async function readLogs(): Promise<SystemLogEntry[]> {
  try {
    const raw = await readFile(logsPath, "utf8");
    return JSON.parse(raw) as SystemLogEntry[];
  } catch {
    return [];
  }
}

export async function listSystemLogs(limit = 200) {
  const logs = await readLogs();
  return logs.slice(0, Math.max(1, Math.min(limit, MAX_LOG_ENTRIES)));
}

export async function logSystemEvent(entry: Omit<SystemLogEntry, "id" | "timestamp">) {
  const record: SystemLogEntry = {
    ...entry,
    id: `log_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    timestamp: new Date().toISOString(),
  };

  const consolePayload = {
    timestamp: record.timestamp,
    level: record.level,
    source: record.source,
    event: record.event,
    conversationId: record.conversationId,
    message: record.message,
    details: record.details,
  };

  const consoleMethod = record.level === "error" ? console.error : record.level === "warning" ? console.warn : console.info;
  consoleMethod("[evercrest]", JSON.stringify(consolePayload));

  try {
    const logs = await readLogs();
    await mkdir(dirname(logsPath), { recursive: true });
    await writeFile(logsPath, JSON.stringify([record, ...logs].slice(0, MAX_LOG_ENTRIES), null, 2) + "\n", "utf8");
  } catch (error) {
    console.error("[evercrest] Unable to persist system log", error);
  }

  return record;
}
