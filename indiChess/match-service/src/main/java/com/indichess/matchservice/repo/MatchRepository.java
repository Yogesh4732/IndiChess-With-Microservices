package com.indichess.matchservice.repo;

import com.indichess.matchservice.model.Match;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.Instant;
import java.util.List;

public interface MatchRepository extends JpaRepository<Match, Long> {

    List<Match> findByCreatedByEmail(String email);

    List<Match> findByCreatedByEmailOrOpponentEmail(String createdByEmail, String opponentEmail);

    // Find a recent open match (no opponent yet) created by someone else for a given game type.
    // We only consider matches created after a given cutoff time to avoid pairing into very old stale games.
    java.util.Optional<Match> findFirstByStatusAndOpponentEmailIsNullAndCreatedByEmailNotAndGameTypeAndCreatedAtAfterOrderByCreatedAtAsc(
            String status,
            String createdByEmailNot,
            String gameType,
            Instant createdAtAfter
    );
}
