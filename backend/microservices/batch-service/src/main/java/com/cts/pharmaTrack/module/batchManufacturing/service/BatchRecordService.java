package com.cts.pharmaTrack.module
    .batchManufacturing.service;

import com.cts.pharmaTrack.common.exception
    .DuplicateBatchException;
import com.cts.pharmaTrack.common.exception
    .InvalidStatusTransitionException;
import com.cts.pharmaTrack.common.exception
    .ResourceNotFoundException;
import com.cts.pharmaTrack.module
    .batchManufacturing.dto.BatchRecordRequest;
import com.cts.pharmaTrack.module
    .batchManufacturing.dto.BatchRecordResponse;
import com.cts.pharmaTrack.module
    .batchManufacturing.entity.BatchRecord;
import com.cts.pharmaTrack.module
    .batchManufacturing.repository
    .BatchRecordRepository;
import com.cts.pharmaTrack.common.notification
    .NotificationPublisher;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Service
public class BatchRecordService {
    private static final Logger logger = LoggerFactory.getLogger(BatchRecordService.class);

    private final BatchRecordRepository repository;
    private final NotificationPublisher notificationPublisher;

    public BatchRecordService(BatchRecordRepository repository,
            NotificationPublisher notificationPublisher) {
        this.repository = repository;
        this.notificationPublisher = notificationPublisher;
    }

    private static final Map<String, List<String>>
        TRANSITIONS = new HashMap<>();
    static {
        TRANSITIONS.put("IP",  List.of("QCH"));
        TRANSITIONS.put("QCH", List.of("REL", "REJ"));
        TRANSITIONS.put("REL", List.of("RCL"));
        TRANSITIONS.put("REJ", List.of("DEL"));
        TRANSITIONS.put("RCL", List.of("DEL"));
    }

    public List<BatchRecordResponse> retrieveBatches() {
        logger.info("Executing retrieveBatches");
        List<BatchRecord> batches = repository.findAll();
        return batches.stream()
            .map(this::toResponse)
            .toList();
    }

    public BatchRecordResponse retrieveBatchById(
            int id) {
        logger.info("Executing retrieveBatchById with id: {}", id);
        return toResponse(findOrThrow(id));
    }

    private String getLoggedInUserId() {
        var auth = org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.getPrincipal() instanceof com.cts.pharmaTrack.common.security.SignedPrincipal principal) {
            return String.valueOf(principal.getUserId());
        }
        return null;
    }

    private String getLoggedInUserName() {
        var auth = org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.getPrincipal() instanceof com.cts.pharmaTrack.common.security.SignedPrincipal principal) {
            return principal.getDisplayName();
        }
        return null;
    }

    public void createBatch(BatchRecordRequest request) {
        logger.info("Executing createBatch with batchNumber: {}", request.getBatchNumber());
        Optional<BatchRecord> existing =
            repository.findByBatchNumber(
                request.getBatchNumber());
        if (existing.isPresent()) {
            throw new DuplicateBatchException(
                "Batch number already exists: "
                + request.getBatchNumber());
        }
        BatchRecord batch = new BatchRecord();
        apply(batch, request);
        batch.setStatus("InProgress");
        batch.setSupervisorName(getLoggedInUserName());
        String loggedInId = getLoggedInUserId();
        if (loggedInId != null) {
            batch.setManufacturingSiteId(Integer.parseInt(loggedInId));
        } else if (request.getManufacturingSiteId() != null) {
            batch.setManufacturingSiteId(request.getManufacturingSiteId());
        }
        BatchRecord saved = repository.save(batch);
        notificationPublisher.notify(NotificationPublisher.BATCH,
            "Batch " + saved.getBatchNumber()
            + " (id " + saved.getBatchId() + ") was created");
    }

    public void updateBatch(
            int id, BatchRecordRequest request) {
        logger.info("Executing updateBatch with id: {}", id);
        BatchRecord existing = findOrThrow(id);
        apply(existing, request);
        if (request.getManufacturingSiteId() != null) {
            existing.setManufacturingSiteId(request.getManufacturingSiteId());
        }
        BatchRecord updated = repository.save(existing);
        notificationPublisher.notify(NotificationPublisher.BATCH,
            "Batch id " + updated.getBatchId() + " was updated");
    }

    public void updateBatchStatus(
            int id, String newStatus) {
        logger.info("Executing updateBatchStatus with id: {} and newStatus: {}", id, newStatus);
        BatchRecord existing = findOrThrow(id);
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
        BatchRecord updated = repository.save(existing);
        notificationPublisher.notify(NotificationPublisher.BATCH,
            "Batch id " + updated.getBatchId()
            + " status changed to " + updated.getStatus());
    }

    private BatchRecord findOrThrow(int id) {
        return repository.findById(id)
            .orElseThrow(() ->
                new ResourceNotFoundException(
                    "BatchRecord", id));
    }

    private void apply(BatchRecord batch,
            BatchRecordRequest request) {
        batch.setProductId(request.getProductId());
        batch.setBatchNumber(request.getBatchNumber());
        batch.setManufacturingDate(
            request.getManufacturingDate());
        batch.setExpiryDate(request.getExpiryDate());
        batch.setQuantityManufactured(
            request.getQuantityManufactured());
        batch.setUnit(request.getUnit());
        // Honour a status supplied by the client on update (Send/QC review).
        if (request.getStatus() != null && !request.getStatus().isBlank()) {
            batch.setStatus(request.getStatus());
        }
    }

    private BatchRecordResponse toResponse(
            BatchRecord b) {
        return new BatchRecordResponse(
            b.getBatchId(),
            b.getProductId(),
            b.getBatchNumber(),
            b.getManufacturingDate(),
            b.getExpiryDate(),
            b.getQuantityManufactured(),
            b.getUnit(),
            b.getManufacturingSiteId(),
            b.getStatus(),
            b.getSupervisorName());
    }
}
