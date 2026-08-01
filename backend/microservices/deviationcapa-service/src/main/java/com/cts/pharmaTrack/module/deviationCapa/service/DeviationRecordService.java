package com.cts.pharmaTrack.module.deviationCapa.service;

import com.cts.pharmaTrack.common.exception.DuplicateResourceException;
import com.cts.pharmaTrack.common.exception.InvalidStatusTransitionException;
import com.cts.pharmaTrack.common.exception.ResourceNotFoundException;
import com.cts.pharmaTrack.common.notification.NotificationPublisher;
import com.cts.pharmaTrack.module.deviationCapa.dto.DeviationRecordRequest;
import com.cts.pharmaTrack.module.deviationCapa.dto.DeviationRecordResponse;
import com.cts.pharmaTrack.module.deviationCapa.entity.DeviationRecord;
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
 * Business logic for quality deviations: logging, lookup, update and safe deletion.
 * The primary key {@code deviationId} is supplied by the client (e.g. {@code DEV001}).
 */
@Service
@RequiredArgsConstructor
@Transactional
public class DeviationRecordService {

    private static final Logger logger = LoggerFactory.getLogger(DeviationRecordService.class);
    private static final String DEFAULT_STATUS = "OPN";

    /**
     * Allowed status transitions for a deviation record, mirroring the workflow
     * definition (OPN → INP/CNL, INP → CLS). CLS and CNL are terminal, so any
     * move out of them - including a no-op like CLS → CLS - is rejected.
     */
    private static final Map<String, List<String>> TRANSITIONS = Map.of(
            "OPN", List.of("INP", "CNL"),
            "INP", List.of("CLS"));

    private final DeviationRecordRepository deviationRepository;
    private final CAPARecordRepository capaRepository;
    private final NotificationPublisher notificationPublisher;

    public DeviationRecordResponse create(DeviationRecordRequest request) {
        logger.info("Executing create with deviationId: {}", request.getDeviationId());
        if (deviationRepository.existsById(request.getDeviationId())) {
            throw new DuplicateResourceException(
                    "deviationId already exists: " + request.getDeviationId());
        }
        DeviationRecord deviation = new DeviationRecord();
        deviation.setDeviationId(request.getDeviationId());
        apply(deviation, request);
        deviation.setStatus(StringUtils.hasText(request.getStatus())
                ? request.getStatus() : "Open");
        DeviationRecord saved = deviationRepository.save(deviation);
        notificationPublisher.notify(NotificationPublisher.DEVIATION,
                "Deviation id " + saved.getDeviationId() + " was created");
        return toResponse(saved);
    }

    @Transactional(readOnly = true)
    public List<DeviationRecordResponse> getAll() {
        logger.info("Executing getAll");
        List<DeviationRecord> deviations = deviationRepository.findAll();
        return deviations.stream().map(this::toResponse).toList();
    }

    @Transactional(readOnly = true)
    public DeviationRecordResponse getById(String deviationId) {
        logger.info("Executing getById with deviationId: {}", deviationId);
        return toResponse(findOrThrow(deviationId));
    }

    public DeviationRecordResponse update(DeviationRecordRequest request) {
        logger.info("Executing update with deviationId: {}", request.getDeviationId());
        DeviationRecord deviation = findOrThrow(request.getDeviationId());
        apply(deviation, request);
        if (StringUtils.hasText(request.getStatus())) {
            deviation.setStatus(request.getStatus());
        }
        DeviationRecord updated = deviationRepository.save(deviation);
        notificationPublisher.notify(NotificationPublisher.DEVIATION,
                "Deviation id " + updated.getDeviationId() + " status changed to " + updated.getStatus());
        return toResponse(updated);
    }

    public void updateStatus(String deviationId, String newStatus) {
        logger.info("Executing updateStatus with deviationId: {}, newStatus: {}", deviationId, newStatus);
        DeviationRecord deviation = findOrThrow(deviationId);
        String currentStatus = toShortStatus(deviation.getStatus());
        String targetStatus = toShortStatus(newStatus);
        List<String> allowed = TRANSITIONS.getOrDefault(currentStatus, List.of());
        if (!allowed.contains(targetStatus)) {
            throw new InvalidStatusTransitionException(
                    "Status transition not allowed: " + currentStatus + " -> " + targetStatus);
        }
        deviation.setStatus(targetStatus);
        DeviationRecord updated = deviationRepository.save(deviation);
        notificationPublisher.notify(NotificationPublisher.DEVIATION,
                "Deviation id " + updated.getDeviationId() + " status changed to " + updated.getStatus());
    }

    public void delete(String deviationId) {
        logger.info("Executing delete with deviationId: {}", deviationId);
        DeviationRecord deviation = findOrThrow(deviationId);
        if (capaRepository.existsByDeviationId(deviationId)) {
            throw new InvalidStatusTransitionException(
                    "Cannot delete deviation with linked CAPA records: " + deviationId);
        }
        deviationRepository.delete(deviation);
    }

    private void apply(DeviationRecord deviation, DeviationRecordRequest request) {
        // Store the related entity type/id exactly as supplied by the client.
        deviation.setRelatedEntityType(request.getRelatedEntityType());
        deviation.setRelatedEntityId(request.getRelatedEntityId());
        deviation.setDescription(request.getDescription());
        deviation.setDetectedById(request.getDetectedById());
        deviation.setDetectionDate(request.getDetectionDate() != null
                ? request.getDetectionDate() : java.time.LocalDate.now());
        deviation.setImpact(request.getImpact());
    }

    private DeviationRecord findOrThrow(String deviationId) {
        return deviationRepository.findById(deviationId)
                .orElseThrow(() -> new ResourceNotFoundException("DeviationRecord", deviationId));
    }

    private DeviationRecordResponse toResponse(DeviationRecord d) {
        return new DeviationRecordResponse(
                d.getDeviationId(),
                d.getRelatedEntityType(),
                d.getRelatedEntityId(),
                d.getDescription(),
                d.getDetectedById(),
                d.getDetectionDate(),
                d.getImpact(),
                d.getStatus());
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
