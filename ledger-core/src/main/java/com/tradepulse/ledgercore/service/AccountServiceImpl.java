package com.tradepulse.ledgercore.service;

import com.tradepulse.ledgercore.domain.Account;
import com.tradepulse.ledgercore.repository.AccountRepository;
import org.springframework.stereotype.Service;

import java.util.Optional;
import java.util.UUID;

@Service
public class AccountServiceImpl implements AccountService {

    private final AccountRepository accountRepository;

    public AccountServiceImpl(AccountRepository accountRepository) {
        this.accountRepository = accountRepository;
    }

    @Override
    public Optional<Account> getAccountForUser(UUID userId) {
        return accountRepository.findByUserId(userId);
    }
}