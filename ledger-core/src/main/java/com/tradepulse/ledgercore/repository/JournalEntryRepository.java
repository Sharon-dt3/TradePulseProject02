package com.tradepulse.ledgercore.repository;

import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

import com.tradepulse.ledgercore.domain.JournalEntry;

/**
 * Spring Data JPA generates the implementation at runtime. postTrade only
 * needs save(), which JpaRepository already provides - no custom query
 * methods yet.
 */
public interface JournalEntryRepository extends JpaRepository<JournalEntry, UUID> {
}
