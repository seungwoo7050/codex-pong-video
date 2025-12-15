package com.codexpong.backend.job;

import com.codexpong.backend.replay.Replay;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

/**
 * [리포지토리] backend/src/main/java/com/codexpong/backend/job/JobRepository.java
 * 설명:
 *   - 리플레이 내보내기 작업 저장/조회 기능을 제공한다.
 * 버전: v0.5.0
 * 관련 설계문서:
 *   - design/contracts/v0.5.0-replay-export-contract.md
 */
public interface JobRepository extends JpaRepository<Job, String> {

    Optional<Job> findByReplayAndType(Replay replay, JobType type);
}
