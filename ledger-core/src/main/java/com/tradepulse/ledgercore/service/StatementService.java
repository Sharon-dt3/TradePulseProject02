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
import com.tradepulse.ledgercore.exception.InvalidStatementPeriodException;
import com.tradepulse.ledgercore.repository.AccountRepository;
import com.tradepulse.ledgercore.repository.AuditLogRepository;
import com.tradepulse.ledgercore.repository.TradeRepository;

/**
 * Generates account-statement PDFs for an exact inclusive date range, stores
 * them in the private Supabase Storage statements bucket, and returns the
 * generated document to the authenticated account owner.
 */
@Service
public class StatementService {

    private static final int TRADES_PER_PAGE = 38;

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

    // PUBLIC_INTERFACE
    /**
     * Generates, stores, and returns an account statement for the selected dates.
     * The requested interval is inclusive on both calendar dates and is translated
     * to [start-of-start-date, start-of-day-after-end-date) in UTC for the query.
     *
     * @param accountId the statement account
     * @param requesterId the authenticated account owner
     * @param periodStart the first included calendar date
     * @param periodEnd the last included calendar date
     * @return the generated PDF bytes and its safe download filename
     */
    public GeneratedStatement generateAndStore(
            UUID accountId,
            UUID requesterId,
            LocalDate periodStart,
            LocalDate periodEnd) {
        if (periodEnd.isBefore(periodStart)) {
            throw InvalidStatementPeriodException.endBeforeStart();
        }

        Account account = accountRepository.findById(accountId)
                .orElseThrow(() -> AccountNotFoundException.forAccountId(accountId));
        if (!account.getUserId().equals(requesterId)) {
            throw ForbiddenException.missingPermission("statements.generate.own");
        }

        OffsetDateTime rangeStart = periodStart.atStartOfDay().atOffset(ZoneOffset.UTC);
        OffsetDateTime rangeEndExclusive = periodEnd.plusDays(1).atStartOfDay().atOffset(ZoneOffset.UTC);
        List<Trade> trades =
                tradeRepository.findByAccountIdAndExecutedAtGreaterThanEqualAndExecutedAtLessThanOrderByExecutedAtAsc(
                        accountId,
                        rangeStart,
                        rangeEndExclusive);

        byte[] pdfBytes = renderPdf(account, periodStart, periodEnd, trades);
        String filename = "tradepulse-statement-" + periodStart + "-to-" + periodEnd + ".pdf";
        String objectPath = requesterId + "/" + accountId + "/" + filename;
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

        return new GeneratedStatement(filename, pdfBytes);
    }

    private byte[] renderPdf(Account account, LocalDate periodStart, LocalDate periodEnd, List<Trade> trades) {
        try (PDDocument document = new PDDocument()) {
            PDType1Font bold = new PDType1Font(Standard14Fonts.FontName.HELVETICA_BOLD);
            PDType1Font regular = new PDType1Font(Standard14Fonts.FontName.HELVETICA);
            int pageCount = Math.max(1, (int) Math.ceil((double) trades.size() / TRADES_PER_PAGE));

            for (int pageIndex = 0; pageIndex < pageCount; pageIndex++) {
                int fromIndex = pageIndex * TRADES_PER_PAGE;
                int toIndex = Math.min(fromIndex + TRADES_PER_PAGE, trades.size());
                PDPage page = new PDPage();
                document.addPage(page);

                try (PDPageContentStream content = new PDPageContentStream(document, page)) {
                    float y = 740;
                    writeLine(content, bold, 16, 50, y, "TradePulse Account Statement");
                    y -= 28;
                    writeLine(content, regular, 11, 50, y, "Account: " + account.getId());
                    y -= 16;
                    writeLine(content, regular, 11, 50, y, "Period: " + periodStart + " to " + periodEnd);
                    y -= 16;
                    writeLine(content, regular, 10, 50, y,
                            "Page " + (pageIndex + 1) + " of " + pageCount + " | " + trades.size() + " trade(s)");
                    y -= 28;
                    writeLine(content, bold, 10, 50, y,
                            "Date         Symbol   Side   Quantity        Price");

                    if (trades.isEmpty()) {
                        y -= 18;
                        writeLine(content, regular, 10, 50, y, "No trades in this period.");
                    }

                    for (Trade trade : trades.subList(fromIndex, toIndex)) {
                        y -= 16;
                        writeLine(content, regular, 10, 50, y, String.format(
                                "%-12s %-8s %-6s %-14s %s",
                                trade.getExecutedAt().toLocalDate(),
                                trade.getSymbol(),
                                trade.getSide(),
                                trade.getQuantity().toPlainString(),
                                trade.getPrice().toPlainString()));
                    }
                }
            }

            ByteArrayOutputStream output = new ByteArrayOutputStream();
            document.save(output);
            return output.toByteArray();
        } catch (IOException exception) {
            throw new UncheckedIOException("Failed to render statement PDF", exception);
        }
    }

    private void writeLine(
            PDPageContentStream content,
            PDType1Font font,
            float fontSize,
            float x,
            float y,
            String text) throws IOException {
        content.beginText();
        content.setFont(font, fontSize);
        content.newLineAtOffset(x, y);
        content.showText(text);
        content.endText();
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
                        "Supabase Storage upload failed: HTTP "
                                + response.statusCode()
                                + " "
                                + response.body());
            }
        } catch (IOException | InterruptedException exception) {
            if (exception instanceof InterruptedException) {
                Thread.currentThread().interrupt();
            }
            throw new IllegalStateException("Supabase Storage upload failed", exception);
        }
    }

    /**
     * Immutable result returned to the web controller after statement generation.
     */
    public record GeneratedStatement(String filename, byte[] pdfBytes) {
    }
}
