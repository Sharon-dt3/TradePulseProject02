package com.tradepulse.ledgercore.repository;

import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

import com.tradepulse.ledgercore.domain.UserRole;

public interface UserRoleRepository extends JpaRepository<UserRole, UserRole.UserRoleId> {

    List<UserRole> findByUserIdOrderByRole(UUID userId);

    List<UserRole> findAllByOrderByUserId();

    boolean existsByUserIdAndRole(UUID userId, String role);

    void deleteByUserIdAndRole(UUID userId, String role);
}
