package com.cts.pharmaTrack.module.identityAccessManagement.controller;

import com.cts.pharmaTrack.common.config.FeatureFlags;
import com.cts.pharmaTrack.module.identityAccessManagement.dto.request.EntitySignatureRequest;
import com.cts.pharmaTrack.module.identityAccessManagement.dto.response.ApiResponse;
import com.cts.pharmaTrack.module.identityAccessManagement.dto.response.SignatureResponse;
import com.cts.pharmaTrack.module.identityAccessManagement.entity.ElectronicSignature;
import com.cts.pharmaTrack.module.identityAccessManagement.security.JwtUtil;
import com.cts.pharmaTrack.module.identityAccessManagement.service.ElectronicSignatureService;
import com.cts.pharmaTrack.module.identityAccessManagement.service.SignatureAuthorizationService;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * Wave 3 entity-based electronic signatures (approval workflows).
 *
 * <p>Gated by {@code pharmatrack.features.signature-v2-enabled}. The signer
 * identity is always resolved from the authenticated JWT principal; the request
 * body never carries a {@code userId} (business rules 3 &amp; 4). The legacy
 * audit-log signing endpoints on {@link AuditLogController} remain live behind
 * {@code signature-legacy-enabled} during migration.
 */
@RestController
@RequestMapping("/pharmaTrack/identityAccess")
public class ElectronicSignatureController {

    private final ElectronicSignatureService signatureService;
    private final SignatureAuthorizationService authorizationService;
    private final FeatureFlags featureFlags;
    private final JwtUtil jwtUtil;

    public ElectronicSignatureController(ElectronicSignatureService signatureService,
                                         SignatureAuthorizationService authorizationService,
                                         FeatureFlags featureFlags,
                                         JwtUtil jwtUtil) {
        this.signatureService = signatureService;
        this.authorizationService = authorizationService;
        this.featureFlags = featureFlags;
        this.jwtUtil = jwtUtil;
    }

    // ── Apply an entity-based electronic signature ─────────────────────────────
    @PostMapping("/signatures")
    public ResponseEntity<ApiResponse<SignatureResponse>> sign(
            @Valid @RequestBody EntitySignatureRequest request,
            HttpServletRequest httpRequest) {

        ResponseEntity<ApiResponse<SignatureResponse>> disabled = guard();
        if (disabled != null) return disabled;

        String bearer = httpRequest.getHeader(HttpHeaders.AUTHORIZATION);
        String token = bearer.substring(7); // JwtFilter has already validated it
        Integer signerId = jwtUtil.getUserId(token);
        String signerName = StringUtils.hasText(jwtUtil.getName(token))
                ? jwtUtil.getName(token) : jwtUtil.getEmail(token);

        // Wave 3.1 — role-based authorization (before any signing side effect).
        authorizationService.authorize(
                jwtUtil.getRole(token), request.getEntityType(), request.getMeaning());

        ElectronicSignature sig = signatureService.sign(
                request.getEntityType(), request.getEntityId(), request.getEntityVersion(),
                request.getMeaning(), signerId, signerName,
                httpRequest.getRemoteAddr(), bearer);

        return ResponseEntity.ok(
                ApiResponse.success("Signature applied", SignatureResponse.from(sig)));
    }

    // ── List signatures on a business record ───────────────────────────────────
    @GetMapping("/signatures")
    public ResponseEntity<ApiResponse<List<SignatureResponse>>> list(
            @RequestParam String entityType, @RequestParam String entityId) {

        if (!featureFlags.isSignatureV2Enabled()) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(ApiResponse.error("Entity-based signatures are not enabled (signature-v2-enabled=false)"));
        }
        List<SignatureResponse> out = signatureService.list(entityType, entityId)
                .stream().map(SignatureResponse::from).toList();
        return ResponseEntity.ok(ApiResponse.success("Signatures fetched", out));
    }

    // ── List all signatures ────────────────────────────────────────────────────
    @GetMapping("/signatures/all")
    public ResponseEntity<ApiResponse<List<SignatureResponse>>> listAll() {
        if (!featureFlags.isSignatureV2Enabled()) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(ApiResponse.error("Entity-based signatures are not enabled (signature-v2-enabled=false)"));
        }
        List<SignatureResponse> out = signatureService.listAll()
                .stream().map(SignatureResponse::from).toList();
        return ResponseEntity.ok(ApiResponse.success("All signatures fetched", out));
    }

    // ── Verify signatures on a business record ─────────────────────────────────
    @GetMapping("/verifySignatures")
    public ResponseEntity<ApiResponse<Map<String, Object>>> verify(
            @RequestParam String entityType, @RequestParam String entityId) {

        if (!featureFlags.isSignatureV2Enabled()) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(ApiResponse.error("Entity-based signatures are not enabled (signature-v2-enabled=false)"));
        }
        return ResponseEntity.ok(ApiResponse.success(
                "Signature verification complete", signatureService.verify(entityType, entityId)));
    }

    /** 403 when Wave 3 signing is disabled; {@code null} when the request may proceed. */
    private ResponseEntity<ApiResponse<SignatureResponse>> guard() {
        if (!featureFlags.isSignatureV2Enabled()) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(ApiResponse.error("Entity-based signatures are not enabled (signature-v2-enabled=false)"));
        }
        return null;
    }
}
