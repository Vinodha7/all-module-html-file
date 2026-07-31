package com.cts.pharmaTrack.module.supplyChain.controller;

import com.cts.pharmaTrack.module.supplyChain.dto.SiteInventoryRequestDTO;
import com.cts.pharmaTrack.module.supplyChain.entity.SiteInventory;
import com.cts.pharmaTrack.module.supplyChain.service.SiteInventoryService;
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
public class SiteInventoryController {

    @Autowired
    private SiteInventoryService siteInventoryService;

    @PostMapping("/createInventory")
    public ResponseEntity<Map<String, Object>> createInventory(
            @RequestBody SiteInventoryRequestDTO dto) {
        log.info("POST /createInventory request received");
        siteInventoryService.createInventory(dto);
        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(Map.of("message", "Inventory record created successfully"));
    }

   @GetMapping("/fetchAllInventory")
public ResponseEntity<Map<String, Object>> fetchAllInventory() {
    log.info("GET /fetchAllInventory request received");
    List<SiteInventory> inventories = siteInventoryService.fetchAllInventory();
    Map<String, Object> response = new LinkedHashMap<>();
    response.put("data", inventories);
    return ResponseEntity.ok(response);
}

@GetMapping("/fetchInventoryById/{inventoryId}")
public ResponseEntity<Map<String, Object>> fetchInventoryById(
        @PathVariable int inventoryId) {
    log.info("GET /fetchInventoryById/{} request received", inventoryId);
    SiteInventory inventory = siteInventoryService.fetchInventoryById(inventoryId);
    Map<String, Object> response = new LinkedHashMap<>();
    response.put("data", inventory);
    return ResponseEntity.ok(response);
}

@GetMapping("/fetchInventoryBySite/{siteId}")
public ResponseEntity<Map<String, Object>> fetchInventoryBySite(
        @PathVariable int siteId) {
    log.info("GET /fetchInventoryBySite/{} request received", siteId);
    List<SiteInventory> inventories = siteInventoryService.fetchInventoryBySite(siteId);
    Map<String, Object> response = new LinkedHashMap<>();
    response.put("data", inventories);
    return ResponseEntity.ok(response);
}

@GetMapping("/fetchInventoryByBatch/{batchId}")
public ResponseEntity<Map<String, Object>> fetchInventoryByBatch(
        @PathVariable int batchId) {
    log.info("GET /fetchInventoryByBatch/{} request received", batchId);
    List<SiteInventory> inventories = siteInventoryService.fetchInventoryByBatch(batchId);
    Map<String, Object> response = new LinkedHashMap<>();
    response.put("data", inventories);
    return ResponseEntity.ok(response);
}

@PutMapping("/updateReceivedQuantity/{inventoryId}")
public ResponseEntity<Map<String, Object>> updateReceivedQuantity(
        @PathVariable int inventoryId,
        @RequestBody SiteInventoryRequestDTO dto) {
    log.info("PUT /updateReceivedQuantity/{} request received", inventoryId);
    siteInventoryService.updateReceivedQuantity(inventoryId, dto);
    Map<String, Object> response = new LinkedHashMap<>();
    response.put("message", "Quantity received updated successfully");
    return ResponseEntity.ok(response);
}

@PutMapping("/updateDispensedQuantity/{inventoryId}")
public ResponseEntity<Map<String, Object>> updateDispensedQuantity(
        @PathVariable int inventoryId,
        @RequestBody SiteInventoryRequestDTO dto) {
    log.info("PUT /updateDispensedQuantity/{} request received", inventoryId);
    siteInventoryService.updateDispensedQuantity(inventoryId, dto);
    Map<String, Object> response = new LinkedHashMap<>();
    response.put("message", "Quantity dispensed updated successfully");
    return ResponseEntity.ok(response);
}
}