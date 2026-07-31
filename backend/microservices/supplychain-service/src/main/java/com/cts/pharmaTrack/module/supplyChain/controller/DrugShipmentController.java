package com.cts.pharmaTrack.module.supplyChain.controller;

import com.cts.pharmaTrack.common.exception.BadRequestException;
import com.cts.pharmaTrack.module.supplyChain.dto.DrugShipmentRequestDTO;
import com.cts.pharmaTrack.module.supplyChain.entity.DrugShipment;
import com.cts.pharmaTrack.module.supplyChain.service.DrugShipmentService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/pharmaTrack/supplyColdManagement")
@Slf4j
public class DrugShipmentController {

    @Autowired
    private DrugShipmentService drugShipmentService;

    @PostMapping("/createShipment")
    public ResponseEntity<Map<String, Object>> createShipment(
            @RequestBody DrugShipmentRequestDTO dto) {
        log.info("POST /createShipment request received");
        drugShipmentService.createShipment(dto);
        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(Map.of("message", "Shipment created successfully"));
    }

    @GetMapping("/fetchAllShipments")
public ResponseEntity<Map<String, Object>> fetchAllShipments() {
    log.info("GET /fetchAllShipments request received");
    List<DrugShipment> shipments = drugShipmentService.fetchAllShipments();
    Map<String, Object> response = new LinkedHashMap<>();
    response.put("data", shipments);
    return ResponseEntity.ok(response);
}

@GetMapping("/fetchShipmentById/{shipmentId}")
public ResponseEntity<Map<String, Object>> fetchShipmentById(
        @PathVariable int shipmentId) {
    log.info("GET /fetchShipmentById/{} request received", shipmentId);
    DrugShipment shipment = drugShipmentService.fetchShipmentById(shipmentId);
    Map<String, Object> response = new LinkedHashMap<>();
    response.put("data", shipment);
    return ResponseEntity.ok(response);
}

@GetMapping("/fetchShipmentsByBatch/{batchId}")
public ResponseEntity<Map<String, Object>> fetchShipmentsByBatch(
        @PathVariable int batchId) {
    log.info("GET /fetchShipmentsByBatch/{} request received", batchId);
    List<DrugShipment> shipments = drugShipmentService.fetchShipmentsByBatch(batchId);
    Map<String, Object> response = new LinkedHashMap<>();
    response.put("data", shipments);
    return ResponseEntity.ok(response);
}

@GetMapping("/fetchShipmentsBySite/{siteId}")
public ResponseEntity<Map<String, Object>> fetchShipmentsBySite(
        @PathVariable int siteId) {
    log.info("GET /fetchShipmentsBySite/{} request received", siteId);
    List<DrugShipment> shipments = drugShipmentService.fetchShipmentsBySite(siteId);
    Map<String, Object> response = new LinkedHashMap<>();
    response.put("data", shipments);
    return ResponseEntity.ok(response);
}

@GetMapping("/fetchShipmentsByStatus/{status}")
public ResponseEntity<Map<String, Object>> fetchShipmentsByStatus(
        @PathVariable String status) {
    log.info("GET /fetchShipmentsByStatus/{} request received", status);
    List<DrugShipment> shipments = drugShipmentService.fetchShipmentsByStatus(status);
    Map<String, Object> response = new LinkedHashMap<>();
    response.put("data", shipments);
    return ResponseEntity.ok(response);
}

@PutMapping("/updateShipment/{shipmentId}")
public ResponseEntity<Map<String, Object>> updateShipment(
        @PathVariable int shipmentId,
        @RequestBody DrugShipmentRequestDTO dto) {
    log.info("PUT /updateShipment/{} request received", shipmentId);
    drugShipmentService.updateShipment(shipmentId, dto);
    Map<String, Object> response = new LinkedHashMap<>();
    response.put("message", "Shipment updated successfully");
    return ResponseEntity.ok(response);
}

@PutMapping("/updateShipmentStatus/{shipmentId}")
public ResponseEntity<Map<String, Object>> updateShipmentStatus(
        @PathVariable int shipmentId,
        @RequestBody Map<String, String> body) {
    log.info("PUT /updateShipmentStatus/{} request received", shipmentId);
    String status = body.get("status");
    if (status == null || status.isEmpty()) {
        throw new BadRequestException("Status is required");
    }
    drugShipmentService.updateShipmentStatus(shipmentId, status);
    Map<String, Object> response = new LinkedHashMap<>();
    response.put("message", "Shipment status updated successfully");
    return ResponseEntity.ok(response);
}
}