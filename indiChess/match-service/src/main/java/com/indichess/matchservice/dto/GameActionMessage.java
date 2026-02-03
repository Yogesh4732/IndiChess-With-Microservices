package com.indichess.matchservice.dto;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class GameActionMessage {

    private String playerColor; // "white" or "black"
    private String timestamp;   // optional ISO-8601
    private Long matchId;       // optional, path variable is primary
}
