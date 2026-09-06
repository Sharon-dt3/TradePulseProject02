package com.tradepulse.ledgercore.domain;

import java.io.Serializable;
import java.util.Objects;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.IdClass;
import jakarta.persistence.Table;

/**
 * Maps to the "role_permissions" table (V2, seeded in V3). Composite key
 * (role, permission) — this table has no surrogate id, it's a plain
 * lookup/mapping table, same shape in Postgres as in Java.
 */
@Entity
@Table(name = "role_permissions")
@IdClass(RolePermission.RolePermissionId.class)
public class RolePermission {

    @Id
    @Column(name = "role")
    private String role;

    @Id
    @Column(name = "permission")
    private String permission;

    protected RolePermission() {
        // required by JPA
    }

    public String getRole() {
        return role;
    }

    public String getPermission() {
        return permission;
    }

    public static class RolePermissionId implements Serializable {
        private String role;
        private String permission;

        public RolePermissionId() {
            // required by JPA
        }

        public RolePermissionId(String role, String permission) {
            this.role = role;
            this.permission = permission;
        }

        @Override
        public boolean equals(Object o) {
            if (this == o) {
                return true;
            }
            if (!(o instanceof RolePermissionId that)) {
                return false;
            }
            return Objects.equals(role, that.role) && Objects.equals(permission, that.permission);
        }

        @Override
        public int hashCode() {
            return Objects.hash(role, permission);
        }
    }
}
