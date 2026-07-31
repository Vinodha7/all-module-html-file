package com.cts.pharmaTrack.module.subjectEnrolment.controller;

// returning plain message strings for mutating endpoints
import java.util.List;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.cts.pharmaTrack.module.subjectEnrolment.dto.TrialSubjectRequest;
import com.cts.pharmaTrack.module.subjectEnrolment.dto.TrialSubjectResponse;
import com.cts.pharmaTrack.module.subjectEnrolment.service.TrialSubjectService;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/pharmaTrack/subjectEnrolment")
@RequiredArgsConstructor
public class TrialSubjectController {

    private static final Logger logger = LoggerFactory.getLogger(TrialSubjectController.class);
    private final TrialSubjectService subjectService;

        @PostMapping("/createTrials")
        public ResponseEntity<String> create(
            @Valid @RequestBody TrialSubjectRequest request) {
        logger.info("POST /createTrials request received with subjectId: {}", request.getSubjectId());
        subjectService.create(request);
        return ResponseEntity.status(HttpStatus.CREATED)
            .body("Subject created successfully");
        }

    @GetMapping("/fetchTrials")
    public ResponseEntity<List<TrialSubjectResponse>> fetchAll() {
        logger.info("GET /fetchTrials request received");
        return ResponseEntity.ok(subjectService.getAll());
    }

    @GetMapping("/fetchTrialById")
    public ResponseEntity<TrialSubjectResponse> fetchById(
            @RequestParam Integer subjectId) {
        logger.info("GET /fetchTrialById request received with subjectId: {}", subjectId);
        return ResponseEntity.ok(subjectService.getById(subjectId));
    }

    @PutMapping("/updateTrials")
    public ResponseEntity<String> update(
            @Valid @RequestBody TrialSubjectRequest request) {
        logger.info("PUT /updateTrials request received with subjectId: {}", request.getSubjectId());
        subjectService.update(request);
        return ResponseEntity.ok("Subject updated successfully");
    }

    
}
