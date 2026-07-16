# MVP Integration Handoff

## Application boundaries

- /tenant is the tenant-only maintenance intake experience.
- /admin is the admin-only conversation review and system activity experience.
- / redirects to /tenant.
- Authentication is intentionally outside this MVP.

There are no navigation links between the tenant and admin experiences.

## Tenant session seam

tenant_info.json is the temporary identity source. current_tenant_id represents the tenant that production authentication will resolve.

For the MVP fixture:

- Current tenant: Miguel Gomez Jr.
- Property: P141
- Address: 2526 Valley Forest, Missouri City, TX 77489
- The same property also contains the Elizabeth Lopez tenant record.

The tenant page resolves the active record through getCurrentTenant() in src/lib/tenantData.ts. During production integration, replace the current_tenant_id lookup with the authenticated session identity and load the tenant/property records from the production system.

New conversations persist these identity fields:

- tenantId
- tenantName
- tenantPhone
- tenantEmail
- propertyId
- propertyAddress

Older saved conversations remain compatible because the newly added identity fields are optional.

## Runtime observability

Server lifecycle events are emitted in two places:

1. Structured console output prefixed with [evercrest].
2. data/system_logs.json, capped at the newest 500 entries.

The admin dashboard reads the newest 200 entries from GET /api/admin/logs and displays them under **System activity**.

Logged events include:

- Conversation created or updated
- Tenant message received
- AI triage completed
- Triage or reply fallback used
- Tenant reply generated
- Staff handoff generated
- Conversation persisted
## Admin operational report

The admin detail view is a structured operational report rather than a raw email preview. It derives its executive brief, routing guidance, safety/compliance review, access readiness, visual evidence, AI differential, and transcript from ConversationRecord.

Similar work orders are ranked through src/lib/cases.ts and cite the sanitized source workbook, source row, work-order number, year, category, urgency, and matching rationale. These matches are routing context only and are explicitly not presented as a diagnosis.

The generated staff handoff email and ticket-specific system activity remain available as collapsible audit sections.

- Admin status changed
- Processing failure

Message bodies and access codes are not copied into the activity log. Logs contain lifecycle metadata such as conversation ID, status, issue category, severity, and message counts.

## Image attachment adapter

The tenant composer accepts image files up to 5 MB. The image and message are submitted atomically, and each tenant ChatMessage stores attachmentIds so both tenant and admin transcripts can render images in the correct turn. A vision-capable OpenAI request creates contextual AI notes before triage and reply generation.

For this MVP, each image is stored as a data URL on the conversation attachment record with mimeType and sizeBytes metadata. Production integration should replace the data URL with an object-storage URL while preserving the AttachmentNote interface and message attachmentIds. Supabase or another object store can be added behind this boundary without changing the chat contract.

Completed intake uses the ticket_submitted status. The legacy email_sent status remains readable and is displayed to tenants as Ticket submitted.

## Token accounting

Each OpenAI completion returns its provider-reported prompt, completion, and total token counts. Vision analysis, triage, and tenant-reply usage is added to ConversationRecord.tokenUsage after every turn. Deterministic emergency replies and heuristic fallbacks add zero tokens. Legacy conversations without tokenUsage display zero in the admin dashboard.


## Main integration endpoints

- GET /api/tenant-info
- GET/POST /api/conversations
- POST /api/conversations/:id/messages
- PATCH /api/conversations/:id
- GET /api/admin/logs

The JSON persistence and simulated email outbox remain MVP adapters. They can be replaced behind src/lib/serverStore.ts and the handoff creation flow without changing the tenant/admin page boundaries.
