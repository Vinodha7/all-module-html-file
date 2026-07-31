package com.cts.pharmaTrack.module
    .batchManufacturing.controller;

import com.cts.pharmaTrack.module
    .batchManufacturing.dto.BatchRecordRequest;
import com.cts.pharmaTrack.module
    .batchManufacturing.dto.MessageResponse;
import com.cts.pharmaTrack.module
    .batchManufacturing.dto.BatchRecordResponse;
import com.cts.pharmaTrack.module
    .batchManufacturing.service.BatchRecordService;
import jakarta.validation.Valid;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/pharmaTrack/batchManufacturing")
@CrossOrigin(origins = "http://localhost:4200")
public class BatchRecordController {
    private static final Logger logger = LoggerFactory.getLogger(BatchRecordController.class);

    private final BatchRecordService service;

    public BatchRecordController(BatchRecordService service) {
        this.service = service;
    }

    @PostMapping("/createBatch")
    public ResponseEntity<?> createBatch(
            @Valid @RequestBody BatchRecordRequest batch) {
        logger.info("POST /createBatch request received with batchNumber: {}", batch.getBatchNumber());
        service.createBatch(batch);
        return ResponseEntity
            .status(HttpStatus.CREATED)
            .body(new MessageResponse(
                "Batch created successfully"));
    }

    @GetMapping("/retrieveBatches")
    public ResponseEntity<List<BatchRecordResponse>>
            retrieveBatches() {
        logger.info("GET /retrieveBatches request received");
        return ResponseEntity.ok(
            service.retrieveBatches());
    }

    @GetMapping("/retrieveBatchById/{batch_id}")
    public ResponseEntity<BatchRecordResponse>
            retrieveBatchById(
            @PathVariable("batch_id") int batchId) {
        logger.info("GET /retrieveBatchById/{} request received with batchId: {}", batchId, batchId);
        return ResponseEntity.ok(
            service.retrieveBatchById(batchId));
    }

    @PutMapping("/updateBatch/{batch_id}")
    public ResponseEntity<?> updateBatch(
            @PathVariable("batch_id") int batchId,
            @Valid @RequestBody BatchRecordRequest batch) {
        logger.info("PUT /updateBatch/{} request received with batchId: {}", batchId, batchId);
        service.updateBatch(batchId, batch);
        return ResponseEntity.ok(Map.of("message",
            "Batch updated successfully"));
    }

    @PutMapping("/updateBatchStatus/{batch_id}")
    public ResponseEntity<?> updateBatchStatus(
            @PathVariable("batch_id") int batchId,
            @RequestBody Map<String, String> body) {
        logger.info("PUT /updateBatchStatus/{} request received with batchId: {}", batchId, batchId);
        service.updateBatchStatus(
            batchId, body.get("status"));
        return ResponseEntity.ok(Map.of("message",
            "Status updated successfully"));
    }
}
