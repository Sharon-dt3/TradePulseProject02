package com.tradepulse.ledgercore.repository;

import java.math.BigDecimal;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.tradepulse.ledgercore.domain.Account;

/**
 * Spring Data JPA generates the implementation of this interface at
 * runtime — no query code to write by hand. findByUserId is the one
 * method Account ownership scoping actually needs.
 */
public interface AccountRepository extends JpaRepository<Account, UUID> {
    Optional<Account> findByUserId(UUID userId);

    /**
     * Atomically adjusts an account's cash_balance by delta (positive to
     * credit, negative to debit) in a single UPDATE statement, rather than
     * loading the entity, mutating a field, and saving it back. Account
     * deliberately has no setCashBalance and no @Version column, so a
     * load-mutate-save cycle here would be vulnerable to a lost update if
     * two trades against the same account committed concurrently; this
     * UPDATE ... SET cash_balance = cash_balance + :delta is serialized
     * by the database itself, so that race can't happen.
     *
     * Returns the number of rows updated (0 or 1) so callers (e.g.
     * LedgerService.postTrade) can detect an unknown/deleted accountId
     * rather than silently doing nothing.
     */
    @Modifying
    @Query("UPDATE Account a SET a.cashBalance = a.cashBalance + :delta WHERE a.id = :accountId")
    int adjustCashBalance(@Param("accountId") UUID accountId, @Param("delta") BigDecimal delta);
}
