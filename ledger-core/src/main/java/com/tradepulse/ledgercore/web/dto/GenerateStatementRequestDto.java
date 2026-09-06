package com.tradepulse.ledgercore.web.dto;

import java.time.LocalDate;

import jakarta.validation.constraints.NotNull;

/**
 * Phase 9: request body for POST /accounts/{accountId}/statements.
 * periodEnd is inclusive; StatementService widens it internally to an
 * exclusive upper bound when querying trades.
 */
public record GenerateStatementRequestDto(
        @NotNull LocalDate periodStart,
        @NotNull LocalDate periodEnd) {
}
