import { env } from "cloudflare:workers";
import type { AttachmentNote, ConversationRecord, ConversationStatus, StaffEmailReport } from "./types";

type D1Statement = {
  bind(...values: unknown[]): D1Statement;
  first<T>(): Promise<T | null>;
  all<T>(): Promise<{ results?: T[] }>;
  run(): Promise<unknown>;
};

type D1DatabaseLike = {
  prepare(query: string): D1Statement;
  batch(statements: D1Statement[]): Promise<unknown>;
};

type R2BucketLike = {
  put(key: string, value: ArrayBuffer | ArrayBufferView, options?: { httpMetadata?: { contentType?: string }; customMetadata?: Record<string, string> }): Promise<unknown>;
};

type RuntimeEnv = {
  DB: D1DatabaseLike;
  ATTACHMENTS?: R2BucketLike;
};

type OutboxRecord = {
  conversationId: string;
  tenantEmail: string;
  propertyAddress: string;
  subject: string;
  body: string;
  sentAt: string;
  deliveryStatus: StaffEmailReport["deliveryStatus"];
};

const runtime = env as unknown as RuntimeEnv;

async function ensureSchema() {
  if (!runtime.DB) {
    throw new Error("Sites database binding DB is unavailable.");
  }

  await runtime.DB.batch([
    runtime.DB.prepare(`CREATE TABLE IF NOT EXISTS conversations (
      id TEXT PRIMARY KEY,
      data TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )`),
    runtime.DB.prepare(`CREATE TABLE IF NOT EXISTS staff_outbox (
      conversation_id TEXT PRIMARY KEY,
      data TEXT NOT NULL,
      sent_at TEXT NOT NULL
    )`),
  ]);
}

function decodeDataUrl(dataUrl: string) {
  const match = /^data:([^;,]+)?;base64,(.+)$/s.exec(dataUrl);
  if (!match) return null;

  const decoded = atob(match[2]);
  const bytes = new Uint8Array(decoded.length);
  for (let index = 0; index < decoded.length; index += 1) {
    bytes[index] = decoded.charCodeAt(index);
  }

  return { contentType: match[1] || "application/octet-stream", bytes };
}

async function persistAttachments(attachments: AttachmentNote[]) {
  if (!runtime.ATTACHMENTS) return attachments;

  return Promise.all(
    attachments.map(async (attachment) => {
      if (!attachment.dataUrl?.startsWith("data:")) return attachment;
      const decoded = decodeDataUrl(attachment.dataUrl);
      if (!decoded) return attachment;

      const key = `attachments/${attachment.id}`;
      await runtime.ATTACHMENTS?.put(key, decoded.bytes, {
        httpMetadata: { contentType: attachment.mimeType || decoded.contentType },
        customMetadata: { filename: attachment.name },
      });

      return {
        ...attachment,
        dataUrl: `/api/attachments/${encodeURIComponent(attachment.id)}`,
      };
    }),
  );
}

export async function listConversations() {
  await ensureSchema();
  const result = await runtime.DB.prepare(
    "SELECT data FROM conversations ORDER BY updated_at DESC",
  ).all<{ data: string }>();

  return (result.results ?? []).flatMap((row) => {
    try {
      return [JSON.parse(row.data) as ConversationRecord];
    } catch {
      return [];
    }
  });
}

export async function saveConversation(conversation: ConversationRecord) {
  await ensureSchema();
  const existing = await runtime.DB.prepare(
    "SELECT data FROM conversations WHERE id = ?",
  ).bind(conversation.id).first<{ data: string }>();

  const nextConversation: ConversationRecord = {
    ...conversation,
    attachments: await persistAttachments(conversation.attachments),
    updatedAt: new Date().toISOString(),
  };

  await runtime.DB.prepare(
    `INSERT INTO conversations (id, data, updated_at)
     VALUES (?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at`,
  ).bind(nextConversation.id, JSON.stringify(nextConversation), nextConversation.updatedAt).run();

  const previous = existing ? (JSON.parse(existing.data) as ConversationRecord) : null;
  if (nextConversation.staffEmail && !previous?.staffEmail) {
    await appendOutbox(nextConversation);
  }

  return nextConversation;
}

export async function updateConversationStatus(id: string, status: ConversationStatus) {
  await ensureSchema();
  const existing = await runtime.DB.prepare(
    "SELECT data FROM conversations WHERE id = ?",
  ).bind(id).first<{ data: string }>();
  if (!existing) return null;

  const updated: ConversationRecord = {
    ...(JSON.parse(existing.data) as ConversationRecord),
    status,
    updatedAt: new Date().toISOString(),
  };

  await runtime.DB.prepare(
    "UPDATE conversations SET data = ?, updated_at = ? WHERE id = ?",
  ).bind(JSON.stringify(updated), updated.updatedAt, id).run();

  return updated;
}

async function appendOutbox(conversation: ConversationRecord) {
  if (!conversation.staffEmail) return;

  const record: OutboxRecord = {
    conversationId: conversation.id,
    tenantEmail: conversation.tenantEmail,
    propertyAddress: conversation.propertyAddress,
    subject: conversation.staffEmail.subject,
    body: conversation.staffEmail.body,
    sentAt: conversation.staffEmail.sentAt,
    deliveryStatus: conversation.staffEmail.deliveryStatus,
  };

  await runtime.DB.prepare(
    "INSERT OR IGNORE INTO staff_outbox (conversation_id, data, sent_at) VALUES (?, ?, ?)",
  ).bind(record.conversationId, JSON.stringify(record), record.sentAt).run();
}
