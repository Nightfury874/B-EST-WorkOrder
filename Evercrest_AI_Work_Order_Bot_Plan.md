# Evercrest AI Work Order Bot Plan

Working directory: `C:\Users\jibab\OneDrive\Desktop\Work\EVercrestWorkOrderBot`

## 1. Product Goal

Evercrest needs a tenant-facing AI maintenance intake bot that replaces slow email back-and-forth with a guided conversation. The bot should understand the reported issue, ask only the questions needed to triage safely, request photos or videos only when useful and safe, and escalate to Evercrest staff whenever a human must review or someone must go to the property.

The bot must not act as a property manager, legal advisor, technician, final vendor selector, or responsibility decision-maker. Its job is to collect facts, assess risk, attempt only safe low-risk checks, and produce a clean staff handoff.

Primary output when staff action is needed:

- A formatted email to Evercrest.
- A TLDR of the entire conversation.
- A structured AI differential analysis.
- Attachment notes explaining what each image/video appears to show and what the tenant said about it.
- A staff-only admin report with possible actual issues, confidence percentages, safety/compliance flags, likely vendor category, and citations from similar earlier cases.

## 2. Existing Docs Inventory

The `Docs` folder contains three main kinds of sources.

### Policy and safety sources

- `bot_guardrails.md`
  - Defines tenant-facing safety boundaries, prohibited statements, safe wording, escalation triggers, photo/video privacy rules, and a required staff handoff YAML format.
  - This is the strongest source for production guardrails and output separation.

- `bot_constraints.md`
  - Defines the bot mission, allowed/prohibited actions, required intake fields, emergency screening, access questions, photo/video rules, Houston/Texas context, uncertainty handling, and staff handoff requirements.
  - This should become the core product requirements document.

- `bot_rubric.md`
  - Defines QA scoring for classification, urgency, emergency handling, intake completeness, troubleshooting safety, liability avoidance, tenant clarity, staff handoff quality, privacy, Houston context, and uncertainty.
  - This should become the automated and human QA rubric.

### Historical work-order sources

- `clean_merged_work_orders_2022_2026.xlsx`
  - Cleaned and redacted historical source with 1,041 parsed work-order rows.
  - Includes `Clean_Work_Orders`, `Redaction_Log`, `Data_Quality`, and `Source_Log`.
  - Useful as the base historical case library after an additional privacy scrub.

- `work_orders_bot_classified.xlsx`
  - Classified version of the same 1,041 work orders.
  - Adds `Specialty`, `Likely Vendor Category`, `Issue Category`, `Normalized Urgency`, `Emergency Candidate`, `Possible Tenant-Caused`, `Staff Review Needed`, `Photo/Video Needed`, `Safe Troubleshooting Summary`, `Do-Not-Suggest Summary`, `Confidence Score`, and classification notes.
  - This should be the main source for initial case retrieval and admin citations.

- `work_order-2022.xlsx` through `work_order-2026.xlsx`
  - Raw annual exports.
  - These should be retained for audit/backfill only, not used directly in runtime prompts or tenant-visible outputs.

### Troubleshooting and QA sources

- `tenant_maintenance_intake_troubleshooting_compliance_reviewed.xlsx`
  - Contains 27 issue-category troubleshooting rows plus compliance review.
  - Columns include resident examples, bot goals, first response, required intake questions, safety questions, safe troubleshooting, disallowed troubleshooting, escalation triggers, likely vendor category, photo/video conditions, and access requirements.
  - This should become the structured rule registry for the conversation planner.

- `maintenance_bot_QA_50_work_orders.xlsx` and duplicate copies
  - Contains 50 QA test cases, failure patterns, recommended edits, and readiness scoring.
  - The copies are byte-identical duplicates. Keep one canonical copy.

## 3. Important Findings From The Docs

The cleaned/classified work-order base is large enough for an MVP knowledge system:

