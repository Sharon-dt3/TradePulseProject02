package com.tradepulse.ledgercore.exception;

import java.util.UUID;

import org.springframework.http.HttpStatus;

/**
 * Thrown when an operation references an accountId that doesn't exist -
 * e.g. LedgerService.postTrade's adjustCashBalance call returning 0 rows
 * updated.
 */
public class AccountNotFoundException extends ApiException {

    public AccountNotFoundException(UUID accountId) {
        super("No account found with id " + accountId);
    }

    @Override
    public String getCode() {
        return "ACCOUNT_NOT_FOUND";
    }

    @Override
    public HttpStatus getStatus() {
        return HttpStatus.NOT_FOUND;
    }
}
