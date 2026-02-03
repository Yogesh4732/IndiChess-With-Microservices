package com.indichess.matchservice.service;

import com.indichess.matchservice.dto.MatchDto;
import com.indichess.matchservice.model.Match;
import com.indichess.matchservice.repo.MatchRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class MatchService {

    private final MatchRepository matchRepository;

    public MatchDto createMatch(String creatorEmail, String gameType) {
        String effectiveType = (gameType == null || gameType.isBlank()) ? "STANDARD" : gameType.toUpperCase();

        // First try to find an existing open match of this type created by someone else
        return matchRepository
                .findFirstByStatusAndOpponentEmailIsNullAndCreatedByEmailNotAndGameType("CREATED", creatorEmail, effectiveType)
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
