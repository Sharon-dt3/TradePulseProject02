package com.tradepulse.ledgercore.repository;

import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

import com.tradepulse.ledgercore.domain.JournalLine;

/**
 * Spring Data JPA generates the implementation at runtime. postTrade only
 * needed save() (JpaRepository already provides that).
 * findByAccountIdOrderByCreatedAtDesc (Phase 12) backs GET
 * /ledger/transactions - every cash movement for an account, newest
 * first.
 */
public interface JournalLineRepository extends JpaRepository<JournalLine, UUID> {
    List<JournalLine> findByAccountIdOrderByCreatedAtDesc(UUID accountId);
}
