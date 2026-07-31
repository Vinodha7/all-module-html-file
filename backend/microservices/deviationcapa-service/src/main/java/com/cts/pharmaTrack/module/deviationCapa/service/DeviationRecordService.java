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

    private final com.cts.pharmaTrack.module.deviationCapa.external.ClinicalTrialRepository clinicalTrialRepository;
    private final com.cts.pharmaTrack.module.deviationCapa.external.BatchRecordRepository batchRecordRepository;
    private final com.cts.pharmaTrack.module.deviationCapa.external.DrugShipmentRepository drugShipmentRepository;

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
                ? toShortStatus(request.getStatus()) : DEFAULT_STATUS);
        DeviationRecord saved = deviationRepository.save(deviation);
        notificationPublisher.notify(NotificationPublisher.DEVIATION,
                "Deviation id " + saved.getDeviationId() + " was created");
        return toResponse(saved);
    }

    @Transactional(readOnly = true)
    public List<DeviationRecordResponse> getAll() {
        logger.info("Executing getAll");
        List<DeviationRecord> deviations = deviationRepository.findAll();
        if (deviations.isEmpty()) {
            throw new ResourceNotFoundException("No deviation records found");
        }
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
            deviation.setStatus(toShortStatus(request.getStatus()));
        }
        DeviationRecord updated = deviationRepository.save(deviation);
        notificationPublisher.notify(NotificationPublisher.DEVIATION,
                "Deviation id " + updated.getDeviationId() + " status changed to " + updated.getStatus());
        return toResponse(updated);
    }

    @Transactional(readOnly = true)
    public List<DeviationRecordResponse> getByEntity(String relatedEntityType, String relatedEntityId) {
        logger.info("Executing getByEntity with entityType: {}, entityId: {}", relatedEntityType, relatedEntityId);
        String dbId = relatedEntityId;
        if ("Trial".equals(relatedEntityType)) {
            dbId = clinicalTrialRepository.findByTrialCode(relatedEntityId)
                    .map(t -> String.valueOf(t.getTrialId()))
                    .orElse(relatedEntityId);
        } else if ("Batch".equals(relatedEntityType)) {
            dbId = batchRecordRepository.findByBatchNumber(relatedEntityId)
                    .map(b -> String.valueOf(b.getBatchId()))
                    .orElse(relatedEntityId);
        } else if ("Shipment".equals(relatedEntityType)) {
            dbId = drugShipmentRepository.findFirstByBatchBatchNumber(relatedEntityId)
                    .map(s -> String.valueOf(s.getShipmentId()))
                    .orElse(relatedEntityId);
        }
        List<DeviationRecord> deviations = deviationRepository.findByRelatedEntityTypeAndRelatedEntityId(
                relatedEntityType, dbId);
        if (deviations.isEmpty()) {
            throw new ResourceNotFoundException("No deviation records found for entity: " + relatedEntityId);
        }
        return deviations.stream().map(this::toResponse).toList();
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
        String type = request.getRelatedEntityType();
        if (!List.of("Trial", "Batch", "Shipment").contains(type)) {
            throw new IllegalArgumentException("Invalid relatedEntityType: " + type + ". Must be Trial, Batch, or Shipment");
        }
        deviation.setRelatedEntityType(type);

        String displayId = request.getRelatedEntityId();
        String dbId = null;
        if ("Trial".equals(type)) {
            var trial = clinicalTrialRepository.findByTrialCode(displayId)
                    .orElseThrow(() -> new ResourceNotFoundException("Trial not found with code: " + displayId));
            dbId = String.valueOf(trial.getTrialId());
        } else if ("Batch".equals(type)) {
            var batch = batchRecordRepository.findByBatchNumber(displayId)
                    .orElseThrow(() -> new ResourceNotFoundException("Batch not found with number: " + displayId));
            dbId = String.valueOf(batch.getBatchId());
        } else if ("Shipment".equals(type)) {
            var shipment = drugShipmentRepository.findFirstByBatchBatchNumber(displayId)
                    .orElseThrow(() -> new ResourceNotFoundException("Shipment not found for batch number: " + displayId));
            dbId = String.valueOf(shipment.getShipmentId());
        }
        deviation.setRelatedEntityId(dbId);

        deviation.setDescription(request.getDescription());
        deviation.setDetectedById(request.getDetectedById());
        deviation.setDetectionDate(java.time.LocalDate.now());
        deviation.setImpact(request.getImpact());
    }

    private DeviationRecord findOrThrow(String deviationId) {
        return deviationRepository.findById(deviationId)
                .orElseThrow(() -> new ResourceNotFoundException("DeviationRecord", deviationId));
    }

    private DeviationRecordResponse toResponse(DeviationRecord d) {
        String dbId = d.getRelatedEntityId();
        String displayId = dbId;
        if (dbId != null) {
            try {
                int id = Integer.parseInt(dbId);
                if ("Trial".equals(d.getRelatedEntityType())) {
                    displayId = clinicalTrialRepository.findById(id)
                            .map(t -> t.getTrialCode())
                            .orElse(dbId);
                } else if ("Batch".equals(d.getRelatedEntityType())) {
                    displayId = batchRecordRepository.findById(id)
                            .map(b -> b.getBatchNumber())
                            .orElse(dbId);
                } else if ("Shipment".equals(d.getRelatedEntityType())) {
                    displayId = drugShipmentRepository.findById(id)
                            .map(s -> s.getBatch().getBatchNumber())
                            .orElse(dbId);
                }
            } catch (NumberFormatException e) {
                // Keep dbId as is
            }
        }
        return new DeviationRecordResponse(
                d.getDeviationId(),
                d.getRelatedEntityType(),
                displayId,
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
