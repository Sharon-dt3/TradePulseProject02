package com.tradepulse.ledgercore.service;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.UncheckedIOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.font.PDType1Font;
import org.apache.pdfbox.pdmodel.font.Standard14Fonts;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import com.tradepulse.ledgercore.domain.Account;
import com.tradepulse.ledgercore.domain.AuditLog;
import com.tradepulse.ledgercore.domain.Trade;
import com.tradepulse.ledgercore.exception.AccountNotFoundException;
import com.tradepulse.ledgercore.exception.ForbiddenException;
import com.tradepulse.ledgercore.repository.AccountRepository;
import com.tradepulse.ledgercore.repository.AuditLogRepository;
import com.tradepulse.ledgercore.repository.TradeRepository;

/**
 * Phase 9: server-side PDF statement generation and upload to the private
 * Supabase Storage "statements" bucket (V19__statements_bucket.sql).
 * Runs entirely here in ledger-core, never client-side, so the
 * service-role key that bypasses Storage RLS never leaves the backend.
 *
 * Object path convention: "{userId}/{accountId}/{periodEnd}.pdf" *within*
 * the "statements" bucket - bucket_id is a separate column on
 * storage.objects, not part of the object name, so it is not repeated in
 * the path itself. This matters because statements_select_own reads
 * (storage.foldername(name))[1] as the owning user id: prefixing the
 * object name with "statements/" would shift that first folder segment
 * and break the policy.
 */
@Service
public class StatementService {

    private final AccountRepository accountRepository;
    private final TradeRepository tradeRepository;
    private final AuditLogRepository auditLogRepository;
    private final HttpClient httpClient;
    private final String supabaseUrl;
    private final String supabaseServiceRoleKey;

    public StatementService(
            AccountRepository accountRepository,
            TradeRepository tradeRepository,
            AuditLogRepository auditLogRepository,
            @Value("${ledger.statements.supabase-url}") String supabaseUrl,
            @Value("${ledger.statements.supabase-service-role-key}") String supabaseServiceRoleKey) {
        this.accountRepository = accountRepository;
        this.tradeRepository = tradeRepository;
        this.auditLogRepository = auditLogRepository;
        this.httpClient = HttpClient.newHttpClient();
        this.supabaseUrl = supabaseUrl;
        this.supabaseServiceRoleKey = supabaseServiceRoleKey;
    }

    /**
     * Generates a statement PDF for accountId covering
     * [periodStart, periodEnd] (inclusive) and uploads it to the
     * statements bucket. Only the account's own owner may request their
     * own statement - there is no delegated/support/auditor path onto
     * this endpoint, unlike account reads elsewhere in this project.
     */
    public String generateAndStore(UUID accountId, UUID requesterId, LocalDate periodStart, LocalDate periodEnd) {
        Account account = accountRepository.findById(accountId)
                .orElseThrow(() -> AccountNotFoundException.forAccountId(accountId));

        if (!account.getUserId().equals(requesterId)) {
            throw ForbiddenException.missingPermission("statements.generate.own");
        }

        OffsetDateTime rangeStart = periodStart.atStartOfDay().atOffset(ZoneOffset.UTC);
        OffsetDateTime rangeEnd = periodEnd.plusDays(1).atStartOfDay().atOffset(ZoneOffset.UTC);
        List<Trade> trades = tradeRepository.findByAccountIdAndExecutedAtBetweenOrderByExecutedAtAsc(
                accountId, rangeStart, rangeEnd);

        byte[] pdfBytes = renderPdf(account, periodStart, periodEnd, trades);
        String objectPath = requesterId + "/" + accountId + "/" + periodEnd + ".pdf";
        uploadToStorage(objectPath, pdfBytes);

        auditLogRepository.save(new AuditLog(
                requesterId,
                "STATEMENT_GENERATED",
                "account",
                accountId,
                Map.of(
                        "periodStart", periodStart.toString(),
                        "periodEnd", periodEnd.toString(),
                        "tradeCount", trades.size(),
                        "objectPath", objectPath)));

        return objectPath;
    }

    private byte[] renderPdf(Account account, LocalDate periodStart, LocalDate periodEnd, List<Trade> trades) {
        try (PDDocument document = new PDDocument()) {
            PDPage page = new PDPage();
            document.addPage(page);
            PDType1Font bold = new PDType1Font(Standard14Fonts.FontName.HELVETICA_BOLD);
            PDType1Font regular = new PDType1Font(Standard14Fonts.FontName.HELVETICA);

            try (PDPageContentStream content = new PDPageContentStream(document, page)) {
                float y = 740;
                content.beginText();
                content.setFont(bold, 16);
                content.newLineAtOffset(50, y);
                content.showText("TradePulse Account Statement");
                content.endText();

                y -= 30;
                content.beginText();
                content.setFont(regular, 11);
                content.newLineAtOffset(50, y);
                content.showText("Account: " + account.getId());
                content.endText();

                y -= 16;
                content.beginText();
                content.setFont(regular, 11);
                content.newLineAtOffset(50, y);
                content.showText("Period: " + periodStart + " to " + periodEnd);
                content.endText();

                y -= 30;
                content.beginText();
                content.setFont(bold, 11);
                content.newLineAtOffset(50, y);
                content.showText("Date         Symbol   Side   Quantity        Price");
                content.endText();

                if (trades.isEmpty()) {
                    y -= 16;
                    content.beginText();
                    content.setFont(regular, 10);
                    content.newLineAtOffset(50, y);
                    content.showText("No trades in this period.");
                    content.endText();
                }

                for (Trade trade : trades) {
                    y -= 16;
                    if (y < 50) {
                        break; // Phase 9: single-page statement for now; pagination is a later enhancement.
                    }
                    content.beginText();
                    content.setFont(regular, 10);
                    content.newLineAtOffset(50, y);
                    content.showText(String.format("%-12s %-8s %-6s %-14s %s",
                            trade.getExecutedAt().toLocalDate(),
                            trade.getSymbol(),
                            trade.getSide(),
                            trade.getQuantity().toPlainString(),
                            trade.getPrice().toPlainString()));
                    content.endText();
                }
            }

            ByteArrayOutputStream out = new ByteArrayOutputStream();
            document.save(out);
            return out.toByteArray();
        } catch (IOException e) {
            throw new UncheckedIOException("Failed to render statement PDF", e);
        }
    }

    private void uploadToStorage(String objectPath, byte[] pdfBytes) {
        URI uri = URI.create(supabaseUrl + "/storage/v1/object/statements/" + objectPath);
        HttpRequest request = HttpRequest.newBuilder(uri)
                .header("Authorization", "Bearer " + supabaseServiceRoleKey)
                .header("apikey", supabaseServiceRoleKey)
                .header("Content-Type", "application/pdf")
                .header("x-upsert", "true")
                .PUT(HttpRequest.BodyPublishers.ofByteArray(pdfBytes))
                .build();
        try {
            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() >= 300) {
                throw new IllegalStateException(
                        "Supabase Storage upload failed: HTTP " + response.statusCode() + " " + response.body());
            }
        } catch (IOException | InterruptedException e) {
            if (e instanceof InterruptedException) {
                Thread.currentThread().interrupt();
            }
            throw new IllegalStateException("Supabase Storage upload failed", e);
        }
    }
}
