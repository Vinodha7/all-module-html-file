package com.cts.pharmaTrack.module.identityAccessManagement.service;

import com.cts.pharmaTrack.module.identityAccessManagement.entity.AuditLog;
import com.cts.pharmaTrack.module.identityAccessManagement.entity.AuditLog.AuditAction;
import com.cts.pharmaTrack.module.identityAccessManagement.entity.ElectronicSignature;
import com.cts.pharmaTrack.module.identityAccessManagement.exception.ResourceNotFoundException;
import com.cts.pharmaTrack.module.identityAccessManagement.repository.IamAuditLogRepository;
import com.cts.pharmaTrack.module.identityAccessManagement.repository.ElectronicSignatureRepository;
import com.cts.pharmaTrack.module.identityAccessManagement.repository.UserRepository;
import com.cts.pharmaTrack.module.identityAccessManagement.util.ChecksumUtil;

import com.lowagie.text.Document;
import com.lowagie.text.DocumentException;
import com.lowagie.text.Font;
import com.lowagie.text.FontFactory;
import com.lowagie.text.PageSize;
import com.lowagie.text.Paragraph;
import com.lowagie.text.Phrase;
import com.lowagie.text.pdf.PdfPCell;
import com.lowagie.text.pdf.PdfPTable;
import com.lowagie.text.pdf.PdfWriter;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.awt.Color;
import java.io.ByteArrayOutputStream;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.*;

/**
 * Compliance reporting & 21 CFR Part 11 features over the audit log:
 * filtering, summary, integrity verification, electronic signature,
 * PDF/Excel export, and the compliance dashboard.
 */
@Service
public class AuditComplianceService {

    private static final Logger logger = LoggerFactory.getLogger(AuditComplianceService.class);

    private final IamAuditLogRepository auditLogRepository;
    private final ElectronicSignatureRepository signatureRepository;
    private final UserRepository userRepository;

    private static final List<AuditAction> APPROVAL_ACTIONS =
            List.of(AuditAction.Approve, AuditAction.Submit, AuditAction.Release);

    public AuditComplianceService(IamAuditLogRepository auditLogRepository,
                                  ElectronicSignatureRepository signatureRepository,
                                  UserRepository userRepository) {
        this.auditLogRepository = auditLogRepository;
        this.signatureRepository = signatureRepository;
        this.userRepository = userRepository;
    }

    private static AuditAction parseAction(String action) {
        if (action == null || action.isBlank()) return null;
        try { return AuditAction.valueOf(action); }
        catch (IllegalArgumentException e) {
            throw new IllegalArgumentException("Unknown action type: " + action);
        }
    }

    private static LocalDateTime startOf(LocalDate d) { return d == null ? null : d.atStartOfDay(); }
    private static LocalDateTime endOf(LocalDate d)   { return d == null ? null : d.atTime(LocalTime.MAX); }

    // ── Filters ──────────────────────────────────────────────────────────────
    public List<AuditLog> byModule(String module) {
        List<AuditLog> logs = auditLogRepository.findByModule(module);
        if (logs.isEmpty()) throw new ResourceNotFoundException("No audit logs for module: " + module);
        return logs;
    }

    public List<AuditLog> byAction(String action) {
        List<AuditLog> logs = auditLogRepository.findByAction(parseAction(action));
        if (logs.isEmpty()) throw new ResourceNotFoundException("No audit logs for action: " + action);
        return logs;
    }

