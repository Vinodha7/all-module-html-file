package com.cts.pharmaTrack.module.audit.service;

import com.cts.pharmaTrack.module.audit.dto.AuditIntegrityIssue;
import com.cts.pharmaTrack.module.audit.dto.AuditIntegrityReport;
import com.cts.pharmaTrack.module.audit.dto.IntegrityStatus;
import com.cts.pharmaTrack.module.audit.entity.AuditEvent;
import com.cts.pharmaTrack.module.audit.repository.AuditEventRepository;
import com.cts.pharmaTrack.module.audit.util.AuditCanonicalizer;
import com.cts.pharmaTrack.module.audit.util.AuditHashService;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.ArrayList;
import java.util.List;

/**
 * Verifies the tamper-evidence of stored audit events by recomputing each row's
 * keyed HMAC (via {@link AuditCanonicalizer} + {@link AuditHashService}) and
 * comparing it, in constant time, to the stored {@code rowHash}.
 *
 * <p>Read-only: it never modifies or deletes rows.
 */
@Service
public class AuditIntegrityService {

    private final AuditEventRepository repository;
    private final AuditCanonicalizer canonicalizer;
    private final AuditHashService hashService;

    public AuditIntegrityService(AuditEventRepository repository,
                                 AuditCanonicalizer canonicalizer,
                                 AuditHashService hashService) {
        this.repository = repository;
        this.canonicalizer = canonicalizer;
        this.hashService = hashService;
    }

    @Transactional(readOnly = true)
    public AuditIntegrityReport verify() {
        List<AuditIntegrityIssue> issues = new ArrayList<>();
        long total = 0;
        long verified = 0;
        long tampered = 0;
        long unverifiable = 0;

        for (AuditEvent event : repository.findAll(Pageable.unpaged())) {
            total++;
            switch (classify(event, issues)) {
                case VERIFIED -> verified++;
                case TAMPERED -> tampered++;
                case UNVERIFIABLE -> unverifiable++;
            }
        }

        boolean intact = tampered == 0 && unverifiable == 0;
        return new AuditIntegrityReport(total, verified, tampered, unverifiable, intact, issues);
    }

    private IntegrityStatus classify(AuditEvent event, List<AuditIntegrityIssue> issues) {
        // Missing stored hash -> cannot verify.
        if (isBlank(event.getRowHash())) {
            issues.add(unverifiable(event, "missing rowHash"));
            return IntegrityStatus.UNVERIFIABLE;
        }

        // Missing a field required to reconstruct the canonical form.
        String missingField = firstMissingRequiredField(event);
        if (missingField != null) {
            issues.add(unverifiable(event, "missing required field: " + missingField));
            return IntegrityStatus.UNVERIFIABLE;
        }

        // Persisted JSON that cannot be canonicalized -> cannot verify.
        try {
            canonicalizer.canonicalizeJson(event.getOldValues());
            canonicalizer.canonicalizeJson(event.getNewValues());
        } catch (RuntimeException ex) {
            issues.add(unverifiable(event, "invalid persisted JSON: " + ex.getMessage()));
            return IntegrityStatus.UNVERIFIABLE;
        }

        String recomputed = hashService.hash(event);
        if (constantTimeEquals(recomputed, event.getRowHash())) {
            return IntegrityStatus.VERIFIED;
        }

        issues.add(new AuditIntegrityIssue(
                event.getEventId(), event.getModule(), IntegrityStatus.TAMPERED,
                null, event.getRowHash(), recomputed));
        return IntegrityStatus.TAMPERED;
    }

    private static AuditIntegrityIssue unverifiable(AuditEvent event, String reason) {
        return new AuditIntegrityIssue(
                event.getEventId(), event.getModule(), IntegrityStatus.UNVERIFIABLE,
                reason, event.getRowHash(), null);
    }

    private static String firstMissingRequiredField(AuditEvent e) {
        if (isBlank(e.getEventId())) return "eventId";
        if (isBlank(e.getModule())) return "module";
        if (isBlank(e.getEntityType())) return "entityType";
        if (isBlank(e.getAction())) return "action";
        if (isBlank(e.getPerformedBy())) return "performedBy";
        if (e.getPerformedAt() == null) return "performedAt";
        return null;
    }

    /**
     * Constant-time comparison of two hex hash strings to avoid leaking match
     * progress via timing. {@link MessageDigest#isEqual} does not short-circuit
     * on the first differing byte for equal-length inputs.
     */
    private static boolean constantTimeEquals(String a, String b) {
        if (a == null || b == null) {
            return false;
        }
        return MessageDigest.isEqual(
                a.getBytes(StandardCharsets.UTF_8),
                b.getBytes(StandardCharsets.UTF_8));
    }

    private static boolean isBlank(String value) {
        return value == null || value.isBlank();
    }
}
