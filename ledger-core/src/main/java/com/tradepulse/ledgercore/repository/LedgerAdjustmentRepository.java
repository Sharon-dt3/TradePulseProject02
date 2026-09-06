package com.tradepulse.ledgercore.repository;

import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

import com.tradepulse.ledgercore.domain.LedgerAdjustment;

public interface LedgerAdjustmentRepository extends JpaRepository<LedgerAdjustment, UUID> {
    List<LedgerAdjustment> findByAccountId(UUID accountId);
}
