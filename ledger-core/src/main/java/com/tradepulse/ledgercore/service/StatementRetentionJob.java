package com.tradepulse.ledgercore.service;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.tradepulse.ledgercore.domain.AuditLog;
import com.tradepulse.ledgercore.domain.StorageObject;
import com.tradepulse.ledgercore.repository.AuditLogRepository;
import com.tradepulse.ledgercore.repository.StorageObjectRepository;

/**
 * Phase 9: enforces the checklist's "explicit retention policy, not
 * indefinite" for the private "statements" bucket. Every
 * ledger.statements.retention-sweep-interval-ms, deletes every statement
 * object older than ledger.statements.retention-years and audit-logs
 * each deletion, the same way OrderExpirySweep sweeps past-due orders.
 *
 * Reads candidates directly from storage.objects (ledger-core's own
 * Postgres connection bypasses Storage RLS here exactly as it bypasses
 * table RLS everywhere else in this project) but deletes through the
 * Storage HTTP API rather than deleting the row directly - the actual
 * PDF bytes live in Supabase's storage backend, not in this row, so only
 * the Storage API's own bulk-remove endpoint frees both consistently.
 */
@Component
public class StatementRetentionJob {

    private static final String BUCKET = "statements";

    private final StorageObjectRepository storageObjectRepository;
    private final AuditLogRepository auditLogRepository;
    private final HttpClient httpClient;
    private final ObjectMapper objectMapper;
    private final String supabaseUrl;
    private final String supabaseServiceRoleKey;
    private final int retentionYears;

    public StatementRetentionJob(
            StorageObjectRepository storageObjectRepository,
            AuditLogRepository auditLogRepository,
            @Value("${ledger.statements.supabase-url}") String supabaseUrl,
            @Value("${ledger.statements.supabase-service-role-key}") String supabaseServiceRoleKey,
            @Value("${ledger.statements.retention-years}") int retentionYears) {
        this.storageObjectRepository = storageObjectRepository;
        this.auditLogRepository = auditLogRepository;
        this.httpClient = HttpClient.newHttpClient();
        this.objectMapper = new ObjectMapper();
        this.supabaseUrl = supabaseUrl;
        this.supabaseServiceRoleKey = supabaseServiceRoleKey;
        this.retentionYears = retentionYears;
    }

    @Scheduled(fixedDelayString = "${ledger.statements.retention-sweep-interval-ms}")
    public void sweep() {
        OffsetDateTime cutoff = OffsetDateTime.now().minusYears(retentionYears);
        List<StorageObject> expired = storageObjectRepository.findByBucketIdAndCreatedAtBefore(BUCKET, cutoff);
        if (expired.isEmpty()) {
            return;
        }

        removeFromStorage(expired.stream().map(StorageObject::getName).toList());

        for (StorageObject object : expired) {
            auditLogRepository.save(new AuditLog(
                    null, // system-initiated - no human actor for a scheduled sweep
                    "STATEMENT_RETENTION_DELETED",
                    "storage_object",
                    object.getId(),
                    Map.of(
                            "bucket", BUCKET,
                            "name", object.getName(),
                            "retentionYears", retentionYears)));
        }
    }

    private void removeFromStorage(List<String> names) {
        try {
            String body = objectMapper.writeValueAsString(Map.of("prefixes", names));
            HttpRequest request = HttpRequest.newBuilder(URI.create(supabaseUrl + "/storage/v1/object/" + BUCKET))
                    .header("Authorization", "Bearer " + supabaseServiceRoleKey)
                    .header("apikey", supabaseServiceRoleKey)
                    .header("Content-Type", "application/json")
                    .method("DELETE", HttpRequest.BodyPublishers.ofString(body))
                    .build();
            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() >= 300) {
                throw new IllegalStateException(
                        "Supabase Storage bulk delete failed: HTTP " + response.statusCode() + " " + response.body());
            }
        } catch (IllegalStateException e) {
            throw e;
        } catch (Exception e) {
            throw new IllegalStateException("Supabase Storage bulk delete failed", e);
        }
    }
}
