package com.tradepulse.ledgercore.web.dto;

import java.time.OffsetDateTime;
import java.util.Map;
import java.util.UUID;

public record AuditLogEntryDto(
        UUID id,
        UUID actorUserId,
        String action,
        String entityType,
        UUID entityId,
        Map<String, Object> details,
        OffsetDateTime createdAt) {
}
