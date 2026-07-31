package com.cts.pharmaTrack.module.deviationCapa.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;

/**
 * Minimal write-confirmation payload carrying a single {@code message}.
 * <p>Exposing only {@code getMessage()} (and no {@code isSuccess()}/{@code getStatus()})
 * makes the shared POST response advice emit exactly {@code {"message": ...}} while
 * preserving the real message, instead of the generic success envelope.
 */
@Getter
@AllArgsConstructor
public class MessageResponse {

    private final String message;
}
