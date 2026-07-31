package com.cts.pharmaTrack.module.identityAccessManagement.config;

import com.cts.pharmaTrack.module.identityAccessManagement.entity.RoleDetails;
import com.cts.pharmaTrack.module.identityAccessManagement.repository.RoleRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;

/**
 * Ensures the read-only {@code Auditor} role exists so it can be assigned to
 * users and carried in issued JWTs.
 *
 * <p>Idempotent and additive: it creates the role only if absent, on every
 * startup (unlike the user-count-guarded {@link AdminBootstrap}), so it also
 * seeds the role on an already-initialized database. It introduces no business
 * logic, no API, and no authorization changes — the Auditor's read-only,
 * all-module access is enforced entirely by the Audit Service (module-scope
 * resolver + security rules). Excluded from the {@code test} profile so tests
 * control their own data.
 */
@Component
@Profile("!test")
public class AuditorRoleBootstrap implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(AuditorRoleBootstrap.class);

    private static final String AUDITOR_ROLE = "Auditor";

    private final RoleRepository roleRepository;

    AuditorRoleBootstrap(RoleRepository roleRepository) {
        this.roleRepository = roleRepository;
    }

    @Override
    public void run(String... args) {
        if (roleRepository.findByRoleName(AUDITOR_ROLE).isEmpty()) {
            RoleDetails role = new RoleDetails();
            role.setRoleName(AUDITOR_ROLE);
            roleRepository.save(role);
            log.info("Seeded read-only '{}' role for audit visibility", AUDITOR_ROLE);
        }
    }
}
