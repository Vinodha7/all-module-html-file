package com.cts.pharmatrack.gateway;

import com.github.tomakehurst.wiremock.WireMockServer;
import com.github.tomakehurst.wiremock.core.WireMockConfiguration;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.reactive.server.WebTestClient;
import org.springframework.http.HttpStatus;

import static com.github.tomakehurst.wiremock.client.WireMock.*;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
public class ApiGatewayRateLimiterIntegrationTest {

    static WireMockServer wireMockServer;

    @LocalServerPort
    int port;

    WebTestClient webTestClient;

    @BeforeAll
    static void startWireMock() {
        wireMockServer = new WireMockServer(WireMockConfiguration.wireMockConfig().dynamicPort());
        wireMockServer.start();
        wireMockServer.stubFor(get(urlPathMatching("/test/.*")).willReturn(aResponse().withStatus(200).withBody("OK")));
    }

    @DynamicPropertySource
    static void registerProperties(DynamicPropertyRegistry registry) {
        // Rate limiter: allow 3 requests per period for the test
        registry.add("resilience4j.ratelimiter.instances.global-rate-limiter.limit-for-period", () -> 3);
        registry.add("resilience4j.ratelimiter.instances.global-rate-limiter.limit-refresh-period", () -> "60s");

        // Configure a dedicated gateway route that points to the WireMock downstream
        registry.add("spring.cloud.gateway.routes[0].id", () -> "test-service");
        registry.add("spring.cloud.gateway.routes[0].uri", () -> "http://localhost:" + wireMockServer.port());
        registry.add("spring.cloud.gateway.routes[0].predicates[0]", () -> "Path=/test/**");
    }

    @BeforeEach
    void setupClient() {
        this.webTestClient = WebTestClient.bindToServer().baseUrl("http://localhost:" + port).build();
    }

    @AfterAll
    static void stopWireMock() {
        if (wireMockServer != null) {
            wireMockServer.stop();
        }
    }

    @Test
    void firstNRequestsAllowed_then_rateLimited_withErrorPayload() {
        // First 3 requests should be allowed
        for (int i = 0; i < 3; i++) {
            webTestClient.get()
                    .uri("/test/hello")
                    .exchange()
                    .expectStatus().isOk()
                    .expectBody(String.class).isEqualTo("OK");
        }

        // Next request should be rate limited
        webTestClient.get()
                .uri("/test/hello")
                .exchange()
                .expectStatus().isEqualTo(HttpStatus.TOO_MANY_REQUESTS)
                .expectBody()
                .jsonPath("$.timestamp").exists()
                .jsonPath("$.status").isEqualTo(429)
                .jsonPath("$.error").isEqualTo("TOO_MANY_REQUESTS")
                .jsonPath("$.message").isEqualTo("Rate limit exceeded. Please try again later.")
                .jsonPath("$.path").isEqualTo("/test/hello");
    }

    @Test
    void actuatorMetrics_and_prometheus_exposeRateLimiterMetrics() {
        // Trigger some requests to populate metrics
        webTestClient.get().uri("/test/hello").exchange().expectStatus().is2xxSuccessful();
        webTestClient.get().uri("/test/hello").exchange();

        // Check /actuator/metrics contains resilience4j.ratelimiter.calls
        webTestClient.get()
                .uri("/actuator/metrics")
                .exchange()
                .expectStatus().isOk()
                .expectBody()
                .jsonPath("$.names").value(names -> {
                    // names is an array; assert it contains expected metric name
                    org.assertj.core.api.Assertions.assertThat(names.toString()).contains("resilience4j.ratelimiter.calls");
                });

        // Check prometheus endpoint contains resilience4j_ratelimiter text
        webTestClient.get()
                .uri("/actuator/prometheus")
                .exchange()
                .expectStatus().isOk()
                .expectBody(String.class)
                .value(body -> org.assertj.core.api.Assertions.assertThat(body).contains("resilience4j_ratelimiter"));
    }
}
