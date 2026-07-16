"use client";

import Image from "next/image";
import {
  Activity,
  AlertTriangle,
  Camera,
  CheckCircle2,
  ClipboardCheck,
  FileText,
  History,
  KeyRound,
  MapPin,
  PhoneCall,
  ShieldCheck,
  Sparkles,
  UserRound,
  Wrench,
} from "lucide-react";
import { getSimilarCaseCitations } from "@/lib/cases";
import type { ConversationRecord, ConversationStatus, SystemLogEntry } from "@/lib/types";

type AdminReportProps = {
  conversation: ConversationRecord;
  logs: SystemLogEntry[];
  onStatusChange: (status: ConversationStatus) => Promise<void>;
};

export default function AdminReport({ conversation, logs, onStatusChange }: AdminReportProps) {
  const { verdict } = conversation;
  const similarCases = getSimilarCaseCitations(conversation, 5);
  const tenantMessages = conversation.messages.filter((message) => message.sender === "tenant");
  const reportLogs = logs.filter((entry) => entry.conversationId === conversation.id);
  const access = verdict.accessDetails;

  return (
    <>
      <header className={`admin-detail-header report-header severity-${verdict.severity}`}>
        <div>
          <div className="report-kicker">
            <span className={`severity-label ${verdict.severity}`}>{formatLabel(verdict.severity)}</span>
            <span>Maintenance intelligence report</span>
          </div>
          <h2>{verdict.issueCategory}</h2>
          <div className="report-location"><MapPin size={15} /> {conversation.propertyAddress} / {verdict.issueLocation}</div>
        </div>
        <div className="admin-actions">
          <button type="button" onClick={() => onStatusChange("reviewed")}><CheckCircle2 size={17} /> Reviewed</button>
          <button type="button" onClick={() => onStatusChange("closed")}><Wrench size={17} /> Close</button>
        </div>
      </header>

      <div className="admin-report">
        <section className="report-hero-card">
          <div className="report-hero-copy">
            <p className="eyebrow">Executive brief</p>
            <h3>{buildExecutiveSummary(conversation)}</h3>
            <p>{verdict.staffReviewRequired ? "Staff review is recommended before routing or scheduling." : "The report is ready for standard maintenance routing."}</p>
          </div>
          <div className="report-hero-status">
            <span>Ticket status</span>
            <strong>{conversationStatusLabel(conversation.status)}</strong>
            <small>Updated {formatDate(conversation.updatedAt)}</small>
          </div>
        </section>

        <section className="report-metric-grid" aria-label="Report summary metrics">
          <ReportMetric icon={<AlertTriangle size={19} />} label="Priority" value={formatLabel(verdict.severity)} tone={verdict.severity} />
          <ReportMetric icon={<Wrench size={19} />} label="Recommended trade" value={verdict.likelyVendorCategory || "Staff triage"} />
          <ReportMetric icon={<Camera size={19} />} label="Visual evidence" value={`${conversation.attachments.length} attachment${conversation.attachments.length === 1 ? "" : "s"}`} />
          <ReportMetric icon={<Sparkles size={19} />} label="AI usage" value={`${(conversation.tokenUsage?.totalTokens ?? 0).toLocaleString()} tokens`} />
        </section>

        <div className="report-content-grid">
          <div className="report-main-column">
            <ReportSection icon={<ClipboardCheck size={20} />} eyebrow="Issue evidence" title="What the tenant reported">
              <div className="reported-message-list">
                {tenantMessages.length ? tenantMessages.map((message) => (
                  <blockquote key={message.id}>
                    <p>{message.body}</p>
                    <footer>{formatDate(message.createdAt)}</footer>
                  </blockquote>
                )) : <p className="muted">No tenant messages were recorded.</p>}
              </div>
            </ReportSection>

            {conversation.attachments.length ? (
              <ReportSection icon={<Camera size={20} />} eyebrow="Visual evidence" title="Attachments and AI observations">
                <div className="report-attachment-gallery">
                  {conversation.attachments.map((attachment) => (
                    <article key={attachment.id}>
                      {attachment.dataUrl ? <Image src={attachment.dataUrl} alt={attachment.name} width={420} height={280} unoptimized /> : null}
                      <div>
                        <strong>{attachment.name}</strong>
                        <p>{attachment.aiNotes}</p>
                        {attachment.sizeBytes ? <small>{formatFileSize(attachment.sizeBytes)}</small> : null}
                      </div>
                    </article>
                  ))}
                </div>
              </ReportSection>
            ) : null}

            <ReportSection icon={<Sparkles size={20} />} eyebrow="AI assessment" title="Differential analysis">
              {verdict.differentialAnalysis.length ? (
                <div className="differential-list">
                  {verdict.differentialAnalysis.map((item) => (
                    <article key={item.possibleIssue}>
                      <div className="differential-heading"><strong>{item.possibleIssue}</strong><span>{Math.round(item.confidence)}%</span></div>
                      <div className="confidence-track" aria-label={`${item.confidence}% confidence`}>
                        <span style={{ width: `${Math.max(0, Math.min(100, item.confidence))}%` }} />
                      </div>
                      <p>{item.evidence}</p>
                    </article>
                  ))}
                </div>
              ) : <p className="muted">No differential analysis is available yet.</p>}
            </ReportSection>

            <ReportSection icon={<History size={20} />} eyebrow="Historical evidence" title="Similar work orders">
              <p className="section-intro">Sanitized historical matches are ranked from the local case index. Use them as routing context, not as a diagnosis.</p>
              {similarCases.length ? (
                <div className="similar-case-grid">
                  {similarCases.map((item) => (
                    <article key={`${item.sourceFile}:${item.sourceRow}:${item.workOrderNumber}`} className="similar-case-card">
                      <header>
                        <div><span className="case-work-order">WO {item.workOrderNumber || "unknown"}</span><strong>{item.issueCategory}</strong></div>
                        <span className={`case-urgency ${item.normalizedUrgency.toLowerCase()}`}>{item.normalizedUrgency}</span>
                      </header>
                      <p>{item.symptomSummary}</p>
                      <div className="case-match-reason">{item.whySimilar}</div>
                      <dl>
                        <div><dt>Year</dt><dd>{item.sourceYear || "Unknown"}</dd></div>
                        <div><dt>Specialty</dt><dd>{item.specialty || item.likelyVendorCategory}</dd></div>
                      </dl>
                      <footer><FileText size={14} /><cite>{item.sourceFile}, row {item.sourceRow || "unknown"}</cite></footer>
                    </article>
                  ))}
                </div>
              ) : <p className="muted">No sufficiently similar historical cases were found.</p>}
            </ReportSection>

            <ReportSection icon={<FileText size={20} />} eyebrow="Audit trail" title="Conversation transcript">
              <div className="admin-transcript report-transcript">
                {conversation.messages.map((message) => {
                  const messageAttachments = conversation.attachments.filter((attachment) => message.attachmentIds?.includes(attachment.id));
                  return (
                    <article key={message.id} className={message.sender}>
                      <div className="transcript-meta"><strong>{message.sender === "tenant" ? "Tenant" : "Evercrest bot"}</strong><span>{formatDate(message.createdAt)}</span></div>
                      {messageAttachments.length ? (
                        <div className="admin-message-attachments">
                          {messageAttachments.map((attachment) => (
                            <div key={attachment.id}>
                              {attachment.dataUrl ? <Image src={attachment.dataUrl} alt={attachment.name} width={180} height={130} unoptimized /> : null}
                              <span>{attachment.name}</span><p>{attachment.aiNotes}</p>
                            </div>
                          ))}
                        </div>
                      ) : null}
                      <p>{message.body}</p>
                    </article>
                  );
                })}
              </div>
            </ReportSection>
          </div>

          <aside className="report-side-column">
            <ReportSection icon={<Wrench size={19} />} eyebrow="Recommended action" title="Routing guidance" compact>
              <div className="action-callout"><span>Likely vendor</span><strong>{verdict.likelyVendorCategory || "Staff triage"}</strong></div>
              <ReportList items={verdict.staffReviewReason} empty="Standard review; no special routing reason recorded." />
              {verdict.repairpersonAdvice ? <p className="report-note"><strong>Technician note:</strong> {verdict.repairpersonAdvice}</p> : null}
              {verdict.costEstimation ? <p className="report-note"><strong>Planning range:</strong> {verdict.costEstimation}</p> : null}
            </ReportSection>

            <ReportSection icon={<ShieldCheck size={19} />} eyebrow="Risk review" title="Safety and compliance" compact>
              <ReportList items={[...verdict.safetyConcerns, ...verdict.complianceSensitiveFlags]} empty="No safety or compliance flags recorded." />
              {verdict.safeStepsDiscussed.length ? <><h4>Safe steps discussed</h4><ReportList items={verdict.safeStepsDiscussed} /></> : null}
            </ReportSection>

            <ReportSection icon={<UserRound size={19} />} eyebrow="Resident" title="Tenant and property" compact>
              <dl className="report-definition-list">
                <div><dt>Tenant</dt><dd>{conversation.tenantName ?? "Legacy conversation"}</dd></div>
                <div><dt>Phone</dt><dd>{conversation.tenantPhone ?? "Not stored"}</dd></div>
                <div><dt>Email</dt><dd>{conversation.tenantEmail}</dd></div>
                <div><dt>Property ID</dt><dd>{conversation.propertyId}</dd></div>
                <div><dt>Address</dt><dd>{conversation.propertyAddress}</dd></div>
              </dl>
            </ReportSection>

            <ReportSection icon={<KeyRound size={19} />} eyebrow="Dispatch readiness" title="Access details" compact>
              <dl className="report-definition-list">
                <div><dt>Permission to enter</dt><dd>{formatLabel(access.permissionToEnter)}</dd></div>
                <div><dt>Occupied</dt><dd>{formatLabel(access.occupied)}</dd></div>
                <div><dt>Pets</dt><dd>{formatLabel(access.petsPresent)}{access.petSecurePlan ? ` - ${access.petSecurePlan}` : ""}</dd></div>
                <div><dt>Alarm</dt><dd>{formatLabel(access.alarmPresent)}</dd></div>
                <div><dt>Restricted times</dt><dd>{access.restrictedTimes || "None reported"}</dd></div>
                <div><dt>Entry notes</dt><dd>{access.gateOrEntryNotes || "None reported"}</dd></div>
                <div><dt>Contact preference</dt><dd>{access.contactPreference || "Not confirmed"}</dd></div>
              </dl>
            </ReportSection>

            <ReportSection icon={<PhoneCall size={19} />} eyebrow="Open items" title="Missing information" compact>
              <ReportList items={verdict.missingInfo} empty="Core intake information is complete." />
            </ReportSection>
          </aside>
        </div>

        <details className="report-disclosure">
          <summary><FileText size={17} /> Raw staff handoff email</summary>
          <pre className="email-preview">{conversation.staffEmail?.body ?? "No staff handoff email has been generated yet."}</pre>
        </details>

        <SystemActivity logs={reportLogs} />
      </div>
    </>
  );
}

