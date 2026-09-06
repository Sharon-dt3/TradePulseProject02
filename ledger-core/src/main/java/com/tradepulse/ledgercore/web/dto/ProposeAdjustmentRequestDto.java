package com.tradepulse.ledgercore.web.dto;

import java.math.BigDecimal;
import java.util.UUID;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record ProposeAdjustmentRequestDto(
        @NotNull UUID accountId,
        @NotNull BigDecimal amount,
        @NotBlank String reason) {
}
