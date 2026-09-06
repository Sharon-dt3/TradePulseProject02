package com.tradepulse.ledgercore.exception;

import java.util.UUID;

import org.springframework.http.HttpStatus;

/**
 * Thrown when an operation references an account that doesn't exist -
 * either by accountId (e.g. LedgerService.postTrade's adjustCashBalance
 * call returning 0 rows updated) or by the calling user having no
 * account at all (e.g. OrderService.placeOrder resolving jwt.sub to no
 * row). Two named factories rather than one constructor since "no
 * account found" reads differently depending on which id the caller
 * actually had on hand - both map to the same {code, message} shape.
 */
public class AccountNotFoundException extends ApiException {

    private AccountNotFoundException(String message) {
        super(message);
    }

    public static AccountNotFoundException forAccountId(UUID accountId) {
        return new AccountNotFoundException("No account found with id " + accountId);
    }

    public static AccountNotFoundException forUserId(UUID userId) {
        return new AccountNotFoundException("No account found for user " + userId);
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
