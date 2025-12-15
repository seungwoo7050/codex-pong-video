package com.codexpong.backend.job;

/**
 * [타입] backend/src/main/java/com/codexpong/backend/job/JobType.java
 * 설명:
 *   - 내보내기 작업 종류(MP4/THUMBNAIL)를 구분한다.
 * 버전: v0.5.0
 * 관련 설계문서:
 *   - design/contracts/v0.5.0-replay-export-contract.md
 */
public enum JobType {
    MP4,
    THUMBNAIL
}
