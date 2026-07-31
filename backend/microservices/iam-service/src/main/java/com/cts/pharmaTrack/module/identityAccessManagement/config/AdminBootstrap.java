package com.cts.pharmaTrack.module.identityAccessManagement.config;

import com.cts.pharmaTrack.module.identityAccessManagement.entity.RoleDetails;
import com.cts.pharmaTrack.module.identityAccessManagement.entity.UserDetails;
import com.cts.pharmaTrack.module.identityAccessManagement.entity.UserDetails.UserStatus;
import com.cts.pharmaTrack.module.identityAccessManagement.repository.RoleRepository;
import com.cts.pharmaTrack.module.identityAccessManagement.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

/**
 * Seeds a default Admin role + admin user on a brand-new database so the
 * now-secured createUser/createRole endpoints have an admin to authenticate
 * with (solving the bootstrap chicken-and-egg). Does nothing if any users
 * already exist. Excluded from the "test" profile so tests control their own data.
 */
@Component
@Profile("!test")
public class AdminBootstrap implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(AdminBootstrap.class);

    private static final String DEFAULT_EMAIL = "admin@pharma.com";
    private static final String DEFAULT_PASSWORD = "Admin@123";

    private final RoleRepository roleRepository;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    AdminBootstrap(RoleRepository roleRepository,
                   UserRepository userRepository,
                   PasswordEncoder passwordEncoder) {
        this.roleRepository = roleRepository;
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    public void run(String... args) {
        if (userRepository.count() > 0) {
            return; // database already initialised — leave it alone
        }

        RoleDetails adminRole = roleRepository.findByRoleName("Admin")
                .orElseGet(() -> {
                    RoleDetails role = new RoleDetails();
                    role.setRoleName("Admin");
                    return roleRepository.save(role);
                });

        UserDetails admin = new UserDetails();
        admin.setName("System Admin");
        admin.setEmail(DEFAULT_EMAIL);
        admin.setRole(adminRole);
        admin.setSiteId(null);
        admin.setPassword(passwordEncoder.encode(DEFAULT_PASSWORD));
        admin.setStatus(UserStatus.Active);
        userRepository.save(admin);

        log.warn("Bootstrapped default admin account: {} / {} — change this password immediately.",
                DEFAULT_EMAIL, DEFAULT_PASSWORD);
    }
}
