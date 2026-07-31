package com.cts.pharmaTrack.module.audit.util;

import com.cts.pharmaTrack.module.audit.config.AuditHashProperties;
import com.cts.pharmaTrack.module.audit.entity.AuditEvent;
import org.springframework.stereotype.Service;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.InvalidKeyException;
import java.security.NoSuchAlgorithmException;

/**
 * Computes the keyed {@code row_hash} for an {@link AuditEvent} using
 * HMAC-SHA256 over the {@link AuditCanonicalizer} output.
 *
 * <p>HMAC-SHA256 produces 32 bytes, rendered as a 64-character lowercase
 * hexadecimal string (matching the {@code row_hash} column length). Because the
 * key is required to produce a valid hash, tampering with a stored row is
 * detectable at verification time (A13) without the key ever leaving the service.
 *
 * <p>This class only computes hashes — it neither persists nor mutates data.
 */
@Service
public class AuditHashService {

    private static final String HMAC_ALGORITHM = "HmacSHA256";

    private final AuditCanonicalizer canonicalizer;
    private final byte[] secretKeyBytes;

    public AuditHashService(AuditCanonicalizer canonicalizer, AuditHashProperties properties) {
        this.canonicalizer = canonicalizer;
        this.secretKeyBytes = properties.getHmacKey().getBytes(StandardCharsets.UTF_8);
    }

    /** HMAC-SHA256 of the canonical form of the event, as a 64-char lowercase hex string. */
    public String hash(AuditEvent event) {
        return hmacHex(canonicalizer.canonicalize(event));
    }

    private String hmacHex(String input) {
        try {
            Mac mac = Mac.getInstance(HMAC_ALGORITHM);
            mac.init(new SecretKeySpec(secretKeyBytes, HMAC_ALGORITHM));
            byte[] raw = mac.doFinal(input.getBytes(StandardCharsets.UTF_8));
            return toLowerHex(raw);
        } catch (NoSuchAlgorithmException | InvalidKeyException e) {
            throw new IllegalStateException("Unable to compute audit HMAC", e);
        }
    }

    private static String toLowerHex(byte[] bytes) {
        StringBuilder sb = new StringBuilder(bytes.length * 2);
        for (byte b : bytes) {
            sb.append(Character.forDigit((b >> 4) & 0xF, 16));
            sb.append(Character.forDigit(b & 0xF, 16));
        }
        return sb.toString();
    }
}
