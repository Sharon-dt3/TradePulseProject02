package com.tradepulse.ledgercore;

import java.util.List;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.oauth2.core.OAuth2TokenValidator;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtDecoders;
import org.springframework.security.oauth2.jwt.JwtValidators;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.security.oauth2.server.resource.web.authentication.BearerTokenAuthenticationFilter;
import org.springframework.security.oauth2.jose.jws.SignatureAlgorithm;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.oauth2.core.DelegatingOAuth2TokenValidator;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

/**
 * Phase 1: JWKS-based JWT verification.
 *
 * Verifies every request's Bearer token against Supabase's public signing
 * key (ES256), checking signature, exp, and iss — not just that the token
 * parses. /actuator/health stays exempt, per BLUEPRINT.md §4.
 *
 * Phase 3 (dashboard Orders view) added CORS: the dashboard is a separate
 * origin from ledger-core, so without an explicit CorsConfigurationSource
 * the browser blocks every request at the preflight stage before it ever
 * reaches a controller — curl/Postman never hit this, since CORS is a
 * browser-enforced mechanism, not a server-enforced one. allowedOrigins
 * comes from ledger.cors.allowed-origins (application.yml) rather than
 * being hardcoded here, so a deployed dashboard's real origin is just a
 * config change.
 */
@Configuration
public class SecurityConfig {

    @Value("${spring.security.oauth2.resourceserver.jwt.jwk-set-uri}")
    private String jwkSetUri;

    @Value("${spring.security.oauth2.resourceserver.jwt.issuer-uri}")
    private String issuerUri;

    @Value("${ledger.cors.allowed-origins}")
    private String allowedOrigins;

    @Bean
    public JwtDecoder jwtDecoder() {
        NimbusJwtDecoder decoder = NimbusJwtDecoder.withJwkSetUri(jwkSetUri)
                .jwsAlgorithm(SignatureAlgorithm.ES256)
                .build();

        OAuth2TokenValidator<org.springframework.security.oauth2.jwt.Jwt> withIssuer =
                JwtValidators.createDefaultWithIssuer(issuerUri);
        OAuth2TokenValidator<org.springframework.security.oauth2.jwt.Jwt> withAudience =
                new AudienceValidator();
        OAuth2TokenValidator<org.springframework.security.oauth2.jwt.Jwt> combined =
                new DelegatingOAuth2TokenValidator<>(withIssuer, withAudience);

        decoder.setJwtValidator(combined);
        return decoder;
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        configuration.setAllowedOrigins(List.of(allowedOrigins.split(",")));
        configuration.setAllowedMethods(List.of("GET", "POST", "OPTIONS"));
        configuration.setAllowedHeaders(List.of("Authorization", "Content-Type"));

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http.cors(cors -> cors.configurationSource(corsConfigurationSource()))
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers("/actuator/health").permitAll()
                        .anyRequest().authenticated()
                )
                .oauth2ResourceServer(oauth2 -> oauth2.jwt(jwt -> jwt.decoder(jwtDecoder())));
        return http.build();
    }
}