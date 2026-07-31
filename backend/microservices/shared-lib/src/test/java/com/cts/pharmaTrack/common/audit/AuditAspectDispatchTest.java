package com.cts.pharmaTrack.common.audit;

import com.cts.pharmaTrack.common.config.FeatureFlags;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

/**
 * Unit tests for {@link AuditAspect#dispatch} — the Wave 2 routing matrix over
 * the {@code audit-central-enabled} / {@code audit-local-fallback-enabled} flags.
 * The dispatch decision is isolated from the servlet/security context so the
 * flag behavior can be verified directly.
 */
class AuditAspectDispatchTest {

    private AuditService auditService;
    private AuditClient auditClient;
    private FeatureFlags flags;
    private AuditAspect aspect;

    @BeforeEach
    void setUp() {
        auditService = mock(AuditService.class);
        auditClient = mock(AuditClient.class);
        flags = new FeatureFlags();
        aspect = new AuditAspect(auditService, auditClient, flags);
    }

    private AuditAspect.AuditData sampleData() {
        AuditAspect.AuditData d = new AuditAspect.AuditData();
        d.eventId = "evt-1";
        d.userId = "user@example.com";
        d.action = "CREATE";
        d.entityType = "BatchRecord";
        d.recordId = "42";
        d.reason = "GMP release";
        d.endpoint = "/pharmaTrack/batchManufacturing/42";
        d.module = "BatchManufacturing";
        d.newValue = "BatchRecord(id=42)";
        d.performedByName = "Alice";
        d.correlationId = "corr-1";
        d.ipAddress = "10.0.0.1";
        d.bearerToken = "Bearer jwt-token";
        return d;
    }

    // ── Defaults (central off, local on): local write only — today's behavior ──
    @Test
    void centralOff_localOn_writesLocalOnly() {
        flags.setAuditCentralEnabled(false);
        flags.setAuditLocalFallbackEnabled(true);

        aspect.dispatch(sampleData());

        verify(auditService).record("user@example.com", "CREATE", "BatchRecord", "42",
                "GMP release", "/pharmaTrack/batchManufacturing/42", "BatchManufacturing",
                "BatchRecord(id=42)");
        verifyNoInteractions(auditClient);
    }

    // ── Both off (Audit Service's own config): records nothing (R1) ────────────
    @Test
    void bothOff_recordsNothing() {
        flags.setAuditCentralEnabled(false);
        flags.setAuditLocalFallbackEnabled(false);

        aspect.dispatch(sampleData());

        verifyNoInteractions(auditService);
        verifyNoInteractions(auditClient);
    }

    // ── Central on, publish succeeds: no local write (no double-recording) ─────
    @Test
    void centralOn_publishSucceeds_noLocalWrite() {
        flags.setAuditCentralEnabled(true);
        flags.setAuditLocalFallbackEnabled(true);
        when(auditClient.publish(any(), anyString())).thenReturn(true);

        aspect.dispatch(sampleData());

        verify(auditClient).publish(any(CentralAuditEvent.class), eq("Bearer jwt-token"));
        verifyNoInteractions(auditService);
    }

    // ── Central on, publish fails, fallback on: falls back to local write ──────
    @Test
    void centralOn_publishFails_fallbackOn_writesLocal() {
        flags.setAuditCentralEnabled(true);
        flags.setAuditLocalFallbackEnabled(true);
        when(auditClient.publish(any(), any())).thenReturn(false);

        aspect.dispatch(sampleData());

        verify(auditClient).publish(any(CentralAuditEvent.class), eq("Bearer jwt-token"));
        verify(auditService).record(eq("user@example.com"), eq("CREATE"), eq("BatchRecord"),
                eq("42"), eq("GMP release"), anyString(), eq("BatchManufacturing"), anyString());
    }

    // ── Central on, publish fails, fallback off: no local write ────────────────
    @Test
    void centralOn_publishFails_fallbackOff_noLocalWrite() {
        flags.setAuditCentralEnabled(true);
        flags.setAuditLocalFallbackEnabled(false);
        when(auditClient.publish(any(), any())).thenReturn(false);

        aspect.dispatch(sampleData());

        verify(auditClient).publish(any(CentralAuditEvent.class), any());
        verify(auditService, never()).record(anyString(), anyString(), anyString(), anyString(),
                any(), anyString(), anyString(), any());
    }

    // ── The central payload mirrors the captured request fields ────────────────
    @Test
    void centralPayload_mapsFields() {
        flags.setAuditCentralEnabled(true);
        flags.setAuditLocalFallbackEnabled(true);
        when(auditClient.publish(any(), any())).thenReturn(true);

        aspect.dispatch(sampleData());

        ArgumentCaptor<CentralAuditEvent> captor = ArgumentCaptor.forClass(CentralAuditEvent.class);
        verify(auditClient).publish(captor.capture(), eq("Bearer jwt-token"));
        CentralAuditEvent e = captor.getValue();

        assertThat(e.getEventId()).isEqualTo("evt-1");
        assertThat(e.getModule()).isEqualTo("BatchManufacturing");
        assertThat(e.getEntityType()).isEqualTo("BatchRecord");
        assertThat(e.getEntityId()).isEqualTo("42");
        assertThat(e.getAction()).isEqualTo("CREATE");
        assertThat(e.getPerformedBy()).isEqualTo("user@example.com");
        assertThat(e.getPerformedByName()).isEqualTo("Alice");
        assertThat(e.getNewValues()).isEqualTo("BatchRecord(id=42)");
        assertThat(e.getCorrelationId()).isEqualTo("corr-1");
        assertThat(e.getIpAddress()).isEqualTo("10.0.0.1");
    }
}
