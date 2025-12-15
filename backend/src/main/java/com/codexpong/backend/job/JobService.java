package com.codexpong.backend.job;

import com.codexpong.backend.replay.Replay;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

/**
 * [서비스] backend/src/main/java/com/codexpong/backend/job/JobService.java
 * 설명:
 *   - 작업 생성, 상태 전이, 진행률 업데이트를 관리한다.
 *   - 상태 머신(QUEUED→RUNNING→SUCCEEDED/FAILED/CANCELLED)을 엄격히 강제한다.
 * 버전: v0.5.0
 * 관련 설계문서:
 *   - design/contracts/v0.5.0-replay-export-contract.md
 */
@Service
public class JobService {

    private final JobRepository jobRepository;
    private final JobQueuePublisher jobQueuePublisher;
    private final JobWebSocketHandler jobWebSocketHandler;

    public JobService(JobRepository jobRepository, JobQueuePublisher jobQueuePublisher,
            JobWebSocketHandler jobWebSocketHandler) {
        this.jobRepository = jobRepository;
        this.jobQueuePublisher = jobQueuePublisher;
        this.jobWebSocketHandler = jobWebSocketHandler;
    }

    public Job createJob(Replay replay, JobType type) {
        Optional<Job> existing = jobRepository.findByReplayAndType(replay, type);
        if (existing.isPresent()) {
            return existing.get();
        }
        String jobId = UUID.randomUUID().toString();
        Job job = new Job(jobId, replay, type, JobStatus.QUEUED, 0, LocalDateTime.now());
        Job saved = jobRepository.save(job);
        jobQueuePublisher.publishRequest(saved);
        return saved;
    }

    public Job markRunning(String jobId) {
        Job job = loadJob(jobId);
        if (job.getStatus() != JobStatus.QUEUED) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "JOB_ALREADY_COMPLETED");
        }
        job.markRunning();
        Job saved = jobRepository.save(job);
        notifyProgress(saved, saved.getProgress(), "작업 실행 시작");
        return saved;
    }

    public Job updateProgress(String jobId, int progress, String message) {
        Job job = loadJob(jobId);
        if (job.getStatus() != JobStatus.RUNNING) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "JOB_ALREADY_COMPLETED");
        }
        job.updateProgress(progress);
        Job saved = jobRepository.save(job);
        notifyProgress(saved, progress, message);
        return saved;
    }

    public Job markSucceeded(String jobId, String artifactPath, String checksum, Long sizeBytes, Long durationMillis) {
        Job job = loadJob(jobId);
        if (job.getStatus() != JobStatus.RUNNING) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "JOB_ALREADY_COMPLETED");
        }
        job.markSucceeded(artifactPath, checksum, sizeBytes, durationMillis);
        Job saved = jobRepository.save(job);
        notifyCompletion(saved);
        return saved;
    }

    public Job markFailed(String jobId, String errorCode, String errorMessage) {
        Job job = loadJob(jobId);
        if (job.getStatus() == JobStatus.SUCCEEDED || job.getStatus() == JobStatus.FAILED) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "JOB_ALREADY_COMPLETED");
        }
        job.markFailed(errorCode, errorMessage);
        Job saved = jobRepository.save(job);
        notifyFailure(saved);
        return saved;
    }

    public Job findJob(String jobId) {
        return loadJob(jobId);
    }

    private Job loadJob(String jobId) {
        return jobRepository.findById(jobId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "JOB_NOT_FOUND"));
    }

    private void notifyProgress(Job job, int progress, String message) {
        Map<String, Object> payload = new HashMap<>();
        payload.put("event", "job.progress");
        payload.put("schemaVersion", "1");
        payload.put("jobId", job.getId());
        payload.put("replayId", job.getReplay().getId());
        payload.put("type", job.getType().name());
        payload.put("progress", progress);
        payload.put("message", message);
        payload.put("timestamp", LocalDateTime.now().toString());
        jobWebSocketHandler.sendToUser(job.getReplay().getOwnerId(), payload);
    }

    private void notifyCompletion(Job job) {
        Map<String, Object> payload = new HashMap<>();
        payload.put("event", "job.completed");
        payload.put("schemaVersion", "1");
        payload.put("jobId", job.getId());
        payload.put("replayId", job.getReplay().getId());
        payload.put("type", job.getType().name());
        payload.put("artifactPath", job.getArtifactPath());
        payload.put("checksum", job.getChecksum());
        payload.put("durationMillis", job.getDurationMillis());
        payload.put("timestamp", LocalDateTime.now().toString());
        jobWebSocketHandler.sendToUser(job.getReplay().getOwnerId(), payload);
    }

    private void notifyFailure(Job job) {
        Map<String, Object> payload = new HashMap<>();
        payload.put("event", "job.failed");
        payload.put("schemaVersion", "1");
        payload.put("jobId", job.getId());
        payload.put("replayId", job.getReplay().getId());
        payload.put("type", job.getType().name());
        payload.put("error_code", job.getErrorCode());
        payload.put("error_message", job.getErrorMessage());
        payload.put("timestamp", LocalDateTime.now().toString());
        jobWebSocketHandler.sendToUser(job.getReplay().getOwnerId(), payload);
    }
}
