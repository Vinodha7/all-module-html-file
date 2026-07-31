package com.cts.pharmaTrack.module.audit.controller;

import com.cts.pharmaTrack.common.exception.ResourceNotFoundException;
import com.cts.pharmaTrack.common.response.ApiResponse;
import com.cts.pharmaTrack.common.security.SignedPrincipal;
import com.cts.pharmaTrack.module.audit.dto.AuditEventFilter;
import com.cts.pharmaTrack.module.audit.dto.AuditEventRequest;
import com.cts.pharmaTrack.module.audit.dto.AuditEventResponse;
import com.cts.pharmaTrack.module.audit.dto.AuditIntegrityReport;
import com.cts.pharmaTrack.module.audit.dto.AuditSummaryResponse;
import com.cts.pharmaTrack.module.audit.service.AuditExportService;
import com.cts.pharmaTrack.module.audit.service.AuditIngestService;
import com.cts.pharmaTrack.module.audit.service.AuditIngestService.IngestResult;
import com.cts.pharmaTrack.module.audit.service.AuditIntegrityService;
import com.cts.pharmaTrack.module.audit.service.AuditQueryService;
import jakarta.validation.Valid;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Audit ingest endpoint. Access is gated by the security chain (valid JWT) and
 * the {@code InternalTokenFilter} (valid {@code X-Internal-Token}); this
 * controller only maps the request to the ingest service and the idempotency
 * outcome to an HTTP status.
 */
@RestController
@RequestMapping("/pharmaTrack/audit")
public class AuditEventController {

    private static final Logger logger = LoggerFactory.getLogger(AuditEventController.class);

    private final AuditIngestService ingestService;
    private final AuditQueryService auditQueryService;
    private final AuditIntegrityService auditIntegrityService;
    private final AuditExportService auditExportService;

    public AuditEventController(AuditIngestService ingestService,
                                AuditQueryService auditQueryService,
                                AuditIntegrityService auditIntegrityService,
                                AuditExportService auditExportService) {
        this.ingestService = ingestService;
        this.auditQueryService = auditQueryService;
        this.auditIntegrityService = auditIntegrityService;
        this.auditExportService = auditExportService;
    }

    /**
     * Ingests one audit event. Returns 201 when a new row was created, or 200
     * when the {@code eventId} was already recorded (idempotent no-op).
     */
    @PostMapping("/events")
    public ResponseEntity<ApiResponse<String>> ingest(@Valid @RequestBody AuditEventRequest request) {
        IngestResult result = ingestService.ingest(request);

        HttpStatus status = result.created() ? HttpStatus.CREATED : HttpStatus.OK;
        String message = result.created()
                ? "Audit event recorded"
                : "Audit event already recorded (idempotent)";
        logger.debug("Ingest eventId={} created={}", result.eventId(), result.created());

        return ResponseEntity.status(status)
                .body(ApiResponse.success(message, result.eventId()));
    }

