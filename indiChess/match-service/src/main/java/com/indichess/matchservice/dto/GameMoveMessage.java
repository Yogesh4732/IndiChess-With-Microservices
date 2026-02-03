package com.indichess.matchservice.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class GameMoveMessage {

    // Flat coordinates used by the frontend
    private Integer fromRow;
    private Integer fromCol;
    private Integer toRow;
    private Integer toCol;

    private String piece;
    private String capturedPiece;
    private Boolean castled;

    @JsonProperty("isEnPassant")
    private Boolean enPassant;

    @JsonProperty("isPromotion")
    private Boolean promotion;

    private String fenBefore;
    private String fenAfter;

    // Full board state after move (optional but supported by the frontend)
    private List<List<String>> board;

    @JsonProperty("isWhiteTurn")
    private Boolean whiteTurn; // whose turn it is (true -> white, false -> black)

    private String playerColor; // color of the player who made this move
    private Long matchId;
    private String timestamp;

    // Optional: algebraic notation or other metadata
    private String moveNotation;
}
