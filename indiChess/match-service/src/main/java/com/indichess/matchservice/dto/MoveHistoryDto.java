package com.indichess.matchservice.dto;

import com.indichess.matchservice.model.PieceColor;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class MoveHistoryDto {

    private int ply;
    private int moveNumber;
    private PieceColor color;
    private String san;
    private String fenBefore;
    private String fenAfter;
    private Instant createdAt;
}
