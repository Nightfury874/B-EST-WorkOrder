import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import type { ConversationRecord, ConversationStatus, StaffEmailReport } from "./types";

type OutboxRecord = {
  conversationId: string;
  tenantEmail: string;
  propertyAddress: string;
  subject: string;
  body: string;
  sentAt: string;
  deliveryStatus: StaffEmailReport["deliveryStatus"];
};

const dataDir = join(process.cwd(), "data");
const conversationsPath = join(dataDir, "conversations.json");
const outboxPath = join(dataDir, "staff_outbox.json");

async function readJsonFile<T>(path: string, fallback: T): Promise<T> {
  try {
    const raw = await readFile(path, "utf8");
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

async function writeJsonFile<T>(path: string, value: T) {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

export async function listConversations() {
  const conversations = await readJsonFile<ConversationRecord[]>(conversationsPath, []);
  return conversations.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function saveConversation(conversation: ConversationRecord) {
  const conversations = await listConversations();
  const existing = conversations.find((item) => item.id === conversation.id);
  const nextConversation: ConversationRecord = {
    ...conversation,
    updatedAt: new Date().toISOString(),
  };
  const next = [nextConversation, ...conversations.filter((item) => item.id !== conversation.id)];
  await writeJsonFile(conversationsPath, next);

  if (conversation.staffEmail && !existing?.staffEmail) {
    await appendOutbox(nextConversation);
  }

  return nextConversation;
}

export async function updateConversationStatus(id: string, status: ConversationStatus) {
  const conversations = await listConversations();
  const target = conversations.find((item) => item.id === id);
  if (!target) return null;

  const updated: ConversationRecord = {
    ...target,
    status,
    updatedAt: new Date().toISOString(),
  };

  const next = conversations.map((item) => (item.id === id ? updated : item));
  await writeJsonFile(conversationsPath, next);
  return updated;
}

async function appendOutbox(conversation: ConversationRecord) {
  if (!conversation.staffEmail) return;

  const outbox = await readJsonFile<OutboxRecord[]>(outboxPath, []);
  if (outbox.some((item) => item.conversationId === conversation.id)) return;

  const record: OutboxRecord = {
    conversationId: conversation.id,
    tenantEmail: conversation.tenantEmail,
    propertyAddress: conversation.propertyAddress,
    subject: conversation.staffEmail.subject,
    body: conversation.staffEmail.body,
    sentAt: conversation.staffEmail.sentAt,
    deliveryStatus: conversation.staffEmail.deliveryStatus,
  };

  await writeJsonFile(outboxPath, [record, ...outbox]);
}
