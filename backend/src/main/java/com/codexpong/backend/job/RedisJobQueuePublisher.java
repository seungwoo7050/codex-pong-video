package com.codexpong.backend.job;

import com.codexpong.backend.storage.StoragePathResolver;
import java.util.HashMap;
import java.util.Map;
import org.springframework.data.redis.connection.stream.MapRecord;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;

/**
 * [어댑터] backend/src/main/java/com/codexpong/backend/job/RedisJobQueuePublisher.java
 * 설명:
 *   - 작업 생성 시 Redis Streams `replay.export.request` 스트림에 메시지를 기록한다.
 *   - schemaVersion 필드를 고정으로 포함시켜 계약 문서를 준수한다.
 * 버전: v0.5.0
 * 관련 설계문서:
 *   - design/contracts/v0.5.0-replay-export-contract.md
 */
@Component
@Profile("!test")
public class RedisJobQueuePublisher implements JobQueuePublisher {

    private static final String REQUEST_STREAM = "replay.export.request";

    private final StringRedisTemplate redisTemplate;
    private final StoragePathResolver storagePathResolver;

    public RedisJobQueuePublisher(StringRedisTemplate redisTemplate, StoragePathResolver storagePathResolver) {
        this.redisTemplate = redisTemplate;
        this.storagePathResolver = storagePathResolver;
    }

    @Override
    public void publishRequest(Job job) {
        Map<String, String> fields = new HashMap<>();
        fields.put("schemaVersion", "1");
        fields.put("jobId", job.getId());
        fields.put("replayId", job.getReplay().getId().toString());
        fields.put("ownerId", job.getReplay().getOwnerId().toString());
        fields.put("type", job.getType().name());
        fields.put("eventPath", job.getReplay().getEventPath());
        fields.put("outputDir", storagePathResolver.ensureExportDir(job.getReplay().getOwnerId(), job.getReplay().getId())
                .toString());
        fields.put("durationMillis", String.valueOf(job.getReplay().getDurationMillis()));
        redisTemplate.opsForStream().add(MapRecord.create(REQUEST_STREAM, fields));
    }
}
