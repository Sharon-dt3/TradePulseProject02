package com.tradepulse.ledgercore;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.web.SecurityFilterChain;

/**
 * Phase 0 baseline security config.
 *
 * spring-boot-starter-oauth2-resource-server is on the classpath already
 * (added ahead of time for Phase 1's JWKS verification work), which makes
 * Spring Security auto-lock every endpoint behind HTTP Basic by default.
 * Until Phase 1 actually wires up JWKS-based verification, this config
 * just leaves /actuator/health open — matching Phase 1's own stated rule
 * that health endpoints stay exempt from auth — and requires
 * authentication on everything else as a safe default in the meantime.
 */
@Configuration
public class SecurityConfig {

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http.authorizeHttpRequests(auth -> auth
                .requestMatchers("/actuator/health").permitAll()
                .anyRequest().authenticated()
        );
        return http.build();
    }
}
