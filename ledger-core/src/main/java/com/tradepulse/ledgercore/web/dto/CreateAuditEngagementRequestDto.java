package com.tradepulse.ledgercore.web.dto;

import java.time.LocalDate;
import java.util.UUID;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record CreateAuditEngagementRequestDto(
        @NotNull UUID auditorUserId,
        @NotBlank String reason,
        @NotNull LocalDate scopeStartDate,
        @NotNull LocalDate scopeEndDate) {
}
