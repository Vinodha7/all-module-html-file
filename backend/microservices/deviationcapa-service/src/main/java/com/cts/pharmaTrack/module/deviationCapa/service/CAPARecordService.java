package com.cts.pharmaTrack.module.deviationCapa.service;

import com.cts.pharmaTrack.common.exception.DuplicateResourceException;
import com.cts.pharmaTrack.common.exception.InvalidStatusTransitionException;
import com.cts.pharmaTrack.common.exception.ResourceNotFoundException;
import com.cts.pharmaTrack.common.notification.NotificationPublisher;
import com.cts.pharmaTrack.module.deviationCapa.dto.CAPARecordRequest;
import com.cts.pharmaTrack.module.deviationCapa.dto.CAPARecordResponse;
import com.cts.pharmaTrack.module.deviationCapa.entity.CAPARecord;
import com.cts.pharmaTrack.module.deviationCapa.repository.CAPARecordRepository;
import com.cts.pharmaTrack.module.deviationCapa.repository.DeviationRecordRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.List;
import java.util.Map;

/**
 * Business logic for corrective and preventive action plans (CAPA).
 * Each CAPA references an existing {@code DeviationRecord}.
 * The primary key {@code capaId} is supplied by the client (e.g. {@code CAPA001}).
 */
@Service
@RequiredArgsConstructor
@Transactional
public class CAPARecordService {

    private static final Logger logger = LoggerFactory.getLogger(CAPARecordService.class);
    private static final String DEFAULT_STATUS = "OPN";

    /**
     * Allowed status transitions for a CAPA record, mirroring the workflow
     * definition (OPN → INP/CLS/CNL, INP → CLS). CLS and CNL are terminal, so any
     * move out of them - including a no-op like CLS → CLS - is rejected.
     */
    private static final Map<String, List<String>> TRANSITIONS = Map.of(
            "OPN", List.of("INP", "CLS", "CNL"),
            "INP", List.of("CLS"));

    private final CAPARecordRepository capaRepository;
    private final DeviationRecordRepository deviationRepository;
    private final NotificationPublisher notificationPublisher;

    public CAPARecordResponse create(CAPARecordRequest request) {
        logger.info("Executing create with capaId: {}", request.getCapaId());
        if (capaRepository.existsById(request.getCapaId())) {
            throw new DuplicateResourceException(
                    "capaId already exists: " + request.getCapaId());
        }
        if (!deviationRepository.existsById(request.getDeviationId())) {
            throw new ResourceNotFoundException("DeviationRecord", request.getDeviationId());
        }
        CAPARecord capa = new CAPARecord();
        capa.setCapaId(request.getCapaId());
        apply(capa, request);
        capa.setStatus(StringUtils.hasText(request.getStatus())
                ? toShortStatus(request.getStatus()) : DEFAULT_STATUS);
        CAPARecord saved = capaRepository.save(capa);
        notificationPublisher.notify(NotificationPublisher.DEVIATION,
                "CAPA id " + saved.getCapaId() + " was created");
        return toResponse(saved);
    }

    @Transactional(readOnly = true)
    public List<CAPARecordResponse> getAll() {
        logger.info("Executing getAll");
        List<CAPARecord> capas = capaRepository.findAll();
        if (capas.isEmpty()) {
            throw new ResourceNotFoundException("No CAPA records found");
        }
        return capas.stream().map(this::toResponse).toList();
    }

    @Transactional(readOnly = true)
    public CAPARecordResponse getById(String capaId) {
        logger.info("Executing getById with capaId: {}", capaId);
        return toResponse(findOrThrow(capaId));
    }

    @Transactional(readOnly = true)
    public List<CAPARecordResponse> getByDeviation(String deviationId) {
        logger.info("Executing getByDeviation with deviationId: {}", deviationId);
        return capaRepository.findByDeviationId(deviationId)
                .stream().map(this::toResponse).toList();
    }

    public CAPARecordResponse update(CAPARecordRequest request) {
        logger.info("Executing update with capaId: {}", request.getCapaId());
        CAPARecord capa = findOrThrow(request.getCapaId());
        if (!deviationRepository.existsById(request.getDeviationId())) {
            throw new ResourceNotFoundException("DeviationRecord", request.getDeviationId());
        }
        apply(capa, request);
        if (StringUtils.hasText(request.getStatus())) {
            capa.setStatus(toShortStatus(request.getStatus()));
        }
        CAPARecord updated = capaRepository.save(capa);
        notificationPublisher.notify(NotificationPublisher.DEVIATION,
                "CAPA id " + updated.getCapaId() + " status changed to " + updated.getStatus());
        return toResponse(updated);
    }

    public void updateStatus(String capaId, String newStatus) {
        logger.info("Executing updateStatus with capaId: {}, newStatus: {}", capaId, newStatus);
        CAPARecord capa = findOrThrow(capaId);
        String currentStatus = toShortStatus(capa.getStatus());
        String targetStatus = toShortStatus(newStatus);
        List<String> allowed = TRANSITIONS.getOrDefault(currentStatus, List.of());
        if (!allowed.contains(targetStatus)) {
            throw new InvalidStatusTransitionException(
                    "Status transition not allowed: " + currentStatus + " -> " + targetStatus);
        }
        capa.setStatus(targetStatus);
        CAPARecord updated = capaRepository.save(capa);
        notificationPublisher.notify(NotificationPublisher.DEVIATION,
                "CAPA id " + updated.getCapaId() + " status changed to " + updated.getStatus());
    }

    public void delete(String capaId) {
        logger.info("Executing delete with capaId: {}", capaId);
        CAPARecord capa = findOrThrow(capaId);
        capaRepository.delete(capa);
    }

    private void apply(CAPARecord capa, CAPARecordRequest request) {
        capa.setDeviationId(request.getDeviationId());
        capa.setRootCause(request.getRootCause());
        capa.setCorrectiveAction(request.getCorrectiveAction());
        capa.setPreventiveAction(request.getPreventiveAction());
        capa.setAssignedToId(request.getAssignedToId());
        capa.setDueDate(request.getDueDate());
        capa.setClosedDate(request.getClosedDate());
        if (StringUtils.hasText(request.getStatus())) {
            capa.setStatus(toShortStatus(request.getStatus()));
        }
    }

    private CAPARecord findOrThrow(String capaId) {
        return capaRepository.findById(capaId)
                .orElseThrow(() -> new ResourceNotFoundException("CAPARecord", capaId));
    }

    private CAPARecordResponse toResponse(CAPARecord c) {
        return new CAPARecordResponse(
                c.getCapaId(),
                c.getDeviationId(),
                c.getRootCause(),
                c.getCorrectiveAction(),
                c.getPreventiveAction(),
                c.getAssignedToId(),
                c.getDueDate(),
                c.getClosedDate(),
                c.getStatus());
    }

    private String toShortStatus(String status) {
        if (!StringUtils.hasText(status)) {
            return DEFAULT_STATUS;
        }
        String normalized = status.trim().toUpperCase();
        return switch (normalized) {
            case "OPEN", "OPN" -> "OPN";
            case "CLOSED", "CLS" -> "CLS";
            case "DELETED", "DEL" -> "DEL";
            case "INPROGRESS", "IN PROGRESS", "INP" -> "INP";
            case "CANCELLED", "CANCELED" -> "CNL";
            default -> normalized.length() >= 3 ? normalized.substring(0, 3) : normalized;
        };
    }
    }

