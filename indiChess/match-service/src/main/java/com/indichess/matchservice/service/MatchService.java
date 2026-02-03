package com.indichess.matchservice.service;

import com.indichess.matchservice.dto.MatchDto;
import com.indichess.matchservice.model.Match;
import com.indichess.matchservice.repo.MatchRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class MatchService {

    private final MatchRepository matchRepository;

    public MatchDto createMatch(String creatorEmail, String gameType) {
        String effectiveType = (gameType == null || gameType.isBlank()) ? "STANDARD" : gameType.toUpperCase();

        // Only match against games that have been created recently (e.g. within the last 90 seconds)
        // to avoid pairing a player into a very old, stale waiting match.
        Instant cutoff = Instant.now().minusSeconds(90);

        // First try to find an existing open match of this type created by someone else
        return matchRepository
            .findFirstByStatusAndOpponentEmailIsNullAndCreatedByEmailNotAndGameTypeAndCreatedAtAfterOrderByCreatedAtAsc(
                "CREATED",
                creatorEmail,
                effectiveType,
                cutoff
            )
                .map(openMatch -> {
                    openMatch.setOpponentEmail(creatorEmail);
                    openMatch.setStatus("IN_PROGRESS");
                    Match saved = matchRepository.save(openMatch);
                    return toDto(saved);
                })
                .orElseGet(() -> {
                    // No open match found -> create a new one and wait for opponent
                    Match match = Match.builder()
                            .createdByEmail(creatorEmail)
                            .status("CREATED")
                            .gameType(effectiveType)
                            .build();

                    Match saved = matchRepository.save(match);
                    return toDto(saved);
                });
    }

    public MatchDto createStandardMatch(String creatorEmail) {
        return createMatch(creatorEmail, "STANDARD");
    }

    public MatchDto createRapidMatch(String creatorEmail) {
        return createMatch(creatorEmail, "RAPID");
    }

    public List<MatchDto> getMyMatches(String email) {
        return matchRepository.findByCreatedByEmailOrOpponentEmail(email, email)
                .stream()
                .map(this::toDto)
                .collect(Collectors.toList());
    }

    public MatchDto getMatch(Long matchId) {
        Match match = matchRepository.findById(matchId)
                .orElseThrow(() -> new IllegalArgumentException("Match not found"));
        return toDto(match);
    }

    public void cancelWaitingMatch(Long matchId, String requesterEmail) {
        Match match = matchRepository.findById(matchId)
                .orElseThrow(() -> new IllegalArgumentException("Match not found"));

        // Only the creator of the match can cancel it while it's still waiting for an opponent.
        if (!requesterEmail.equals(match.getCreatedByEmail())) {
            throw new IllegalStateException("Only the creator can cancel this match");
        }

        // If an opponent has already joined or the match has progressed, do not allow cancel.
        if (match.getOpponentEmail() != null || !"CREATED".equalsIgnoreCase(match.getStatus())) {
            throw new IllegalStateException("Match can no longer be cancelled");
        }

        // Mark as cancelled so it is no longer picked up by matchmaking.
        match.setStatus("CANCELLED");
        matchRepository.save(match);
    }

    public MatchDto joinMatch(Long matchId, String email) {
        Match match = matchRepository.findById(matchId)
                .orElseThrow(() -> new IllegalArgumentException("Match not found"));

        if (email.equals(match.getCreatedByEmail())) {
            throw new IllegalStateException("Creator cannot join their own match as opponent");
        }
        if (match.getOpponentEmail() != null) {
            throw new IllegalStateException("Match already has an opponent");
        }

        match.setOpponentEmail(email);
        match.setStatus("IN_PROGRESS");

        Match saved = matchRepository.save(match);
        return toDto(saved);
    }

    private MatchDto toDto(Match match) {
        return new MatchDto(
                match.getId(),
                match.getCreatedByEmail(),
                match.getOpponentEmail(),
                match.getStatus(),
                match.getCreatedAt(),
                match.getUpdatedAt()
        );
    }
}
