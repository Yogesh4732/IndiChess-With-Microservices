
package com.indichess.matchservice.controller;

import com.indichess.matchservice.dto.GameJoinMessage;
import com.indichess.matchservice.dto.ChatMessageDto;
import com.indichess.matchservice.dto.DrawOfferMessage;
import com.indichess.matchservice.dto.GameMoveMessage;
import com.indichess.matchservice.dto.GameStateMessage;
import com.indichess.matchservice.dto.GameActionMessage;
import com.indichess.matchservice.model.ChatMessage;
import com.indichess.matchservice.model.Match;
import com.indichess.matchservice.model.Move;
import com.indichess.matchservice.model.PieceColor;
import com.indichess.matchservice.repo.ChatMessageRepository;
import com.indichess.matchservice.repo.MoveRepository;
import com.indichess.matchservice.model.Match;
import com.indichess.matchservice.repo.MatchRepository;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.handler.annotation.SendTo;
import org.springframework.stereotype.Controller;

import java.util.Optional;

@Controller
@RequiredArgsConstructor
public class GameWebSocketController {

    private static final Logger log = LoggerFactory.getLogger(GameWebSocketController.class);

    private final MatchRepository matchRepository;
    private final MoveRepository moveRepository;
    private final ChatMessageRepository chatMessageRepository;

    /**
     * Handle a player joining a game via STOMP.
     * The frontend sends a message to /app/game/{matchId}/join and expects
     * an initial game state on /topic/game/{matchId}.
     */
    @MessageMapping("/game/{matchId}/join")
    @SendTo("/topic/game/{matchId}")
    public GameStateMessage handleJoin(@DestinationVariable Long matchId,
                                       @Payload GameJoinMessage joinMessage) {
        // Look up the match once and optionally short‑circuit if it's already finished.
        Optional<Match> matchOpt = matchRepository.findById(matchId);
        if (matchOpt.isPresent()) {
            Match existing = matchOpt.get();
            if ("FINISHED".equalsIgnoreCase(existing.getStatus())) {
                log.warn("Ignoring join for finished match {}", matchId);
                return null; // no broadcast
            }
        }

        log.info("Player joined match {} with payload: type={}, color={}, ts={}",
                matchId, joinMessage.getType(), joinMessage.getPlayerColor(), joinMessage.getTimestamp());

        // Optionally verify that the match exists; if not, still return a basic state so the UI doesn't hang.
        String status;
        boolean isMyTurn;
        String gameType = "STANDARD";

        if (matchOpt.isPresent()) {
            Match match = matchOpt.get();

            if (match.getGameType() != null) {
                gameType = match.getGameType();
            }

            if (match.getOpponentEmail() == null) {
                // No opponent yet - show waiting state and do not allow moves.
                status = "Waiting for opponent";
                isMyTurn = false;
            } else if ("IN_PROGRESS".equalsIgnoreCase(match.getStatus())) {
                status = "Game in progress";
                // White starts by default; we treat the joining player's color as "my" color.
                isMyTurn = "white".equalsIgnoreCase(joinMessage.getPlayerColor());
            } else {
                status = "Game started";
                isMyTurn = "white".equalsIgnoreCase(joinMessage.getPlayerColor());
            }
        } else {
            status = "Game started";
            isMyTurn = "white".equalsIgnoreCase(joinMessage.getPlayerColor());
        }

        return GameStateMessage.builder()
            .matchId(matchId)
            .status(status)
            .isMyTurn(isMyTurn)
            .gameType(gameType)
            .build();
    }

    /**
     * Handle a chess move sent by a client.
     * Frontend publishes to /app/game/{matchId}/move and all subscribers
     * listen on /topic/moves/{matchId}.
     *
     * We simply toggle the turn and broadcast the move payload back so that:
     *  - both clients update their boards, and
     *  - the opponent's client sees that it's now their turn.
     */
    @MessageMapping("/game/{matchId}/move")
    @SendTo("/topic/moves/{matchId}")
    public GameMoveMessage handleMove(@DestinationVariable Long matchId,
                                      @Payload GameMoveMessage moveMessage) {
        // Check if the match is already finished; if so, ignore further moves.
        Optional<Match> matchOpt = matchRepository.findById(matchId);
        if (matchOpt.isPresent()) {
            Match match = matchOpt.get();
            if ("FINISHED".equalsIgnoreCase(match.getStatus())) {
                log.warn("Ignoring move for finished match {}", matchId);
                return null; // no broadcast
            }
        }

        log.info("Move in match {} from ({},{}) to ({},{}), piece={}, playerColor={}, isWhiteTurn={}",
                matchId,
                moveMessage.getFromRow(),
                moveMessage.getFromCol(),
                moveMessage.getToRow(),
                moveMessage.getToCol(),
                moveMessage.getPiece(),
                moveMessage.getPlayerColor(),
                moveMessage.getWhiteTurn());

        // The client sends whiteTurn = true when WHITE makes a move, false when BLACK moves.
        // For the next turn we simply flip this flag so that the other client knows it's their turn.
        Boolean currentWhiteTurn = moveMessage.getWhiteTurn();
        boolean nextWhiteTurn = currentWhiteTurn == null ? false : !currentWhiteTurn;
        moveMessage.setWhiteTurn(nextWhiteTurn);

        // Ensure matchId is set (frontend also sends it, but we trust the path variable)
        moveMessage.setMatchId(matchId);

        // Persist this move in the database for later history retrieval.
    matchOpt.ifPresent(m -> saveMove(m, moveMessage));

        return moveMessage;
    }

