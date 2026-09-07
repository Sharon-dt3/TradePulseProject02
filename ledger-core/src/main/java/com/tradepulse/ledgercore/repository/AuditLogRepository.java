package com.tradepulse.ledgercore.repository;

import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

import com.tradepulse.ledgercore.domain.AuditLog;

/**
 * Spring Data JPA generates the implementation at runtime. postTrade
 * only needed save() originally - no custom query methods. Phase 18
 * item 3 (Admin audit read) adds the two finders below: capped at 200
 * rows rather than an unbounded findAll(), since audit_log is an
 * ever-growing append-only log, unlike the small fixed-size lists
 * (users, accounts) the rest of this codebase returns unpaginated.
 */
public interface AuditLogRepository extends JpaRepository<AuditLog, UUID> {

    List<AuditLog> findTop200ByOrderByCreatedAtDesc();

    List<AuditLog> findTop200ByEntityTypeOrderByCreatedAtDesc(String entityType);
}
