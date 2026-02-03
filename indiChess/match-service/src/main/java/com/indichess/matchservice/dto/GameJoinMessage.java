package com.indichess.matchservice.dto;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class GameJoinMessage {

    private String type;        // e.g. "PLAYER_JOINED"
    private String playerColor; // "white" or "black"
    private String timestamp;   // ISO-8601 string from client
}
