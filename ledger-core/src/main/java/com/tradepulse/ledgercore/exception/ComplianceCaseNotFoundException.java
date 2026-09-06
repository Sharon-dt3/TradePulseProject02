package com.tradepulse.ledgercore.exception;

import java.util.UUID;

import org.springframework.http.HttpStatus;

public class ComplianceCaseNotFoundException extends ApiException {

    public ComplianceCaseNotFoundException(UUID caseId) {
        super("Compliance case not found: " + caseId);
    }

    @Override
    public String getCode() {
        return "COMPLIANCE_CASE_NOT_FOUND";
    }

    @Override
    public HttpStatus getStatus() {
        return HttpStatus.NOT_FOUND;
    }
}
