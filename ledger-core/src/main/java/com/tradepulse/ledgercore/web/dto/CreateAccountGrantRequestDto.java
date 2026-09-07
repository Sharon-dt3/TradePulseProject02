package com.tradepulse.ledgercore.web.dto;

import java.time.OffsetDateTime;
import java.util.UUID;

import jakarta.validation.constraints.Future;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

/**
 * Request body for POST /admin/accounts/{accountId}/grants. purpose is
 * a free string here (not an enum) so AccountGrantService's
 * InvalidGrantRequestException gives a clean 400 for a bad value,
 * rather than jakarta.validation's less specific enum-binding failure.
 */
public record CreateAccountGrantRequestDto(
        @NotNull UUID grantedToUserId,
        @NotBlank String purpose,
        @NotBlank String reason,
        @NotNull @Future OffsetDateTime expiresAt) {
}