    /**
     * Module-scoped, filtered, paged search over the audit ledger. All predicates
     * are optional; results are restricted to the caller's permitted modules by
     * {@code AuditQueryService} (no scoping logic here). Default page 0, size 20.
     */
    @GetMapping("/events")
    public ResponseEntity<ApiResponse<Page<AuditEventResponse>>> search(
            @RequestParam(name = "module", required = false) String module,
            @RequestParam(name = "action", required = false) String action,
            @RequestParam(name = "entityType", required = false) String entityType,
            @RequestParam(name = "entityId", required = false) String entityId,
            @RequestParam(name = "performedBy", required = false) String performedBy,
            @RequestParam(name = "correlationId", required = false) String correlationId,
            @RequestParam(name = "from", required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime from,
            @RequestParam(name = "to", required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime to,
            @RequestParam(name = "page", defaultValue = "0") int page,
            @RequestParam(name = "size", defaultValue = "20") int size,
            @AuthenticationPrincipal SignedPrincipal principal) {

        AuditEventFilter filter = new AuditEventFilter();
        filter.setModule(module);
        filter.setAction(action);
        filter.setEntityType(entityType);
        filter.setEntityId(entityId);
        filter.setPerformedBy(performedBy);
        filter.setCorrelationId(correlationId);
        filter.setFrom(from);
        filter.setTo(to);
        filter.setPage(page);
        filter.setSize(size);

        String role = (principal != null) ? principal.getRole() : null;
        Page<AuditEventResponse> result = auditQueryService.search(filter, role);
        return ResponseEntity.ok(ApiResponse.success("Audit events fetched", result));
    }

    /**
     * Fetches a single audit event by id, scoped to the caller's modules.
     * Returns 404 both when the event does not exist and when it exists but is
     * outside the caller's module scope — the two cases are indistinguishable
     * (visibility is enforced by {@code AuditQueryService}, not here).
     */
    @GetMapping("/events/{eventId}")
    public ResponseEntity<ApiResponse<AuditEventResponse>> getById(
            @PathVariable("eventId") String eventId,
            @AuthenticationPrincipal SignedPrincipal principal) {

        String role = (principal != null) ? principal.getRole() : null;
        AuditEventResponse event = auditQueryService.getById(eventId, role)
                .orElseThrow(() -> new ResourceNotFoundException("Audit event not found: " + eventId));
        return ResponseEntity.ok(ApiResponse.success("Audit event fetched", event));
    }

    /**
     * Audit counts grouped by module and by action, restricted to the caller's
     * module scope by {@code AuditQueryService} (no aggregation or authorization
     * logic here). Admin/Auditor see all modules; scoped roles see their subset;
     * unknown roles get empty counts.
     */
    @GetMapping("/summary")
    public ResponseEntity<ApiResponse<AuditSummaryResponse>> getSummary(
            @AuthenticationPrincipal SignedPrincipal principal) {

        String role = (principal != null) ? principal.getRole() : null;
        AuditSummaryResponse summary = auditQueryService.getSummary(role);
        return ResponseEntity.ok(ApiResponse.success("Audit summary fetched", summary));
    }

    /**
     * Recomputes and verifies the keyed HMAC of every stored audit event.
     * Access is restricted to Admin/Auditor by the security chain (A14); this
     * method performs no authorization itself.
     */
    @GetMapping("/verifyIntegrity")
    public ResponseEntity<ApiResponse<AuditIntegrityReport>> verifyIntegrity() {
        AuditIntegrityReport report = auditIntegrityService.verify();
        return ResponseEntity.ok(ApiResponse.success("Integrity verification complete", report));
    }

    /**
     * Exports the filtered, module-scoped audit rows as PDF (default) or Excel.
     * Rows are fetched via {@code AuditQueryService.exportSearch} (same scoping as
     * the list endpoint); rendering is delegated to {@code AuditExportService}.
     * No filtering or authorization logic here.
     */
    @GetMapping("/events/export")
    public ResponseEntity<byte[]> export(
            @RequestParam(name = "module", required = false) String module,
            @RequestParam(name = "action", required = false) String action,
            @RequestParam(name = "entityType", required = false) String entityType,
            @RequestParam(name = "entityId", required = false) String entityId,
            @RequestParam(name = "performedBy", required = false) String performedBy,
            @RequestParam(name = "correlationId", required = false) String correlationId,
            @RequestParam(name = "from", required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime from,
            @RequestParam(name = "to", required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime to,
            @RequestParam(name = "format", defaultValue = "pdf") String format,
            @AuthenticationPrincipal SignedPrincipal principal) {

        AuditEventFilter filter = new AuditEventFilter();
        filter.setModule(module);
        filter.setAction(action);
        filter.setEntityType(entityType);
        filter.setEntityId(entityId);
        filter.setPerformedBy(performedBy);
        filter.setCorrelationId(correlationId);
        filter.setFrom(from);
        filter.setTo(to);

        String role = (principal != null) ? principal.getRole() : null;
        List<AuditEventResponse> rows = auditQueryService.exportSearch(filter, role);

        boolean excel = "excel".equalsIgnoreCase(format) || "xlsx".equalsIgnoreCase(format);
        byte[] body = excel
                ? auditExportService.renderExcel(rows)
                : auditExportService.renderPdf(rows);
        String filename = "audit-events." + (excel ? "xlsx" : "pdf");
        MediaType contentType = excel
                ? MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
                : MediaType.APPLICATION_PDF;

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
                .contentType(contentType)
                .body(body);
    }
}
