package com.cts.pharmaTrack.common.web;

import org.springframework.core.MethodParameter;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.http.converter.HttpMessageConverter;
import org.springframework.http.server.ServerHttpRequest;
import org.springframework.http.server.ServerHttpResponse;
import org.springframework.http.server.ServletServerHttpRequest;
import org.springframework.http.server.ServletServerHttpResponse;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.servlet.mvc.method.annotation.ResponseBodyAdvice;

import java.lang.reflect.Method;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Set;

/**
 * Reduces every successful <strong>POST</strong> response body to a message-only
 * envelope: the {@code data} payload is dropped so writes confirm the outcome
 * without echoing the created/updated resource. Applies uniformly across all
 * services (each one component-scans {@code com.cts.pharmaTrack}).
 *
 * <p>Rules:
 * <ul>
 *   <li>Only {@code POST} requests are touched — GET/PUT/DELETE responses are
 *       returned unchanged.</li>
 *   <li>Only {@code 2xx} responses are rewritten; error bodies produced by
 *       {@code GlobalExceptionHandler} (4xx/5xx) are left fully intact.</li>
 *   <li>Token-issuing endpoints ({@code /auth/login}, {@code /auth/refresh}) are
 *       exempt — they must keep returning the JWT in {@code data}.</li>
 *   <li>Raw {@code String}/{@code byte[]}/{@code Resource} bodies are passed
 *       through untouched.</li>
 * </ul>
 *
 * <p>For a standard response wrapper (any object exposing {@code getMessage()})
 * the {@code message} and the {@code success}/{@code status} flag are preserved
 * and {@code data} (and {@code timestamp}) are removed. A raw object/entity with
 * no {@code message} is replaced with a generic success message so no payload
 * leaks.
 */
@RestControllerAdvice
public class PostResponseMessageOnlyAdvice implements ResponseBodyAdvice<Object> {

    /** Paths whose POST responses keep their data payload (they issue a JWT). */
    private static final Set<String> EXEMPT_PATH_SUFFIXES = Set.of(
            "/pharmaTrack/identityAccess/auth/login",
            "/pharmaTrack/identityAccess/auth/refresh");

    @Override
    public boolean supports(MethodParameter returnType,
                            Class<? extends HttpMessageConverter<?>> converterType) {
        // Participate for every converter; beforeBodyWrite() guards the body type
        // so we never hand a Map to a String/byte[] converter.
        return true;
    }

    @Override
    public Object beforeBodyWrite(Object body, MethodParameter returnType, MediaType selectedContentType,
                                  Class<? extends HttpMessageConverter<?>> selectedConverterType,
                                  ServerHttpRequest request, ServerHttpResponse response) {
        if (body == null
                || body instanceof CharSequence
                || body instanceof byte[]
                || body instanceof Resource) {
            return body;
        }
        if (!(request instanceof ServletServerHttpRequest servletRequest)) {
            return body;
        }
        if (!HttpMethod.POST.equals(servletRequest.getMethod())) {
            return body;
        }
        // Only strip successful responses; leave error payloads untouched.
        if (response instanceof ServletServerHttpResponse servletResponse) {
            int status = servletResponse.getServletResponse().getStatus();
            if (status < 200 || status >= 300) {
                return body;
            }
        }
        String path = servletRequest.getServletRequest().getRequestURI();
        if (path != null) {
            for (String suffix : EXEMPT_PATH_SUFFIXES) {
                if (path.endsWith(suffix)) {
                    return body;
                }
            }
        }
        return toMessageOnly(body);
    }

    private Object toMessageOnly(Object body) {
        // Controllers that already return a Map (e.g. Map.of("message", ...)) are
        // treated as message-only envelopes: keep the existing message and drop
        // anything else. Values are kept as-is so the result stays compatible with
        // a declared Map<String, String> return type (no Boolean/number values are
        // injected, which would fail Jackson's String-typed value serializer).
        if (body instanceof Map<?, ?> map) {
            Object message = map.get("message");
            Map<String, Object> out = new LinkedHashMap<>();
            out.put("message", message != null ? message : "Request processed successfully");
            return out;
        }
        Object message = invokeGetter(body, "getMessage");
        Map<String, Object> out = new LinkedHashMap<>();
        if (message != null) {
            // Preserve whichever success/status flag the wrapper uses.
            Object success = invokeGetter(body, "isSuccess");
            Object status = invokeGetter(body, "getStatus");
            if (success != null) {
                out.put("success", success);
            }
            if (status != null) {
                out.put("status", status);
            }
            out.put("message", message);
        } else {
            out.put("success", true);
            out.put("message", "Request processed successfully");
        }
        return out;
    }

    private Object invokeGetter(Object target, String getter) {
        try {
            Method m = target.getClass().getMethod(getter);
            return m.invoke(target);
        } catch (Exception ex) {
            return null;
        }
    }
}
