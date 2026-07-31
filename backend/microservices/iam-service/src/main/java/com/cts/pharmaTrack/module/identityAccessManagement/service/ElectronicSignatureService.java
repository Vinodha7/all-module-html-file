package com.cts.pharmaTrack.module.identityAccessManagement.service;

import com.cts.pharmaTrack.common.audit.AuditClient;
import com.cts.pharmaTrack.common.audit.AuditModules;
import com.cts.pharmaTrack.common.audit.CentralAuditEvent;
import com.cts.pharmaTrack.common.config.FeatureFlags;
import com.cts.pharmaTrack.common.web.CorrelationIdFilter;
import com.cts.pharmaTrack.module.identityAccessManagement.dto.response.SignatureVerificationResult;
import com.cts.pharmaTrack.module.identityAccessManagement.entity.ElectronicSignature;
import com.cts.pharmaTrack.module.identityAccessManagement.entity.SignatureMeaning;
import com.cts.pharmaTrack.module.identityAccessManagement.repository.ElectronicSignatureRepository;
import com.cts.pharmaTrack.module.identityAccessManagement.util.ChecksumUtil;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.slf4j.MDC;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Wave 3 entity-based electronic signatures on approval workflows.
 *
 * <p>Reuses the existing {@link ElectronicSignature} entity/repository, the
 * {@link ChecksumUtil} SHA-256 helper, the {@link FeatureFlags} rollout switches,
 * and the {@link AuditClient} central-audit pipeline. A signature binds the
 * authenticated signer to a business entity + version with a tamper-evident hash,
 * and every successful signature emits a {@link CentralAuditEvent}.
 *
 * <p>Feature gating is the caller's responsibility (the controller checks
 * {@link FeatureFlags#isSignatureV2Enabled()}); this service is the pure logic.
 */
@Service
public class ElectronicSignatureService {

    private static final Logger logger = LoggerFactory.getLogger(ElectronicSignatureService.class);

    private final ElectronicSignatureRepository signatureRepository;
    private final AuditClient auditClient;

    public ElectronicSignatureService(ElectronicSignatureRepository signatureRepository,
                                      AuditClient auditClient) {
        this.signatureRepository = signatureRepository;
        this.auditClient = auditClient;
    }

    /**
     * Applies an entity-based electronic signature. The signer identity
     * ({@code signerId}/{@code signerName}) is supplied by the controller from the
     * authenticated JWT principal — never from the request body.
     *
     * @return the persisted signature
     */
    public ElectronicSignature sign(String entityType, String entityId, String entityVersion,
                                    SignatureMeaning meaning, Integer signerId, String signerName,
                                    String ipAddress, String bearerToken) {
        // Truncate to seconds so the value that is hashed is exactly the value that
        // round-trips from the DB (guards the tamper check against column precision).
        LocalDateTime signedAt = LocalDateTime.now().truncatedTo(ChronoUnit.SECONDS);
        String meaningName = meaning.name();

        ElectronicSignature sig = new ElectronicSignature();
        sig.setAuditId(null); // entity-based signature: no audit-log linkage
        sig.setUserId(signerId);
        sig.setSignerName(signerName);
        sig.setEntityType(entityType);
        sig.setEntityId(entityId);
        sig.setEntityVersion(entityVersion);
        sig.setSignedAt(signedAt);
        sig.setMeaning(meaningName);
        sig.setSignatureHash(ChecksumUtil.sha256(
                canonical(signerId, entityType, entityId, entityVersion, meaningName, signedAt)));

        ElectronicSignature saved = signatureRepository.save(sig);
        publishSignatureEvent(saved, ipAddress, bearerToken);
        return saved;
    }

    /** All entity-based signatures on a business record. */
    public List<ElectronicSignature> list(String entityType, String entityId) {
        return signatureRepository.findByEntityTypeAndEntityId(entityType, entityId);
    }

    /** List all signatures. */
    public List<ElectronicSignature> listAll() {
        return signatureRepository.findAll();
    }

    /**
     * Verifies every signature on a business record: recomputes each hash from the
     * stored fields and compares it to the stored hash. Proves who signed, what and
     * which version was signed, and flags any record whose hash no longer matches
     * (tampered).
     */
    public Map<String, Object> verify(String entityType, String entityId) {
        List<ElectronicSignature> sigs = signatureRepository.findByEntityTypeAndEntityId(entityType, entityId);
        List<SignatureVerificationResult> results = new ArrayList<>();
        long valid = 0, tampered = 0;

        for (ElectronicSignature s : sigs) {
            String recomputed = ChecksumUtil.sha256(
                    canonical(s.getUserId(), s.getEntityType(), s.getEntityId(),
                            s.getEntityVersion(), s.getMeaning(), s.getSignedAt()));
            boolean ok = recomputed.equals(s.getSignatureHash());
            if (ok) valid++; else tampered++;
            results.add(new SignatureVerificationResult(
                    s.getSignatureId(), s.getUserId(), s.getSignerName(),
                    s.getEntityType(), s.getEntityId(), s.getEntityVersion(),
                    s.getMeaning(), s.getSignedAt(), ok, s.getSignatureHash(), recomputed));
        }

        Map<String, Object> out = new LinkedHashMap<>();
        out.put("entityType", entityType);
        out.put("entityId", entityId);
        out.put("total", sigs.size());
        out.put("valid", valid);
        out.put("tamperedCount", tampered);
        out.put("intact", tampered == 0);
        out.put("signatures", results);
        return out;
    }

    // ── internals ──────────────────────────────────────────────────────────────

    /**
     * Canonical string hashed for the signature — covers userId, entityType,
     * entityId, entityVersion, meaning and signedAt (Wave 3 business rule 6), in
     * that order. Used identically at sign and verify time.
     */
    private static String canonical(Integer userId, String entityType, String entityId,
                                    String entityVersion, String meaning, LocalDateTime signedAt) {
        return userId + "|" + entityType + "|" + entityId + "|" + entityVersion + "|"
                + meaning + "|" + signedAt.truncatedTo(ChronoUnit.SECONDS);
    }

    /** Emit the signing action to the central Audit Service (never blocks the signature). */
    private void publishSignatureEvent(ElectronicSignature sig, String ipAddress, String bearerToken) {
        CentralAuditEvent event = new CentralAuditEvent();
        event.setEventId(UUID.randomUUID().toString());
        event.setModule(AuditModules.IDENTITY_ACCESS_MANAGEMENT);
        event.setEntityType(sig.getEntityType());
        event.setEntityId(sig.getEntityId());
        event.setAction("SIGN");
        event.setPerformedBy(String.valueOf(sig.getUserId()));
        event.setPerformedByName(sig.getSignerName());
        event.setPerformedAt(sig.getSignedAt());
        event.setNewValues(Map.of(
                "meaning", sig.getMeaning(),
                "entityVersion", sig.getEntityVersion(),
                "signatureId", sig.getSignatureId(),
                "signatureHash", sig.getSignatureHash()));
        event.setIpAddress(ipAddress);
        event.setCorrelationId(MDC.get(CorrelationIdFilter.CORRELATION_ID_MDC_KEY));

        boolean published = auditClient.publish(event, bearerToken);
        if (!published) {
            logger.warn("Central audit publish for signature {} (entity {}:{} v{}) returned false",
                    sig.getSignatureId(), sig.getEntityType(), sig.getEntityId(), sig.getEntityVersion());
        }
    }
}