    public Page<AuditLog> filter(String module, String action, Integer userId,
                                 LocalDate fromDate, LocalDate toDate, int page, int size) {
        return auditLogRepository.filter(
                (module == null || module.isBlank()) ? null : module,
                parseAction(action), userId, startOf(fromDate), endOf(toDate),
                PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "timestamp")));
    }

    // ── Summary (endpoint 4) ───────────────────────────────────────────────────
    public Map<String, Object> summary() {
        Map<String, Map<String, Long>> byModuleAction = new LinkedHashMap<>();
        for (Object[] row : auditLogRepository.summaryByModuleAndAction()) {
            String module = String.valueOf(row[0]);
            String action = String.valueOf(row[1]);
            long count = ((Number) row[2]).longValue();
            byModuleAction.computeIfAbsent(module, m -> new LinkedHashMap<>()).put(action, count);
        }
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("totalLogs", auditLogRepository.count());
        out.put("byModuleAndAction", byModuleAction);
        return out;
    }

    // ── Integrity verification (endpoint 7) ────────────────────────────────────
    public Map<String, Object> verifyIntegrity() {
        List<Map<String, Object>> tampered = new ArrayList<>();
        long verified = 0, legacy = 0;
        for (AuditLog log : auditLogRepository.findAll()) {
            if (log.getChecksum() == null || log.getChecksum().isBlank()) { legacy++; continue; }
            String recomputed = ChecksumUtil.sha256(AuditLog.canonicalString(log));
            if (recomputed.equals(log.getChecksum())) {
                verified++;
            } else {
                Map<String, Object> t = new LinkedHashMap<>();
                t.put("auditId", log.getAuditId());
                t.put("module", log.getModule());
                t.put("storedChecksum", log.getChecksum());
                t.put("recomputedChecksum", recomputed);
                tampered.add(t);
            }
        }
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("verified", verified);
        out.put("legacyUnverifiable", legacy);
        out.put("tamperedCount", tampered.size());
        out.put("tampered", tampered);
        out.put("intact", tampered.isEmpty());
        return out;
    }

    // ── Electronic signature (endpoints 8 & 9) ─────────────────────────────────
    public ElectronicSignature sign(Integer auditId, Integer userId, String meaning) {
        AuditLog log = auditLogRepository.findById(auditId)
                .orElseThrow(() -> new ResourceNotFoundException("Audit log not found: " + auditId));
        userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + userId));
        if (meaning == null || meaning.isBlank())
            throw new IllegalArgumentException("Signature meaning is required (e.g. Approved, Reviewed, Submitted)");

        ElectronicSignature sig = new ElectronicSignature();
        sig.setAuditId(log.getAuditId());
        sig.setUserId(userId);
        sig.setSignedAt(LocalDateTime.now());
        sig.setMeaning(meaning);
        sig.setSignatureHash(ChecksumUtil.sha256(userId + "|" + auditId + "|" + sig.getSignedAt()));
        return signatureRepository.save(sig);
    }

    public List<ElectronicSignature> signatures(Integer auditId) {
        return signatureRepository.findByAuditId(auditId);
    }

    // ── Compliance dashboard (endpoint 10) ─────────────────────────────────────
    public Map<String, Object> dashboard() {
        Map<String, Long> logsByModule = new LinkedHashMap<>();
        for (Object[] row : auditLogRepository.countByModule())
            logsByModule.put(String.valueOf(row[0]), ((Number) row[1]).longValue());

        long unsigned = 0;
        for (AuditAction a : APPROVAL_ACTIONS)
            for (AuditLog log : auditLogRepository.findByAction(a))
                if (signatureRepository.countByAuditId(log.getAuditId()) == 0) unsigned++;

        Map<String, Object> out = new LinkedHashMap<>();
        out.put("totalLogs", auditLogRepository.count());
        out.put("todayLogs", auditLogRepository.countByTimestampAfter(LocalDate.now().atStartOfDay()));
        out.put("failedLogins",
                auditLogRepository.countByActionAndReasonContainingIgnoreCase(AuditAction.Login, "fail"));
        out.put("tamperedLogs", ((Number) verifyIntegrity().get("tamperedCount")).longValue());
        out.put("unsignedRecords", unsigned);
        out.put("logsByModule", logsByModule);
        return out;
    }

    // ── Export (endpoints 5 & 6) ───────────────────────────────────────────────
    private static final String[] COLS = {
            "auditId", "timestamp", "module", "action", "entityType",
            "recordId", "user", "reason", "ipAddress", "checksum"
    };

    private List<AuditLog> exportRows(String module, String action, Integer userId,
                                      LocalDate fromDate, LocalDate toDate) {
        return auditLogRepository.filterList(
                (module == null || module.isBlank()) ? null : module,
                parseAction(action), userId, startOf(fromDate), endOf(toDate));
    }

    private static String[] rowValues(AuditLog a) {
        return new String[]{
                String.valueOf(a.getAuditId()),
                String.valueOf(a.getTimestamp()),
                String.valueOf(a.getModule()),
                String.valueOf(a.getAction()),
                String.valueOf(a.getEntityType()),
                String.valueOf(a.getRecordId()),
                a.getUser() != null ? String.valueOf(a.getUser().getUserId()) : "",
                a.getReason() == null ? "" : a.getReason(),
                a.getIpAddress() == null ? "" : a.getIpAddress(),
                a.getChecksum() == null ? "" : a.getChecksum()
        };
    }

    public byte[] exportPdf(String module, String action, Integer userId,
                            LocalDate fromDate, LocalDate toDate) {
        List<AuditLog> rows = exportRows(module, action, userId, fromDate, toDate);
        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        Document doc = new Document(PageSize.A4.rotate(), 24, 24, 32, 24);
        try {
            PdfWriter.getInstance(doc, baos);
            doc.open();
            Font title = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 14);
            Font small = FontFactory.getFont(FontFactory.HELVETICA, 7);
            Font head = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 7, Color.WHITE);
            doc.add(new Paragraph("PharmaTrack — Audit Log (21 CFR Part 11)", title));
            doc.add(new Paragraph("Generated: " + LocalDateTime.now() + "   Records: " + rows.size(),
                    FontFactory.getFont(FontFactory.HELVETICA, 9)));
            doc.add(new Paragraph(" "));

            PdfPTable table = new PdfPTable(COLS.length);
            table.setWidthPercentage(100);
            for (String c : COLS) {
                PdfPCell cell = new PdfPCell(new Phrase(c, head));
                cell.setBackgroundColor(new Color(45, 90, 160));
                cell.setPadding(4);
                table.addCell(cell);
            }
            for (AuditLog a : rows)
                for (String v : rowValues(a))
                    table.addCell(new PdfPCell(new Phrase(v, small)));
            doc.add(table);
            doc.close();
        } catch (DocumentException e) {
            throw new IllegalStateException("Failed to build PDF export", e);
        }
        return baos.toByteArray();
    }

    public byte[] exportExcel(String module, String action, Integer userId,
                              LocalDate fromDate, LocalDate toDate) {
        List<AuditLog> rows = exportRows(module, action, userId, fromDate, toDate);
        try (XSSFWorkbook wb = new XSSFWorkbook(); ByteArrayOutputStream baos = new ByteArrayOutputStream()) {
            Sheet sheet = wb.createSheet("AuditLogs");
            CellStyle headStyle = wb.createCellStyle();
            org.apache.poi.ss.usermodel.Font f = wb.createFont();
            f.setBold(true); headStyle.setFont(f);
            Row header = sheet.createRow(0);
            for (int i = 0; i < COLS.length; i++) {
                Cell c = header.createCell(i); c.setCellValue(COLS[i]); c.setCellStyle(headStyle);
            }
            int r = 1;
            for (AuditLog a : rows) {
                Row row = sheet.createRow(r++);
                String[] vals = rowValues(a);
                for (int i = 0; i < vals.length; i++) row.createCell(i).setCellValue(vals[i]);
            }
            for (int i = 0; i < COLS.length; i++) sheet.autoSizeColumn(i);
            wb.write(baos);
            return baos.toByteArray();
        } catch (Exception e) {
            throw new IllegalStateException("Failed to build Excel export", e);
        }
    }
}
