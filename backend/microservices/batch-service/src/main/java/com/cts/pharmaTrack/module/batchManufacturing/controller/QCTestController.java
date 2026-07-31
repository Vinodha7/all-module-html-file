package com.cts.pharmaTrack.module
    .batchManufacturing.controller;

import com.cts.pharmaTrack.module
    .batchManufacturing.dto.MessageResponse;
import com.cts.pharmaTrack.module
    .batchManufacturing.dto.QCTestRequest;
import com.cts.pharmaTrack.module
    .batchManufacturing.dto.QCTestResponse;
import com.cts.pharmaTrack.module
    .batchManufacturing.service.QCTestService;
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
public class QCTestController {
    private static final Logger logger = LoggerFactory.getLogger(QCTestController.class);

    private final QCTestService service;

    public QCTestController(QCTestService service) {
        this.service = service;
    }

    @PostMapping("/createQcTest")
    public ResponseEntity<?> createQCTest(
            @Valid @RequestBody QCTestRequest test) {
        logger.info("POST /createQcTest request received with testType: {}", test.getTestType());
        service.createQCTest(test);
        return ResponseEntity
            .status(HttpStatus.CREATED)
            .body(new MessageResponse(
                "QC Test created successfully"));
    }

    @GetMapping("/retrieveQcTests")
    public ResponseEntity<List<QCTestResponse>>
            retrieveQCTests() {
        logger.info("GET /retrieveQcTests request received");
        return ResponseEntity.ok(
            service.retrieveQCTests());
    }

    @GetMapping("/retrieveQcTestById/{test_id}")
    public ResponseEntity<QCTestResponse>
            retrieveQCTestById(
            @PathVariable("test_id") int testId) {
        logger.info("GET /retrieveQcTestById/{} request received with testId: {}", testId, testId);
        return ResponseEntity.ok(
            service.retrieveQCTestById(testId));
    }

    @GetMapping(
        "/retrieveQcTestByBatchId/{batch_id}")
    public ResponseEntity<List<QCTestResponse>>
            retrieveQCTestByBatchId(
            @PathVariable("batch_id") int batchId) {
        logger.info("GET /retrieveQcTestByBatchId/{} request received with batchId: {}", batchId, batchId);
        return ResponseEntity.ok(
            service.retrieveQCTestByBatchId(batchId));
    }

    @PutMapping("/updateQcTest/{test_id}")
    public ResponseEntity<?> updateQCTest(
            @PathVariable("test_id") int testId,
            @Valid @RequestBody QCTestRequest test) {
        logger.info("PUT /updateQcTest/{} request received with testId: {}", testId, testId);
        service.updateQCTest(testId, test);
        return ResponseEntity.ok(Map.of("message",
            "QC Test updated successfully"));
    }

    @PutMapping("/updateQcTestStatus/{test_id}")
    public ResponseEntity<?> updateQCTestStatus(
            @PathVariable("test_id") int testId,
            @RequestBody Map<String, String> body) {
        logger.info("PUT /updateQcTestStatus/{} request received with testId: {}", testId, testId);
        service.updateQCTestStatus(
            testId, body.get("status"));
        return ResponseEntity.ok(Map.of("message",
            "Status updated successfully"));
    }
}
