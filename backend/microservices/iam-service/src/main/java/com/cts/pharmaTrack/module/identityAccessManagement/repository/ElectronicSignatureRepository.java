package com.cts.pharmaTrack.module.identityAccessManagement.repository;

import com.cts.pharmaTrack.module.identityAccessManagement.entity.ElectronicSignature;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface ElectronicSignatureRepository extends JpaRepository<ElectronicSignature, Integer> {

    // ── Legacy audit-log signatures ────────────────────────────────────────────
    List<ElectronicSignature> findByAuditId(Integer auditId);
    long countByAuditId(Integer auditId);

    // ── Wave 3 entity-based signatures ─────────────────────────────────────────
    /** All signatures on a business record, across every version, newest linkage first. */
    List<ElectronicSignature> findByEntityTypeAndEntityId(String entityType, String entityId);

    /** All signatures on a specific version of a business record. */
    List<ElectronicSignature> findByEntityTypeAndEntityIdAndEntityVersion(
            String entityType, String entityId, String entityVersion);
}
