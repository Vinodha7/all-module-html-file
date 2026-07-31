# Wave 3 — Entity-Based Electronic Signatures

Entity-based 21 CFR Part 11 electronic signatures for approval workflows
(Clinical Trial / Protocol, Subject Enrollment, Regulatory Submission, Batch
release, …). Built by **reusing** the existing `ElectronicSignature` entity +
repository, `ChecksumUtil`, `AuditClient`, and `FeatureFlags`. The legacy
audit-log signing endpoint is untouched and stays live during migration.

## Business rules → implementation

| Rule | Where |
|------|-------|
| 1. Signatures required for approval workflows | `signature-v2-enabled` gates the V2 endpoints |
| 2. Linked to entityType / entityId / entityVersion | new nullable columns on `ElectronicSignature` |
| 3. Signer from JWT principal | `ElectronicSignatureController` reads userId/name from the validated token via `JwtUtil` |
| 4. `userId` never from body | `EntitySignatureRequest` has **no** userId field |
| 5. `SignatureMeaning` enum | `SignatureMeaning{APPROVED,REVIEWED,REJECTED,RELEASED}`, `@NotNull` on the request |
| 6. Hash covers userId, entityType, entityId, entityVersion, meaning, signedAt | `ElectronicSignatureService.canonical(...)` → `ChecksumUtil.sha256` |
| 7. Every signature emits a CentralAuditEvent | `ElectronicSignatureService.publishSignatureEvent` → `AuditClient.publish` (action `SIGN`) |
| 8. Legacy signatures keep working | `signature-legacy-enabled` still gates `signAuditLog`; entity columns are nullable so old rows remain valid |
| 9. New signatures behind `signature-v2-enabled` | controller returns 403 when the flag is off |
| 10. Verification proves who/what/version/tamper | `GET /verifySignatures` recomputes each hash and reports `intact` + per-signature `valid` |

## Endpoints (base `/pharmaTrack/identityAccess`)

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| POST | `/signatures` | authenticated | Apply a signature (`{entityType, entityId, entityVersion, meaning}`) |
| GET  | `/signatures?entityType=&entityId=` | authenticated | List signatures on a record |
| GET  | `/verifySignatures?entityType=&entityId=` | authenticated | Verify/tamper-check all signatures on a record |

A single record can carry multiple signatures (e.g. **Created By** Clinical
Researcher + **Approved By** Principal Investigator), each with its own meaning.

## Signature hash

```
sha256( userId | entityType | entityId | entityVersion | meaning | signedAt )
```

`signedAt` is truncated to whole seconds at signing time so the hashed value
equals the value that round-trips from the database — otherwise column-precision
truncation would make an untampered row fail verification.

## Deploy / migration order

1. Apply `src/main/resources/db/wave3-electronic-signature.sql` to
   `pharmatrack_iam_ms` (adds nullable columns, relaxes `audit_id`, indexes the
   entity linkage). `ddl-auto` stays `none`.
2. Deploy the service (endpoints ship dark while `signature-v2-enabled=false`).
3. Set `signature-v2-enabled: true` (already flipped in `application.yml`) with
   `signature-legacy-enabled: true` — V2 and legacy run in parallel.
4. Migrate approval-workflow callers to `POST /signatures`.
5. When cut over, set `signature-legacy-enabled: false`; remove the legacy path a
   release later.

## Wave 3.1 — Role-based authorization

`SignatureAuthorizationService.authorize(role, entityType, meaning)` runs before
signing; a disallowed combination throws `SignatureNotAuthorizedException` →
**HTTP 403** `{"message":"Role <role> cannot sign <entityType> with <MEANING> meaning"}`.
Hashing, verification, audit SIGN events, legacy signatures and feature flags are
unchanged.

**The matrix keys off the JWT `role` claim — the platform's short-code role
identifiers (same contract as `AuditRbac`), NOT the human-readable descriptions.**
Mapping:

| Requirements-doc description | JWT `role` code (matrix key) |
|---|---|
| Clinical Researcher | `Researcher` |
| Principal Investigator | `Investigator` |
| Quality Assurance Analyst | `QAAnalyst` |
| Manufacturing Supervisor | `MfgSupervisor` |
| Supply Chain Manager | `SupplyChain` |
| Regulatory Affairs Officer | `RegulatoryOfficer` |
| Pharma Admin | `Admin` — **no business signatures** |

| Entity types | Allowed role → meanings |
|---|---|
| TrialProtocol, ClinicalTrial, TrialSite | Investigator → REVIEWED, APPROVED |
| TrialSubject, VisitRecord, AdverseEvent | Researcher → REVIEWED · Investigator → REVIEWED |
| DeviationRecord, CAPARecord | QAAnalyst → APPROVED, REJECTED |
| BatchRecord, QCTest, RawMaterialUsage | MfgSupervisor → REVIEWED · QAAnalyst → RELEASED |
| DrugShipment, ColdChainLog, SiteInventory | SupplyChain → APPROVED, RELEASED |
| RegulatoryDossier, RegulatoryMilestone | RegulatoryOfficer → APPROVED, REJECTED |

Unknown/unmapped `entityType` and any role not listed (including `Admin`) are
denied. If a role's stored `RoleDetails.roleName` ever differs from these codes,
change the constants in `SignatureAuthorizationService` — that is the single
source of truth.
