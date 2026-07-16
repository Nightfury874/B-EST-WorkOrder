import type { AttachmentNote, ConversationRecord, ConversationStatus, SystemLogEntry } from "./types";

export async function fetchConversations(): Promise<ConversationRecord[]> {
  const response = await fetch("/api/conversations", { cache: "no-store" });
  if (!response.ok) return [];
  const data = (await response.json()) as { conversations: ConversationRecord[] };
  return data.conversations;
}

export async function fetchSystemLogs(): Promise<SystemLogEntry[]> {
  const response = await fetch("/api/admin/logs?limit=200", { cache: "no-store" });
  if (!response.ok) return [];
  const data = (await response.json()) as { logs: SystemLogEntry[] };
  return data.logs;
}

export async function saveConversationToServer(conversation: ConversationRecord): Promise<ConversationRecord> {
  const response = await fetch("/api/conversations", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(conversation),
  });

  if (!response.ok) {
    throw new Error("Unable to save conversation");
  }

  const data = (await response.json()) as { conversation: ConversationRecord };
  return data.conversation;
}

export async function sendMessageToServer(id: string, body: string, attachments: AttachmentNote[] = []): Promise<ConversationRecord> {
  const response = await fetch(`/api/conversations/${id}/messages`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ body, attachments }),
  });

  if (!response.ok) {
    throw new Error("Unable to send message to server");
  }

  const data = (await response.json()) as { conversation: ConversationRecord };
  return data.conversation;
}

export async function updateConversationStatusOnServer(id: string, status: ConversationStatus): Promise<ConversationRecord> {
  const response = await fetch(`/api/conversations/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status }),
  });

  if (!response.ok) {
    throw new Error("Unable to update conversation status");
  }

  const data = (await response.json()) as { conversation: ConversationRecord };
  return data.conversation;
}
