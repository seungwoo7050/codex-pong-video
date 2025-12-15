package com.codexpong.backend.replay;

import com.codexpong.backend.auth.model.AuthenticatedUser;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.ZoneOffset;
import java.util.List;
import java.util.stream.Collectors;
import org.springframework.core.io.InputStreamResource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * [컨트롤러] backend/src/main/java/com/codexpong/backend/replay/ReplayController.java
 * 설명:
 *   - 리플레이 메타데이터 목록과 이벤트 파일을 조회하는 API를 노출한다.
 * 버전: v0.5.0
 * 관련 설계문서:
 *   - design/contracts/v0.5.0-replay-export-contract.md
 */
@RestController
@RequestMapping("/api/replays")
public class ReplayController {

    private final ReplayService replayService;

    public ReplayController(ReplayService replayService) {
        this.replayService = replayService;
    }

    @GetMapping
    public ReplayListResponse list(@AuthenticationPrincipal AuthenticatedUser user) {
        List<ReplayResponse> items = replayService.listByOwner(user.id()).stream()
                .map(ReplayResponse::from)
                .collect(Collectors.toList());
        return new ReplayListResponse("1", items);
    }

    @GetMapping("/{id}")
    public ReplayResponse detail(@AuthenticationPrincipal AuthenticatedUser user, @PathVariable Long id) {
        return ReplayResponse.from(replayService.getOwnedReplay(id, user.id()));
    }

    @GetMapping("/{id}/events")
    public ResponseEntity<InputStreamResource> download(@AuthenticationPrincipal AuthenticatedUser user,
            @PathVariable Long id) throws IOException {
        Replay replay = replayService.getOwnedReplay(id, user.id());
        Path eventPath = replayService.resolveEventPath(replay);
        InputStreamResource resource = new InputStreamResource(Files.newInputStream(eventPath));
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_OCTET_STREAM);
        headers.setContentDispositionFormData("attachment", eventPath.getFileName().toString());
        return ResponseEntity.ok()
                .headers(headers)
                .body(resource);
    }

    public record ReplayListResponse(String schemaVersion, List<ReplayResponse> items) {
    }

    public record ReplayResponse(Long id, Long ownerId, String title, long durationMillis, String eventPath,
            String createdAt) {

        static ReplayResponse from(Replay replay) {
            return new ReplayResponse(
                    replay.getId(),
                    replay.getOwnerId(),
                    replay.getTitle(),
                    replay.getDurationMillis(),
                    replay.getEventPath(),
                    replay.getCreatedAt().atOffset(ZoneOffset.UTC).toString()
            );
        }
    }
}
