# Evercrest Work Order Bot Implementation Milestones

Working directory: `C:\Users\jibab\OneDrive\Desktop\Work\EVercrestWorkOrderBot`

This plan converts the product plan into a build sequence. The MVP target is an English-only tenant-facing chat app with address selection / tenant impersonation, guided maintenance intake, safe triage, image upload when needed, a tenant-facing verdict summary, automatic one-email staff handoff, and a very basic admin dashboard for review.

## Development Principles

- Build the safest workflow first: emergency handling, prohibited wording, and staff-only boundaries must exist before advanced AI features.
- Keep staff out of the chatbot workflow. Staff receives and reviews the bot-generated email/report outside the bot.
- Send exactly one staff handoff email per escalated conversation in MVP.
- Use `tenant_info.json` for MVP tenant/property identity and address selection.
- Treat historical work orders as admin-only support material, never tenant-facing evidence.
- Do not optimize the bot to avoid sending someone. If unresolved, unsafe, unclear, urgent, or human-required, escalate.

## Milestone 0: Project Setup And Technical Skeleton

### Goal
Create the runnable application foundation and repo structure.

### Development Work

- Initialize application project.
- Choose stack: recommended Next.js/React frontend plus API routes or separate backend.
- Add environment configuration.
- Add local development scripts.
- Add basic folder structure for app, server logic, data, prompts, tests, and docs.
- Add placeholder admin and tenant routes.
- Add baseline lint/type/test tooling.

### Expected Outcome
A developer can run the project locally and see two empty shells: tenant chat and admin dashboard.

### Acceptance Criteria

- App starts locally with one command.
- Tenant page loads.
- Admin page loads.
- Environment variables are documented.
- No production secrets are hardcoded.

## Milestone 1: Tenant And Property Identity MVP

### Goal
Support whitelisted tenants and MVP property/address selection.

### Development Work

- Implement `tenant_info.json` loader.
- Define tenant and property schemas.
- Add address/property selector for MVP impersonation.
- Store selected tenant/property in session state.
- Display only non-sensitive tenant/property context in the UI.
- Add validation for missing or inactive tenant/property records.

### Expected Outcome
An admin/tester can select a property address and start a tenant chat as that tenant/property.

### Acceptance Criteria

- The app reads `tenant_info.json` successfully.
- Only whitelisted tenants/properties can start a chat.
- Selected property is attached to the conversation state.
- Tenant email is available internally after selection/login.
- Tenant-facing UI does not expose internal IDs unnecessarily.

## Milestone 2: Conversation State And Transcript Model

### Goal
Create the structured state that every chat turn updates.

### Development Work

- Define conversation state JSON.
- Track messages, sender, timestamps, attachments, and extracted facts.
- Track maintenance fields: issue category, issue location, description, start time, current status, affected areas, symptoms, safety flags, access details, contact preference, photo/video status, troubleshooting attempted, and open questions.
- Add persistence layer. For MVP this can be local JSON/SQLite/Postgres depending on chosen stack.
- Add conversation lifecycle statuses: `active`, `needs_more_info`, `escalated`, `email_sent`, `reviewed`, `closed`.

### Expected Outcome
Every tenant message updates a durable conversation record and structured state.

### Acceptance Criteria

- Starting a chat creates a conversation record.
- Each message is saved.
- Extracted state can be viewed in debug/admin mode.
- Conversation can resume without losing prior facts.
- State includes enough fields to generate a staff handoff.

## Milestone 3: Policy And Safety Rule Engine

### Goal
Make safety/compliance deterministic before relying on AI reasoning.

### Development Work

- Convert guardrails and constraints into structured rule definitions.
- Implement emergency and urgent trigger checks.
- Implement prohibited tenant-facing wording checks.
- Implement staff-only boundary checks for tenant-caused indicators, legal/compliance labels, confidence percentages, citations, access codes, and responsibility/charge language.
- Implement approved emergency wording exactly as documented.
- Implement photo/video request rules: `required_if_safe`, `optional_if_useful`, `not_requested_initially`, `unsafe_to_request`.

### Expected Outcome
The app can detect high-risk situations and block unsafe or noncompliant tenant-facing responses.

### Acceptance Criteria

- Gas, fire/smoke/CO, sewage, active leak, electrical hazard, unsecured exterior access, and severe HVAC heat/cold cases force escalation.
- Tenant-facing output never includes legal advice, charge decisions, responsibility decisions, vendor promises, timeline promises, or tenant-caused flags.
- The approved emergency script is used for life-safety cases.
- Photo/video requests are not made by default.
- Access codes are not shown in tenant-facing summaries.

