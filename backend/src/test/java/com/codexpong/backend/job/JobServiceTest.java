package com.codexpong.backend.job;

import com.codexpong.backend.CodexPongApplication;
import com.codexpong.backend.replay.Replay;
import com.codexpong.backend.replay.ReplayService;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Primary;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.context.annotation.Import;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.data.redis.connection.stream.MapRecord;
import org.springframework.data.redis.core.StringRedisTemplate;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;

/**
 * [단위테스트] backend/src/test/java/com/codexpong/backend/job/JobServiceTest.java
 * 설명:
 *   - 작업 상태 머신과 idempotency 동작을 검증한다.
 * 버전: v0.5.0
 * 관련 설계문서:
 *   - design/contracts/v0.5.0-replay-export-contract.md
 */
@SpringBootTest(classes = CodexPongApplication.class)
@Import(JobServiceTest.TestJobQueuePublisherConfig.class)
@ActiveProfiles("test")
class JobServiceTest {

    @Autowired
    private ReplayService replayService;

    @Autowired
    private JobService jobService;

    private Replay replay;

    @BeforeEach
    void setUp() {
        replay = replayService.createReplay(1L, "테스트 경기", 1200L, List.of("{}", "{}"));
    }

    @Test
    @DisplayName("동일 리플레이/타입으로 두 번 요청해도 동일 jobId를 반환한다")
    void idempotentCreate() {
        Job first = jobService.createJob(replay, JobType.MP4);
        Job second = jobService.createJob(replay, JobType.MP4);

        assertThat(first.getId()).isEqualTo(second.getId());
        assertThat(first.getStatus()).isEqualTo(JobStatus.QUEUED);
    }

    @Test
    @DisplayName("상태 머신: QUEUED→RUNNING→SUCCEEDED 이후 추가 업데이트는 막는다")
    void stateMachineBlocks() {
        Job job = jobService.createJob(replay, JobType.THUMBNAIL);
        jobService.markRunning(job.getId());
        Job done = jobService.markSucceeded(job.getId(), "/tmp/out.png", "sha256:abc", 10L, 1000L);

        assertThat(done.getStatus()).isEqualTo(JobStatus.SUCCEEDED);
        assertThat(done.getProgress()).isEqualTo(100);

        assertThatThrownBy(() -> jobService.updateProgress(job.getId(), 50, "불필요"))
                .isInstanceOf(ResponseStatusException.class);
    }

    @Test
    @DisplayName("Redis 진행률 메시지를 소비하면 Job 상태가 RUNNING으로 전환된다")
    void progressMessageUpdatesJob() {
        Job job = jobService.createJob(replay, JobType.MP4);
        JobStreamConsumer consumer = new JobStreamConsumer(mock(StringRedisTemplate.class), jobService);
        MapRecord<String, String, String> record = MapRecord.create("replay.export.progress", Map.of(
                "jobId", job.getId(),
                "progress", "40",
                "message", "테스트 진행"
        ));

        consumer.onProgress(record);

        Job updated = jobService.findJob(job.getId());
        assertThat(updated.getStatus()).isEqualTo(JobStatus.RUNNING);
        assertThat(updated.getProgress()).isEqualTo(40);
    }

    @TestConfiguration(proxyBeanMethods = false)
    static class TestJobQueuePublisherConfig {
        @Bean
        @Primary
        JobQueuePublisher jobQueuePublisher() {
            return job -> {
                // 테스트 환경에서는 외부 Redis 없이 동작하도록 no-op 처리
            };
        }
    }
}
