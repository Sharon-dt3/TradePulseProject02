package com.tradepulse.ledgercore.domain;

import java.util.UUID;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

/**
 * Read-only mapping onto Supabase's auth.users table - just the columns
 * Admin's user listing needs (id, email). Never written from here;
 * Supabase's Auth API owns that table's full lifecycle (signup, password
 * reset, etc. - see the admin-API calls used elsewhere this session), so
 * this entity is deliberately minimal and JPA never inserts/updates/deletes
 * through it.
 */
@Entity
@Table(name = "users", schema = "auth")
public class AuthUser {

    @Id
    private UUID id;

    @Column(name = "email")
    private String email;

    protected AuthUser() {
        // required by JPA
    }

    public UUID getId() {
        return id;
    }

    public String getEmail() {
        return email;
    }
}
