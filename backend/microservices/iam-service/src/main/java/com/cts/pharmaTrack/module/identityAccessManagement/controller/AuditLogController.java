package com.cts.pharmaTrack.module.identityAccessManagement.controller;

import com.cts.pharmaTrack.module.identityAccessManagement.dto.request.SignatureRequest;
import com.cts.pharmaTrack.module.identityAccessManagement.dto.response.ApiResponse;
import com.cts.pharmaTrack.module.identityAccessManagement.entity.AuditLog;
import com.cts.pharmaTrack.module.identityAccessManagement.entity.ElectronicSignature;
import com.cts.pharmaTrack.module.identityAccessManagement.exception.ResourceNotFoundException;
import com.cts.pharmaTrack.module.identityAccessManagement.repository.IamAuditLogRepository;
import com.cts.pharmaTrack.module.identityAccessManagement.service.AuditComplianceService;
import org.springframework.data.domain.Page;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

@RestController
@RequestMapping("/pharmaTrack/identityAccess")
public class AuditLogController {

    private static final Logger logger = LoggerFactory.getLogger(AuditLogController.class);

    private final IamAuditLogRepository auditLogRepository;
    private final AuditComplianceService compliance;

    public AuditLogController(IamAuditLogRepository auditLogRepository,
                              AuditComplianceService compliance) {
        this.auditLogRepository = auditLogRepository;
        this.compliance = compliance;
    }

    // ── Existing (backward compatible) ─────────────────────────────────────────
    @GetMapping("/fetchAuditLogs")
    public ResponseEntity<ApiResponse<List<AuditLog>>> fetchAuditLogs() {
        List<AuditLog> logs = auditLogRepository.findAll();
        if (logs.isEmpty()) throw new ResourceNotFoundException("No audit logs found");
        return ResponseEntity.ok(ApiResponse.success("Audit logs fetched", logs));
    }

    @GetMapping("/fetchAuditLogsByUser/{userId}")
    public ResponseEntity<ApiResponse<List<AuditLog>>> fetchAuditLogsByUser(@PathVariable Integer userId) {
        List<AuditLog> logs = auditLogRepository.findByUser_UserId(userId);
        if (logs.isEmpty()) throw new ResourceNotFoundException("No audit logs found for this user");
        return ResponseEntity.ok(ApiResponse.success("Audit logs fetched", logs));
    }

    // ── 1. By module ───────────────────────────────────────────────────────────
    @GetMapping("/fetchAuditLogsByModule/{module}")
    public ResponseEntity<ApiResponse<List<AuditLog>>> fetchByModule(@PathVariable String module) {
        return ResponseEntity.ok(ApiResponse.success("Audit logs fetched", compliance.byModule(module)));
    }

    // ── 2. By action ───────────────────────────────────────────────────────────
    @GetMapping("/fetchAuditLogsByAction/{action}")
    public ResponseEntity<ApiResponse<List<AuditLog>>> fetchByAction(@PathVariable String action) {
        return ResponseEntity.ok(ApiResponse.success("Audit logs fetched", compliance.byAction(action)));
    }

    // ── 3. Combined filter + pagination ────────────────────────────────────────
    @GetMapping("/fetchAuditLogsFiltered")
    public ResponseEntity<ApiResponse<Page<AuditLog>>> fetchFiltered(
            @RequestParam(required = false) String module,
            @RequestParam(required = false) String action,
            @RequestParam(required = false) Integer userId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fromDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate toDate,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        Page<AuditLog> result = compliance.filter(module, action, userId, fromDate, toDate, page, size);
        return ResponseEntity.ok(ApiResponse.success("Audit logs fetched", result));
    }

    // ── 4. Summary ─────────────────────────────────────────────────────────────
    @GetMapping("/fetchAuditLogsSummary")
    public ResponseEntity<ApiResponse<Map<String, Object>>> summary() {
        return ResponseEntity.ok(ApiResponse.success("Audit log summary", compliance.summary()));
    }

    // ── 5 & 6. Export (pdf | excel) ────────────────────────────────────────────
    @GetMapping("/exportAuditLogs")
    public ResponseEntity<byte[]> export(
            @RequestParam(defaultValue = "pdf") String format,
            @RequestParam(required = false) String module,
            @RequestParam(required = false) String action,
            @RequestParam(required = false) Integer userId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fromDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate toDate) {
        boolean excel = "excel".equalsIgnoreCase(format) || "xlsx".equalsIgnoreCase(format);
        byte[] body = excel
                ? compliance.exportExcel(module, action, userId, fromDate, toDate)
                : compliance.exportPdf(module, action, userId, fromDate, toDate);
        String filename = "audit-logs." + (excel ? "xlsx" : "pdf");
        MediaType type = excel
                ? MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
                : MediaType.APPLICATION_PDF;
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
                .contentType(type)
                .body(body);
    }

    // ── 7. Integrity verification ──────────────────────────────────────────────
    @GetMapping("/verifyAuditLogIntegrity")
    public ResponseEntity<ApiResponse<Map<String, Object>>> verifyIntegrity() {
        return ResponseEntity.ok(ApiResponse.success("Integrity check complete", compliance.verifyIntegrity()));
    }

    // ── 8. Apply electronic signature ──────────────────────────────────────────
    @PostMapping("/signAuditLog/{auditId}")
    public ResponseEntity<ApiResponse<ElectronicSignature>> sign(
            @PathVariable Integer auditId, @RequestBody SignatureRequest request) {
        ElectronicSignature sig = compliance.sign(auditId, request.getUserId(), request.getMeaning());
        return ResponseEntity.ok(ApiResponse.success("Audit log signed", sig));
    }

    // ── 9. Fetch signatures for an entry ───────────────────────────────────────
    @GetMapping("/fetchAuditLogSignatures/{auditId}")
    public ResponseEntity<ApiResponse<List<ElectronicSignature>>> signatures(@PathVariable Integer auditId) {
        return ResponseEntity.ok(ApiResponse.success("Signatures fetched", compliance.signatures(auditId)));
    }

    // ── 10. Compliance dashboard ───────────────────────────────────────────────
    @GetMapping("/fetchComplianceDashboard")
    public ResponseEntity<ApiResponse<Map<String, Object>>> dashboard() {
        return ResponseEntity.ok(ApiResponse.success("Compliance dashboard", compliance.dashboard()));
    }
}
