package com.codexpong.backend.job;

import com.codexpong.backend.auth.model.AuthenticatedUser;
import com.codexpong.backend.replay.Replay;
import com.codexpong.backend.replay.ReplayService;
import java.time.ZoneOffset;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

/**
 * [컨트롤러] backend/src/main/java/com/codexpong/backend/job/JobController.java
 * 설명:
 *   - 리플레이 내보내기 작업 생성과 상태/결과 조회 엔드포인트를 제공한다.
 * 버전: v0.5.0
 * 관련 설계문서:
 *   - design/contracts/v0.5.0-replay-export-contract.md
 */
@RestController
@RequestMapping("/api")
public class JobController {

    private final ReplayService replayService;
    private final JobService jobService;

    public JobController(ReplayService replayService, JobService jobService) {
        this.replayService = replayService;
        this.jobService = jobService;
    }

    @PostMapping("/replays/{id}/exports/mp4")
    @ResponseStatus(HttpStatus.ACCEPTED)
    public JobCreatedResponse createMp4(@AuthenticationPrincipal AuthenticatedUser user, @PathVariable Long id) {
        Replay replay = replayService.getOwnedReplay(id, user.id());
        Job job = jobService.createJob(replay, JobType.MP4);
        return new JobCreatedResponse("1", job.getId());
    }

    @PostMapping("/replays/{id}/exports/thumbnail")
    @ResponseStatus(HttpStatus.ACCEPTED)
    public JobCreatedResponse createThumbnail(@AuthenticationPrincipal AuthenticatedUser user, @PathVariable Long id) {
        Replay replay = replayService.getOwnedReplay(id, user.id());
        Job job = jobService.createJob(replay, JobType.THUMBNAIL);
        return new JobCreatedResponse("1", job.getId());
    }

    @GetMapping("/jobs/{jobId}")
    public JobResponse jobStatus(@AuthenticationPrincipal AuthenticatedUser user, @PathVariable String jobId) {
        Job job = jobService.findJob(jobId);
        if (!job.getReplay().getOwnerId().equals(user.id())) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "JOB_NOT_FOUND");
        }
        return JobResponse.from(job);
    }

    @GetMapping("/jobs/{jobId}/result")
    public JobResultResponse jobResult(@AuthenticationPrincipal AuthenticatedUser user, @PathVariable String jobId) {
        Job job = jobService.findJob(jobId);
        if (!job.getReplay().getOwnerId().equals(user.id())) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "JOB_NOT_FOUND");
        }
        if (job.getStatus() != JobStatus.SUCCEEDED) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, job.getErrorCode() == null ? "JOB_ALREADY_COMPLETED"
                    : job.getErrorCode());
        }
        return JobResultResponse.from(job);
    }

    public record JobCreatedResponse(String schemaVersion, String jobId) {
    }

    public record JobResponse(String schemaVersion, String id, Long replayId, String type, String status, int progress,
            String error_code, String error_message, String createdAt, String updatedAt) {

        static JobResponse from(Job job) {
            return new JobResponse(
                    "1",
                    job.getId(),
                    job.getReplay().getId(),
                    job.getType().name(),
                    job.getStatus().name(),
                    job.getProgress(),
                    job.getErrorCode(),
                    job.getErrorMessage(),
                    job.getCreatedAt().atOffset(ZoneOffset.UTC).toString(),
                    job.getUpdatedAt().atOffset(ZoneOffset.UTC).toString()
            );
        }
    }

    public record JobResultResponse(String schemaVersion, String id, String type, String artifactPath, String checksum,
            Long sizeBytes, Long durationMillis) {

        static JobResultResponse from(Job job) {
            return new JobResultResponse("1", job.getId(), job.getType().name(), job.getArtifactPath(),
                    job.getChecksum(), job.getSizeBytes(), job.getDurationMillis());
        }
    }
}
