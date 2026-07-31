package com.cts.pharmaTrack.module
    .batchManufacturing.controller;

import com.cts.pharmaTrack.module
    .batchManufacturing.dto.MessageResponse;
import com.cts.pharmaTrack.module
    .batchManufacturing.dto.RawMaterialUsageRequest;
import com.cts.pharmaTrack.module
    .batchManufacturing.dto.RawMaterialUsageResponse;
import com.cts.pharmaTrack.module
    .batchManufacturing.service.RawMaterialService;
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
public class RawMaterialController {
    private static final Logger logger = LoggerFactory.getLogger(RawMaterialController.class);

    private final RawMaterialService service;

    public RawMaterialController(RawMaterialService service) {
        this.service = service;
    }

    @PostMapping("/createRawMaterial")
    public ResponseEntity<?> createRawMaterial(
            @Valid @RequestBody
            RawMaterialUsageRequest material) {
        logger.info("POST /createRawMaterial request received with materialName: {}", material.getMaterialName());
        service.createRawMaterial(material);
        return ResponseEntity
            .status(HttpStatus.CREATED)
            .body(new MessageResponse(
                "Material created successfully"));
    }

    @GetMapping("/retrieveRawMaterials")
    public ResponseEntity<List<RawMaterialUsageResponse>>
            retrieveRawMaterials() {
        logger.info("GET /retrieveRawMaterials request received");
        return ResponseEntity.ok(
            service.retrieveRawMaterials());
    }

    @GetMapping(
        "/retrieveRawMaterialById/{usage_id}")
    public ResponseEntity<RawMaterialUsageResponse>
            retrieveRawMaterialById(
            @PathVariable("usage_id") int usageId) {
        logger.info("GET /retrieveRawMaterialById/{} request received with usageId: {}", usageId, usageId);
        return ResponseEntity.ok(
            service.retrieveRawMaterialById(usageId));
    }

    @GetMapping(
        "/retrieveRawMaterialByBatchId/{batch_id}")
    public ResponseEntity<List<RawMaterialUsageResponse>>
            retrieveRawMaterialByBatchId(
            @PathVariable("batch_id") int batchId) {
        logger.info("GET /retrieveRawMaterialByBatchId/{} request received with batchId: {}", batchId, batchId);
        return ResponseEntity.ok(
            service.retrieveRawMaterialByBatchId(
                batchId));
    }

    @PutMapping("/updateRawMaterial/{usage_id}")
    public ResponseEntity<?> updateRawMaterial(
            @PathVariable("usage_id") int usageId,
            @Valid @RequestBody
            RawMaterialUsageRequest material) {
        logger.info("PUT /updateRawMaterial/{} request received with usageId: {}", usageId, usageId);
        service.updateRawMaterial(usageId, material);
        return ResponseEntity.ok(Map.of("message",
            "Material updated successfully"));
    }

    @PutMapping(
        "/updateRawMaterialStatus/{usage_id}")
    public ResponseEntity<?> updateRawMaterialStatus(
            @PathVariable("usage_id") int usageId,
            @RequestBody Map<String, String> body) {
        logger.info("PUT /updateRawMaterialStatus/{} request received with usageId: {}", usageId, usageId);
        service.updateRawMaterialStatus(
            usageId, body.get("status"));
        return ResponseEntity.ok(Map.of("message",
            "Status updated successfully"));
    }
}
