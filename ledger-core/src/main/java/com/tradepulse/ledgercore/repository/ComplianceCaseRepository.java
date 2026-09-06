package com.tradepulse.ledgercore.repository;

import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

import com.tradepulse.ledgercore.domain.ComplianceCase;

public interface ComplianceCaseRepository extends JpaRepository<ComplianceCase, UUID> {
    List<ComplianceCase> findByAccountId(UUID accountId);
}
