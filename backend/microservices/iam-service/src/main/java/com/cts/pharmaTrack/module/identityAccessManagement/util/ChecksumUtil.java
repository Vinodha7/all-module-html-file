package com.cts.pharmaTrack.module.identityAccessManagement.util;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;

/**
 * SHA-256 helper used for tamper-evident audit-log checksums and electronic
 * signature hashes (21 CFR Part 11 data-integrity requirements).
 */
public final class ChecksumUtil {

    private ChecksumUtil() {}

    public static String sha256(String data) {
        try {
            MessageDigest md = MessageDigest.getInstance("SHA-256");
            byte[] hash = md.digest((data == null ? "" : data).getBytes(StandardCharsets.UTF_8));
            StringBuilder sb = new StringBuilder(hash.length * 2);
            for (byte b : hash) sb.append(String.format("%02x", b));
            return sb.toString();
        } catch (NoSuchAlgorithmException e) {
            // SHA-256 is guaranteed present on every JVM; never reached.
            throw new IllegalStateException("SHA-256 not available", e);
        }
    }
}
