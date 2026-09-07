package com.tradepulse.ledgercore.service;

import com.tradepulse.ledgercore.domain.Account;
import com.tradepulse.ledgercore.domain.AuthUser;
import com.tradepulse.ledgercore.repository.AccountRepository;
import com.tradepulse.ledgercore.repository.AuthUserRepository;
import com.tradepulse.ledgercore.web.dto.AccountSummaryDto;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class AccountServiceImpl implements AccountService {

    private static final String ACCOUNT_READ_PERMISSION = "account.read.own";
    private static final String ACCOUNT_READ_GRANTED_PERMISSION = "account.read.granted";
    private static final String ACCOUNT_READ_ANY_PERMISSION = "account.read.any";

    private final AccountRepository accountRepository;
    private final AuthUserRepository authUserRepository;
    private final PermissionService permissionService;
    private final AccountAccessService accountAccessService;

    public AccountServiceImpl(AccountRepository accountRepository, AuthUserRepository authUserRepository,
                               PermissionService permissionService, AccountAccessService accountAccessService) {
        this.accountRepository = accountRepository;
        this.authUserRepository = authUserRepository;
        this.permissionService = permissionService;
        this.accountAccessService = accountAccessService;
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

    @Override
    public Account getAccount(List<String> roles, UUID callerId, UUID accountId) {
        return accountAccessService.resolveReadableAccount(
                roles, callerId, accountId,
                ACCOUNT_READ_PERMISSION, ACCOUNT_READ_GRANTED_PERMISSION, ACCOUNT_READ_ANY_PERMISSION);
    }

    @Override
    public List<AccountSummaryDto> listAllAccounts(List<String> roles) {
        permissionService.requirePermission(roles, ACCOUNT_READ_ANY_PERMISSION);

        Map<UUID, String> emailByUserId = authUserRepository.findAllByOrderByEmailAsc().stream()
                .collect(Collectors.toMap(AuthUser::getId, AuthUser::getEmail));

        return accountRepository.findAll().stream()
                .map(account -> new AccountSummaryDto(
                        account.getId(),
                        account.getUserId(),
                        emailByUserId.get(account.getUserId()),
                        account.getCashBalance(),
                        account.isMarginEnabled(),
                        account.isFrozen()))
                .toList();
    }
}