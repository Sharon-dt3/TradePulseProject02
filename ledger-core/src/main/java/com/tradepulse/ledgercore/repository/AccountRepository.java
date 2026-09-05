
package com.tradepulse.ledgercore.repository;

import com.tradepulse.ledgercore.domain.Account;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

import java.util.UUID;

/**

 * Spring Data JPA generates the implementation of this interface at

 * runtime — no query code to write by hand. findByUserId is the one

 * method Account ownership scoping actually needs.

 */

public interface AccountRepository extends JpaRepository<Account, UUID> {

    Optional<Account> findByUserId(UUID userId);

}

