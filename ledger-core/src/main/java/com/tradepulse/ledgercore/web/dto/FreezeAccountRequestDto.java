package com.tradepulse.ledgercore.web.dto;

import jakarta.validation.constraints.NotBlank;

/**
 * Request body for POST /accounts/{accountId}/freeze and
 * POST /accounts/{accountId}/unfreeze. reason is mandatory (Phase
 * 14 item 1), same reason-mandatory philosophy as AccountGrant.issue
 * and AuditEngagement.create - it's stored only in the audit_log
 * details column, since accounts.frozen is a bare boolean with no
 * reason column of its own.
 */
public record FreezeAccountRequestDto(@NotBlank String reason) {
}
