package com.tradepulse.ledgercore.repository;

import com.tradepulse.ledgercore.domain.AccountGrant;

import org.springframework.data.jpa.repository.JpaRepository;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

public interface AccountGrantRepository extends JpaRepository<AccountGrant, Long> {

    /**
     * The one check every granted-access read depends on: is there a
     * still-valid grant (expiresAt after now) letting grantedToUserId
     * read accountId, for one of the given purposes? Mirrors
     * PermissionService.hasPermission's existsBy... style - evaluated
     * fresh on every call, nothing cached, so an expired or revoked
     * grant stops working on the very next request.
     */
    boolean existsByAccountIdAndGrantedToUserIdAndPurposeInAndExpiresAtAfter(
            UUID accountId, UUID grantedToUserId, List<String> purposes, OffsetDateTime now);
}
