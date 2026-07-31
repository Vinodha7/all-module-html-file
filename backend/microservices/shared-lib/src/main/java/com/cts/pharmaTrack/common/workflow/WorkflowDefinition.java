package com.cts.pharmaTrack.common.workflow;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;

/**
 * The set of explicitly-allowed transitions for one entity type (Wave 4). Any
 * (from → to) not present is, by definition, an invalid transition.
 *
 * <p>Built once per entity, typically as a {@code static final} constant in the
 * owning service:
 * <pre>{@code
 * WorkflowDefinition.forEntity("TrialProtocol")
 *     .allowSigned("Draft", "Approved", "APPROVE", "APPROVED", "Investigator")
 *     .allow("Approved", "Superseded", "SUPERSEDE", "Investigator")
 *     .build();
 * }</pre>
 */
public final class WorkflowDefinition {

    private final String entityType;
    private final Map<String, WorkflowTransition> transitions;

    private WorkflowDefinition(String entityType, Map<String, WorkflowTransition> transitions) {
        this.entityType = entityType;
        this.transitions = transitions;
    }

    public String getEntityType() {
        return entityType;
    }

    /** The rule for a requested transition, or empty when it is not allowed. */
    public Optional<WorkflowTransition> transition(String from, String to) {
        return Optional.ofNullable(transitions.get(WorkflowTransition.key(from, to)));
    }

    /** All declared transitions (for status/definition introspection). */
    public List<WorkflowTransition> transitions() {
        return List.copyOf(transitions.values());
    }

    public static Builder forEntity(String entityType) {
        return new Builder(entityType);
    }

    public static final class Builder {
        private final String entityType;
        private final Map<String, WorkflowTransition> transitions = new LinkedHashMap<>();

        private Builder(String entityType) {
            this.entityType = entityType;
        }

        /** A transition requiring no signature, optionally restricted to roles. */
        public Builder allow(String from, String to, String auditAction, String... roles) {
            add(new WorkflowTransition(from, to, auditAction, Set.of(roles), false, null));
            return this;
        }

        /** A transition requiring a valid signature of {@code requiredMeaning}. */
        public Builder allowSigned(String from, String to, String auditAction,
                                   String requiredMeaning, String... roles) {
            add(new WorkflowTransition(from, to, auditAction, Set.of(roles), true, requiredMeaning));
            return this;
        }

        private void add(WorkflowTransition t) {
            transitions.put(t.key(), t);
        }

        public WorkflowDefinition build() {
            return new WorkflowDefinition(entityType, Map.copyOf(transitions));
        }
    }
}