- Total classified historical rows: 1,041.
- Top specialties: Plumbing 397, HVAC 311, Roof/Exterior 72, Electrical 52, Unknown 49, Pest 38, Door/Lock/Garage 33, Appliance 31.
- Top issue categories: Active leak/water intrusion 248, No cooling/AC failure 106, Plumbing issue 97, HVAC issue 80, Roof/exterior repair 78, Appliance not working 68, Door/lock security issue 46, Unclear issue 43.
- Urgency labels: Routine 694, Urgent 225, Emergency 122.
- Emergency candidate cases: 288.
- Staff review needed in the classified source: 422.
- Possible tenant-caused labels: Unknown 563, No 433, Yes 45. These must remain staff-only.

The QA workbook already identifies several launch blockers:

- Emergency wording conflict, now resolved for MVP:
  - `bot_guardrails.md` says the bot must not directly tell tenants to contact emergency services.
  - `bot_constraints.md` and `bot_rubric.md` require emergency-service instruction for immediate danger.
  - Approved MVP decision: the bot will use the tenant-facing emergency wording in Section 13 and encode it consistently in guardrails, tests, and prompts.

- Photo/video overcollection:
  - The classified workbook marks `Photo/Video Needed = Yes` for all 1,041 rows.
  - The guardrails say photos/videos must not be requested by default.
  - The implementation should replace the binary field with: `required_if_safe`, `optional_if_useful`, `not_requested_initially`, `unsafe_to_request`.

- Access information gap:
  - Access, pets, alarm, gate, permission-to-enter, and restricted-time details are required for handoff, but historical work orders often do not contain them.
  - The bot should collect access details before staff handoff unless doing so delays life-safety escalation.

- Privacy gap:
  - A safer scan found 15 rows in job descriptions with access-code-like patterns. The values were not printed or exposed.
  - Before using historical cases for retrieval or citations, descriptions and instructions need an additional scrub for access codes, gate/alarm/lockbox/keypad data, private names, contact info, IDs, and unrelated private information.

## 4. Recommended MVP Scope

### Tenant chat interface

The tenant interface should be a normal chat with file upload and a right-side or top summary tab.

The chat should support:

- Free-text issue reporting.
- Guided follow-up questions.
- Image/video upload when requested by the bot.
- A tenant-facing summary/verdict tab.
- Final confirmation that management will review and determine the next step.
- Tenant login from a whitelist. The app should know the tenant email after login.
- MVP admin impersonation: staff/admin selects a property address and the system starts the chat as that tenant/property for testing and controlled rollout.
- A `tenant_info.json` source for tenant/property identity, whitelist status, email, and selectable addresses.

The tenant-facing summary tab should show only safe, neutral details:

- Issue category, phrased plainly.
- Reported location.
- Current status: active, intermittent, stopped, worsening, recurring, or unknown.
- Safety concerns reported.
- Photos/videos status.
- Safe steps already discussed.
- What information is still needed.
- Whether the request is being sent to management for review.

The tenant-facing summary must not show:

- Tenant-caused indicators.
- Legal/compliance labels.
- Charge/no-charge analysis.
- Vendor names.
- Internal confidence percentages.
- Similar-case citations.
- Access codes or private details.

### Basic admin dashboard

The admin dashboard can be intentionally simple for MVP:

- Conversation list.
- Filters for severity, category, staff review needed, email sent, property, and status.
- Detail view with:
  - Transcript.
  - Tenant-safe summary.
  - Staff handoff report.
  - AI differential analysis.
  - Similar-case citations.
  - Attachment notes.
  - Email preview and sent timestamp.
  - Open questions.
  - Internal flags.
- Action buttons:
  - Mark reviewed.
  - Mark dispatched.
  - Copy report.
  - Resend email.
  - Close conversation.

Staff does not interact with the chatbot in MVP. Staff reviews the email/report and handles operational follow-up outside the bot.

## 5. Conversation Workflow

The bot should run every message through a structured triage loop.

### Step 1: Intake and state extraction

Extract and update:

- Property identifier.
- Issue category, if known.
- Location on property.
- Tenant description summary.
- Start time/date.
- Current status.
- Affected areas.
- Visible symptoms.
- Safety signals.
- Access details.
- Contact preference.
- Photos/videos status.
- Safe troubleshooting already attempted.
- Open questions.

### Step 2: Safety gate

Before troubleshooting, screen for:

