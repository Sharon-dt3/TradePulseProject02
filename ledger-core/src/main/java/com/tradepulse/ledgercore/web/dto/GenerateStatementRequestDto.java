package com.tradepulse.ledgercore.web.dto;

import java.time.LocalDate;

import com.fasterxml.jackson.annotation.JsonIgnore;

import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.NotNull;

/**
 * Request body for POST /accounts/{accountId}/statements.
 * periodEnd is inclusive; StatementService converts it to an exclusive
 * next-day UTC bound before querying executed trades.
 */
public record GenerateStatementRequestDto(
        @NotNull LocalDate periodStart,
        @NotNull LocalDate periodEnd) {

    // PUBLIC_INTERFACE
    /**
     * Verifies that the requested inclusive statement interval is chronological.
     *
     * @return true when the end is on or after the start, or when field validation
     *         will report a missing value separately
     */
    @AssertTrue(message = "periodEnd must be on or after periodStart")
    @JsonIgnore
    public boolean isChronologicalRange() {
        return periodStart == null || periodEnd == null || !periodEnd.isBefore(periodStart);
    }
}
