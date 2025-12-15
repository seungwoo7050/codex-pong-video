package com.codexpong.backend.replay;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

/**
 * [리포지토리] backend/src/main/java/com/codexpong/backend/replay/ReplayRepository.java
 * 설명:
 *   - 리플레이 메타데이터 CRUD를 담당한다.
 * 버전: v0.5.0
 * 관련 설계문서:
 *   - design/contracts/v0.5.0-replay-export-contract.md
 */
public interface ReplayRepository extends JpaRepository<Replay, Long> {

    List<Replay> findByOwnerId(Long ownerId);
}