- Fire, smoke, CO alarm, burning smell.
- Gas smell.
- Sparks, exposed wiring, wet electrical area, hot outlet/switch, repeated breaker trips.
- Active water intrusion, ceiling sag, standing water, water near electrical.
- Sewage backup or no usable toilet.
- No water, no hot water, no AC in Houston heat, no heat in cold weather.
- Security failure, unsecured exterior door/window/garage.
- Storm/roof/structural hazards.
- Pest/wildlife safety concerns.
- Injury, immediate danger, legal/payment/responsibility questions, or possible tenant-caused indicators.

If a safety trigger is positive, the bot should stop routine troubleshooting and escalate to staff review.

### Step 3: Issue-specific questions

Use `tenant_maintenance_intake_troubleshooting_compliance_reviewed.xlsx` as the issue-category registry. Each category should provide:

- First response.
- Required intake questions.
- Safety screening questions.
- Safe troubleshooting allowed or not.
- Disallowed troubleshooting.
- Emergency and urgent triggers.
- Likely vendor category for staff review.
- Photo/video request conditions.
- Access information requirements.

Ask only the smallest useful batch of questions, ideally 2 to 4 at a time.

### Step 4: Safe troubleshooting gate

Troubleshooting is optional and must be low-risk. The bot may suggest simple visual or settings checks such as:

- Thermostat mode and setpoint.
- Whether air is blowing from vents.
- Visible error codes.
- Whether a visible fixture-level shutoff is safe and accessible.
- Whether other rooms/fixtures/outlets are affected.
- GFCI status only when there are no hazard signs.

The bot must never ask tenants to:

- Open equipment panels.
- Handle wiring or gas lines.
- Climb roofs/ladders.
- Enter unsafe attics.
- Clear main sewer lines.
- Use chemical drain treatments.
- Move heavy appliances.
- Bypass safety devices.
- Perform repairs.
- Repeatedly reset breakers, alarms, HVAC, appliances, or garage doors.

### Step 5: Photo/video decision

Photos/videos should be requested only when they improve triage and are safe to capture.

Request them for:

- Active leaks or water damage.
- Sewage/drain backups if sanitary and safe.
- HVAC thermostat, error, noise, airflow, ice, water, or exterior unit symptoms.
- Appliance error codes, visible leak/damage, or model tag if safely visible.
- Electrical issue only from a safe distance.
- Door/lock/garage/security visible damage.
- Roof/exterior/storm damage from ground level only.
- Pest evidence only if safe.
- Unclear issues where visual evidence will help classify the category.

Do not request them when capturing them would delay emergency action or require approaching fire, smoke, gas, sewage, live electrical hazards, aggressive animals, unstable structures, broken glass, roof areas, unsafe standing water, or private information.

### Step 6: Staff handoff and email trigger

Send a staff email when any of these are true:

- Safety, emergency, urgent, compliance-sensitive, legal, privacy, or tenant-caused indicator is present.
- The issue likely requires a human/vendor visit.
- Safe troubleshooting did not solve the issue.
- The bot cannot confidently classify the issue.
- Required photos/videos are unavailable.
- Access details are incomplete.
- The issue is repeat, disputed, prior-unresolved, multi-trade, or unclear.

In practice, most real maintenance requests should produce staff review. The bot should not be optimized to avoid sending someone when the reported issue remains unresolved.

For MVP, the bot sends exactly one staff handoff email automatically when escalation is triggered. Staff does not draft, edit, or send this email from the chatbot. The admin dashboard can display the sent email/report for review.

## 6. AI System Design

Use a hybrid system: deterministic rules for safety/compliance plus LLM reasoning for conversation, summarization, and differential analysis.

### Core components

- Chat orchestrator:
  - Reads the latest tenant message and current state.
  - Chooses the next safe response or escalation.

- State extractor:
  - Converts each message and attachment into structured JSON.
  - Updates the conversation state with evidence and open questions.

- Policy engine:
  - Deterministic checks from guardrails and constraints.
  - Blocks unsafe troubleshooting and prohibited wording.
  - Forces staff escalation when required.

- Question planner:
  - Chooses the next issue-specific questions from the 27-row troubleshooting source.
  - Avoids repetitive or irrelevant questions.

- Image analyzer:
  - Runs only when image/video is uploaded.
  - Produces safe notes, visible symptoms, privacy flags, and uncertainty.
  - Redacts or avoids private data in summaries.

