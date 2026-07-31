package com.cts.pharmaTrack.module.audit.service;

import com.cts.pharmaTrack.module.audit.dto.AuditEventResponse;
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
import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.CellStyle;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.stereotype.Service;

import java.awt.Color;
import java.io.ByteArrayOutputStream;
import java.util.List;

/**
 * Renders already-scoped audit rows to PDF or Excel. This is pure rendering — it
 * performs no querying, scoping, or authorization; callers pass rows that were
 * already filtered and module-scoped by {@code AuditQueryService}.
 */
@Service
public class AuditExportService {

    private static final String[] COLUMNS = {
            "eventId", "performedAt", "module", "action", "entityType",
            "entityId", "performedBy", "correlationId", "ipAddress", "rowHash"
    };

    public byte[] renderPdf(List<AuditEventResponse> rows) {
        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        Document doc = new Document(PageSize.A4.rotate(), 24, 24, 32, 24);
        try {
            PdfWriter.getInstance(doc, baos);
            doc.open();
            Font title = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 14);
            Font small = FontFactory.getFont(FontFactory.HELVETICA, 7);
            Font head = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 7, Color.WHITE);

            doc.add(new Paragraph("PharmaTrack - Audit Events", title));
            doc.add(new Paragraph("Records: " + rows.size(),
                    FontFactory.getFont(FontFactory.HELVETICA, 9)));
            doc.add(new Paragraph(" "));

            PdfPTable table = new PdfPTable(COLUMNS.length);
            table.setWidthPercentage(100);
            for (String c : COLUMNS) {
                PdfPCell cell = new PdfPCell(new Phrase(c, head));
                cell.setBackgroundColor(new Color(45, 90, 160));
                cell.setPadding(4);
                table.addCell(cell);
            }
            for (AuditEventResponse r : rows) {
                for (String v : rowValues(r)) {
                    table.addCell(new PdfPCell(new Phrase(v, small)));
                }
            }
            doc.add(table);
            doc.close();
        } catch (DocumentException e) {
            throw new IllegalStateException("Failed to build audit PDF export", e);
        }
        return baos.toByteArray();
    }

    public byte[] renderExcel(List<AuditEventResponse> rows) {
        try (XSSFWorkbook wb = new XSSFWorkbook();
             ByteArrayOutputStream baos = new ByteArrayOutputStream()) {
            Sheet sheet = wb.createSheet("AuditEvents");

            CellStyle headStyle = wb.createCellStyle();
            org.apache.poi.ss.usermodel.Font f = wb.createFont();
            f.setBold(true);
            headStyle.setFont(f);

            Row header = sheet.createRow(0);
            for (int i = 0; i < COLUMNS.length; i++) {
                Cell c = header.createCell(i);
                c.setCellValue(COLUMNS[i]);
                c.setCellStyle(headStyle);
            }

            int rowIdx = 1;
            for (AuditEventResponse r : rows) {
                Row row = sheet.createRow(rowIdx++);
                String[] vals = rowValues(r);
                for (int i = 0; i < vals.length; i++) {
                    row.createCell(i).setCellValue(vals[i]);
                }
            }
            for (int i = 0; i < COLUMNS.length; i++) {
                sheet.autoSizeColumn(i);
            }
            wb.write(baos);
            return baos.toByteArray();
        } catch (Exception e) {
            throw new IllegalStateException("Failed to build audit Excel export", e);
        }
    }

    private static String[] rowValues(AuditEventResponse r) {
        return new String[]{
                nz(r.getEventId()),
                r.getPerformedAt() == null ? "" : r.getPerformedAt().toString(),
                nz(r.getModule()),
                nz(r.getAction()),
                nz(r.getEntityType()),
                nz(r.getEntityId()),
                nz(r.getPerformedBy()),
                nz(r.getCorrelationId()),
                nz(r.getIpAddress()),
                nz(r.getRowHash())
        };
    }

    private static String nz(String value) {
        return value == null ? "" : value;
    }
}
