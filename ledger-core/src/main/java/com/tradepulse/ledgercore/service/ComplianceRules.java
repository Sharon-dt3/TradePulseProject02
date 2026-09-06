package com.tradepulse.ledgercore.service;

import java.math.BigDecimal;
import java.util.Optional;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import com.tradepulse.ledgercore.domain.Account;
import com.tradepulse.ledgercore.domain.RejectionReason;
import com.tradepulse.ledgercore.domain.Trade;

/**
 * Phase 4: pre-trade checks run after the price/staleness check (a
 * compliance decision needs a real reference price to mean anything) and
 * before LedgerService.postTrade — a violation here rejects the order
 * exactly like NO_MARKET/STALE_PRICE, never reaching the ledger write.
 *
 * Two checks, in this order:
 *
 *  1. INSUFFICIENT_POSITION - a SELL on a non-margin account can't take
 *     the position below zero. Margin-enabled accounts are exempt from
 *     this one check only; margin trading itself (tracking margin_used,
 *     a different notional limit) isn't built - that's Phase 11.
 *
 *  2. NOTIONAL_LIMIT_EXCEEDED - deliberately notional
 *     (|positionAfter| x referencePrice), not share count, against
 *     ledger.max-position-notional. Two accounts holding $10,000 of a $2
 *     stock (5,000 shares) and $10,000 of a $400 stock (25 shares) are
 *     treated identically by this check; two accounts holding equal
 *     share counts of those same two stocks are not - notional is what
 *     actually represents risk exposure, share count doesn't.
 *
 *     This check only fires when the trade INCREASES exposure
 *     (|positionAfter| > |currentPosition|). An account already over the
 *     cap (e.g. from a limit lowered after the position was built, or a
 *     large pre-Phase-4 fill) must always be allowed to de-risk — a
 *     SELL that shrinks an oversized long position is moving the account
 *     toward compliance, not away from it, and blocking it would trap
 *     the account in its worst state instead of letting it recover.
 *
 * referencePrice is passed in rather than looked up here - OrderService
 * already fetched and freshness-checked it for the NO_MARKET/STALE_PRICE
 * decision, and this reuses that same value rather than querying
 * PriceCache a second time for the same symbol.
 */
@Component
public class ComplianceRules {

    private final BigDecimal maxPositionNotional;

    public ComplianceRules(@Value("${ledger.max-position-notional}") BigDecimal maxPositionNotional) {
        this.maxPositionNotional = maxPositionNotional;
    }

    public Optional<RejectionReason> firstViolation(
            Account account,
            Trade.Side side,
            BigDecimal quantity,
            BigDecimal currentPosition,
            BigDecimal referencePrice
    ) {
        if (side == Trade.Side.SELL
                && !account.isMarginEnabled()
                && currentPosition.compareTo(quantity) < 0) {
            return Optional.of(RejectionReason.INSUFFICIENT_POSITION);
        }

        BigDecimal signedQuantity = side == Trade.Side.BUY ? quantity : quantity.negate();
        BigDecimal positionAfter = currentPosition.add(signedQuantity);

        boolean increasesExposure = positionAfter.abs().compareTo(currentPosition.abs()) > 0;
        if (increasesExposure) {
            BigDecimal notionalAfter = positionAfter.abs().multiply(referencePrice);
            if (notionalAfter.compareTo(maxPositionNotional) > 0) {
                return Optional.of(RejectionReason.NOTIONAL_LIMIT_EXCEEDED);
            }
        }

        return Optional.empty();
    }
}