package com.codexpong.backend.replay;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import java.time.LocalDateTime;

/**
 * [엔티티] backend/src/main/java/com/codexpong/backend/replay/Replay.java
 * 설명:
 *   - 리플레이 메타데이터를 저장한다.
 *   - JSONL_V1 이벤트 파일 경로와 소유자 정보를 포함한다.
 * 버전: v0.5.0
 * 관련 설계문서:
 *   - design/contracts/v0.5.0-replay-export-contract.md
 */
@Entity
public class Replay {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long ownerId;

    @Column(nullable = false)
    private String title;

    @Column(nullable = false)
    private long durationMillis;

    @Column(nullable = false)
    private String eventPath;

    @Column(nullable = false)
    private LocalDateTime createdAt;

    protected Replay() {
    }

    public Replay(Long ownerId, String title, long durationMillis, String eventPath, LocalDateTime createdAt) {
        this.ownerId = ownerId;
        this.title = title;
        this.durationMillis = durationMillis;
        this.eventPath = eventPath;
        this.createdAt = createdAt;
    }

    public Long getId() {
        return id;
    }

    public Long getOwnerId() {
        return ownerId;
    }

    public String getTitle() {
        return title;
    }

    public long getDurationMillis() {
        return durationMillis;
    }

    public String getEventPath() {
        return eventPath;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }
}
