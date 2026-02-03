package com.indichess.matchservice.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;

import java.time.Instant;

@Getter
@AllArgsConstructor
public class MatchDto {

    private final Long id;
    private final String createdByEmail;
    private final String opponentEmail;
    private final String status;
    private final Instant createdAt;
    private final Instant updatedAt;
}
