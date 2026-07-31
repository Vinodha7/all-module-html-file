# Audit Service — Database Immutability Hardening

This document describes how the `audit_event` table in the `pharmatrack_audit`
database is protected at the **database layer**, complementing the
**application-layer** immutability already built into the service.

The audit trail must be **append-only**: rows may be inserted and read, but never
updated or deleted. This is a 21 CFR Part 11 / EU Annex 11 expectation — an audit
record must be at least as trustworthy as the record it describes.

---

## 1. Two database users

Immutability is enforced by separating the account that **creates** the schema
from the account the **running service** uses.

### 1.1 Initial schema-creation user (privileged)

- A privileged account (DDL-capable) creates the `pharmatrack_audit` database and
  the `audit_event` table **and its indexes**.
- In the current dev setup this happens automatically: the service boots once with
  `spring.jpa.hibernate.ddl-auto=update` using the configured (privileged) MySQL
  user, which issues the `CREATE TABLE` / `CREATE INDEX` DDL.
- In a hardened environment, run the schema creation once with this privileged
  user (or a reviewed migration script), then **stop using it for the running
  service**.

### 1.2 Runtime restricted user (least privilege)

- After the schema exists, the service runs as a **separate, restricted** MySQL
  user that holds only `INSERT` and `SELECT` on `audit_event`.
- With this user, `ddl-auto` must be set to `validate` (or `none`) — the restricted
  user has no DDL rights and must not attempt schema changes.

---

## 2. Runtime grants

The runtime user is granted exactly:

```sql
-- Runtime (restricted) user: append + read only.
CREATE USER 'pharmatrack_audit_rt'@'%' IDENTIFIED BY '<strong-secret>';

GRANT INSERT, SELECT ON pharmatrack_audit.audit_event TO 'pharmatrack_audit_rt'@'%';

-- Explicitly NOT granted (append-only):
--   UPDATE  -> existing rows can never be modified
--   DELETE  -> existing rows can never be removed
--   DROP / ALTER / TRUNCATE -> no DDL at runtime
FLUSH PRIVILEGES;
```

Runtime datasource configuration then uses this user, with:

```yaml
spring:
  datasource:
    username: pharmatrack_audit_rt
    password: ${AUDIT_DB_PASSWORD}
  jpa:
    hibernate:
      ddl-auto: validate   # never 'update' with the restricted user
```

### 2.1 What is deliberately withheld

| Privilege | Granted? | Reason |
|-----------|----------|--------|
| `INSERT`  | ✅ | new audit events are appended |
| `SELECT`  | ✅ | search / reporting / integrity verification |
| `UPDATE`  | ❌ | an existing audit row must never change |
| `DELETE`  | ❌ | an existing audit row must never be removed |
| `ALTER` / `DROP` / `TRUNCATE` | ❌ | no schema tampering at runtime |

---

## 3. Why DB-level immutability complements application-level immutability

The service already enforces immutability in code:

- The entity has **no** `@PreUpdate` / `@PreRemove` / `@Version` callbacks and marks
  `performed_at`, `received_at`, and `row_hash` as `updatable = false`.
- The repository (A6) exposes **only** insert and read operations — there is no
  `delete`/`update` method to call.
- Each row carries a **keyed HMAC `row_hash`** (A9) so tampering is detectable even
  if a row is changed out-of-band.

These are strong, but they all live **inside the application**. They do not stop:

- a bug, rogue admin, or SQL console issuing `UPDATE`/`DELETE` directly against the
  database;
- another application sharing the credentials;
- a compromised service instance.

Granting the runtime user only `INSERT, SELECT` closes that gap: even a fully
compromised service **cannot** modify or delete history, because the database
itself rejects the statement. The keyed HMAC is the third layer — if a row is
altered by a privileged account despite everything, `verifyIntegrity` (A13) detects
it because the attacker cannot recompute a valid hash without the externally-held
`AUDIT_HMAC_KEY`.

**Defense in depth:**

1. **Application** — no update/delete code paths (structural).
2. **Database** — no `UPDATE`/`DELETE` grant (enforced by the DBMS).
3. **Cryptography** — keyed HMAC `row_hash` detects any change made by a
   privileged account that bypasses layers 1–2.

## 4. Why `audit_event` must be append-only

- **Regulatory:** 21 CFR Part 11 §11.10(e) and EU Annex 11 require secure,
  computer-generated, time-stamped audit trails that record operator entries and
  actions and do **not** obscure previously recorded information. Editing or
  deleting audit rows would obscure history.
- **Trust:** the audit trail is the evidence of what happened. If it can be edited,
  it proves nothing. Append-only + tamper-evidence is what makes it admissible.
- **Correctness:** corrections are made by **appending** a new event (e.g. a
  correcting action), never by mutating the original — the full history is
  preserved.

---

## 5. Operational checklist

- [ ] Schema (`audit_event` + indexes) created once by the privileged user.
- [ ] Runtime user created with **only** `INSERT, SELECT` on `audit_event`.
- [ ] Runtime datasource switched to the restricted user; `ddl-auto: validate`.
- [ ] Verified: `UPDATE` / `DELETE` against `audit_event` as the runtime user fails
      with an access-denied error.
- [ ] Verified: `INSERT` and `SELECT` succeed as the runtime user.
- [ ] `AUDIT_HMAC_KEY` provisioned and held outside the database.
