package com.tradepulse.ledgercore.web.dto;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;

import com.tradepulse.ledgercore.domain.LedgerAdjustment;

public record LedgerAdjustmentDto(
        UUID id,
        UUID accountId,
        UUID proposedBy,
        UUID approvedBy,
        BigDecimal amount,
        String reason,
        String status,
        OffsetDateTime proposedAt,
        OffsetDateTime approvedAt) {

    public static LedgerAdjustmentDto from(LedgerAdjustment adjustment) {
        return new LedgerAdjustmentDto(
                adjustment.getId(),
                adjustment.getAccountId(),
                adjustment.getProposedBy(),
                adjustment.getApprovedBy(),
                adjustment.getAmount(),
                adjustment.getReason(),
                adjustment.getStatus().name(),
                adjustment.getProposedAt(),
                adjustment.getApprovedAt());
    }
}
