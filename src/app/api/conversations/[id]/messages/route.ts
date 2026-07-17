import { NextResponse } from "next/server";
import { listConversations, saveConversation } from "@/lib/serverStore";
import { createMessage } from "@/lib/storage";
import { logSystemEvent } from "@/lib/systemLog";
import { addTokenUsage } from "@/lib/tokenUsage";
import { analyzeMaintenanceImages, analyzeTenantMessage, createBotReply, createStaffEmail } from "@/lib/triage";
import type { AttachmentNote, ConversationRecord, ConversationStatus } from "@/lib/types";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const body = (await request.json()) as { body?: string; attachments?: AttachmentNote[] };
    const submittedAttachments = body.attachments ?? [];
    const messageBody = body.body?.trim() || (submittedAttachments.length
      ? submittedAttachments.length === 1 ? "Attached an image." : `Attached ${submittedAttachments.length} images.`
      : "");

    if (!messageBody || submittedAttachments.some((attachment) => !isValidImageAttachment(attachment))) {
      return NextResponse.json({ error: "A message or valid image attachment is required" }, { status: 400 });
    }

    const conversations = await listConversations();
    const conversation = conversations.find((item) => item.id === id);

    if (!conversation) {
      return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
    }

    await logSystemEvent({
      level: "info",
      source: "tenant",
      event: "message.received",
      message: "Tenant message received; triage is starting.",
      conversationId: conversation.id,
      details: {
        messageLength: messageBody.length,
        attachmentCount: submittedAttachments.length,
      },
    });

    // 1. Append the tenant's new message
    const tenantMsg = createMessage("tenant", messageBody, submittedAttachments.map((attachment) => attachment.id));
    const tempMessages = [...conversation.messages, tenantMsg];
    const existingAttachmentIds = new Set(conversation.attachments.map((attachment) => attachment.id));
    const mergedAttachments = [...conversation.attachments, ...submittedAttachments.filter((attachment) => !existingAttachmentIds.has(attachment.id))];

    // 2. Build the transcript and review newly submitted images.
    const baseTranscript = tempMessages
      .map((msg) => `${msg.sender === "tenant" ? "Tenant" : "Bot"}: ${msg.body}`)
      .join("\n");
    const visionAnalysis = await analyzeMaintenanceImages(submittedAttachments, baseTranscript, conversation.id);
    const analyzedById = new Map(visionAnalysis.attachments.map((attachment) => [attachment.id, attachment]));
    const attachments = mergedAttachments.map((attachment) => analyzedById.get(attachment.id) ?? attachment);
    const attachmentContext = visionAnalysis.summary
      ? `\nAI image review: ${visionAnalysis.summary}`
      : submittedAttachments.length
        ? `\nTenant attached ${submittedAttachments.length} image(s): ${submittedAttachments.map((attachment) => attachment.name).join(", ")}.`
        : "";
    const transcript = baseTranscript + attachmentContext;

    // 3. Analyze state and generate bot reply
    const { verdict, tokenUsage: triageTokenUsage } = await analyzeTenantMessage(conversation.verdict, tenantMsg.body + attachmentContext, transcript, conversation.id);
    if (submittedAttachments.length) {
      verdict.photoVideoStatus = "received";
    }

    await logSystemEvent({
      level: "info",
      source: "triage",
      event: "triage.completed",
      message: "Triage verdict and intake state were updated.",
      conversationId: conversation.id,
      details: {
        category: verdict.issueCategory,
        severity: verdict.severity,
        intakeComplete: verdict.intakeComplete,
        inputTokens: triageTokenUsage.inputTokens,
        outputTokens: triageTokenUsage.outputTokens,
      },
    });

    // Add the bot reply to the temp message history to form the full transcript
    const nextTranscript = transcript + `\nBot: (generating response...)`;
    const { body: generatedReplyBody, tokenUsage: replyTokenUsage } = await createBotReply(verdict, nextTranscript, conversation.id);
    const botReplyBody = visionAnalysis.summary
      ? `Thanks for the image. ${visionAnalysis.summary}\n\n${generatedReplyBody}`
      : generatedReplyBody;
    const botMsg = createMessage("bot", botReplyBody);

    await logSystemEvent({
      level: "info",
      source: "triage",
      event: "reply.generated",
      message: "Tenant-facing response was generated.",
      conversationId: conversation.id,
      details: {
        replyLength: botReplyBody.length,
        inputTokens: replyTokenUsage.inputTokens,
        outputTokens: replyTokenUsage.outputTokens,
      },
    });

    const messages = [...tempMessages, botMsg];
    const turnTokenUsage = addTokenUsage(addTokenUsage(visionAnalysis.tokenUsage, triageTokenUsage), replyTokenUsage);
    const tokenUsage = addTokenUsage(conversation.tokenUsage, turnTokenUsage);

    // 4. Determine new conversation status
    let status: ConversationStatus = "needs_more_info";
    if (verdict.severity === "emergency" || verdict.intakeComplete) {
      status = "ticket_submitted";
    }

    let updatedConversation: ConversationRecord = {
      ...conversation,
      status,
      messages,
      attachments,
      verdict,
      tokenUsage,
      updatedAt: new Date().toISOString(),
    };

    // 5. Generate staff handoff email if needed
    if (status === "ticket_submitted" && !conversation.staffEmail) {
      const staffEmail = createStaffEmail(updatedConversation);
      updatedConversation = {
        ...updatedConversation,
        staffEmail,
      };
      await logSystemEvent({
        level: "info",
        source: "handoff",
        event: "handoff.generated",
        message: "Staff handoff report was generated and added to the simulated outbox.",
        conversationId: conversation.id,
        details: {
          severity: verdict.severity,
          category: verdict.issueCategory,
          deliveryStatus: staffEmail.deliveryStatus,
        },
      });
    }

    // 6. Save back to the database file
    const saved = await saveConversation(updatedConversation);

    await logSystemEvent({
      level: "info",
      source: "storage",
      event: "conversation.persisted",
      message: "Conversation state was persisted after message processing.",
      conversationId: saved.id,
      details: {
        status: saved.status,
        messageCount: saved.messages.length,
        attachmentCount: saved.attachments.length,
        handoffCreated: Boolean(saved.staffEmail),
        totalTokens: saved.tokenUsage?.totalTokens ?? 0,
      },
    });

    return NextResponse.json({ conversation: saved });
  } catch (error) {
    await logSystemEvent({
      level: "error",
      source: "api",
      event: "message.processing_failed",
      message: "Conversation message processing failed.",
      details: { error: error instanceof Error ? error.message : "Unknown error" },
    });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

function isValidImageAttachment(attachment: AttachmentNote) {
  return Boolean(
    attachment &&
      typeof attachment.id === "string" &&
      typeof attachment.name === "string" &&
      typeof attachment.dataUrl === "string" &&
      attachment.dataUrl.startsWith("data:image/") &&
      typeof attachment.mimeType === "string" &&
      attachment.mimeType.startsWith("image/") &&
      typeof attachment.sizeBytes === "number" &&
      attachment.sizeBytes > 0 &&
      attachment.sizeBytes <= 5 * 1024 * 1024 &&
      attachment.dataUrl.length <= 7_500_000,
  );
}
