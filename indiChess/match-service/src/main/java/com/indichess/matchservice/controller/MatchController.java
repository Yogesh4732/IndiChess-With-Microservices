package com.indichess.matchservice.controller;

import com.indichess.matchservice.dto.MatchDto;
import com.indichess.matchservice.service.MatchService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/matches")
@RequiredArgsConstructor
public class MatchController {

    private final MatchService matchService;

    @PostMapping("/create")
    public ResponseEntity<MatchDto> createMatch(@RequestHeader("X-User-Email") String email) {
        MatchDto created = matchService.createStandardMatch(email);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @PostMapping("/create-rapid")
    public ResponseEntity<MatchDto> createRapidMatch(@RequestHeader("X-User-Email") String email) {
        MatchDto created = matchService.createRapidMatch(email);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @GetMapping("/my")
    public ResponseEntity<List<MatchDto>> getMyMatches(@RequestHeader("X-User-Email") String email) {
        List<MatchDto> matches = matchService.getMyMatches(email);
        return ResponseEntity.ok(matches);
    }

    @GetMapping("/{id}")
    public ResponseEntity<MatchDto> getMatch(@PathVariable("id") Long id) {
        MatchDto match = matchService.getMatch(id);
        return ResponseEntity.ok(match);
    }

    @PostMapping("/{id}/join")
    public ResponseEntity<?> joinMatch(@PathVariable("id") Long id,
                                       @RequestHeader("X-User-Email") String email) {
        try {
            MatchDto joined = matchService.joinMatch(id, email);
            return ResponseEntity.ok(joined);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(e.getMessage());
        } catch (IllegalStateException e) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body(e.getMessage());
        }
    }

    @PostMapping("/{id}/cancel")
    public ResponseEntity<?> cancelMatch(@PathVariable("id") Long id,
                                         @RequestHeader("X-User-Email") String email) {
        try {
            matchService.cancelWaitingMatch(id, email);
            return ResponseEntity.noContent().build();
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(e.getMessage());
        } catch (IllegalStateException e) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body(e.getMessage());
        }
    }
}
