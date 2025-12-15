package com.codexpong.backend.job;

import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;

/**
 * [테스트 어댑터] backend/src/main/java/com/codexpong/backend/job/TestJobQueuePublisher.java
 * 설명:
 *   - 테스트 프로필에서 Redis 의존성 없이 컨텍스트를 띄우기 위한 No-Op 퍼블리셔이다.
 *   - 운영 코드의 동작에는 영향을 주지 않고, JobQueuePublisher 주입 실패로 인한 컨텍스트 로딩 오류만 차단한다.
 * 버전: v0.5.0
 */
@Component
@Profile("test")
public class TestJobQueuePublisher implements JobQueuePublisher {

    @Override
    public void publishRequest(Job job) {
        // 테스트 환경에서는 외부 큐에 발행하지 않는다.
    }
}
