package com.codexpong.backend.job;

import com.codexpong.backend.replay.Replay;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import java.time.LocalDateTime;

/**
 * [엔티티] backend/src/main/java/com/codexpong/backend/job/Job.java
 * 설명:
 *   - 리플레이 내보내기 작업 상태와 결과를 저장한다.
 *   - 동일 리플레이/타입 조합에 대해 idempotency를 보장하기 위해 유니크 제약을 둔다.
 * 버전: v0.5.0
 * 관련 설계문서:
 *   - design/contracts/v0.5.0-replay-export-contract.md
 */
@Entity
@Table(name = "job", uniqueConstraints = {
        @UniqueConstraint(name = "uk_job_replay_type", columnNames = {"replay_id", "type"})
})
public class Job {

    @Id
    private String id;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "replay_id", nullable = false)
    private Replay replay;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private JobType type;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private JobStatus status;

    @Column(nullable = false)
    private int progress;

    private String artifactPath;

    private String checksum;

    private Long sizeBytes;

    private Long durationMillis;

    private String errorCode;

    private String errorMessage;

    @Column(nullable = false)
    private LocalDateTime createdAt;

    @Column(nullable = false)
    private LocalDateTime updatedAt;

    protected Job() {
    }

    public Job(String id, Replay replay, JobType type, JobStatus status, int progress, LocalDateTime createdAt) {
        this.id = id;
        this.replay = replay;
        this.type = type;
        this.status = status;
        this.progress = progress;
        this.createdAt = createdAt;
        this.updatedAt = createdAt;
    }

    public String getId() {
        return id;
    }

    public Replay getReplay() {
        return replay;
    }

    public JobType getType() {
        return type;
    }

    public JobStatus getStatus() {
        return status;
    }

    public int getProgress() {
        return progress;
    }

    public String getArtifactPath() {
        return artifactPath;
    }

    public String getChecksum() {
        return checksum;
    }

    public Long getSizeBytes() {
        return sizeBytes;
    }

    public Long getDurationMillis() {
        return durationMillis;
    }

    public String getErrorCode() {
        return errorCode;
    }

    public String getErrorMessage() {
        return errorMessage;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }

    public void markRunning() {
        this.status = JobStatus.RUNNING;
        this.updatedAt = LocalDateTime.now();
    }

    public void updateProgress(int progress) {
        this.progress = progress;
        this.updatedAt = LocalDateTime.now();
    }

    public void markSucceeded(String artifactPath, String checksum, Long sizeBytes, Long durationMillis) {
        this.status = JobStatus.SUCCEEDED;
        this.artifactPath = artifactPath;
        this.checksum = checksum;
        this.sizeBytes = sizeBytes;
        this.durationMillis = durationMillis;
        this.progress = 100;
        this.updatedAt = LocalDateTime.now();
    }

    public void markFailed(String errorCode, String errorMessage) {
        this.status = JobStatus.FAILED;
        this.errorCode = errorCode;
        this.errorMessage = errorMessage;
        this.updatedAt = LocalDateTime.now();
    }
}