- Case retrieval engine:
  - Retrieves similar historical cases from the sanitized classified work-order library.
  - Uses issue category, symptoms, location, urgency, vendor category, and semantic similarity.
  - Returns citations for admin-only reports.

- Email/report generator:
  - Produces tenant-safe summary, staff report, attachment notes, differential analysis, and structured handoff.

- QA monitor:
  - Runs rubric checks and prohibited-language assertions before tenant responses and staff reports are finalized.

### Suggested data flow

1. Tenant sends message.
2. State extractor updates structured conversation state.
3. Policy engine evaluates safety/compliance/privacy triggers.
4. Question planner decides whether to ask more, request image, offer safe check, or escalate.
5. Tenant summary tab updates after each turn.
6. If staff action is required, case retrieval finds similar historical examples.
7. Report generator creates staff email and admin report.
8. QA guard validates outputs.
9. The bot sends one staff handoff email to the configured staff recipient and the admin dashboard updates.

## 7. Historical Case Citations

The earlier cases should be used as admin-only support, not as tenant-facing evidence.

Recommended citation format:

- Work order number.
- Source year.
- Source file.
- Source row.
- Issue category.
- Normalized urgency.
- Specialty or likely vendor category.
- Short sanitized symptom summary.

Example citation shape:

```json
{
  "work_order_number": "1136-1",
  "source_year": 2022,
  "source_file": "work_orders_bot_classified.xlsx",
  "source_row": 22,
  "issue_category": "No cooling / AC failure",
  "normalized_urgency": "Urgent",
  "likely_vendor_category": "HVAC technician",
  "why_similar": "AC making loud noise and not cooling; fan running but compressor not running"
}
```

Before deployment, sanitize all citation text so it cannot reveal resident names, vendor names, access codes, contact information, account IDs, or unrelated private data.

## 8. Confidence And Differential Analysis

The admin report should present a differential analysis, not a final diagnosis.

Recommended model:

- Most likely issue.
- Alternative possible causes.
- Confidence percentage for each.
- Evidence from tenant statements.
- Evidence from images, if any.
- Similar historical cases.
- Risk flags.
- What staff should verify onsite.

Confidence should combine:

- Completeness of intake fields.
- Number and strength of safety triggers.
- Similar-case agreement from historical retrieval.
- Specificity of symptoms.
- Image clarity, if available.
- Whether safe troubleshooting supports or weakens a hypothesis.
- Whether multiple trades are plausible.

The report should use words like `possible`, `likely`, `reported`, and `needs staff review`. It should not say the AI has definitively diagnosed the issue.

## 9. Email Format

Recommended staff email:

Delivery rule: the bot sends one staff handoff email automatically. The staff recipient should be configured as a single staff email address or staff group alias, such as `STAFF_HANDOFF_EMAIL`. No ticketing-system ingestion is required for MVP unless Evercrest later provides one.

Subject:

`[Evercrest Maintenance][{severity}] {property_identifier} - {issue_category} - {issue_location}`

Body:

```text
TLDR
{1-3 sentence summary of issue, severity, current status, and requested action}

Recommended Staff Action
- Review priority: emergency | urgent | routine | staff_triage
- Likely vendor category: {tentative category}
- Human/site visit recommended: yes/no
- Reason: {why}

Tenant Conversation Summary
- Property: {property_identifier}
- Location: {issue_location}
- Started: {started_at}
- Current status: {active/intermittent/stopped/worsening/recurring/unknown}
- Tenant reported: {neutral summary}
- Safe troubleshooting discussed: {list}
- Open questions: {list}

Safety And Compliance Flags
- {staff-only flags}

Attachment Notes
- Attachment 1: {tenant note + AI-visible notes + privacy/safety caveats}
- Attachment 2: ...

AI Differential Analysis
- {possible issue}: {confidence}% - {evidence}
- {possible issue}: {confidence}% - {evidence}
- {possible issue}: {confidence}% - {evidence}

Similar Earlier Cases
- {work_order_number}, {source_year}, {issue_category}, {urgency}, {why similar}
- ...

Access And Scheduling Details
- Contact preference: {contact_preference}
- Permission to enter: {yes/no/unclear}
- Occupied: {yes/no/unclear}
- Restricted times: {restricted_times}
- Pets: {pets_present + secure plan}
- Alarm/gate/access notes: {tenant-provided gate/alarm/lockbox/keypad/access instructions; staff-only, not tenant-facing}

Internal Notes
- Possible tenant-caused indicator: {staff-only neutral note, if any}
- Legal/lease/payment/responsibility questions: {if any}
- AI uncertainty: {what is unknown}
```

