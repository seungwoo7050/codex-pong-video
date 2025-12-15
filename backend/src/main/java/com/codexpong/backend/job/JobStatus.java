package com.codexpong.backend.job;

/**
 * [상태] backend/src/main/java/com/codexpong/backend/job/JobStatus.java
 * 설명:
 *   - 내보내기 작업 상태를 표현한다.
 * 버전: v0.5.0
 * 관련 설계문서:
 *   - design/contracts/v0.5.0-replay-export-contract.md
 */
public enum JobStatus {
    QUEUED,
    RUNNING,
    SUCCEEDED,
    FAILED,
    CANCELLED
}
