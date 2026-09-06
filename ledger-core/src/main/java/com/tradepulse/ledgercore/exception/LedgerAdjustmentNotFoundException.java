package com.tradepulse.ledgercore.exception;

import java.util.UUID;

import org.springframework.http.HttpStatus;

public class LedgerAdjustmentNotFoundException extends ApiException {

    private LedgerAdjustmentNotFoundException(String message) {
        super(message);
    }

    public static LedgerAdjustmentNotFoundException forId(UUID id) {
        return new LedgerAdjustmentNotFoundException("No ledger adjustment found with id " + id);
    }

    @Override
    public String getCode() {
        return "LEDGER_ADJUSTMENT_NOT_FOUND";
    }

    @Override
    public HttpStatus getStatus() {
        return HttpStatus.NOT_FOUND;
    }
}
