# PharmaTrack — E-Signature & Audit API Reference (non-IAM modules)

All calls need `Authorization: Bearer <token>` and `Content-Type: application/json`
(except Login). **POST responses are message-only (no `data`)** by global policy;
only `/auth/login` and `/auth/refresh` return `data`. GET responses still carry `data`.

## Ports
| Service | Base URL |
|---|---|
| IAM (auth + signatures) | http://localhost:8081 |
| Clinical Trial | http://localhost:8082 |
| Subject Enrolment | http://localhost:8083 |
| Batch | http://localhost:8084 |
| Supply Chain | http://localhost:8085 |
| Deviation & CAPA | http://localhost:8086 |
| Regulatory | http://localhost:8087 |
| Audit Service | http://localhost:8089 |

---

## 0. Login  (data — exempt from stripping)
`POST http://localhost:8081/pharmaTrack/identityAccess/auth/login`
```json
{ "email": "investigator@pharma.com", "password": "Pass@123" }
```
**200**
```json
{
  "status": "success",
  "message": "Login successful",
  "data": { "token": "eyJhbGciOi...", "expiresIn": 1800000, "userId": 2, "role": "Investigator" }
}
```
Seeded admin: `admin@pharma.com` / `Admin@123`. Use the `token` as the Bearer for every call below.

---

## 1. Electronic signatures (IAM, 8081)

### Apply a signature  (message-only)
`POST http://localhost:8081/pharmaTrack/identityAccess/signatures`
```json
{ "entityType": "BatchRecord", "entityId": "1", "entityVersion": "1", "meaning": "RELEASED" }
```
**200**
```json
{ "status": "success", "message": "Signature applied" }
```
`meaning` ∈ `APPROVED | REVIEWED | REJECTED | RELEASED`. Role must be allowed to sign that
entityType/meaning (matrix below) else **403**. `entityVersion` is only enforced for
`TrialProtocol` (must equal its versionNumber); free otherwise.

### Verify signatures  (GET — data)
`GET http://localhost:8081/pharmaTrack/identityAccess/verifySignatures?entityType=BatchRecord&entityId=1`
**200**
```json
{
  "status": "success",
  "message": "Signature verification complete",
  "data": {
    "entityType": "BatchRecord", "entityId": "1",
    "total": 1, "valid": 1, "tamperedCount": 0, "intact": true,
    "signatures": [
      { "signatureId": 5, "signerId": 3, "signerName": "QA User",
        "entityType": "BatchRecord", "entityId": "1", "entityVersion": "1",
        "meaning": "RELEASED", "signedAt": "2026-07-20T12:00:00", "valid": true }
    ]
  }
}
```

### List signatures  (GET — data)
`GET http://localhost:8081/pharmaTrack/identityAccess/signatures?entityType=BatchRecord&entityId=1`

---

## 2. Workflow (served by EACH module on its own port)

### Transition  (message-only)
`POST http://localhost:{modulePort}/workflow/transition`
```json
{ "entityType": "BatchRecord", "entityId": "1", "targetStatus": "REL", "reason": "Release batch" }
```
**200**
```json
{ "success": true, "message": "Workflow transition to 'REL' recorded for BatchRecord 1" }
```
Rejections: **403** wrong role / missing signature, **409** invalid state change,
**400** unknown entityType / missing fields. Error body (not stripped):
```json
{ "status": 403, "message": "... requires a valid RELEASED electronic signature", "errorCode": "FORBIDDEN", "path": "/workflow/transition", "timestamp": "2026-07-20T12:00:00" }
```

### Status  (GET — data)
`GET http://localhost:{modulePort}/workflow/status/BatchRecord/1`
```json
{ "entityType": "BatchRecord", "entityId": "1", "status": "QCH" }
```

### History  (GET — data)
`GET http://localhost:{modulePort}/workflow/history/BatchRecord/1`
```json
[
  { "historyId": 10, "entityType": "BatchRecord", "entityId": "1",
    "oldStatus": "QCH", "newStatus": "REL", "changedBy": "3",
    "changedAt": "2026-07-20T12:00:05", "signatureId": 5, "reason": "Release batch" }
]
```