function ReportMetric({ icon, label, value, tone }: { icon: React.ReactNode; label: string; value: string; tone?: string }) {
  return <article className={`report-metric ${tone ? `tone-${tone}` : ""}`}><div>{icon}</div><span>{label}</span><strong>{value}</strong></article>;
}

function ReportSection({ icon, eyebrow, title, compact = false, children }: { icon: React.ReactNode; eyebrow: string; title: string; compact?: boolean; children: React.ReactNode }) {
  return (
    <section className={`report-section ${compact ? "compact" : ""}`}>
      <header className="report-section-heading"><div className="report-section-icon">{icon}</div><div><span>{eyebrow}</span><h3>{title}</h3></div></header>
      {children}
    </section>
  );
}

function ReportList({ items, empty = "" }: { items: string[]; empty?: string }) {
  const values = Array.from(new Set(items.filter(Boolean)));
  if (!values.length) return empty ? <p className="muted">{empty}</p> : null;
  return <ul className="report-list">{values.map((item) => <li key={item}>{item}</li>)}</ul>;
}

export function SystemActivity({ logs }: { logs: SystemLogEntry[] }) {
  return (
    <details className="report-disclosure">
      <summary><Activity size={17} /> System activity / {logs.length} event{logs.length === 1 ? "" : "s"}</summary>
      <div className="system-log-list">
        {logs.length ? logs.map((entry) => (
          <article key={entry.id} className={"system-log-entry " + entry.level}>
            <div className="system-log-meta"><strong>{entry.event}</strong><span>{formatDate(entry.timestamp)}</span></div>
            <p>{entry.message}</p>
            <div className="system-log-context"><code>{entry.source}</code><code>{entry.level}</code>{entry.conversationId ? <code>{entry.conversationId}</code> : null}</div>
            {entry.details ? <pre>{JSON.stringify(entry.details, null, 2)}</pre> : null}
          </article>
        )) : <p className="muted">No system activity has been recorded for this ticket.</p>}
      </div>
    </details>
  );
}

function buildExecutiveSummary(conversation: ConversationRecord) {
  const { verdict } = conversation;
  const status = verdict.currentStatus && verdict.currentStatus !== "Unknown" ? ` It is reported as ${verdict.currentStatus.toLowerCase()}.` : "";
  return `${verdict.issueCategory} reported in ${verdict.issueLocation || "an unspecified area"}.${status}`;
}

function conversationStatusLabel(status: ConversationStatus) {
  if (status === "ticket_submitted" || status === "email_sent") return "Ticket submitted";
  if (status === "needs_more_info") return "Intake in progress";
  return formatLabel(status);
}

function formatLabel(value: string) {
  return value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatDate(value: string) {
  return new Date(value).toLocaleString([], { dateStyle: "medium", timeStyle: "short" });
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

