"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Building2,
  CheckCircle2,
  Home,
  Phone,
  Plus,
  Send,
  UserRound,
  X,
} from "lucide-react";
import { createMessage, initialVerdict } from "@/lib/storage";
import { getCurrentTenant, getPropertiesForTenant } from "@/lib/tenantData";
import { saveConversationToServer, sendMessageToServer } from "@/lib/clientApi";
import type { AttachmentNote, ConversationRecord, PropertyInfo, TenantInfoFile } from "@/lib/types";

type TenantPayload = TenantInfoFile & { source?: string };

export default function TenantChatPage() {
  const [tenantData, setTenantData] = useState<TenantPayload | null>(null);
  const [conversation, setConversation] = useState<ConversationRecord | null>(null);
  const [draft, setDraft] = useState("");
  const [attachmentError, setAttachmentError] = useState("");
  const [pendingAttachmentIds, setPendingAttachmentIds] = useState<string[]>([]);
  const [saveState, setSaveState] = useState<"idle" | "pending" | "saving" | "saved" | "error">("idle");
  const lastStartedKey = useRef("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    async function loadTenantInfo() {
      const response = await fetch("/api/tenant-info");
      const data = (await response.json()) as TenantPayload;
      setTenantData(data);
    }

    loadTenantInfo().catch(() => setSaveState("error"));
  }, []);

  const selectedTenant = useMemo(
    () => (tenantData ? getCurrentTenant(tenantData) : undefined),
    [tenantData],
  );

  const availableProperties = useMemo(
    () => (selectedTenant && tenantData ? getPropertiesForTenant(selectedTenant, tenantData.properties) : []),
    [selectedTenant, tenantData],
  );

  const selectedProperty = availableProperties[0];

  useEffect(() => {
    if (!selectedTenant || !selectedProperty) return;
    const key = `${selectedTenant.tenant_id}:${selectedProperty.property_id}`;
    if (lastStartedKey.current === key) return;
    lastStartedKey.current = key;

    const greeting = createMessage(
      "bot",
      "Hi. I can help document a maintenance issue for Evercrest. Please describe what is happening, where it is located, and whether there are any safety concerns.",
    );
    const next: ConversationRecord = {
      id: `conv_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      tenantId: selectedTenant.tenant_id,
      tenantName: selectedTenant.name,
      tenantPhone: selectedTenant.contact_preferences?.phone,
      tenantEmail: selectedTenant.email,
      propertyAddress: formatAddress(selectedProperty),
      propertyId: selectedProperty.property_id,
      status: "active",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      messages: [greeting],
      attachments: [],
      verdict: {
        ...initialVerdict,
        accessDetails: {
          ...initialVerdict.accessDetails,
          contactPreference: [selectedTenant.contact_preferences?.preferred_method, selectedTenant.contact_preferences?.phone].filter(Boolean).join(": "),
        },
      },
      tokenUsage: {
        inputTokens: 0,
        outputTokens: 0,
        totalTokens: 0,
      },
    };

    updateConversation(next);
  }, [selectedProperty, selectedTenant]);

  const messageCount = conversation?.messages.length ?? 0;
  const pendingAttachments = conversation?.attachments.filter((attachment) => pendingAttachmentIds.includes(attachment.id)) ?? [];
  const chatComplete = Boolean(conversation && (conversation.verdict.intakeComplete || ["ticket_submitted", "email_sent", "reviewed", "closed"].includes(conversation.status)));


  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messageCount]);

  async function updateConversation(next: ConversationRecord) {
    setConversation(next);
    setSaveState("saving");
    try {
      const saved = await saveConversationToServer(next);
      setConversation(saved);
      setSaveState("saved");
    } catch {
      setSaveState("error");
    }
  }

  async function handleSend() {
    if (!conversation || chatComplete) return;

    const attachmentsToSend = pendingAttachments;
    const typedText = draft.trim();
    if (!typedText && !attachmentsToSend.length) return;

    const userText = typedText || (attachmentsToSend.length === 1 ? "Attached an image." : `Attached ${attachmentsToSend.length} images.`);
    setDraft("");

    // Keep the message and its pending images together while the server processes one atomic request.
    const tempUserMsg = createMessage("tenant", userText, attachmentsToSend.map((attachment) => attachment.id));
    const tempBotMsg = createMessage("bot", "Thinking...");
    const tempConversation: ConversationRecord = {
      ...conversation,
      messages: [...conversation.messages, tempUserMsg, tempBotMsg],
    };
    setConversation(tempConversation);
    setSaveState("saving");

    try {
      const updated = await sendMessageToServer(conversation.id, userText, attachmentsToSend);
      setConversation(updated);
      setPendingAttachmentIds([]);
      setSaveState("saved");
    } catch (error) {
      console.error(error);
      setConversation(conversation);
      setDraft(typedText);
      setSaveState("error");
    }
  }

  function handleImageSelection(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!conversation || !file) return;

    setAttachmentError("");
    if (!file.type.startsWith("image/")) {
      setAttachmentError("Please select an image file.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setAttachmentError("Images must be 5 MB or smaller.");
      return;
    }

    const reader = new FileReader();
    reader.onerror = () => setAttachmentError("The image could not be read. Please try another file.");
    reader.onload = () => {
      if (typeof reader.result !== "string") {
        setAttachmentError("The image could not be read. Please try another file.");
        return;
      }

      const attachment: AttachmentNote = {
        id: "att_" + Date.now(),
        name: file.name,
        tenantNote: "",
        aiNotes: "Awaiting AI image review.",
        privacyFlags: [],
        dataUrl: reader.result,
        mimeType: file.type,
        sizeBytes: file.size,
      };

      setConversation((current) => {
        if (!current) return current;
        return {
          ...current,
          attachments: [...current.attachments, attachment],
          verdict: {
            ...current.verdict,
            photoVideoStatus: "received",
          },
          updatedAt: new Date().toISOString(),
        };
      });
      setPendingAttachmentIds((ids) => [...ids, attachment.id]);
      setSaveState("pending");
    };
    reader.readAsDataURL(file);
  }

  function removeAttachment(id: string) {
    if (!conversation) return;

    const attachments = conversation.attachments.filter((attachment) => attachment.id !== id);
    const nextConversation: ConversationRecord = {
      ...conversation,
      attachments,
      verdict: {
        ...conversation.verdict,
        photoVideoStatus: attachments.length ? "received" : "not_requested",
      },
      updatedAt: new Date().toISOString(),
    };

    if (pendingAttachmentIds.includes(id)) {
      const nextPendingIds = pendingAttachmentIds.filter((attachmentId) => attachmentId !== id);
      setPendingAttachmentIds(nextPendingIds);
      setConversation(nextConversation);
      setSaveState(nextPendingIds.length ? "pending" : "saved");
      return;
    }

    updateConversation(nextConversation);
  }



  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="brand-lockup">
          <div className="brand-mark"><Building2 size={22} /></div>
          <div>
            <h1>Evercrest</h1>
            <p>Work order intake</p>
          </div>
        </div>


        <div className="context-list">
          <ContextRow icon={<UserRound size={16} />} label="Signed-in tenant" value={selectedTenant?.name ?? "Loading tenant"} />
          <ContextRow icon={<Phone size={16} />} label="Phone" value={selectedTenant?.contact_preferences?.phone ?? "Not provided"} />
          <ContextRow icon={<UserRound size={16} />} label="Email" value={selectedTenant?.email ?? "Loading"} />
          <ContextRow icon={<Building2 size={16} />} label="Property ID" value={selectedProperty?.property_id ?? "Loading"} />
          <ContextRow icon={<Home size={16} />} label="Property" value={selectedProperty ? formatAddress(selectedProperty) : "Loading property"} />
          <ContextRow icon={<CheckCircle2 size={16} />} label="Sync status" value={saveStateLabel(saveState)} />
        </div>

      </aside>

      <section className="chat-panel">
        <header className="panel-header">
          <div>
            <p className="eyebrow">Tenant chat</p>
            <h2>Report a maintenance issue</h2>
          </div>
          <StatusBadge label={conversation?.status ?? "active"} />
        </header>

        <div className="messages" aria-live="polite">
          {conversation?.messages.map((message) => {
            const messageAttachments = conversation.attachments.filter((attachment) => message.attachmentIds?.includes(attachment.id));
            return (
              <article key={message.id} className={`message ${message.sender}`}>
                <div className="message-meta">{message.sender === "tenant" ? "Tenant" : "Evercrest bot"}</div>
                {messageAttachments.length ? (
                  <div className="message-attachments">
                    {messageAttachments.map((attachment) => attachment.dataUrl ? (
                      <Image key={attachment.id} src={attachment.dataUrl} alt={attachment.name} width={320} height={220} unoptimized />
                    ) : null)}
                  </div>
                ) : null}
                <p>{message.body}</p>
              </article>
            );
          })}
          <div ref={messagesEndRef} aria-hidden="true" />
        </div>

        <div className="chat-controls">
          {pendingAttachments.length && !chatComplete ? (
            <div className="tenant-attachment-tray" aria-label="Attached images">
              {pendingAttachments.map((attachment) => (
                <article key={attachment.id} className="tenant-attachment">
                  {attachment.dataUrl ? <Image src={attachment.dataUrl} alt={attachment.name} width={48} height={48} unoptimized /> : null}
                  <span title={attachment.name}>{attachment.name}</span>
                  <button type="button" onClick={() => removeAttachment(attachment.id)} aria-label={"Remove " + attachment.name}>
                    <X size={15} />
                  </button>
                </article>
              ))}
            </div>
          ) : null}
          {attachmentError ? <p className="attachment-error" role="alert">{attachmentError}</p> : null}


        <footer className="composer">
          {chatComplete ? (
            <div className="ticket-submitted-notice"><CheckCircle2 size={20} /><span><strong>Ticket submitted</strong> Evercrest will review the report and determine the next step.</span></div>
          ) : null}

          <input
            ref={fileInputRef}
            className="visually-hidden"
            type="file"
            accept="image/*"
            onChange={handleImageSelection}
            tabIndex={-1}
            disabled={chatComplete}
          />
          <button type="button" className="attach-button" onClick={() => fileInputRef.current?.click()} aria-label="Attach an image" disabled={chatComplete}>
            <Plus size={22} />
          </button>
          <textarea
            rows={2}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                handleSend();
              }
            }}
            placeholder={chatComplete ? "Ticket submitted - this chat is now closed." : "Describe the issue, location, current status, and any safety concern..."}
            disabled={chatComplete}
          />
          <button type="button" className="send-button" onClick={handleSend} aria-label="Send message" disabled={chatComplete || saveState === "saving"}>
            <Send size={20} />
          </button>
        </footer>
        </div>
      </section>

    </main>
  );
}

function formatAddress(property: PropertyInfo) {
  return property.unit ? `${property.address}, ${property.unit}` : property.address;
}

function saveStateLabel(state: "idle" | "pending" | "saving" | "saved" | "error") {
  if (state === "pending") return "Image ready to send";
  if (state === "saving") return "Saving";
  if (state === "saved") return "Saved";
  if (state === "error") return "Save issue";
  return "Ready";
}

function ContextRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="context-row">
      {icon}
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
      </div>
    </div>
  );
}

function StatusBadge({ label }: { label: string }) {
  return <span className={`status-badge ${label}`}>{conversationStatusLabel(label)}</span>;
}

function conversationStatusLabel(status: string) {
  if (status === "ticket_submitted" || status === "email_sent") return "Ticket submitted";
  if (status === "needs_more_info") return "In progress";
  return status.replaceAll("_", " ");
}

