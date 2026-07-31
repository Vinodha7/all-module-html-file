package com.cts.pharmaTrack.module.notification.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import javax.sql.DataSource;
import java.sql.Connection;

@Component
public class NotificationSchemaInitializer {

    private static final Logger logger = LoggerFactory.getLogger(NotificationSchemaInitializer.class);
    private final JdbcTemplate jdbcTemplate;

    public NotificationSchemaInitializer(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @EventListener(ApplicationReadyEvent.class)
    public void initSchema() {
        DataSource dataSource = jdbcTemplate.getDataSource();
        if (dataSource == null) {
            logger.warn("No DataSource available for notification schema initialization");
            return;
        }

        try (Connection connection = dataSource.getConnection()) {
            String catalog = connection.getCatalog();
            String tableName = catalog != null ? catalog + ".notification" : "notification";
            String sql = "ALTER TABLE " + tableName + " MODIFY COLUMN notificationId BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY";
            jdbcTemplate.execute(sql);
            logger.info("Ensured notificationId is AUTO_INCREMENT on {}", tableName);
        } catch (Exception ex) {
            logger.error("Failed to initialize notification schema for auto-increment", ex);
        }
    }
}
