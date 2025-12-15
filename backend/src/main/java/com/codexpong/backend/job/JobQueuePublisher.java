package com.codexpong.backend.job;

/**
 * [포트] backend/src/main/java/com/codexpong/backend/job/JobQueuePublisher.java
 * 설명:
 *   - Redis Streams로 작업 요청/진행/결과를 발행하기 위한 추상 포트이다.
 *   - 테스트에서는 메모리 구현을 주입해 외부 의존성을 제거한다.
 * 버전: v0.5.0
 * 관련 설계문서:
 *   - design/contracts/v0.5.0-replay-export-contract.md
 */
public interface JobQueuePublisher {

    void publishRequest(Job job);
}