    private void saveMove(Match match, GameMoveMessage moveMessage) {
        // Determine current ply as (existing moves + 1)
        long existing = moveRepository.countByMatch_Id(match.getId());
        int ply = (int) existing + 1;

        Move move = new Move();
        move.setMatch(match);
        move.setPly(ply);
        move.setMoveNumber((ply + 1) / 2); // 1,1,2,2,3,3,...

        // Color: we treat the player who sent this move as the moving color
        String colorStr = moveMessage.getPlayerColor();
        if ("white".equalsIgnoreCase(colorStr)) {
            move.setColor(PieceColor.WHITE);
        } else if ("black".equalsIgnoreCase(colorStr)) {
            move.setColor(PieceColor.BLACK);
        }

        // Basic notation: from/to squares, e.g. e2e4 as UCI and e4 as SAN-like
        if (moveMessage.getFromRow() != null && moveMessage.getFromCol() != null
                && moveMessage.getToRow() != null && moveMessage.getToCol() != null) {
            char fromFile = (char) ('a' + moveMessage.getFromCol());
            int fromRank = 8 - moveMessage.getFromRow();
            char toFile = (char) ('a' + moveMessage.getToCol());
            int toRank = 8 - moveMessage.getToRow();

            String uci = "" + fromFile + fromRank + toFile + toRank;
            move.setUci(uci);
            move.setSan(moveMessage.getMoveNotation() != null
                    ? moveMessage.getMoveNotation()
                    : ("" + toFile + toRank));
        }

        move.setFenBefore(moveMessage.getFenBefore());
        move.setFenAfter(moveMessage.getFenAfter());

        moveRepository.save(move);
    }

    /**
     * Handle resignation: one player resigns, game ends for both.
     * Frontend publishes to /app/game/{matchId}/resign and both clients
     * listen on /topic/game-state/{matchId}.
     */
    @MessageMapping("/game/{matchId}/resign")
    @SendTo("/topic/game-state/{matchId}")
    public GameStateMessage handleResign(@DestinationVariable Long matchId,
                                         @Payload GameActionMessage action) {
        String resigningColor = action.getPlayerColor();
        String winnerColor;
        if ("white".equalsIgnoreCase(resigningColor)) {
            winnerColor = "BLACK";
        } else if ("black".equalsIgnoreCase(resigningColor)) {
            winnerColor = "WHITE";
        } else {
            winnerColor = "UNKNOWN";
        }

        // Mark match as finished
        Match match = matchRepository.findById(matchId).orElse(null);
        String gameType = "STANDARD";
        if (match != null) {
            match.setStatus("FINISHED");
            if (match.getGameType() != null) {
                gameType = match.getGameType();
            }
            matchRepository.save(match);
        }

        return GameStateMessage.builder()
                .matchId(matchId)
                .status("Game Over")
                .isMyTurn(false)
                .gameType(gameType)
                .result(winnerColor + " wins by resignation")
                .build();
    }

    /**
     * Handle a draw offer: one player offers a draw to the opponent.
     * Frontend publishes to /app/game/{matchId}/draw and both clients
     * listen on /topic/draw-offers/{matchId}.
     */
    @MessageMapping("/game/{matchId}/draw")
    @SendTo("/topic/draw-offers/{matchId}")
    public DrawOfferMessage handleDrawOffer(@DestinationVariable Long matchId,
                                            @Payload GameActionMessage action) {
        String color = action.getPlayerColor();
        log.info("Draw offer in match {} from color {}", matchId, color);

        // We do not modify match state here; this is just an offer.
        return DrawOfferMessage.builder()
                .matchId(matchId)
                .type("DRAW_OFFER")
                .playerColor(color)
                .build();
    }

    /**
     * Handle accepting a draw: the game is concluded as a draw.
     * Frontend publishes to /app/game/{matchId}/draw/accept and both
     * clients listen on /topic/draw-offers/{matchId}.
     */
    @MessageMapping("/game/{matchId}/draw/accept")
    @SendTo("/topic/draw-offers/{matchId}")
    public DrawOfferMessage handleDrawAccept(@DestinationVariable Long matchId,
                                             @Payload GameActionMessage action) {
        String color = action.getPlayerColor();
        log.info("Draw accepted in match {} by color {}", matchId, color);

        // Mark match as finished (draw) in the database.
        Match match = matchRepository.findById(matchId).orElse(null);
        if (match != null) {
            match.setStatus("FINISHED");
            matchRepository.save(match);
        }

        return DrawOfferMessage.builder()
                .matchId(matchId)
                .type("DRAW_ACCEPTED")
                .playerColor(color)
                .result("Draw agreed")
                .build();
    }

    /**
     * Handle in-game chat messages.
     * Frontend publishes to /app/game/{matchId}/chat and all subscribers
     * listen on /topic/chat/{matchId}.
     */
    @MessageMapping("/game/{matchId}/chat")
    @SendTo("/topic/chat/{matchId}")
    public ChatMessageDto handleChat(@DestinationVariable Long matchId,
                                     @Payload ChatMessageDto incoming) {
        String text = incoming.getMessage();
        if (text == null || text.trim().isEmpty()) {
            return null; // nothing to broadcast
        }

        // Persist chat message
        Match match = matchRepository.findById(matchId).orElse(null);
        if (match == null) {
            return incoming; // no match, but still echo if needed
        }

        ChatMessage entity = new ChatMessage();
        entity.setMatch(match);
        entity.setFromUser(incoming.getFrom());
        entity.setMessage(text.trim());

        ChatMessage saved = chatMessageRepository.save(entity);

        // Return DTO to all subscribers
        ChatMessageDto dto = new ChatMessageDto();
        dto.setId(saved.getId());
        dto.setMatchId(matchId);
        dto.setFrom(saved.getFromUser());
        dto.setMessage(saved.getMessage());
        dto.setTimestamp(saved.getCreatedAt());
        return dto;
    }
}
