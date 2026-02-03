package com.indichess.matchservice.repo;

import com.indichess.matchservice.model.ChatMessage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ChatMessageRepository extends JpaRepository<ChatMessage, Long> {

    List<ChatMessage> findByMatch_IdOrderByCreatedAtAsc(Long matchId);
}
