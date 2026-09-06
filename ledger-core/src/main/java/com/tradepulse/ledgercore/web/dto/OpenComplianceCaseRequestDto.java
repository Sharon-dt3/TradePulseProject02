package com.tradepulse.ledgercore.web.dto;

import java.util.UUID;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record OpenComplianceCaseRequestDto(
        @NotNull UUID accountId,
        @NotBlank String reason
) {
}
