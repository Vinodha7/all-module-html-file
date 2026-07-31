# Wave 4 — Approval Workflows & Record Lifecycle Control

A reusable workflow engine in `pharmatrack-common` that each owning service adopts
for its records. Each entity keeps its **existing** status vocabulary; Wave 4 adds
explicit transition control, signature gating, lifecycle history, and per-transition
audit. Shipped with **TrialProtocol** as the reference slice; the other six entities
follow the same pattern.

## Components (`com.cts.pharmaTrack.common.workflow`)

| Class | Role |
|-------|------|
| `WorkflowDefinition` (+`Builder`) | Per-entity set of allowed transitions (`allow` / `allowSigned`). States are Strings. |
| `WorkflowTransition` | One rule: from, to, allowed roles, requiresSignature, requiredMeaning. |
| `WorkflowEngine` | Pure validation → returns the authorizing signature id (or null). |
| `SignatureGate` / `IamSignatureGate` | Verifies signatures via IAM `GET /verifySignatures`. **Fails closed.** |
| `RecordLifecycleHistory` (+repo) | `record_lifecycle_history` row per transition. |
| `WorkflowAuditPublisher` | Emits a `TRANSITION` `CentralAuditEvent` (reuses `AuditClient`). |
| `WorkflowService` | Orchestrates: `validateTransition` (before) + `recordTransition` (after). |

Gated by `pharmatrack.features.workflow-enabled` (default `false`).

## Validation & error mapping (requirement 4)

| Rejection | Exception | HTTP |
|-----------|-----------|------|
| Transition not in the definition (invalid state) | `InvalidStatusTransitionException` | 409 |
| Actor role not permitted for the transition | `ForbiddenException` | 403 |
| Required signature missing / invalid / unverifiable | `ForbiddenException` | 403 |

Messages are explicit, e.g. `Transition TrialProtocol Draft -> Approved requires a valid APPROVED electronic signature for version 2.0 by an authorized signer`.

## Lifecycle history (requirement 5)

`record_lifecycle_history`: `id, entity_type, record_id, old_status, new_status, changed_by, changed_at, signature_id (nullable)`. Auto-created where `ddl-auto: update`. Read via each service's history endpoint.

## Audit (requirement 6)

Every committed transition publishes a `CentralAuditEvent` — `action = TRANSITION`, `oldValues.status` / `newValues.status` + `newValues.signatureId`, module = the entity's canonical `AuditModules` name.

## Reference slice: TrialProtocol (clinicaltrial-service)

Definition (`TrialProtocolWorkflow`): `Draft → Approved` (signed, `APPROVED`, role `Investigator`), `Approved → Superseded` (role `Investigator`, no signature). Integrated into `TrialProtocolService.updateProtocolStatus`; when `workflow-enabled=true` the engine replaces the legacy validator and history/audit are written. New endpoint `GET /pharmaTrack/trialProtocol/getProtocolHistory/{trialId}/{protocolId}`.

**Signature linkage:** the `Draft → Approved` gate looks for a Wave 3 signature with `entityType=TrialProtocol`, `entityId=<protocolId>`, `entityVersion=<versionNumber>`, `meaning=APPROVED`, `valid=true`. Sign with those exact values first.

Config added to clinicaltrial `application.yml`: `pharmatrack.features.workflow-enabled: true` and `pharmatrack.iam.base-url` (default `http://localhost:8081`).

## Rolling out the remaining entities

For ClinicalTrial, CAPARecord, DeviationRecord, BatchRecord, DrugShipment, RegulatoryDossier:
1. Add a `<Entity>Workflow` holding a `WorkflowDefinition` over that entity's existing states (see requirement examples: CAPARecord `Open → Closed`, BatchRecord `QCHold → Released`, RegulatoryDossier `UnderReview → Approved`).
2. Call `workflowService.validateTransition(...)` before the status change and `workflowService.recordTransition(...)` after, in the owning service's `updateStatus` method.
3. Set `workflow-enabled: true` and (for signature-gated transitions) `pharmatrack.iam.base-url` in that service's `application.yml`.
4. Keep signature `requiredMeaning`/roles consistent with the Wave 3.1 role→meaning matrix.

## Verification (reference slice)

1. Start IAM (8081, `signature-v2-enabled: true`), clinicaltrial (8082, `workflow-enabled: true`), audit-service (8089). Create a trial + a Draft protocol.
2. **Missing signature** → attempt `PUT /pharmaTrack/trialProtocol/updateProtocolStatus/{trialId}/{protocolId}` `{"status":"Approved"}` as an Investigator → **403**, "requires a valid APPROVED electronic signature".
3. **Sign** in IAM: `POST /pharmaTrack/identityAccess/signatures` `{"entityType":"TrialProtocol","entityId":"<protocolId>","entityVersion":"<versionNumber>","meaning":"APPROVED"}` as Investigator.
4. **Approve** again → **200**; protocol status = Approved.
5. **Invalid state**: `Superseded → Approved` → **409**.
6. **History**: `GET /getProtocolHistory/{trialId}/{protocolId}` → the `Draft→Approved` row with `signatureId` set.
7. **Audit**: audit-service shows an `action='TRANSITION'` event for `TrialProtocol/<protocolId>`.
