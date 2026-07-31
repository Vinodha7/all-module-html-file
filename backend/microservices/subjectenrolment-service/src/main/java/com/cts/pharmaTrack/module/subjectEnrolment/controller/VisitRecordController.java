package com.cts.pharmaTrack.module.subjectEnrolment.controller;

import java.util.List;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.cts.pharmaTrack.module.subjectEnrolment.dto.VisitRecordRequest;
import com.cts.pharmaTrack.module.subjectEnrolment.dto.VisitRecordResponse;
import com.cts.pharmaTrack.module.subjectEnrolment.service.VisitRecordService;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/pharmaTrack/subjectEnrolment")
@RequiredArgsConstructor
public class VisitRecordController {

    private static final Logger logger = LoggerFactory.getLogger(VisitRecordController.class);
    private final VisitRecordService visitService;

    @PostMapping("/createVisits")
        public ResponseEntity<String> create(
            @Valid @RequestBody VisitRecordRequest request) {
        logger.info("POST /createVisits request received with visitId: {}", request.getVisitId());
        visitService.create(request);
        return ResponseEntity.status(HttpStatus.CREATED)
            .body("Visit created successfully");
    }

    @GetMapping("/fetchVisits")
    public ResponseEntity<List<VisitRecordResponse>> fetchAll() {
        logger.info("GET /fetchVisits request received");
        return ResponseEntity.ok(visitService.getAll());
    }

    @GetMapping("/fetchVisitById")
    public ResponseEntity<VisitRecordResponse> fetchById(
            @RequestParam String visitId) {
        logger.info("GET /fetchVisitById request received with visitId: {}", visitId);
        return ResponseEntity.ok(visitService.getById(visitId));
    }

    @GetMapping("/fetchVisitsBySubjectId")
    public ResponseEntity<List<VisitRecordResponse>> fetchBySubjectId(
            @RequestParam Integer subjectId) {
        logger.info("GET /fetchVisitsBySubjectId request received with subjectId: {}", subjectId);
        return ResponseEntity.ok(visitService.getBySubjectId(subjectId));
    }

    @PutMapping("/updateVisits")
        public ResponseEntity<String> update(
                @Valid @RequestBody VisitRecordRequest request) {
            logger.info("PUT /updateVisits request received with visitId: {}", request.getVisitId());
            visitService.update(request);
            return ResponseEntity.ok("Visit updated successfully");
    }

    
}
