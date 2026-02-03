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
public class DrawOfferMessage {

    private Long matchId;

    /**
     * Type of draw-related event.
     * Expected values:
     *  - "DRAW_OFFER" when a player offers a draw
     *  - "DRAW_ACCEPTED" when a draw has been accepted
     */
    private String type;

    /**
     * The color of the player initiating the event ("white" or "black").
     */
    private String playerColor;

    /**
     * Optional human‑readable result, e.g. "Draw agreed".
     */
    private String result;
}
