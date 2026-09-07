package com.tradepulse.ledgercore.web.dto;

import java.util.List;
import java.util.UUID;

public record UserSummaryDto(UUID userId, String email, List<String> roles) {
}
