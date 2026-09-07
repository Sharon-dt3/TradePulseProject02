package com.tradepulse.ledgercore.web.dto;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.UUID;

public record AuditEngagementDto(
        Long id,
        UUID accountId,
        UUID auditorUserId,
        String reason,
        LocalDate scopeStartDate,
        LocalDate scopeEndDate,
        OffsetDateTime createdAt) {
}
