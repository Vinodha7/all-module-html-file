-- ============================================================================
-- Wave 3 — Entity-based electronic signatures
-- ----------------------------------------------------------------------------
-- The IAM service runs with spring.jpa.hibernate.ddl-auto=none, so schema
-- changes are applied out-of-band. Run this ONCE against pharmatrack_iam_ms
-- before / alongside enabling pharmatrack.features.signature-v2-enabled.
--
-- IMPORTANT — column naming: the service uses
--   spring.jpa.hibernate.naming.physical-strategy=PhysicalNamingStrategyStandardImpl
-- which maps each JPA field to a column name VERBATIM (no camelCase→snake_case
-- conversion). The existing columns are therefore camelCase (auditId, userId,
-- signedAt, signatureHash), and the Wave 3 columns MUST be camelCase too
-- (entityType, entityId, entityVersion, signerName) or Hibernate's INSERT fails
-- with "Unknown column 'entityId' in 'field list'".
--
-- Dialect: MySQL (com.mysql.cj.jdbc.Driver / MySQLDialect). MySQL does NOT
-- support "ADD COLUMN IF NOT EXISTS" / "CREATE INDEX IF NOT EXISTS" (those are
-- MariaDB), so plain statements are used. Run once on a clean legacy table.
-- ============================================================================

ALTER TABLE electronic_signature
    ADD COLUMN signerName    VARCHAR(150) NULL,
    ADD COLUMN entityType    VARCHAR(100) NULL,
    ADD COLUMN entityId      VARCHAR(100) NULL,
    ADD COLUMN entityVersion VARCHAR(50)  NULL;

-- Legacy schema declared auditId NOT NULL; Wave 3 entity signatures have no
-- audit-log linkage, so relax it to NULLable.
ALTER TABLE electronic_signature
    MODIFY COLUMN auditId INT NULL;

-- Read/verify signatures by business record and version.
CREATE INDEX idx_esig_entity
    ON electronic_signature (entityType, entityId, entityVersion);
