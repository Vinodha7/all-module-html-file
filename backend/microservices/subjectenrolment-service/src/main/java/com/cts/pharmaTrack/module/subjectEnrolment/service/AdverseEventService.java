package com.cts.pharmaTrack.module.subjectEnrolment.service;

import com.cts.pharmaTrack.common.exception.ResourceNotFoundException;
import com.cts.pharmaTrack.module.subjectEnrolment.exception.AdverseEventDeletionNotAllowedException;
import com.cts.pharmaTrack.module.subjectEnrolment.exception.AdverseEventNotFoundException;
import com.cts.pharmaTrack.module.subjectEnrolment.exception.DuplicateSubjectCodeException;
import com.cts.pharmaTrack.module.subjectEnrolment.dto.AdverseEventRequest;
import com.cts.pharmaTrack.module.subjectEnrolment.dto.AdverseEventResponse;
import com.cts.pharmaTrack.module.subjectEnrolment.entity.AdverseEvent;
import com.cts.pharmaTrack.module.subjectEnrolment.repository.AdverseEventRepository;
import com.cts.pharmaTrack.module.subjectEnrolment.repository.TrialSubjectRepository;
import com.cts.pharmaTrack.module.subjectEnrolment.repository.VisitRecordRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.core.context.SecurityContextHolder;
import com.cts.pharmaTrack.common.security.SignedPrincipal;

import java.util.List;

/**
 * Business logic for adverse events. An event can only be created against an
 * existing subject and visit, and an event that is still {@code Open} cannot be
 * deleted. The primary key {@code aeId} is supplied by the client (e.g. {@code AE001}).
 */
@Service
@RequiredArgsConstructor
@Transactional
public class AdverseEventService {

    private static final Logger logger = LoggerFactory.getLogger(AdverseEventService.class);
    private static final String DEFAULT_STATUS = "Open";
    private static final String STATUS_OPEN = "Open";

    private final AdverseEventRepository adverseEventRepository;
    private final TrialSubjectRepository subjectRepository;
    private final VisitRecordRepository visitRepository;

    private String getLoggedInUserId() {
        var auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.getPrincipal() instanceof SignedPrincipal principal) {
            return String.valueOf(principal.getUserId());
        }
        return null;
    }

    public AdverseEventResponse create(AdverseEventRequest request) {
        logger.info("Executing create with aeId: {}", request.getAeId());
        if (adverseEventRepository.existsById(request.getAeId())) {
            throw new DuplicateSubjectCodeException("aeId already exists: " + request.getAeId());
        }
        requireSubjectAndVisitExist(request.getSubjectId(), request.getVisitId());
        AdverseEvent event = new AdverseEvent();
        event.setAeId(request.getAeId());
        apply(event, request);
        event.setReportedById(getLoggedInUserId());
        event.setStatus(StringUtils.hasText(request.getStatus()) ? request.getStatus() : DEFAULT_STATUS);
        return toResponse(adverseEventRepository.save(event));
    }

    @Transactional(readOnly = true)
    public List<AdverseEventResponse> getAll() {
        logger.info("Executing getAll");
        List<AdverseEvent> events = adverseEventRepository.findAll();
        if (events.isEmpty()) {
            throw new AdverseEventNotFoundException("No events found");
        }
        return events.stream().map(this::toResponse).toList();
    }

    @Transactional(readOnly = true)
    public AdverseEventResponse getById(String aeId) {
        logger.info("Executing getById with aeId: {}", aeId);
        return toResponse(findOrThrow(aeId));
    }

    @Transactional(readOnly = true)
    public List<AdverseEventResponse> getBySubjectId(Integer subjectId) {
        logger.info("Executing getBySubjectId with subjectId: {}", subjectId);
        List<AdverseEvent> events = adverseEventRepository.findBySubjectId(subjectId);
        if (events.isEmpty()) {
            throw new AdverseEventNotFoundException("No events found for subject");
        }
        return events.stream().map(this::toResponse).toList();
    }

    public AdverseEventResponse update(AdverseEventRequest request) {
        logger.info("Executing update with aeId: {}", request.getAeId());
        AdverseEvent event = findOrThrow(request.getAeId());
        requireSubjectAndVisitExist(request.getSubjectId(), request.getVisitId());
        apply(event, request);
        event.setStatus(StringUtils.hasText(request.getStatus()) ? request.getStatus() : event.getStatus());
        return toResponse(adverseEventRepository.save(event));
    }

    public void delete(String aeId) {
        logger.info("Executing delete with aeId: {}", aeId);
        AdverseEvent event = findOrThrow(aeId);
        if (STATUS_OPEN.equalsIgnoreCase(event.getStatus())) {
            throw new AdverseEventDeletionNotAllowedException();
        }
        adverseEventRepository.delete(event);
    }

    private void apply(AdverseEvent event, AdverseEventRequest request) {
        event.setSubjectId(request.getSubjectId());
        event.setVisitId(request.getVisitId());
        event.setDescription(request.getDescription());
        event.setSeverity(request.getSeverity());
        event.setRelatedness(request.getRelatedness());
        event.setOnsetDate(request.getOnsetDate());
        event.setResolutionDate(request.getResolutionDate());
    }

    private void requireSubjectAndVisitExist(Integer subjectId, String visitId) {
        if (!subjectRepository.existsById(subjectId) || !visitRepository.existsById(visitId)) {
            throw new ResourceNotFoundException("Subject or Visit not found");
        }
    }

    private AdverseEvent findOrThrow(String aeId) {
        return adverseEventRepository.findById(aeId)
                .orElseThrow(AdverseEventNotFoundException::new);
    }

    private AdverseEventResponse toResponse(AdverseEvent event) {
        return new AdverseEventResponse(
                event.getAeId(),
                event.getSubjectId(),
                event.getVisitId(),
                event.getDescription(),
                event.getSeverity(),
                event.getRelatedness(),
                event.getOnsetDate(),
                event.getResolutionDate(),
                event.getReportedById(),
                event.getStatus());
    }
}
