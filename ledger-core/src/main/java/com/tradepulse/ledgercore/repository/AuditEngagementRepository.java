package com.tradepulse.ledgercore.repository;

import com.tradepulse.ledgercore.domain.AuditEngagement;

import org.springframework.data.jpa.repository.JpaRepository;

/**
 * Create-only for Phase 18 item 2 (Admin issues engagements). Phase 18
 * item 3 (Admin audit read) and Phase 16 (Auditor's own read) will add
 * lookup methods here when built.
 */
public interface AuditEngagementRepository extends JpaRepository<AuditEngagement, Long> {
}
