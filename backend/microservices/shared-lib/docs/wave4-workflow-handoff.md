# Wave 4 — Complete Workflow Framework Integration (Handoff Guide)

Reusable workflow framework in `pharmatrack-common`, integrated into all six
business modules. Existing statuses are preserved exactly; workflow control,
signature gating, lifecycle history and audit are layered around them. Built on
the existing Audit (Wave 1/2) and Electronic Signature (Wave 3/3.1) architecture —
no redesign of Waves 1–3.

Module owners only **execute business actions, verify transitions, verify
signatures, verify audit events** — no framework code to write.

## 1. Shared-lib framework (`com.cts.pharmaTrack.common.workflow`)

| Class | Role |
|-------|------|
| `WorkflowEngine` | Decides a transition: delegates to the validator, then enforces the signature gate. |
| `WorkflowTransitionValidator` | State-machine + role validation (409 / 403). |
| `SignatureGate` / `IamSignatureGate` | Verifies signatures via IAM `GET /verifySignatures`. **Fails closed.** |
| `RecordLifecycleHistory` (+repo) | `record_lifecycle_history`: historyId, entityType, entityId, oldStatus, newStatus, changedBy, changedAt, signatureId, reason. |
| `WorkflowAuditPublisher` | Emits an action-typed `CentralAuditEvent` (reuses `AuditClient`). |
| `WorkflowDefinition` / `WorkflowTransition` | Per-entity transition rules (`allow` / `allowSigned`, with an audit action verb). |
| `WorkflowEntityHandler` (SPI) | Per-entity adapter: reads/writes the entity's own status (keeps state in each service). |
| `WorkflowManager` | Generic orchestration; honors `pharmatrack.features.workflow-enabled`. |
| `WorkflowController` | Generic `/workflow` API, served by each module for its own entities. |

## 2. Generic APIs (served by each service for its registered entities)

- `POST /workflow/transition` — body `{ "entityType", "entityId", "targetStatus", "reason" }`
- `GET /workflow/history/{entityType}/{entityId}`
- `GET /workflow/status/{entityType}/{entityId}`

Signer/actor is always the JWT principal. `/workflow/**` is `authenticated()` in
every service; the per-transition role is enforced by the validator.
Rejections: **409** invalid state, **403** wrong role / missing signature, **400**
unknown entityType or missing fields.

## 3. Roles

Only existing project roles are used: Researcher, Investigator, QAAnalyst,
MfgSupervisor, SupplyChain, RegulatoryOfficer, Admin. **Admin appears in no
business-approval transition** (verified: Admin is rejected 403 on signed
approvals).

## 4. Per-module mapping (transition matrix · signature · audit action)

Legend: `from → to  [role(s)]  {SIGNED: MEANING}  ⇒ AUDIT_ACTION`. Statuses are
the **actual stored values**.

### Clinical Trial (module `ClinicalTrial`)
- **ClinicalTrial** (`Draft/Active/Suspended/Completed/Terminated`):
  Draft→Active [Investigator] ⇒ ACTIVATE · Active→Suspended ⇒ SUSPEND · Active→Completed ⇒ COMPLETE · Active→Terminated ⇒ TERMINATE · Suspended→Active ⇒ RESUME · Suspended→Terminated ⇒ TERMINATE. No signatures.
- **TrialProtocol** (`Draft/Approved/Superseded`):
  Draft→Approved [Investigator] {SIGNED: APPROVED} ⇒ APPROVE · Approved→Superseded [Investigator] ⇒ SUPERSEDE.
- **TrialSite** (`Active/OnHold/Closed`):
  Active→OnHold ⇒ HOLD · Active→Closed ⇒ CLOSE · OnHold→Active ⇒ REACTIVATE · OnHold→Closed ⇒ CLOSE. [Investigator], no signatures.

### Subject Enrollment (module `SubjectEnrollment`) — free-string status; baseline matrices aligned to Wave 3.1 REVIEWED authority (confirm with owners)
- **TrialSubject** (init `Enrolled`): Enrolled→Reviewed [Researcher,Investigator] {SIGNED: REVIEWED} ⇒ REVIEW · Reviewed→Completed [Investigator] ⇒ COMPLETE · Enrolled→Withdrawn [Investigator] ⇒ WITHDRAW.
- **VisitRecord** (init `Scheduled`): Scheduled→Completed [Researcher,Investigator] ⇒ COMPLETE · Completed→Reviewed [Investigator] {SIGNED: REVIEWED} ⇒ REVIEW.
- **AdverseEvent** (init `Open`): Open→Reviewed [Investigator] {SIGNED: REVIEWED} ⇒ REVIEW · Reviewed→Closed [Investigator] ⇒ CLOSE.

### Batch Manufacturing (module `BatchManufacturing`) — short codes
- **BatchRecord** (`IP/QCH/REL/REJ/RCL/DEL`): IP→QCH [MfgSupervisor] ⇒ SUBMIT · **QCH→REL [QAAnalyst] {SIGNED: RELEASED} ⇒ RELEASE** · QCH→REJ [QAAnalyst] ⇒ REJECT · REL→RCL [QAAnalyst] ⇒ RECALL · REJ→DEL / RCL→DEL [MfgSupervisor] ⇒ DELETE.
- **QCTest** (`RT/P/F/DEL`): RT→P ⇒ PASS · RT→F ⇒ FAIL · F→RT ⇒ RETEST · F→DEL / P→DEL ⇒ DELETE. [QAAnalyst], no signatures.
- **RawMaterialUsage** (`CON/QRN/DEL`): CON→QRN ⇒ QUARANTINE · QRN→CON ⇒ RELEASE · CON→DEL / QRN→DEL ⇒ DELETE. [MfgSupervisor], no signatures.

