package com.cts.pharmaTrack.module.clinicalTrial.controller;

import com.cts.pharmaTrack.module.clinicalTrial.dto.request.TrialProtocolRequestDTO;
import com.cts.pharmaTrack.module.clinicalTrial.dto.response.TrialProtocolResponseDTO;
import com.cts.pharmaTrack.module.clinicalTrial.service.TrialProtocolService;
import com.cts.pharmaTrack.common.workflow.RecordLifecycleHistory;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/pharmaTrack/trialProtocol")
public class TrialProtocolController {

    private static final Logger logger =
            LoggerFactory.getLogger(TrialProtocolController.class);

    @Autowired
    private TrialProtocolService trialProtocolService;

    //CREATE PROTOCOL 

    @PostMapping("/createProtocol/{trialId}")
    public ResponseEntity<Map<String, String>> createProtocol(
            @PathVariable int trialId,
            @RequestBody TrialProtocolRequestDTO request) {
        logger.info("POST /createProtocol called for trialId: {}",
                trialId);
        trialProtocolService.createProtocol(trialId, request);
        return ResponseEntity.status(201)
                .body(Map.of("message",
                        "Protocol created successfully"));
    }

    //GET ALL PROTOCOLS

    @GetMapping("/getAllProtocols/{trialId}")
    public ResponseEntity<List<TrialProtocolResponseDTO>> getAllProtocols(
            @PathVariable int trialId) {
        logger.info("GET /getAllProtocols called for trialId: {}",
                trialId);
        List<TrialProtocolResponseDTO> response =
                trialProtocolService.getAllProtocols(trialId);
        return ResponseEntity.status(200).body(response);
    }

    //GET PROTOCOL BY ID

    @GetMapping("/getProtocolById/{trialId}/{protocolId}")
    public ResponseEntity<TrialProtocolResponseDTO> getProtocolById(
            @PathVariable int trialId,
            @PathVariable int protocolId) {
        logger.info(
                "GET /getProtocolById called for trialId: {}" +
                " protocolId: {}", trialId, protocolId);
        TrialProtocolResponseDTO response =
                trialProtocolService.getProtocolById(
                        trialId, protocolId);
        return ResponseEntity.status(200).body(response);
    }

    //UPDATE PROTOCOL

    @PutMapping("/updateProtocol/{trialId}/{protocolId}")
    public ResponseEntity<Map<String, String>> updateProtocol(
            @PathVariable int trialId,
            @PathVariable int protocolId,
            @RequestBody TrialProtocolRequestDTO request) {
        logger.info(
                "PUT /updateProtocol called for trialId: {}" +
                " protocolId: {}", trialId, protocolId);
        trialProtocolService.updateProtocol(
                trialId, protocolId, request);
        return ResponseEntity.status(200)
                .body(Map.of("message",
                        "Protocol updated successfully"));
    }

    //UPDATE PROTOCOL STATUS

    @PutMapping("/updateProtocolStatus/{trialId}/{protocolId}")
    public ResponseEntity<Map<String, String>> updateProtocolStatus(
            @PathVariable int trialId,
            @PathVariable int protocolId,
            @RequestBody Map<String, String> requestBody) {
        logger.info(
                "PUT /updateProtocolStatus called for trialId: {}" +
                " protocolId: {}", trialId, protocolId);
        String newStatus = requestBody.get("status");
        if (newStatus == null || newStatus.trim().isEmpty()) {
            logger.error("Status is missing in request body");
            throw new IllegalArgumentException(
                    "Status is mandatory");
        }
        trialProtocolService.updateProtocolStatus(
                trialId, protocolId, newStatus.trim());
        return ResponseEntity.status(200)
                .body(Map.of("message",
                        "Protocol status updated successfully"));
    }

    //GET PROTOCOL LIFECYCLE HISTORY (Wave 4)

    @GetMapping("/getProtocolHistory/{trialId}/{protocolId}")
    public ResponseEntity<List<RecordLifecycleHistory>> getProtocolHistory(
            @PathVariable int trialId,
            @PathVariable int protocolId) {
        logger.info(
                "GET /getProtocolHistory called for trialId: {}" +
                " protocolId: {}", trialId, protocolId);
        return ResponseEntity.status(200)
                .body(trialProtocolService.getProtocolHistory(trialId, protocolId));
    }
}