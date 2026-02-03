package com.indichess.matchservice.controller;

import com.indichess.matchservice.dto.MoveHistoryDto;
import com.indichess.matchservice.model.Move;
import com.indichess.matchservice.repo.MoveRepository;
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
public class GameHistoryController {

    private final MoveRepository moveRepository;

    @GetMapping("/{matchId}/moves")
    public ResponseEntity<List<MoveHistoryDto>> getMoveHistory(@PathVariable("matchId") Long matchId) {
        List<Move> moves = moveRepository.findByMatch_IdOrderByPlyAsc(matchId);

        List<MoveHistoryDto> dtoList = moves.stream()
            .map(m -> new MoveHistoryDto(
                m.getPly(),
                m.getMoveNumber(),
                m.getColor(),
                m.getSan(),
                m.getFenBefore(),
                m.getFenAfter(),
                m.getCreatedAt()
            ))
            .collect(Collectors.toList());

        return ResponseEntity.ok(dtoList);
    }
}
