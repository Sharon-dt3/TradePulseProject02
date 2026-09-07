package com.tradepulse.ledgercore.service;

import com.tradepulse.ledgercore.domain.Account;
import com.tradepulse.ledgercore.repository.AccountRepository;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
public class AccountServiceImpl implements AccountService {

    private static final String ACCOUNT_READ_PERMISSION = "account.read.own";

    private final AccountRepository accountRepository;
    private final PermissionService permissionService;

    public AccountServiceImpl(AccountRepository accountRepository, PermissionService permissionService) {
        this.accountRepository = accountRepository;
        this.permissionService = permissionService;
    }

    @Override
    public Optional<Account> getAccountForUser(UUID userId) {
        return accountRepository.findByUserId(userId);
    }

    @Override
    public Optional<Account> getMyAccount(List<String> roles, UUID userId) {
        permissionService.requirePermission(roles, ACCOUNT_READ_PERMISSION);
        return getAccountForUser(userId);
    }
}