package com.indichess.matchservice.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class GameStateMessage {

    private Long matchId;
    private String status;     // e.g. "Game started"
    private boolean isMyTurn;  // whether the joining player should move
    private String gameType;   // e.g. "STANDARD" or "RAPID"
    private String result;     // e.g. "WHITE wins by resignation"
}