## Milestone 4: AI Intake And Question Planner

### Goal
Create the guided chat behavior that understands a problem and asks useful next questions.

### Development Work

- Build LLM prompt for state extraction.
- Build LLM prompt for next-question planning.
- Load issue-category rules from the troubleshooting source.
- Ask small batches of targeted questions instead of long forms.
- Handle unclear, multi-issue, and low-detail reports.
- Add safe troubleshooting suggestions only when allowed by the rule engine.
- Add fallback when AI confidence is low: staff triage and clarifying questions.

### Expected Outcome
Tenant chat feels natural but remains structured, safe, and operationally useful.

### Acceptance Criteria

- Bot classifies common issue types: plumbing, HVAC, electrical, appliance, pest, roof/exterior, door/lock/garage, landscaping, handyman, and unclear.
- Bot asks category-specific safety and intake questions.
- Bot stops troubleshooting when safety flags appear.
- Bot can summarize what it knows and what is missing.
- Bot escalates unclear cases instead of guessing.

## Milestone 5: Tenant-Facing Summary / Verdict Tab

### Goal
Give tenants a live, safe summary of what the bot understands so far.

### Development Work

- Build summary tab UI.
- Show tenant-safe fields only: issue category, location, current status, reported safety concerns, photos/videos status, safe steps discussed, missing information, and review status.
- Update summary after each message.
- Add privacy guard before rendering summary.

### Expected Outcome
Tenant can see the current verdict without seeing internal analysis or staff-only flags.

### Acceptance Criteria

- Summary updates in real time.
- Summary is concise and plain English.
- No internal confidence, citations, tenant-caused indicators, legal/compliance labels, vendor names, or access codes appear.
- Summary clearly says when Evercrest review is needed.

## Milestone 6: Attachment Upload And Image Notes

### Goal
Allow photos/videos only when helpful and safe, then use them in staff reports.

### Development Work

- Add image/video upload UI.
- Add pre-upload privacy instruction.
- Store attachment metadata and tenant-provided notes.
- Add image analysis for visible maintenance symptoms.
- Add privacy/safety flagging for images.
- Attach image notes to staff handoff.
- Do not require images for every conversation.

### Expected Outcome
The bot can request, receive, and summarize attachments when they improve triage.

### Acceptance Criteria

- Bot requests attachments only under approved conditions.
- Tenant sees privacy guidance before upload.
- Uploaded attachments are linked to the conversation.
- Staff report includes attachment notes and tenant context.
- Unsafe/private image concerns are flagged.

## Milestone 7: Staff Handoff Email Generation

### Goal
Generate and send the one automatic staff email when escalation is triggered.

### Development Work

- Implement staff email template.
- Generate TLDR, tenant conversation summary, recommended staff action, safety/compliance flags, attachment notes, access details, internal notes, and AI uncertainty.
- Add differential analysis with confidence percentages.
- Add similar-case citations from sanitized historical cases.
- Add final QA guard before sending.
- Configure `STAFF_HANDOFF_EMAIL` or equivalent recipient setting.
- Send exactly one email per escalated conversation.
- Store email subject, body, sent timestamp, and delivery status.

### Expected Outcome
When the bot decides human/site review is required, staff receives one well-formatted email with all useful context.

### Acceptance Criteria

- Email sends automatically after escalation.
- Email is not sent repeatedly for the same escalation.
- Email includes TLDR, differential analysis, attachment notes, access details, and similar historical cases.
- Email keeps tenant-caused indicators and access details staff-only.
- Email avoids legal conclusions, vendor selection, payment decisions, or timing promises.
- Failed email delivery is visible in admin dashboard.

## Milestone 8: Historical Case Retrieval And Citations

### Goal
Use past work orders as admin-only support for the AI report.

### Development Work

- Sanitize classified historical work orders again for names, vendors, access codes, contact details, IDs, and private text.
- Build searchable case index from `work_orders_bot_classified.xlsx`.
- Add semantic and structured retrieval by category, symptoms, specialty, urgency, and location.
- Return 3 to 5 similar cases for staff-only reports.
- Include citation metadata: work order number, source year, source file, source row, issue category, urgency, and why similar.

