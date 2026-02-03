package com.indichess.matchservice.controller;

import com.indichess.matchservice.dto.ChatMessageDto;
import com.indichess.matchservice.model.ChatMessage;
import com.indichess.matchservice.repo.ChatMessageRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/games")
@RequiredArgsConstructor
public class ChatHistoryController {

    private final ChatMessageRepository chatMessageRepository;

    @GetMapping("/{matchId}/chat")
    public ResponseEntity<List<ChatMessageDto>> getChatHistory(@PathVariable("matchId") Long matchId) {
        List<ChatMessage> messages = chatMessageRepository.findByMatch_IdOrderByCreatedAtAsc(matchId);

        List<ChatMessageDto> dtoList = messages.stream()
                .map(m -> new ChatMessageDto(
                        m.getId(),
                        matchId,
                        m.getFromUser(),
                        m.getMessage(),
                        m.getCreatedAt()
                ))
                .collect(Collectors.toList());

        return ResponseEntity.ok(dtoList);
    }
}