## 10. Data Model

Minimum database tables:

- `tenants`
  - `id`, `email`, `whitelist_status`, `tenant_info_json`, `created_at`, `updated_at`.

- `properties`
  - `id`, `address`, `property_code`, `status`, `notes`.

- `tenant_properties`
  - `id`, `tenant_id`, `property_id`, `is_primary`, `start_date`, `end_date`.

- `conversations`
  - `id`, `tenant_id`, `property_id`, `tenant_channel`, `impersonated_by_admin`, `status`, `severity`, `issue_category`, `staff_review_required`, `staff_review_status`, `email_sent_at`, `created_at`, `updated_at`.

- `messages`
  - `id`, `conversation_id`, `sender_type`, `body_redacted`, `body_internal`, `created_at`.

- `attachments`
  - `id`, `conversation_id`, `message_id`, `file_url`, `file_type`, `tenant_note`, `ai_notes`, `privacy_flags`, `safe_to_use_in_report`.

- `verdict_snapshots`
  - `id`, `conversation_id`, `tenant_summary_json`, `staff_summary_json`, `created_at`.

- `staff_reports`
  - `id`, `conversation_id`, `handoff_yaml`, `differential_json`, `email_subject`, `email_body`, `created_at`, `sent_at`.

- `case_citations`
  - `id`, `conversation_id`, `work_order_number`, `source_year`, `source_file`, `source_row`, `similarity_score`, `why_similar`.

- `audit_logs`
  - `id`, `actor`, `action`, `conversation_id`, `metadata`, `created_at`.

## 11. Implementation Phases

### Phase 0: Source cleanup and policy alignment

- Pick canonical copies of duplicate workbooks.
- Apply the approved emergency wording from Section 13 to guardrails, prompts, and QA tests.
- Replace binary photo/video rules with conditional request statuses.
- Sanitize historical work orders again for access codes and private details.
- Convert Markdown guardrails and workbook troubleshooting rows into structured JSON.
- Define the final staff email template.
- Create the initial `tenant_info.json` format.

### Phase 1: MVP chat and handoff

- Build tenant chat UI.
- Build tenant-facing summary tab.
- Build tenant whitelist/login lookup.
- Build MVP address selector and tenant impersonation mode.
- Implement conversation state JSON.
- Implement safety/compliance rule engine.
- Implement category-specific question planner.
- Implement automatic one-email staff handoff generation and delivery.
- Implement very basic admin conversation list and detail page.
- Add prohibited-language checks before responses.

### Phase 2: Case memory and admin report

- Build sanitized historical case index.
- Add semantic retrieval for similar cases.
- Add admin-only citations.
- Add differential analysis with confidence percentages.
- Add QA dashboard fields for confidence, uncertainty, and staff review reason.

### Phase 3: Attachment handling

- Add image/video upload.
- Add privacy guidance before upload.
- Add image notes and privacy flagging.
- Add attachment summaries to staff email.
- Add safe photo request logic by issue category.

### Phase 4: Hardening and operations

- Add email delivery status and retry.
- Add admin actions and audit logs.
- Add production monitoring.
- Support periodic import of the staff-maintained historical work-order sheet if Evercrest wants fresh reference cases later.
- Do not require staff to interact with the chatbot or provide training feedback inside the bot.

## 12. QA And Acceptance Criteria

Use `bot_rubric.md` and the 50 QA work-order cases as the initial evaluation suite.

Automated tests should verify:

- No unsafe repair instructions.
- No legal advice or Texas-law citations to tenants.
- No charge/no-charge or responsibility conclusions.
- No tenant-caused indicators in tenant-facing output.
- No vendor names or dispatch/timeline promises.
- No access codes or private identifiers in tenant-facing/vendor-facing summaries.
- Safety triggers force escalation.
- Access questions are collected before non-emergency handoff.
- Photos/videos are not requested by default.
- Staff reports contain required structured fields.
- Similar-case citations are admin-only and sanitized.

