package com.tradepulse.ledgercore.web.dto;

import java.time.OffsetDateTime;
import java.util.UUID;

import com.tradepulse.ledgercore.domain.ComplianceCase;

public record ComplianceCaseDto(
        UUID id,
        UUID accountId,
        UUID openedBy,
        ComplianceCase.Status status,
        String reason,
        OffsetDateTime openedAt,
        UUID closedBy,
        OffsetDateTime closedAt
) {
    public static ComplianceCaseDto from(ComplianceCase complianceCase) {
        return new ComplianceCaseDto(
                complianceCase.getId(),
                complianceCase.getAccountId(),
                complianceCase.getOpenedBy(),
                complianceCase.getStatus(),
                complianceCase.getReason(),
                complianceCase.getOpenedAt(),
                complianceCase.getClosedBy(),
                complianceCase.getClosedAt()
        );
    }
}
