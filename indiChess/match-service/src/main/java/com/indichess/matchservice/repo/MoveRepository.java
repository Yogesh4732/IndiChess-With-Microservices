package com.indichess.matchservice.repo;

import com.indichess.matchservice.model.Move;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface MoveRepository extends JpaRepository<Move, Long> {

    long countByMatch_Id(Long matchId);

    List<Move> findByMatch_IdOrderByPlyAsc(Long matchId);
}
