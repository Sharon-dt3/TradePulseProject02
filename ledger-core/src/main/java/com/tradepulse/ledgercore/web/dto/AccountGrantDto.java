package com.tradepulse.ledgercore.web.dto;

import java.time.OffsetDateTime;
import java.util.UUID;

public record AccountGrantDto(
        Long id,
        UUID accountId,
        UUID grantedToUserId,
        String purpose,
        String reason,
        OffsetDateTime expiresAt,
        OffsetDateTime createdAt) {
}
