"use client";

import { useEffect, useMemo, useState } from "react";
import { ClipboardList, Inbox, RefreshCw, Search, ShieldAlert } from "lucide-react";
import AdminReport, { SystemActivity } from "./AdminReport";
import { fetchConversations, fetchSystemLogs, updateConversationStatusOnServer } from "@/lib/clientApi";
import type { ConversationRecord, ConversationStatus, SystemLogEntry } from "@/lib/types";

export default function AdminDashboard() {
  const [conversations, setConversations] = useState<ConversationRecord[]>([]);
  const [logs, setLogs] = useState<SystemLogEntry[]>([]);
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAdminData();
  }, []);

  async function loadAdminData() {
    setLoading(true);
    const [items, activity] = await Promise.all([fetchConversations(), fetchSystemLogs()]);
    setConversations(items);
    setLogs(activity);
    setSelectedId((current) => current || items[0]?.id || "");
    setLoading(false);
  }

  const filtered = useMemo(() => {
    const value = query.toLowerCase();
    return conversations.filter((conversation) => {
      return [conversation.propertyAddress, conversation.tenantEmail, conversation.verdict.issueCategory, conversation.status]
        .join(" ")
        .toLowerCase()
        .includes(value);
    });
  }, [conversations, query]);

  const selected = filtered.find((conversation) => conversation.id === selectedId) ?? filtered[0];

  async function updateStatus(status: ConversationStatus) {
    if (!selected) return;
    const updated = await updateConversationStatusOnServer(selected.id, status);
    setConversations((items) => items.map((conversation) => (conversation.id === updated.id ? updated : conversation)));
    setLogs(await fetchSystemLogs());
  }

  return (
    <main className="admin-shell">
      <aside className="admin-list-panel">
        <div className="admin-title">
          <ClipboardList size={24} />
          <div><p className="eyebrow">Admin</p><h1>Work order reports</h1></div>
        </div>

        <label className="search-box">
          <Search size={18} />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search reports" />
        </label>

        <button type="button" className="refresh-button" onClick={loadAdminData}>
          <RefreshCw size={16} /> Refresh
        </button>

        <div className="conversation-list">
          {filtered.length ? filtered.map((conversation) => (
            <button
              key={conversation.id}
              type="button"
              className={"conversation-item " + (conversation.id === selected?.id ? "selected" : "")}
              onClick={() => setSelectedId(conversation.id)}
            >
              <span className={"severity-dot " + conversation.verdict.severity} />
              <strong>{conversation.verdict.issueCategory}</strong>
              <small>{conversation.propertyAddress}</small>
              <em>{conversationStatusLabel(conversation.status)}</em>
            </button>
          )) : (
            <div className="empty-state"><Inbox size={28} /> {loading ? "Loading reports..." : "No reports found."}</div>
          )}
        </div>
      </aside>

      <section className="admin-detail-panel">
        {selected ? (
          <AdminReport conversation={selected} logs={logs} onStatusChange={updateStatus} />
        ) : (
          <div className="admin-grid">
            <div className="admin-empty admin-block wide"><ShieldAlert size={34} /> Start a tenant chat to create the first work order report.</div>
            <SystemActivity logs={logs} />
          </div>
        )}
      </section>
    </main>
  );
}

function conversationStatusLabel(status: ConversationStatus) {
  if (status === "ticket_submitted" || status === "email_sent") return "ticket submitted";
  if (status === "needs_more_info") return "in progress";
  return status.replaceAll("_", " ");
}