Launch acceptance:

- 100% pass on high-risk prohibited-language tests.
- 100% escalation on gas, fire/smoke/CO, sewage, active leak, electrical hazard, unsecured property, and severe HVAC weather-sensitivity cases.
- At least acceptable rubric score on all 50 QA workbook cases.
- Human review required for every emergency, urgent, safety-sensitive, legal/payment/responsibility, tenant-caused, unclear, or multi-trade conversation.

## 13. Decisions Recorded

### Approved tenant-facing emergency wording

Use this exact wording when a tenant reports immediate danger, fire, smoke, gas smell, carbon monoxide alarm, medical emergency, active break-in/security threat, major electrical hazard, or another life-safety concern:

```text
Safety first: if anyone is in immediate danger, you see fire or smoke, smell gas, a carbon monoxide alarm is sounding, there is a medical emergency, or you believe the home is unsafe, leave the area if you can do so safely and contact emergency services now. Do not wait for this chat. I will continue documenting the issue for Evercrest once you are safe.
```

For non-life-safety urgent maintenance, continue to use neutral wording:

```text
I am flagging this for Evercrest review because of the safety details reported. I will collect the remaining information so management can review and route this properly.
```

### Staff handoff delivery

The bot sends the staff handoff email. Staff does not send an email from the chatbot. For MVP, exactly one email is sent per escalated conversation to a configured staff recipient or group alias. A ticketing system is not required for MVP.

### Tenant identity and MVP impersonation

All tenants are whitelisted. If a tenant logs in, the system should know the tenant email. For MVP, the admin/tester can select a property address and the app will impersonate that tenant/property to start the chat. A `tenant_info.json` file should exist and include at minimum tenant email, whitelist status, tenant display label if needed, property address IDs, and contact preferences.

### Staff review behavior

Staff reviews the generated email/report after the bot sends it. Staff does not edit the AI-generated email before sending and does not interact with the chatbot.

### Gate, alarm, lockbox, keypad, and access codes

The bot may ask the tenant for gate, alarm, lockbox, keypad, or access instructions when needed for entry. For MVP, the tenant provides these details directly in chat and they are included only in the staff-only access section of the handoff email/report. Tenant-facing summaries must not display actual codes.

### Language support

MVP is English only. Even though the underlying LLM can support many languages, prompts, UI copy, tests, and guardrails should be written and validated for English first.

### Learning from completed work orders

Staff will maintain a similar historical work-order sheet outside the chatbot. Staff does not need to enter case outcomes into the chatbot, and the chatbot does not need a staff feedback/training workflow for MVP. Future versions may periodically import the staff-maintained sheet as a refreshed reference library.

## 14. Recommended Build Stack

A practical stack for MVP:

- Frontend: React/Next.js chat interface and simple admin dashboard.
- Backend: Node.js/TypeScript or Python/FastAPI.
- Database: Postgres.
- File storage: S3-compatible object storage or platform storage.
- Email: SendGrid, Postmark, Microsoft Graph, or Gmail/Workspace SMTP/API depending on Evercrest operations.
- AI:
  - LLM for conversation, extraction, summarization, and differential analysis.
  - Vision model for image notes when attachments are provided.
  - Embedding model/vector index for historical case retrieval.
- QA:
  - Unit tests for policy rules.
  - Snapshot tests for tenant responses and staff reports.
  - Evaluation suite from the 50 QA workbook cases.

## 15. Practical MVP Definition

The first usable release should do this end to end:

1. Tenant opens chat and describes a maintenance issue.
2. Bot asks safety and category-specific questions.
3. Bot requests photos only when needed and safe.
4. Tenant summary tab updates after every exchange.
5. Bot decides staff/human review is required.
6. Bot generates a formatted Evercrest email with TLDR, staff handoff, differential analysis, attachment notes, and similar-case citations.
7. Bot sends exactly one staff handoff email automatically.
8. Admin dashboard shows the conversation, verdict, report, and email status.
9. All tenant-facing content remains neutral, safe, and free of legal/vendor/timeline/responsibility promises.

