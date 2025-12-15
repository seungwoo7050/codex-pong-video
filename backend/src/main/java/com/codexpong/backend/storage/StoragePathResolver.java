package com.codexpong.backend.storage;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import org.springframework.stereotype.Component;

/**
 * [유틸] backend/src/main/java/com/codexpong/backend/storage/StoragePathResolver.java
 * 설명:
 *   - 스토리지 루트와 하위 디렉터리를 결합해 안전한 파일 경로를 생성한다.
 *   - 필요한 디렉터리가 없을 경우 자동으로 생성해 I/O 오류를 줄인다.
 * 버전: v0.5.0
 * 관련 설계문서:
 *   - design/contracts/v0.5.0-replay-export-contract.md
 */
@Component
public class StoragePathResolver {

    private final StorageProperties properties;

    public StoragePathResolver(StorageProperties properties) {
        this.properties = properties;
    }

    public Path ensureReplayDir(Long ownerId) {
        Path path = Path.of(properties.root(), properties.replayEventsDir(), String.valueOf(ownerId));
        createIfMissing(path);
        return path;
    }

    public Path ensureExportDir(Long ownerId, Long replayId) {
        Path path = Path.of(properties.root(), properties.exportDir(), String.valueOf(ownerId), String.valueOf(replayId));
        createIfMissing(path);
        return path;
    }

    public Path root() {
        Path rootPath = Path.of(properties.root());
        createIfMissing(rootPath);
        return rootPath;
    }

    private void createIfMissing(Path path) {
        try {
            Files.createDirectories(path);
        } catch (IOException e) {
            throw new IllegalStateException("스토리지 경로를 생성할 수 없습니다: " + path, e);
        }
    }
}
