package com.tradepulse.ledgercore.exception;

import org.springframework.http.HttpStatus;

/**
 * Thrown for a structurally-valid but semantically invalid POST
 * /admin/accounts/{accountId}/audit-engagements request - specifically
 * scopeEndDate before scopeStartDate, mirroring the database's own
 * audit_engagements_valid_range CHECK so the client gets a clean 400
 * instead of a raw constraint violation.
 */
public class InvalidAuditEngagementRequestException extends ApiException {

    private InvalidAuditEngagementRequestException(String message) {
        super(message);
    }

    public static InvalidAuditEngagementRequestException invalidDateRange() {
        return new InvalidAuditEngagementRequestException("scopeEndDate must not be before scopeStartDate");
    }

    @Override
    public String getCode() {
        return "INVALID_AUDIT_ENGAGEMENT_REQUEST";
    }

    @Override
    public HttpStatus getStatus() {
        return HttpStatus.BAD_REQUEST;
    }
}
