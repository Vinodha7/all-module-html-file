package com.cts.pharmaTrack.common.security;

import java.security.Principal;
import java.util.Objects;

/**
 * Immutable authenticated principal carrying the identity claims PharmaTrack
 * needs downstream — the numeric {@code userId} and display {@code name} — in
 * addition to the {@code email} and {@code role} already used today.
 *
 * <p>Introduced in Wave 0 (T2). This class is <strong>not wired in yet</strong>:
 * {@code JwtAuthFilter} continues to place the bare email string in the
 * {@code SecurityContext} until a later task deliberately switches to this type.
 *
 * <p>Backward-compatibility contract: {@link #getName()} returns the
 * {@code email}. When this principal eventually replaces the raw email string,
 * {@code Authentication.getName()} — which delegates to a {@link Principal}
 * principal's {@code getName()} — will keep returning the email, so existing
 * consumers (e.g. the audit aspect) behave identically.
 */
public final class SignedPrincipal implements Principal {

    private final Integer userId;
    private final String name;
    private final String email;
    private final String role;

    public SignedPrincipal(Integer userId, String name, String email, String role) {
        this.userId = userId;
        this.name = name;
        this.email = email;
        this.role = role;
    }

    public Integer getUserId() {
        return userId;
    }

    /** The user's display name (from the {@code name} JWT claim). */
    public String getDisplayName() {
        return name;
    }

    public String getEmail() {
        return email;
    }

    public String getRole() {
        return role;
    }

    /**
     * Returns the {@code email}, preserving the existing
     * {@code Authentication.getName() == email} behavior.
     */
    @Override
    public String getName() {
        return email;
    }

    @Override
    public String toString() {
        return email;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) {
            return true;
        }
        if (!(o instanceof SignedPrincipal that)) {
            return false;
        }
        return Objects.equals(userId, that.userId)
                && Objects.equals(name, that.name)
                && Objects.equals(email, that.email)
                && Objects.equals(role, that.role);
    }

    @Override
    public int hashCode() {
        return Objects.hash(userId, name, email, role);
    }
}
