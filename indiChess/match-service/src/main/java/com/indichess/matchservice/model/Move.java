package com.indichess.matchservice.model;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.Instant;

@Entity
@Table(
        name = "moves",
        uniqueConstraints = @UniqueConstraint(columnNames = {"match_id", "ply"})
)
@Getter
@Setter
public class Move {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "match_id", nullable = false)
    private Match match;

    private int ply;            // 1..N (half-move index)
    private int moveNumber;     // 1,2,3...

    @Enumerated(EnumType.STRING)
    private PieceColor color;   // WHITE / BLACK

    private String uci;         // e2e4
    private String san;         // e4 (simple algebraic notation)

    private String fenBefore;
    private String fenAfter;

    @Column(nullable = false, updatable = false)
    private Instant createdAt;

    @PrePersist
    public void onCreate() {
        if (createdAt == null) {
            createdAt = Instant.now();
        }
    }
}
