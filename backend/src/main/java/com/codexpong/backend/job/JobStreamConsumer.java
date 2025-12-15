package com.codexpong.backend.job;

import jakarta.annotation.PostConstruct;
import jakarta.annotation.PreDestroy;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Profile;
import org.springframework.data.redis.connection.stream.MapRecord;
import org.springframework.data.redis.connection.stream.StreamOffset;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.stream.StreamMessageListenerContainer;
import org.springframework.data.redis.stream.StreamMessageListenerContainer.StreamMessageListenerContainerOptions;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;

/**
 * [컨슈머] backend/src/main/java/com/codexpong/backend/job/JobStreamConsumer.java
 * 설명:
 *   - Redis Streams로 전달되는 진행률/결과 메시지를 소비해 Job 상태를 갱신한다.
 *   - 갱신된 상태는 JobWebSocketHandler를 통해 /ws/jobs 구독자에게 즉시 푸시된다.
 * 버전: v0.5.0
 * 관련 설계문서:
 *   - design/contracts/v0.5.0-replay-export-contract.md
 */
@Component
@Profile("!test")
public class JobStreamConsumer {

    private static final Logger log = LoggerFactory.getLogger(JobStreamConsumer.class);
    private static final String PROGRESS_STREAM = "replay.export.progress";
    private static final String RESULT_STREAM = "replay.export.result";

    private final StringRedisTemplate redisTemplate;
    private final JobService jobService;
    private StreamMessageListenerContainer<String, MapRecord<String, String, String>> container;

    public JobStreamConsumer(StringRedisTemplate redisTemplate, JobService jobService) {
        this.redisTemplate = redisTemplate;
        this.jobService = jobService;
    }

    @PostConstruct
    public void start() {
        StreamMessageListenerContainerOptions<String, MapRecord<String, String, String>> options =
                StreamMessageListenerContainerOptions.builder()
                        .pollTimeout(java.time.Duration.ofSeconds(2))
                        .build();
        this.container = StreamMessageListenerContainer.create(redisTemplate.getConnectionFactory(), options);
        this.container.receive(StreamOffset.latest(PROGRESS_STREAM), this::onProgress);
        this.container.receive(StreamOffset.latest(RESULT_STREAM), this::onResult);
        this.container.start();
        log.info("Redis 스트림 컨슈머 시작: {}, {}", PROGRESS_STREAM, RESULT_STREAM);
    }

    @PreDestroy
    public void stop() {
        if (this.container != null) {
            this.container.stop();
        }
    }

    void onProgress(MapRecord<String, String, String> record) {
        Map<String, String> value = record.getValue();
        String jobId = value.get("jobId");
        int progress = parseInt(value.get("progress"), 0);
        String message = value.getOrDefault("message", "진행 중");
        try {
            jobService.markRunning(jobId);
        } catch (ResponseStatusException e) {
            log.debug("markRunning 스킵: {}", e.getReason());
        }
        try {
            jobService.updateProgress(jobId, progress, message);
        } catch (ResponseStatusException e) {
            log.warn("진행률 업데이트 실패: {}", e.getReason());
        }
    }

    void onResult(MapRecord<String, String, String> record) {
        Map<String, String> value = record.getValue();
        String jobId = value.get("jobId");
        String status = value.get("status");
        if ("SUCCEEDED".equals(status)) {
            String artifactPath = value.get("artifactPath");
            String checksum = value.get("checksum");
            Long sizeBytes = parseLong(value.get("sizeBytes"));
            Long durationMillis = parseLong(value.get("durationMillis"));
            try {
                jobService.markSucceeded(jobId, artifactPath, checksum, sizeBytes, durationMillis);
            } catch (ResponseStatusException e) {
                log.warn("성공 상태 반영 실패: {}", e.getReason());
            }
            return;
        }
        if ("FAILED".equals(status)) {
            String errorCode = value.getOrDefault("error_code", "UNKNOWN_ERROR");
            String errorMessage = value.getOrDefault("error_message", "작업 실패");
            try {
                jobService.markFailed(jobId, errorCode, errorMessage);
            } catch (ResponseStatusException e) {
                log.warn("실패 상태 반영 실패: {}", e.getReason());
            }
        }
    }

    private int parseInt(String value, int defaultValue) {
        try {
            return Integer.parseInt(value);
        } catch (Exception e) {
            return defaultValue;
        }
    }

    private Long parseLong(String value) {
        try {
            return Long.parseLong(value);
        } catch (Exception e) {
            return null;
        }
    }
}