### Expected Outcome
Admin report can cite earlier similar cases without exposing private or unsafe historical data to tenants.

### Acceptance Criteria

- Retrieval returns relevant cases for common issue categories.
- Citations are admin-only.
- Citation text is sanitized.
- Low-confidence or no-match cases are handled gracefully.
- Similar cases support but never replace staff review.

## Milestone 9: Basic Admin Dashboard

### Goal
Give Evercrest a simple view of conversations, verdicts, reports, and email status.

### Development Work

- Build conversation list.
- Add filters: status, severity, category, property, staff review required, email sent.
- Build conversation detail page.
- Show transcript, tenant-safe summary, staff handoff, differential analysis, citations, attachment notes, email status, and internal flags.
- Add simple actions: mark reviewed, mark dispatched, copy report, resend email if failed, close conversation.

### Expected Outcome
Staff can review what the bot collected and what email was sent without chatting with the bot.

### Acceptance Criteria

- Admin can find and inspect every conversation.
- Admin can see email sent status and report content.
- Admin can mark review/dispatch/close statuses.
- Dashboard does not allow staff to modify tenant conversation content.
- Sensitive fields are clearly separated from tenant-facing fields.

## Milestone 10: QA Suite And Evaluation Harness

### Goal
Prove the bot follows the guardrails before pilot use.

### Development Work

- Convert the 50 QA workbook cases into automated test fixtures.
- Add prohibited-output tests.
- Add emergency escalation tests.
- Add photo/video request tests.
- Add staff handoff structure tests.
- Add tenant summary privacy tests.
- Add regression tests for access codes and tenant-caused flags.
- Add manual review checklist based on `bot_rubric.md`.

### Expected Outcome
The team can run a repeatable test suite and know whether the bot is safe enough for pilot.

### Acceptance Criteria

- 100% pass on high-risk prohibited wording tests.
- 100% escalation on life-safety and urgent maintenance cases.
- No tenant-facing output leaks staff-only fields.
- At least acceptable rubric score on all 50 QA cases.
- QA failures identify the broken rule or prompt area.

## Milestone 11: MVP Pilot Readiness

### Goal
Prepare the app for a controlled internal pilot.

### Development Work

- Add production-like environment configuration.
- Configure staff recipient email.
- Configure tenant whitelist data.
- Add logging and audit events.
- Add basic monitoring for failed emails, failed AI calls, and policy guard failures.
- Run end-to-end scenarios for major categories.
- Prepare pilot checklist and rollback plan.

### Expected Outcome
Evercrest can test the bot with selected tenant/property scenarios in a controlled environment.

### Acceptance Criteria

- End-to-end flow works from address selection to chat to email to admin review.
- Staff email recipient is configurable.
- App handles AI/email failure gracefully.
- Pilot users know the limitations: English-only, no staff chat interaction, one automatic staff email, no legal/payment/responsibility decisions.
- Logs are sufficient to debug a failed conversation.

## Milestone 12: Pilot Feedback And Production Hardening

### Goal
Stabilize the MVP after real internal usage.

### Development Work

- Review pilot transcripts and staff emails.
- Fix unclear prompts, missing fields, and false escalations.
- Improve category-specific question flows.
- Improve admin dashboard usability.
- Tighten sanitization and privacy checks.
- Add import path for future staff-maintained historical work-order sheets.
- Prepare deployment documentation.

### Expected Outcome
The MVP is stable enough for a limited tenant rollout.

### Acceptance Criteria

- Known pilot defects are resolved or explicitly deferred.
- Email quality is consistently usable by staff.
- No major safety/privacy failures occur in pilot testing.
- Deployment and operations steps are documented.
- Future import of updated work-order history is planned but not required for MVP.

## Suggested Build Order Summary

1. Project skeleton.
2. Tenant/property identity and impersonation.
3. Conversation state.
4. Safety and policy engine.
5. AI intake and question planner.
6. Tenant summary tab.
7. Attachments and image notes.
8. Staff handoff email.
9. Historical case retrieval and citations.
10. Admin dashboard.
11. QA/evaluation harness.
12. Pilot readiness and hardening.

## MVP Definition Of Done

The MVP is complete when a whitelisted/impersonated tenant can report an issue in English, the bot can safely triage it, the tenant can see a safe summary, the bot can request attachments only when useful and safe, the bot can automatically send exactly one staff email with TLDR/report/differential/citations, and the admin dashboard can show all conversations, verdicts, reports, and email status.