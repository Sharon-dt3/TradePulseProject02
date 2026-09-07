package com.tradepulse.ledgercore.service;

import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;

import com.tradepulse.ledgercore.domain.Account;
import com.tradepulse.ledgercore.domain.JournalEntry;
import com.tradepulse.ledgercore.domain.JournalLine;
import com.tradepulse.ledgercore.exception.AccountNotFoundException;
import com.tradepulse.ledgercore.repository.JournalEntryRepository;
import com.tradepulse.ledgercore.repository.JournalLineRepository;
import com.tradepulse.ledgercore.web.dto.TransactionDto;

@Service
public class LedgerTransactionServiceImpl implements LedgerTransactionService {

    private static final String LEDGER_TRANSACTIONS_READ_OWN_PERMISSION = "ledger.transactions.read.own";

    private final AccountService accountService;
    private final JournalLineRepository journalLineRepository;
    private final JournalEntryRepository journalEntryRepository;
    private final PermissionService permissionService;

    public LedgerTransactionServiceImpl(AccountService accountService,
                                         JournalLineRepository journalLineRepository,
                                         JournalEntryRepository journalEntryRepository,
                                         PermissionService permissionService) {
        this.accountService = accountService;
        this.journalLineRepository = journalLineRepository;
        this.journalEntryRepository = journalEntryRepository;
        this.permissionService = permissionService;
    }

    @Override
    public List<TransactionDto> listTransactions(List<String> roles, UUID userId) {
        permissionService.requirePermission(roles, LEDGER_TRANSACTIONS_READ_OWN_PERMISSION);

        Account account = accountService.getAccountForUser(userId)
                .orElseThrow(() -> AccountNotFoundException.forUserId(userId));

        List<JournalLine> lines = journalLineRepository.findByAccountIdOrderByCreatedAtDesc(account.getId());

        // Same batch-fetch-then-zip shape as OrderServiceImpl.listOrders'
        // trade lookup - one extra query for the whole page, not one per
        // line.
        List<UUID> entryIds = lines.stream().map(JournalLine::getJournalEntryId).distinct().toList();
        Map<UUID, JournalEntry> entryById = journalEntryRepository.findAllById(entryIds).stream()
                .collect(Collectors.toMap(JournalEntry::getId, Function.identity()));

        return lines.stream()
                .map(line -> TransactionDto.from(line, entryById.get(line.getJournalEntryId())))
                .toList();
    }
}
