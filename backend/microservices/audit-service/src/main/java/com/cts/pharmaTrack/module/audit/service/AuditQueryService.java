package com.cts.pharmaTrack.module.audit.service;

import com.cts.pharmaTrack.module.audit.dto.AuditEventFilter;
import com.cts.pharmaTrack.module.audit.dto.AuditEventResponse;
import com.cts.pharmaTrack.module.audit.dto.AuditSummaryResponse;
import com.cts.pharmaTrack.module.audit.entity.AuditEvent;
import com.cts.pharmaTrack.module.audit.repository.AuditEventRepository;
import com.cts.pharmaTrack.module.audit.security.ModuleScopeResolver;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;

/**
 * Read side of the Audit Service: module-scoped, filtered, paged queries and
 * summary aggregation.
 *
 * <p>Every result is constrained to the modules the caller's role may read
 * (via {@link ModuleScopeResolver}). Admin and Auditor see all modules; an
 * unknown/unmapped role sees nothing (empty results). Results are ordered by
 * {@code performedAt} descending.
 */
@Service
public class AuditQueryService {

    private final AuditEventRepository repository;
    private final ModuleScopeResolver scopeResolver;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public AuditQueryService(AuditEventRepository repository, ModuleScopeResolver scopeResolver) {
        this.repository = repository;
        this.scopeResolver = scopeResolver;
    }

    @Transactional(readOnly = true)
    public Page<AuditEventResponse> search(AuditEventFilter filter, String role) {
        Pageable pageable = PageRequest.of(
                filter.getPage(), filter.getSize(),
                Sort.by(Sort.Direction.DESC, "performedAt"));

        Set<String> allowedModules = scopeResolver.resolveModules(role);
        if (allowedModules.isEmpty()) {
            return Page.empty(pageable);
        }

        return repository.search(
                allowedModules,
                blankToNull(filter.getModule()),
                blankToNull(filter.getAction()),
                blankToNull(filter.getEntityType()),
                blankToNull(filter.getEntityId()),
                blankToNull(filter.getPerformedBy()),
                blankToNull(filter.getCorrelationId()),
                filter.getFrom(),
                filter.getTo(),
                pageable
        ).map(this::toResponse);
    }

    @Transactional(readOnly = true)
    public Optional<AuditEventResponse> getById(String eventId, String role) {
        Set<String> allowedModules = scopeResolver.resolveModules(role);
        if (allowedModules.isEmpty()) {
            return Optional.empty();
        }
        return repository.findById(eventId)
                .filter(event -> allowedModules.contains(event.getModule()))
                .map(this::toResponse);
    }

    /**
     * Returns all module-scoped rows matching the filter (unpaged), for export.
     * Same scoping and filtering as {@link #search}, ordered by performedAt DESC.
     */
    @Transactional(readOnly = true)
    public List<AuditEventResponse> exportSearch(AuditEventFilter filter, String role) {
        Set<String> allowedModules = scopeResolver.resolveModules(role);
        if (allowedModules.isEmpty()) {
            return List.of();
        }
        Pageable pageable = PageRequest.of(0, Integer.MAX_VALUE,
                Sort.by(Sort.Direction.DESC, "performedAt"));
        return repository.search(
                allowedModules,
                blankToNull(filter.getModule()),
                blankToNull(filter.getAction()),
                blankToNull(filter.getEntityType()),
                blankToNull(filter.getEntityId()),
                blankToNull(filter.getPerformedBy()),
                blankToNull(filter.getCorrelationId()),
                filter.getFrom(),
                filter.getTo(),
                pageable
        ).map(this::toResponse).getContent();
    }

    @Transactional(readOnly = true)
    public AuditSummaryResponse getSummary(String role) {
        Set<String> allowedModules = scopeResolver.resolveModules(role);
        if (allowedModules.isEmpty()) {
            return new AuditSummaryResponse(Map.of(), Map.of());
        }
        return new AuditSummaryResponse(
                toCountMap(repository.moduleCounts(allowedModules)),
                toCountMap(repository.actionCounts(allowedModules)));
    }

    // ── Mapping helpers ──────────────────────────────────────────────────────

    private AuditEventResponse toResponse(AuditEvent e) {
        AuditEventResponse r = new AuditEventResponse();
        r.setEventId(e.getEventId());
        r.setModule(e.getModule());
        r.setEntityType(e.getEntityType());
        r.setEntityId(e.getEntityId());
        r.setAction(e.getAction());
        r.setPerformedBy(e.getPerformedBy());
        r.setPerformedByName(e.getPerformedByName());
        r.setPerformedAt(e.getPerformedAt());
        r.setReceivedAt(e.getReceivedAt());
        r.setOldValues(parseJson(e.getOldValues()));
        r.setNewValues(parseJson(e.getNewValues()));
        r.setIpAddress(e.getIpAddress());
        r.setCorrelationId(e.getCorrelationId());
        r.setSource(e.getSource());
        r.setRowHash(e.getRowHash());
        return r;
    }

    private Object parseJson(String json) {
        if (json == null || json.isBlank()) {
            return null;
        }
        try {
            // Parse to plain JDK types (Map/List/String/...) so the response
            // serializes under Boot 4's Jackson 3, independent of any JsonNode type.
            return objectMapper.readValue(json, Object.class);
        } catch (JsonProcessingException ex) {
            throw new IllegalStateException("Corrupt stored JSON for audit event", ex);
        }
    }

    private static Map<String, Long> toCountMap(List<Object[]> rows) {
        Map<String, Long> counts = new LinkedHashMap<>();
        for (Object[] row : rows) {
            counts.put((String) row[0], ((Number) row[1]).longValue());
        }
        return counts;
    }

    private static String blankToNull(String value) {
        return (value == null || value.isBlank()) ? null : value;
    }
}
