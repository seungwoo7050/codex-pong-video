package com.codexpong.backend.storage;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/**
 * [설정] backend/src/main/java/com/codexpong/backend/storage/StorageProperties.java
 * 설명:
 *   - 리플레이 이벤트와 내보내기 산출물을 저장할 루트 경로를 주입한다.
 *   - v0.5.0 리플레이/내보내기 기능을 위해 APP_STORAGE_ROOT 기반 하위 디렉터리를 관리한다.
 * 버전: v0.5.0
 * 관련 설계문서:
 *   - design/contracts/v0.5.0-replay-export-contract.md
 */
@Component
public class StorageProperties {

    private final String root;
    private final String replayEventsDir;
    private final String exportDir;

    public StorageProperties(
            @Value("${app.storage.root}") String root,
            @Value("${app.storage.replay-events-dir}") String replayEventsDir,
            @Value("${app.storage.export-dir}") String exportDir) {
        this.root = root;
        this.replayEventsDir = replayEventsDir;
        this.exportDir = exportDir;
    }

    public String root() {
        return root;
    }

    public String replayEventsDir() {
        return replayEventsDir;
    }

    public String exportDir() {
        return exportDir;
    }
}