### Supply Chain (module `SupplyChain`)
- **DrugShipment** (`Dispatched/InTransit/Delivered/Lost/Rejected`): Dispatched→InTransit ⇒ SHIP · InTransit→Delivered ⇒ DELIVER · InTransit→Lost ⇒ REPORT_LOST · InTransit→Rejected ⇒ REJECT. [SupplyChain], no signatures.
- **ColdChainLog** — *excluded*: status (`Normal/Excursion`) is derived from temperature, not a user transition.
- **SiteInventory** — *excluded*: no status field.

### Deviation & CAPA (module `DeviationCAPA`) — short codes
- **DeviationRecord** (`OPN/INP/CLS/CNL`): OPN→INP [QAAnalyst,Investigator] ⇒ INVESTIGATE · INP→CLS [QAAnalyst] {SIGNED: APPROVED} ⇒ CLOSE · OPN→CNL [QAAnalyst] ⇒ CANCEL.
- **CAPARecord** (`OPN/INP/CLS/CNL`): OPN→INP [QAAnalyst] ⇒ START · **OPN→CLS / INP→CLS [QAAnalyst] {SIGNED: APPROVED} ⇒ CLOSE** · OPN→CNL ⇒ CANCEL.

### Regulatory Affairs (module `RegulatoryAffairs`) — verbatim words
- **RegulatoryDossier** (`InPreparation/Submitted/UnderReview/Approved/Rejected/Withdrawn`): InPreparation→Submitted ⇒ SUBMIT · Submitted→UnderReview ⇒ REVIEW · **UnderReview→Approved {SIGNED: APPROVED} ⇒ APPROVE** · UnderReview→Rejected ⇒ REJECT · {InPreparation,Submitted,UnderReview}→Withdrawn ⇒ WITHDRAW. [RegulatoryOfficer].
- **RegulatoryMilestone** (`Pending/Completed`): Pending→Completed [RegulatoryOfficer] ⇒ COMPLETE.

## 5. Lifecycle history mapping

Every transition writes one `record_lifecycle_history` row in the owning
service's DB (entityType, entityId, oldStatus, newStatus, changedBy=JWT userId,
changedAt, signatureId for gated transitions, reason). Read via
`GET /workflow/history/{entityType}/{entityId}`.

## 6. Audit events generated

Every transition emits a `CentralAuditEvent` (reusing `AuditClient`) with
`action` = the transition's verb (APPROVE, REJECT, RELEASE, SUBMIT, CLOSE,
SUSPEND, SHIP, …), `oldValues.status` / `newValues.status`, `newValues.signatureId`,
`newValues.reason`, and the entity's canonical module.

## 7. Database schema changes

One new table per business-service DB, **auto-created** (`ddl-auto: update`):
`record_lifecycle_history (history_id PK AI, entity_type, entity_id, old_status,
new_status, changed_by, changed_at, signature_id NULL, reason NULL)`. No changes
to any existing entity table. (If a stale `record_lifecycle_history` from the
earlier reference slice exists with `id`/`record_id` columns, drop it so the new
schema is created cleanly.)

## 8. Verification checklist (per module)

1. Services up: IAM (8081, `signature-v2-enabled: true`), the module's service
   (`workflow-enabled: true`), audit-service (8089).
2. `GET /workflow/status/{entityType}/{entityId}` → returns the record's current status.
3. Non-signature transition (e.g. `IP→QCH`) via `POST /workflow/transition` as the
   allowed role → **200**; status advances; history row written; audit event
   emitted with the right action verb.
4. Signature-gated transition without a signature (e.g. `QCH→REL`) → **403**
   ("requires a valid RELEASED electronic signature …").
5. Sign in IAM (`POST /signatures`, `entityType`/`entityId`/`entityVersion`/`meaning`
   matching the gate), then retry → **200**; history row has `signatureId`.
6. Wrong role (incl. **Admin** on any signed approval) → **403**.
7. Invalid state (undeclared from→to) → **409**.
8. `GET /workflow/history/{entityType}/{entityId}` → full ordered history.
9. Audit-service shows one event per committed transition (action = APPROVE /
   RELEASE / CLOSE / …).

## 9. How module owners adjust a matrix

Edit the `WorkflowDefinition` in that module's `*Workflows` class (e.g.
`BatchWorkflows.BATCH_RECORD`) — add/remove `allow`/`allowSigned` lines. The
`entityType`, transition states, roles, signature meaning and audit action are all
declared there. No framework change needed. Signature meanings/roles must stay
consistent with the Wave 3.1 signature authorization matrix in IAM.

## 10. Notes / follow-ups for owners

- Subject Enrollment matrices are **baseline proposals** (those entities had no
  prior state machine); confirm the target states/roles with the module owner.
- The generic `/workflow` transition for TrialProtocol does not run the legacy
  auto-supersede-others side effect (that remains only on the existing
  `PUT /pharmaTrack/trialProtocol/updateProtocolStatus` endpoint).
- Gateway: each service serves `/workflow/**` for its own entities; route
  `/workflow/**` per service (or call services directly) — there is no single
  aggregator.
