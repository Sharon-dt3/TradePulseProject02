package com.tradepulse.ledgercore.domain;

import java.io.Serializable;
import java.util.Objects;
import java.util.UUID;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.IdClass;
import jakarta.persistence.Table;

/**
 * Maps to the "user_roles" table (V2). Composite key (userId, role), same
 * shape as RolePermission - a user can hold any number of roles (see
 * testtrader's trader+compliance combination from earlier testing), so
 * assignment/removal is exactly adding/removing one row. The role column
 * itself has a Postgres CHECK constraint restricting it to the 8 valid
 * roles; UserManagementService validates the same set in Java first so a
 * bad role name comes back as a clean 400 rather than a raw constraint
 * violation.
 */
@Entity
@Table(name = "user_roles")
@IdClass(UserRole.UserRoleId.class)
public class UserRole {

    @Id
    @Column(name = "user_id")
    private UUID userId;

    @Id
    @Column(name = "role")
    private String role;

    protected UserRole() {
        // required by JPA
    }

    public UserRole(UUID userId, String role) {
        this.userId = userId;
        this.role = role;
    }

    public UUID getUserId() {
        return userId;
    }

    public String getRole() {
        return role;
    }

    public static class UserRoleId implements Serializable {
        private UUID userId;
        private String role;

        public UserRoleId() {
            // required by JPA
        }

        public UserRoleId(UUID userId, String role) {
            this.userId = userId;
            this.role = role;
        }

        @Override
        public boolean equals(Object o) {
            if (this == o) {
                return true;
            }
            if (!(o instanceof UserRoleId that)) {
                return false;
            }
            return Objects.equals(userId, that.userId) && Objects.equals(role, that.role);
        }

        @Override
        public int hashCode() {
            return Objects.hash(userId, role);
        }
    }
}
