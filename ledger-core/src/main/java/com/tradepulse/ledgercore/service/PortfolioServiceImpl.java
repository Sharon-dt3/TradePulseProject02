package com.tradepulse.ledgercore.service;

import java.util.List;
import java.util.UUID;

import org.springframework.stereotype.Service;

import com.tradepulse.ledgercore.domain.Account;
import com.tradepulse.ledgercore.exception.AccountNotFoundException;
import com.tradepulse.ledgercore.repository.TradeRepository;
import com.tradepulse.ledgercore.web.dto.PositionDto;
import com.tradepulse.ledgercore.web.dto.TradeResultDto;

@Service
public class PortfolioServiceImpl implements PortfolioService {

    private static final String POSITIONS_READ_OWN_PERMISSION = "positions.read.own";
    private static final String TRADES_READ_OWN_PERMISSION = "trades.read.own";

    private final AccountService accountService;
    private final TradeRepository tradeRepository;
    private final PermissionService permissionService;

    public PortfolioServiceImpl(AccountService accountService, TradeRepository tradeRepository,
                                 PermissionService permissionService) {
        this.accountService = accountService;
        this.tradeRepository = tradeRepository;
        this.permissionService = permissionService;
    }

    @Override
    public List<PositionDto> listPositions(List<String> roles, UUID userId) {
        permissionService.requirePermission(roles, POSITIONS_READ_OWN_PERMISSION);

        Account account = accountService.getAccountForUser(userId)
                .orElseThrow(() -> AccountNotFoundException.forUserId(userId));

        return tradeRepository.currentPositionsByAccount(account.getId()).stream()
                .map(PositionDto::from)
                .toList();
    }

    @Override
    public List<TradeResultDto> listTrades(List<String> roles, UUID userId) {
        permissionService.requirePermission(roles, TRADES_READ_OWN_PERMISSION);

        Account account = accountService.getAccountForUser(userId)
                .orElseThrow(() -> AccountNotFoundException.forUserId(userId));

        return tradeRepository.findByAccountIdOrderByExecutedAtDesc(account.getId()).stream()
                .map(TradeResultDto::from)
                .toList();
    }
}
