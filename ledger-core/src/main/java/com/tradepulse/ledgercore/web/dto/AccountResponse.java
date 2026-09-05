package com.tradepulse.ledgercore.web.dto;
import com.tradepulse.ledgercore.domain.Account;
import java.math.BigDecimal;
import java.util.UUID;

public record AccountResponse(
    UUID accountId,
    BigDecimal cashBalance,
    boolean marginEnabled,
    boolean frozen
){
    public static AccountResponse from(Account account){
        return new AccountResponse(
            account.getId(),
            account.getCashBalance(),
            account.isMarginEnabled(),
            account.isFrozen()
        );
    }
}