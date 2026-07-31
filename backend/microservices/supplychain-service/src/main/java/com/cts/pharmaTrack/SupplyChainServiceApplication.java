package com.cts.pharmaTrack;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.EnableAspectJAutoProxy;

/**
 * Service entry point. The application sits in the com.cts.pharmaTrack root
 * package, so component scanning, JPA entity scanning and repository scanning
 * all default to this package and its subpackages (module code + shared lib).
 */
@SpringBootApplication
@EnableAspectJAutoProxy
public class SupplyChainServiceApplication {
    private static final Logger logger = LoggerFactory.getLogger(SupplyChainServiceApplication.class);

    public static void main(String[] args) {
        logger.info("Starting SupplyChainServiceApplication");
        SpringApplication.run(SupplyChainServiceApplication.class, args);
    }
}