package com.cts.pharmaTrack.module
    .batchManufacturing.service;

import com.cts.pharmaTrack.common.exception
    .InvalidStatusTransitionException;
import com.cts.pharmaTrack.common.exception
    .ResourceNotFoundException;
import com.cts.pharmaTrack.module
    .batchManufacturing.dto.QCTestRequest;
import com.cts.pharmaTrack.module
    .batchManufacturing.dto.QCTestResponse;
import com.cts.pharmaTrack.module
    .batchManufacturing.entity.QCTest;
import com.cts.pharmaTrack.module
    .batchManufacturing.repository.QCTestRepository;
import com.cts.pharmaTrack.common.notification
    .NotificationPublisher;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class QCTestService {
    private static final Logger logger = LoggerFactory.getLogger(QCTestService.class);

    private final QCTestRepository repository;
    private final NotificationPublisher notificationPublisher;

    public QCTestService(QCTestRepository repository,
            NotificationPublisher notificationPublisher) {
        this.repository = repository;
        this.notificationPublisher = notificationPublisher;
    }

    private static final Map<String, List<String>>
        TRANSITIONS = new HashMap<>();
    static {
        TRANSITIONS.put("RT", List.of("P", "F"));
        TRANSITIONS.put("F",  List.of("RT", "DEL"));
        TRANSITIONS.put("P",  List.of("DEL"));
    }

    public List<QCTestResponse> retrieveQCTests() {
        logger.info("Executing retrieveQCTests");
        List<QCTest> tests = repository.findAll();
        if (tests.isEmpty()) {
            throw new ResourceNotFoundException(
                "No tests found");
        }
        return tests.stream()
            .map(this::toResponse)
            .toList();
    }

    public QCTestResponse retrieveQCTestById(int id) {
        logger.info("Executing retrieveQCTestById with id: {}", id);
        return toResponse(findOrThrow(id));
    }

    public List<QCTestResponse> retrieveQCTestByBatchId(
            int batchId) {
        logger.info("Executing retrieveQCTestByBatchId with batchId: {}", batchId);
        List<QCTest> tests =
            repository.findByBatchId(batchId);
        if (tests.isEmpty()) {
            throw new ResourceNotFoundException(
                "No tests found for batch: " + batchId);
        }
        return tests.stream()
            .map(this::toResponse)
            .toList();
    }

    private String getLoggedInUserId() {
        var auth = org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.getPrincipal() instanceof com.cts.pharmaTrack.common.security.SignedPrincipal principal) {
            return String.valueOf(principal.getUserId());
        }
        return null;
    }

    public void createQCTest(QCTestRequest request) {
        logger.info("Executing createQCTest with testType: {}", request.getTestType());
        QCTest test = new QCTest();
        apply(test, request);
        test.setStatus("RT");
        String loggedInId = getLoggedInUserId();
        if (loggedInId != null) {
            test.setTestedById(Integer.parseInt(loggedInId));
        }
        QCTest saved = repository.save(test);
        notificationPublisher.notify(NotificationPublisher.BATCH,
            "QC test " + saved.getTestType()
            + " (id " + saved.getTestId() + ") was created for batch "
            + saved.getBatchId());
    }

    public void updateQCTest(
            int id, QCTestRequest request) {
        logger.info("Executing updateQCTest with id: {}", id);
        QCTest existing = findOrThrow(id);
        apply(existing, request);
        QCTest updated = repository.save(existing);
        notificationPublisher.notify(NotificationPublisher.BATCH,
            "QC test id " + updated.getTestId() + " was updated");
    }

    public void updateQCTestStatus(
            int id, String newStatus) {
        logger.info("Executing updateQCTestStatus with id: {} and newStatus: {}", id, newStatus);
        QCTest existing = findOrThrow(id);
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
        QCTest updated = repository.save(existing);
        notificationPublisher.notify(NotificationPublisher.BATCH,
            "QC test id " + updated.getTestId()
            + " status changed to " + updated.getStatus());
    }

    private QCTest findOrThrow(int id) {
        return repository.findById(id)
            .orElseThrow(() ->
                new ResourceNotFoundException(
                    "QCTest", id));
    }

    private void apply(QCTest test,
            QCTestRequest request) {
        test.setBatchId(request.getBatchId());
        test.setTestType(request.getTestType());
        if (request.getTestedById() != null) {
            test.setTestedById(request.getTestedById());
        }
        test.setTestDate(request.getTestDate());
        test.setResult(request.getResult());
        test.setSpecification(request.getSpecification());
    }

    private QCTestResponse toResponse(QCTest t) {
        return new QCTestResponse(
            t.getTestId(),
            t.getBatchId(),
            t.getTestType(),
            t.getTestedById(),
            t.getTestDate(),
            t.getResult(),
            t.getSpecification(),
            t.getStatus());
    }
}
