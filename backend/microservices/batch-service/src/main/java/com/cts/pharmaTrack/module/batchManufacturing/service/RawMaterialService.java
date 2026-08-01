package com.cts.pharmaTrack.module
    .batchManufacturing.service;

import com.cts.pharmaTrack.common.exception
    .InvalidStatusTransitionException;
import com.cts.pharmaTrack.common.exception
    .ResourceNotFoundException;
import com.cts.pharmaTrack.module
    .batchManufacturing.dto.RawMaterialUsageRequest;
import com.cts.pharmaTrack.module
    .batchManufacturing.dto.RawMaterialUsageResponse;
import com.cts.pharmaTrack.module
    .batchManufacturing.entity.RawMaterialUsage;
import com.cts.pharmaTrack.module
    .batchManufacturing.repository
    .RawMaterialRepository;
import com.cts.pharmaTrack.common.notification
    .NotificationPublisher;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class RawMaterialService {
    private static final Logger logger = LoggerFactory.getLogger(RawMaterialService.class);

    private final RawMaterialRepository repository;
    private final NotificationPublisher notificationPublisher;

    public RawMaterialService(RawMaterialRepository repository,
            NotificationPublisher notificationPublisher) {
        this.repository = repository;
        this.notificationPublisher = notificationPublisher;
    }

    private static final Map<String, List<String>>
        TRANSITIONS = new HashMap<>();
    static {
        TRANSITIONS.put("CON", List.of("QRN", "DEL"));
        TRANSITIONS.put("QRN", List.of("CON", "DEL"));
    }

    public List<RawMaterialUsageResponse>
            retrieveRawMaterials() {
        logger.info("Executing retrieveRawMaterials");
        List<RawMaterialUsage> materials =
            repository.findAll();
        if (materials.isEmpty()) {
            throw new ResourceNotFoundException(
                "No materials found");
        }
        return materials.stream()
            .map(this::toResponse)
            .toList();
    }

    public RawMaterialUsageResponse
            retrieveRawMaterialById(int id) {
        logger.info("Executing retrieveRawMaterialById with id: {}", id);
        return toResponse(findOrThrow(id));
    }

    public List<RawMaterialUsageResponse>
            retrieveRawMaterialByBatchId(int batchId) {
        logger.info("Executing retrieveRawMaterialByBatchId with batchId: {}", batchId);
        List<RawMaterialUsage> materials =
            repository.findByBatchId(batchId);
        if (materials.isEmpty()) {
            throw new ResourceNotFoundException(
                "No materials found for batch: "
                + batchId);
        }
        return materials.stream()
            .map(this::toResponse)
            .toList();
    }

    public void createRawMaterial(
            RawMaterialUsageRequest request) {
        logger.info("Executing createRawMaterial with materialName: {}", request.getMaterialName());
        RawMaterialUsage material = new RawMaterialUsage();
        apply(material, request);
        if (material.getStatus() == null || material.getStatus().isBlank()) {
            material.setStatus("Consumed");
        }
        RawMaterialUsage saved = repository.save(material);
        notificationPublisher.notify(NotificationPublisher.BATCH,
            "Raw material usage " + saved.getMaterialName()
            + " (id " + saved.getUsageId() + ") was recorded for batch "
            + saved.getBatchId());
    }

    public void updateRawMaterial(
            int id, RawMaterialUsageRequest request) {
        logger.info("Executing updateRawMaterial with id: {}", id);
        RawMaterialUsage existing = findOrThrow(id);
        apply(existing, request);
        RawMaterialUsage updated = repository.save(existing);
        notificationPublisher.notify(NotificationPublisher.BATCH,
            "Raw material usage id " + updated.getUsageId()
            + " was updated");
    }

    public void updateRawMaterialStatus(
            int id, String newStatus) {
        logger.info("Executing updateRawMaterialStatus with id: {} and newStatus: {}", id, newStatus);
        RawMaterialUsage existing = findOrThrow(id);
        String currentStatus = existing.getStatus();
        List<String> allowed =
            TRANSITIONS.getOrDefault(
                currentStatus, List.of());
        if (!allowed.contains(newStatus)) {
            throw new InvalidStatusTransitionException(
                "Status transition not allowed: "
                + currentStatus + " -> " + newStatus);
        }
        existing.setStatus(newStatus);
        RawMaterialUsage updated = repository.save(existing);
        notificationPublisher.notify(NotificationPublisher.BATCH,
            "Raw material usage id " + updated.getUsageId()
            + " status changed to " + updated.getStatus());
    }

    private RawMaterialUsage findOrThrow(int id) {
        return repository.findById(id)
            .orElseThrow(() ->
                new ResourceNotFoundException(
                    "RawMaterialUsage", id));
    }

    private void apply(RawMaterialUsage material,
            RawMaterialUsageRequest request) {
        material.setBatchId(request.getBatchId());
        material.setMaterialName(
            request.getMaterialName());
        material.setMaterialLotNumber(
            request.getMaterialLotNumber());
        material.setQuantityUsed(
            request.getQuantityUsed());
        material.setUnit(request.getUnit());
        if (request.getStatus() != null && !request.getStatus().isBlank()) {
            material.setStatus(request.getStatus());
        }
    }

    private RawMaterialUsageResponse toResponse(
            RawMaterialUsage m) {
        return new RawMaterialUsageResponse(
            m.getUsageId(),
            m.getBatchId(),
            m.getMaterialName(),
            m.getMaterialLotNumber(),
            m.getQuantityUsed(),
            m.getUnit(),
            m.getStatus());
    }
}