---

## 3. Per-module gated flows (what to sign + what to transition)

| Module (port) | entityType | Sign meaning · role | Transition (from→to) targetStatus | Audit action |
|---|---|---|---|---|
| Clinical Trial (8082) | TrialProtocol | APPROVED · Investigator | Draft→Approved `Approved` | APPROVE |
| Subject Enrolment (8083) | TrialSubject | REVIEWED · Researcher/Investigator | Enrolled→Reviewed `Reviewed` | REVIEW |
| Batch (8084) | BatchRecord | RELEASED · QAAnalyst | QCH→REL `REL` | RELEASE |
| Deviation & CAPA (8086) | CAPARecord | APPROVED · QAAnalyst | OPN/INP→CLS `CLS` | CLOSE |
| Regulatory (8087) | RegulatoryDossier | APPROVED · RegulatoryOfficer | UnderReview→Approved `Approved` | APPROVE |
| Supply Chain (8085) | DrugShipment | *(none — unsigned)* | Dispatched→InTransit `InTransit` | SHIP |

**Signature authorization matrix** (who may sign what):
- TrialProtocol / ClinicalTrial / TrialSite → Investigator {REVIEWED, APPROVED}
- TrialSubject / VisitRecord / AdverseEvent → Researcher {REVIEWED}, Investigator {REVIEWED}
- DeviationRecord / CAPARecord → QAAnalyst {APPROVED, REJECTED}
- BatchRecord / QCTest / RawMaterialUsage → MfgSupervisor {REVIEWED}, QAAnalyst {RELEASED}
- DrugShipment / ColdChainLog / SiteInventory → SupplyChain {APPROVED, RELEASED}
- RegulatoryDossier / RegulatoryMilestone → RegulatoryOfficer {APPROVED, REJECTED}

**Test sequence per module:** login as role → `GET /workflow/status` → `POST /workflow/transition`
(expect **403**, no signature) → `POST /signatures` in IAM → `GET /verifySignatures` → retry
`POST /workflow/transition` (expect **200**) → `GET /workflow/history` → query audit.

---

## 4. Audit Service (8089)  — all GET, use Admin/Auditor token

### Search events (paged)
`GET http://localhost:8089/pharmaTrack/audit/events?module=BatchManufacturing&action=RELEASE&entityType=BatchRecord&entityId=1&page=0&size=20`
Optional filters: `performedBy`, `correlationId`, `from`, `to` (ISO `2026-07-01T00:00:00`).
**200**
```json
{
  "success": true, "message": "Audit events fetched",
  "data": {
    "content": [
      { "eventId": "b3f...", "module": "BatchManufacturing", "action": "RELEASE",
        "entityType": "BatchRecord", "entityId": "1",
        "performedBy": "3", "performedByName": "QA User",
        "performedAt": "2026-07-20T12:00:05", "receivedAt": "2026-07-20T12:00:05",
        "oldValues": { "status": "QCH" },
        "newValues": { "status": "REL", "signatureId": 5, "reason": "Release batch" },
        "correlationId": "…", "source": "batch-service", "rowHash": "…" }
    ],
    "totalElements": 1, "totalPages": 1, "number": 0, "size": 20
  }
}
```
Canonical `module` values: `ClinicalTrial`, `SubjectEnrollment`, `BatchManufacturing`,
`SupplyChain`, `DeviationCAPA`, `RegulatoryAffairs`, `IdentityAccessManagement`.

### Get one event
`GET http://localhost:8089/pharmaTrack/audit/events/{eventId}`  → `data` = one event (404 if outside your scope).

### Summary (counts by module & action)
`GET http://localhost:8089/pharmaTrack/audit/summary`

### Verify integrity (recompute HMAC of every row — Admin/Auditor)
`GET http://localhost:8089/pharmaTrack/audit/verifyIntegrity`

### Export
`GET http://localhost:8089/pharmaTrack/audit/events/export?format=pdf`  (`pdf` | `excel`; returns a file).
