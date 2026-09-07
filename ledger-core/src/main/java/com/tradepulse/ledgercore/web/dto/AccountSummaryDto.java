package com.tradepulse.ledgercore.web.dto;

import java.math.BigDecimal;
import java.util.UUID;

/**
 * Phase 20 prerequisite: one row of the account directory
 * (GET /accounts), for Admin/Compliance to browse and pick an
 * accountId rather than needing one handed to them out of band.
 * ownerEmail comes from a Java-side join against AuthUser, same
 * pattern UserManagementServiceImpl already uses for role listing.
 */
public record AccountSummaryDto(
        UUID accountId,
        UUID ownerUserId,
        String ownerEmail,
        BigDecimal cashBalance,
        boolean marginEnabled,
        boolean frozen) {
}
