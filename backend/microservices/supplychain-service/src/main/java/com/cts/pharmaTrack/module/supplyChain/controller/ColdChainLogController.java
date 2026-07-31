package com.cts.pharmaTrack.module.supplyChain.controller;

import com.cts.pharmaTrack.module.supplyChain.dto.ColdChainLogRequestDTO;
import com.cts.pharmaTrack.module.supplyChain.entity.ColdChainLog;
import com.cts.pharmaTrack.module.supplyChain.service.ColdChainLogService;
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
public class ColdChainLogController {

    @Autowired
    private ColdChainLogService coldChainLogService;

    @PostMapping("/recordTemperatureLog")
    public ResponseEntity<Map<String, Object>> recordTemperatureLog(
            @RequestBody ColdChainLogRequestDTO dto) {
        log.info("POST /recordTemperatureLog request received");
        coldChainLogService.recordTemperatureLog(dto);
        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(Map.of("message", "Temperature log recorded successfully"));
    }

    @GetMapping("/fetchAllLogs")
public ResponseEntity<Map<String, Object>> fetchAllLogs() {
    log.info("GET /fetchAllLogs request received");
    List<ColdChainLog> logs = coldChainLogService.fetchAllLogs();
    Map<String, Object> response = new LinkedHashMap<>();
    response.put("data", logs);
    return ResponseEntity.ok(response);
}

@GetMapping("/fetchLogById/{logId}")
public ResponseEntity<Map<String, Object>> fetchLogById(
        @PathVariable int logId) {
    log.info("GET /fetchLogById/{} request received", logId);
    ColdChainLog coldChainLog = coldChainLogService.fetchLogById(logId);
    Map<String, Object> response = new LinkedHashMap<>();
    response.put("data", coldChainLog);
    return ResponseEntity.ok(response);
}

@GetMapping("/fetchLogsByShipment/{shipmentId}")
public ResponseEntity<Map<String, Object>> fetchLogsByShipment(
        @PathVariable int shipmentId) {
    log.info("GET /fetchLogsByShipment/{} request received", shipmentId);
    List<ColdChainLog> logs = coldChainLogService.fetchLogsByShipment(shipmentId);
    Map<String, Object> response = new LinkedHashMap<>();
    response.put("data", logs);
    return ResponseEntity.ok(response);
}

@GetMapping("/fetchExcursionLogs")
public ResponseEntity<Map<String, Object>> fetchExcursionLogs() {
    log.info("GET /fetchExcursionLogs request received");
    List<ColdChainLog> logs = coldChainLogService.fetchExcursionLogs();
    Map<String, Object> response = new LinkedHashMap<>();
    response.put("data", logs);
    return ResponseEntity.ok(response);
}
}