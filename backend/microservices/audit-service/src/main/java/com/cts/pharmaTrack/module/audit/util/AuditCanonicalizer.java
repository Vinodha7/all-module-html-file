package com.cts.pharmaTrack.module.audit.util;

import com.cts.pharmaTrack.module.audit.entity.AuditEvent;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

/**
 * Produces a deterministic, order-stable canonical representation of an
 * {@link AuditEvent} for keyed-HMAC calculation (A9) and integrity verification
 * (A13).
 *
 * <p>The canonical form is stable across JVM executions, Jackson serialization
 * variations, and MySQL JSON-column normalization: object keys are sorted
 * recursively, insignificant whitespace is removed, and array ordering is
 * preserved, so two semantically identical JSON documents always canonicalize to
 * the same string. This is what allows a {@code row_hash} computed at ingest to
 * match one recomputed from the value MySQL stored and re-read (which may reorder
 * keys / strip whitespace).
 *
 * <p>This class computes canonical strings only — it does not hash and does not
 * persist anything.
 */
@Component
public class AuditCanonicalizer {

    /**
     * Field separator: ASCII Unit Separator (code point 31, U+001F). A control
     * character is used so field values (including JSON, which escapes control
     * characters) cannot contain it, preventing canonical-string collisions
     * across field boundaries. Built from the code point to avoid source-escape
     * fragility.
     */
    private static final String SEPARATOR = Character.toString(31);

    /** Placeholder for a null/absent value: ASCII NUL (code point 0), so a null
     * and an empty string never canonicalize to the same token. */
    private static final String NULL_TOKEN = Character.toString(0);

    /** Dedicated mapper with default configuration for deterministic output. */
    private final ObjectMapper objectMapper = new ObjectMapper();

    /**
     * Canonical string over the hash-relevant fields of an audit event, in a
     * fixed field order, with JSON payloads canonicalized and the timestamp
     * truncated to whole seconds for cross-store stability.
     */
    public String canonicalize(AuditEvent event) {
        if (event == null) {
            return NULL_TOKEN;
        }
        return String.join(SEPARATOR,
                nullSafe(event.getEventId()),
                nullSafe(event.getModule()),
                nullSafe(event.getEntityType()),
                nullSafe(event.getEntityId()),
                nullSafe(event.getAction()),
                nullSafe(event.getPerformedBy()),
                canonicalTimestamp(event.getPerformedAt()),
                canonicalizeJson(event.getOldValues()),
                canonicalizeJson(event.getNewValues()),
                nullSafe(event.getIpAddress()),
                nullSafe(event.getCorrelationId()));
    }

    /**
     * Canonicalizes a JSON document supplied as text (e.g. read back from the
     * {@code json} column). Null/blank input yields the null token.
     */
    public String canonicalizeJson(String json) {
        if (json == null || json.isBlank()) {
            return NULL_TOKEN;
        }
        try {
            return canonicalizeJson(objectMapper.readTree(json));
        } catch (JsonProcessingException e) {
            throw new IllegalArgumentException("Invalid JSON supplied for canonicalization", e);
        }
    }

    /**
     * Canonicalizes an arbitrary value bound from JSON at the HTTP boundary
     * (Map/List/String/Number/Boolean, as produced by the JSON deserializer),
     * decoupling callers from any specific {@code JsonNode} type/version. Null
     * yields the null token.
     */
    public String canonicalizeJson(Object value) {
        if (value == null) {
            return NULL_TOKEN;
        }
        JsonNode tree = objectMapper.valueToTree(value);
        return canonicalizeJson(tree);
    }

    /**
     * Canonicalizes a parsed JSON node: keys sorted recursively, arrays in order,
     * compact (no whitespace). Null/missing yields the null token.
     */
    public String canonicalizeJson(JsonNode node) {
        if (node == null || node.isNull() || node.isMissingNode()) {
            return NULL_TOKEN;
        }
        try {
            return objectMapper.writeValueAsString(sort(node));
        } catch (JsonProcessingException e) {
            throw new IllegalArgumentException("Unable to serialize canonical JSON", e);
        }
    }

    /** Recursively rebuilds a node with object keys sorted; arrays keep order. */
    private JsonNode sort(JsonNode node) {
        if (node == null || node.isNull() || node.isMissingNode()) {
            return node;
        }
        if (node.isObject()) {
            ObjectNode source = (ObjectNode) node;
            List<String> fieldNames = new ArrayList<>();
            source.fieldNames().forEachRemaining(fieldNames::add);
            Collections.sort(fieldNames);
            ObjectNode sorted = objectMapper.createObjectNode();
            for (String name : fieldNames) {
                sorted.set(name, sort(source.get(name)));
            }
            return sorted;
        }
        if (node.isArray()) {
            ArrayNode source = (ArrayNode) node;
            ArrayNode result = objectMapper.createArrayNode();
            for (JsonNode element : source) {
                result.add(sort(element));
            }
            return result;
        }
        return node;
    }

    private static String nullSafe(String value) {
        return value == null ? NULL_TOKEN : value;
    }

    private static String canonicalTimestamp(LocalDateTime timestamp) {
        return timestamp == null
                ? NULL_TOKEN
                : timestamp.truncatedTo(ChronoUnit.SECONDS).toString();
    }
}
