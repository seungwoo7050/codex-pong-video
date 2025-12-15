package com.codexpong.backend.replay;

import com.codexpong.backend.storage.StoragePathResolver;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

/**
 * [서비스] backend/src/main/java/com/codexpong/backend/replay/ReplayService.java
 * 설명:
 *   - 리플레이 메타데이터와 이벤트 파일을 저장/조회한다.
 *   - JSONL_V1 이벤트 파일을 APP_STORAGE_ROOT 하위 디렉터리에 기록한다.
 * 버전: v0.5.0
 * 관련 설계문서:
 *   - design/contracts/v0.5.0-replay-export-contract.md
 */
@Service
public class ReplayService {

    private final ReplayRepository replayRepository;
    private final StoragePathResolver storagePathResolver;

    public ReplayService(ReplayRepository replayRepository, StoragePathResolver storagePathResolver) {
        this.replayRepository = replayRepository;
        this.storagePathResolver = storagePathResolver;
    }

    public Replay createReplay(Long ownerId, String title, long durationMillis, List<String> events) {
        Path dir = storagePathResolver.ensureReplayDir(ownerId);
        Path filePath = dir.resolve("replay-" + UUID.randomUUID() + ".jsonl");
        try {
            Files.write(filePath, events, StandardCharsets.UTF_8);
        } catch (IOException e) {
            throw new IllegalStateException("리플레이 이벤트 파일을 기록할 수 없습니다.", e);
        }
        Replay replay = new Replay(ownerId, title, durationMillis, filePath.toString(), LocalDateTime.now());
        return replayRepository.save(replay);
    }

    public List<Replay> listByOwner(Long ownerId) {
        return replayRepository.findByOwnerId(ownerId);
    }

    public Replay getOwnedReplay(Long replayId, Long ownerId) {
        Replay replay = replayRepository.findById(replayId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "리플레이를 찾을 수 없습니다."));
        if (!replay.getOwnerId().equals(ownerId)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "리플레이를 찾을 수 없습니다.");
        }
        return replay;
    }

    public Path resolveEventPath(Replay replay) {
        return Path.of(replay.getEventPath());
    }
}
