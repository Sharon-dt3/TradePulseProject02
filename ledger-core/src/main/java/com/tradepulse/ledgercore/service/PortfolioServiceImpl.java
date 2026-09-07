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
    private static final String POSITIONS_READ_GRANTED_PERMISSION = "positions.read.granted";
    private static final String TRADES_READ_GRANTED_PERMISSION = "trades.read.granted";

    private final AccountService accountService;
    private final TradeRepository tradeRepository;
    private final PermissionService permissionService;
    private final AccountAccessService accountAccessService;

    public PortfolioServiceImpl(AccountService accountService, TradeRepository tradeRepository,
                                 PermissionService permissionService, AccountAccessService accountAccessService) {
        this.accountService = accountService;
        this.tradeRepository = tradeRepository;
        this.permissionService = permissionService;
        this.accountAccessService = accountAccessService;
    }

    @Override
    public List<PositionDto> listPositions(List<String> roles, UUID userId) {
        permissionService.requirePermission(roles, POSITIONS_READ_OWN_PERMISSION);

        Account account = accountService.getAccountForUser(userId)
                .orElseThrow(() -> AccountNotFoundException.forUserId(userId));

        return positionsForAccountId(account.getId());
    }

    @Override
    public List<PositionDto> listPositionsForAccount(List<String> roles, UUID callerId, UUID accountId) {
        Account account = accountAccessService.resolveReadableAccount(
                roles, callerId, accountId, POSITIONS_READ_OWN_PERMISSION, POSITIONS_READ_GRANTED_PERMISSION);
        return positionsForAccountId(account.getId());
    }

    private List<PositionDto> positionsForAccountId(UUID accountId) {
        return tradeRepository.currentPositionsByAccount(accountId).stream()
                .map(PositionDto::from)
                .toList();
    }

    @Override
    public List<TradeResultDto> listTrades(List<String> roles, UUID userId) {
        permissionService.requirePermission(roles, TRADES_READ_OWN_PERMISSION);

        Account account = accountService.getAccountForUser(userId)
                .orElseThrow(() -> AccountNotFoundException.forUserId(userId));

        return tradesForAccountId(account.getId());
    }

    @Override
    public List<TradeResultDto> listTradesForAccount(List<String> roles, UUID callerId, UUID accountId) {
        Account account = accountAccessService.resolveReadableAccount(
                roles, callerId, accountId, TRADES_READ_OWN_PERMISSION, TRADES_READ_GRANTED_PERMISSION);
        return tradesForAccountId(account.getId());
    }

    private List<TradeResultDto> tradesForAccountId(UUID accountId) {
        return tradeRepository.findByAccountIdOrderByExecutedAtDesc(accountId).stream()
                .map(TradeResultDto::from)
                .toList();
    }
}
