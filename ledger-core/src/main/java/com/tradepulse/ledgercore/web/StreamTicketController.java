package com.tradepulse.ledgercore.web;

import java.util.UUID;

import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RestController;

import com.tradepulse.ledgercore.service.StreamTicketService;
import com.tradepulse.ledgercore.web.dto.StreamTicketDto;

/**
 * Phase 10: any authenticated user can mint a ticket for their own SSE
 * connection - there is no separate permission for this, since the
 * ticket only proves identity. What that identity is then allowed to
 * see over SSE is still enforced downstream (the same role/scope and
 * RLS checks that already gate every other read in this project), not
 * by ticket issuance itself.
 */
@RestController
public class StreamTicketController {

    private final StreamTicketService streamTicketService;

    public StreamTicketController(StreamTicketService streamTicketService) {
        this.streamTicketService = streamTicketService;
    }

    @PostMapping("/stream/tickets")
    public StreamTicketDto issueTicket(Authentication authentication) {
        Jwt jwt = (Jwt) authentication.getPrincipal();
        UUID userId = UUID.fromString(jwt.getSubject());
        return new StreamTicketDto(streamTicketService.issueTicket(userId));
    }
}
