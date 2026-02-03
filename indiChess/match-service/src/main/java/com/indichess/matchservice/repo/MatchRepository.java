package com.indichess.matchservice.repo;

import com.indichess.matchservice.model.Match;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface MatchRepository extends JpaRepository<Match, Long> {

    List<Match> findByCreatedByEmail(String email);

    List<Match> findByCreatedByEmailOrOpponentEmail(String createdByEmail, String opponentEmail);

    // Find an open match (no opponent yet) created by someone else for a given game type
    java.util.Optional<Match> findFirstByStatusAndOpponentEmailIsNullAndCreatedByEmailNotAndGameType(String status, String createdByEmailNot, String gameType);
}
