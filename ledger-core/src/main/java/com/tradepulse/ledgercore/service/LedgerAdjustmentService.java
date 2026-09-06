package com.tradepulse.ledgercore.service;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.tradepulse.ledgercore.domain.AuditLog;
import com.tradepulse.ledgercore.domain.JournalEntry;
import com.tradepulse.ledgercore.domain.JournalLine;
import com.tradepulse.ledgercore.domain.LedgerAdjustment;
import com.tradepulse.ledgercore.exception.AccountNotFoundException;
import com.tradepulse.ledgercore.exception.ForbiddenException;
import com.tradepulse.ledgercore.exception.LedgerAdjustmentNotFoundException;
import com.tradepulse.ledgercore.repository.AccountRepository;
import com.tradepulse.ledgercore.repository.AuditLogRepository;
import com.tradepulse.ledgercore.repository.JournalEntryRepository;
import com.tradepulse.ledgercore.repository.JournalLineRepository;
import com.tradepulse.ledgercore.repository.LedgerAdjustmentRepository;

@Service
public class LedgerAdjustmentService {

    private final LedgerAdjustmentRepository ledgerAdjustmentRepository;
    private final AccountRepository accountRepository;
    private final JournalEntryRepository journalEntryRepository;
    private final JournalLineRepository journalLineRepository;
    private final AuditLogRepository auditLogRepository;
    private final PermissionService permissionService;

    public LedgerAdjustmentService(
            LedgerAdjustmentRepository ledgerAdjustmentRepository,
            AccountRepository accountRepository,
            JournalEntryRepository journalEntryRepository,
            JournalLineRepository journalLineRepository,
            AuditLogRepository auditLogRepository,
            PermissionService permissionService) {
        this.ledgerAdjustmentRepository = ledgerAdjustmentRepository;
        this.accountRepository = accountRepository;
        this.journalEntryRepository = journalEntryRepository;
        this.journalLineRepository = journalLineRepository;
        this.auditLogRepository = auditLogRepository;
        this.permissionService = permissionService;
    }

    @Transactional
    public LedgerAdjustment proposeAdjustment(
            UUID accountId, UUID proposedBy, List<String> roles, BigDecimal amount, String reason) {
        permissionService.requirePermission(roles, "ledger.adjustment.propose");

        LedgerAdjustment adjustment = LedgerAdjustment.propose(accountId, proposedBy, amount, reason);
        ledgerAdjustmentRepository.save(adjustment);

        auditLogRepository.save(new AuditLog(
                proposedBy,
                "LEDGER_ADJUSTMENT_PROPOSED",
                "LEDGER_ADJUSTMENT",
                adjustment.getId(),
                Map.of(
                        "accountId", accountId.toString(),
                        "amount", amount.toString(),
                        "reason", reason)));

        return adjustment;
    }

    @Transactional
    public LedgerAdjustment approveAdjustment(UUID adjustmentId, UUID approvedBy, List<String> roles) {
        permissionService.requirePermission(roles, "ledger.adjustment.approve");

        LedgerAdjustment adjustment = ledgerAdjustmentRepository.findById(adjustmentId)
                .orElseThrow(() -> LedgerAdjustmentNotFoundException.forId(adjustmentId));

        if (approvedBy.equals(adjustment.getProposedBy())) {
            throw ForbiddenException.selfApprovalNotAllowed();
        }

        adjustment.approve(approvedBy);

        int updated = accountRepository.adjustCashBalance(adjustment.getAccountId(), adjustment.getAmount());
        if (updated == 0) {
            throw AccountNotFoundException.forAccountId(adjustment.getAccountId());
        }

        JournalEntry journalEntry = JournalEntry.forAdjustment(
                adjustment.getId(), "Admin adjustment: " + adjustment.getReason());
        journalEntryRepository.save(journalEntry);

        JournalLine journalLine = new JournalLine(
                journalEntry.getId(), adjustment.getAccountId(), adjustment.getAmount());
        journalLineRepository.save(journalLine);

        ledgerAdjustmentRepository.save(adjustment);

        auditLogRepository.save(new AuditLog(
                approvedBy,
                "LEDGER_ADJUSTMENT_APPROVED",
                "LEDGER_ADJUSTMENT",
                adjustment.getId(),
                Map.of(
                        "accountId", adjustment.getAccountId().toString(),
                        "amount", adjustment.getAmount().toString())));

        return adjustment;
    }
}
