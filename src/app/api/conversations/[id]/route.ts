import { NextResponse } from "next/server";
import { updateConversationStatus } from "@/lib/serverStore";
import { logSystemEvent } from "@/lib/systemLog";
import type { ConversationStatus, ConversationRecord } from "@/lib/types";

const allowedStatuses: ConversationStatus[] = ["active", "needs_more_info", "escalated", "ticket_submitted", "email_sent", "reviewed", "closed"];

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const body = (await request.json()) as { status?: ConversationStatus; conversation?: ConversationRecord };

  if (!body.status || !allowedStatuses.includes(body.status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const conversation = await updateConversationStatus(id, body.status, body.conversation);
  if (!conversation) {
    return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
  }

  await logSystemEvent({
    level: "info",
    source: "admin",
    event: "conversation.status_changed",
    message: `Conversation status changed to ${conversation.status}.`,
    conversationId: conversation.id,
    details: { status: conversation.status },
  });

  return NextResponse.json({ conversation });
}
