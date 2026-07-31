package com.cts.pharmaTrack.module.subjectEnrolment.service;

import com.cts.pharmaTrack.module.subjectEnrolment.exception.DuplicateSubjectCodeException;
import com.cts.pharmaTrack.module.subjectEnrolment.exception.SubjectDeletionNotAllowedException;
import com.cts.pharmaTrack.module.subjectEnrolment.exception.SubjectNotFoundException;
import com.cts.pharmaTrack.module.subjectEnrolment.dto.TrialSubjectRequest;
import com.cts.pharmaTrack.module.subjectEnrolment.dto.TrialSubjectResponse;
import com.cts.pharmaTrack.module.subjectEnrolment.entity.TrialSubject;
import com.cts.pharmaTrack.module.subjectEnrolment.repository.AdverseEventRepository;
import com.cts.pharmaTrack.module.subjectEnrolment.repository.TrialSubjectRepository;
import com.cts.pharmaTrack.module.subjectEnrolment.repository.VisitRecordRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.web.client.RestClient;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import java.util.List;

/**
 * Business logic for trial subjects: enrolment, lookup, update and safe deletion.
 * The primary key {@code subjectId} is supplied by the client (e.g. {@code SUB001}).
 */
@Service
@RequiredArgsConstructor
@Transactional
public class TrialSubjectService {

    private static final Logger logger = LoggerFactory.getLogger(TrialSubjectService.class);
    private static final String DEFAULT_STATUS = "Enrolled";

    @Value("${pharmatrack.clinicaltrial.base-url:http://localhost:8090}")
    private String clinicalTrialBaseUrl;

    private final RestClient restClient = RestClient.create();

    private final TrialSubjectRepository subjectRepository;
    private final VisitRecordRepository visitRepository;
    private final AdverseEventRepository adverseEventRepository;

    private String getBearerToken() {
        ServletRequestAttributes attrs = (ServletRequestAttributes) RequestContextHolder.getRequestAttributes();
        return attrs != null ? attrs.getRequest().getHeader(HttpHeaders.AUTHORIZATION) : null;
    }

    public TrialSubjectResponse create(TrialSubjectRequest request) {
        logger.info("Executing create for subjectCode: {}", request.getSubjectCode());

        // Call clinicaltrial-service via gateway to check plannedSubjects
        String token = getBearerToken();
        int plannedSubjects = 0;
        try {
            com.fasterxml.jackson.databind.JsonNode trial = restClient.get()
                    .uri(clinicalTrialBaseUrl + "/pharmaTrack/clinicalTrial/getTrialById/" + request.getTrialId())
                    .header(HttpHeaders.AUTHORIZATION, token)
                    .retrieve()
                    .body(com.fasterxml.jackson.databind.JsonNode.class);
            if (trial != null) {
                plannedSubjects = trial.path("plannedSubjects").asInt(0);
            }
        } catch (Exception ex) {
            logger.warn("Failed to fetch planned subjects from clinicaltrial-service: {}", ex.getMessage());
            throw new IllegalArgumentException("Failed to validate planned subject limit: Trial not found or service unavailable.");
        }

        long count = subjectRepository.countByTrialId(request.getTrialId());
        if (count >= plannedSubjects) {
            throw new IllegalArgumentException("Planned subject limit reached. No additional subjects can be enrolled.");
        }

        if (subjectRepository.existsBySubjectCode(request.getSubjectCode())) {
            throw new DuplicateSubjectCodeException("subjectCode already exists: " + request.getSubjectCode());
        }

        TrialSubject subject = new TrialSubject();
        apply(subject, request);
        subject.setStatus(StringUtils.hasText(request.getStatus()) ? request.getStatus() : DEFAULT_STATUS);
        return toResponse(subjectRepository.save(subject));
    }

    @Transactional(readOnly = true)
    public List<TrialSubjectResponse> getAll() {
        logger.info("Executing getAll");
        List<TrialSubject> subjects = subjectRepository.findAll();
        if (subjects.isEmpty()) {
            throw new SubjectNotFoundException("No subjects found");
        }
        return subjects.stream().map(this::toResponse).toList();
    }

    @Transactional(readOnly = true)
    public TrialSubjectResponse getById(Integer subjectId) {
        logger.info("Executing getById with subjectId: {}", subjectId);
        return toResponse(findOrThrow(subjectId));
    }

    public TrialSubjectResponse update(TrialSubjectRequest request) {
        logger.info("Executing update with subjectId: {}", request.getSubjectId());
        TrialSubject subject = findOrThrow(request.getSubjectId());
        apply(subject, request);
        subject.setStatus(StringUtils.hasText(request.getStatus()) ? request.getStatus() : subject.getStatus());
        return toResponse(subjectRepository.save(subject));
    }

    public void delete(Integer subjectId) {
        logger.info("Executing delete with subjectId: {}", subjectId);
        TrialSubject subject = findOrThrow(subjectId);
        if (visitRepository.existsBySubjectId(subjectId)
                || adverseEventRepository.existsBySubjectId(subjectId)) {
            throw new SubjectDeletionNotAllowedException();
        }
        subjectRepository.delete(subject);
    }

    private void apply(TrialSubject subject, TrialSubjectRequest request) {
        subject.setTrialId(request.getTrialId());
        subject.setSiteId(request.getSiteId());
        subject.setSubjectCode(request.getSubjectCode());
        subject.setDateOfBirth(request.getDateOfBirth());
        subject.setGender(request.getGender());
        subject.setConsentDate(request.getConsentDate());
        subject.setEnrolmentDate(request.getEnrolmentDate());
    }

    private TrialSubject findOrThrow(Integer subjectId) {
        return subjectRepository.findById(subjectId)
                .orElseThrow(() -> new SubjectNotFoundException("Subject not found with id: " + subjectId));
    }

    private TrialSubjectResponse toResponse(TrialSubject subject) {
        return new TrialSubjectResponse(
                subject.getSubjectId(),
                subject.getTrialId(),
                subject.getSiteId(),
                subject.getSubjectCode(),
                subject.getDateOfBirth(),
                subject.getGender(),
                subject.getConsentDate(),
                subject.getEnrolmentDate(),
                subject.getStatus());
    }
}
