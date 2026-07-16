import { NextResponse } from "next/server";
import { listConversations, saveConversation } from "@/lib/sitesStore";
import { logSystemEvent } from "@/lib/sitesLog";
import type { ConversationRecord } from "@/lib/types";

export async function GET() {
  const conversations = await listConversations();
  return NextResponse.json({ conversations });
}

export async function POST(request: Request) {
  const conversation = (await request.json()) as ConversationRecord;

  if (!conversation.id || !conversation.propertyId || !conversation.tenantEmail) {
    await logSystemEvent({
      level: "warning",
      source: "api",
      event: "conversation.rejected",
      message: "Rejected an invalid conversation payload.",
    });
    return NextResponse.json({ error: "Invalid conversation payload" }, { status: 400 });
  }

  const existing = (await listConversations()).some((item) => item.id === conversation.id);
  const saved = await saveConversation(conversation);
  await logSystemEvent({
    level: "info",
    source: "tenant",
    event: existing ? "conversation.updated" : "conversation.created",
    message: existing ? "Tenant conversation was updated." : "Tenant conversation was created.",
    conversationId: saved.id,
    details: {
      propertyId: saved.propertyId,
      status: saved.status,
      messageCount: saved.messages.length,
      attachmentCount: saved.attachments.length,
    },
  });
  return NextResponse.json({ conversation: saved });
}
