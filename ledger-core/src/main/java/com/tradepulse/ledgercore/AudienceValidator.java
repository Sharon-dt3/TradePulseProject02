package com.tradepulse.ledgercore;

import org.springframework.security.oauth2.core.OAuth2Error;
import org.springframework.security.oauth2.core.OAuth2TokenValidator;
import org.springframework.security.oauth2.core.OAuth2TokenValidatorResult;
import org.springframework.security.oauth2.jwt.Jwt;

/**
 * Confirms a token's "aud" claim matches Supabase's fixed value for
 * authenticated users. Kept as its own class (single responsibility)
 * so it can be unit-tested or reused independently of SecurityConfig's
 * wiring.
 */

public class AudienceValidator implements OAuth2TokenValidator<Jwt>{
    private static final String REQUIRED_AUDIENCE = "authenticated";

    @Override
    public OAuth2TokenValidatorResult validate(Jwt jwt){
        if(jwt.getAudience().contains(REQUIRED_AUDIENCE)){
            return OAuth2TokenValidatorResult.success();
        } 
        OAuth2Error error = new OAuth2Error(
            "invalid_token",
            "The required audience \"" + REQUIRED_AUDIENCE + "\" is missing",
            null
        );
        return OAuth2TokenValidatorResult.failure(error);
    }
}