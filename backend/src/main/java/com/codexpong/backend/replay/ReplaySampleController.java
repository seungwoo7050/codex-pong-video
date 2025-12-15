package com.codexpong.backend.replay;

import com.codexpong.backend.auth.model.AuthenticatedUser;
import java.util.List;
import org.springframework.context.annotation.Profile;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/**
 * [컨트롤러] backend/src/main/java/com/codexpong/backend/replay/ReplaySampleController.java
 * 설명:
 *   - dev 프로파일에서 로그인 사용자가 즉시 사용할 수 있는 샘플 리플레이를 생성한다.
 *   - 이벤트 파일을 실제 스토리지에 기록해 E2E 내보내기 데모가 막히지 않도록 한다.
 * 버전: v0.5.0
 * 관련 설계문서:
 *   - design/contracts/v0.5.0-replay-export-contract.md
 */
@RestController
@Profile("dev")
@RequestMapping("/api/replays/sample")
public class ReplaySampleController {

    private final ReplayService replayService;

    public ReplaySampleController(ReplayService replayService) {
        this.replayService = replayService;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ReplayController.ReplayResponse createSample(@AuthenticationPrincipal AuthenticatedUser user) {
        List<String> events = List.of(
                "{\"ts\":0,\"event\":\"start\"}",
                "{\"ts\":1000,\"event\":\"score\",\"player\":\"A\"}",
                "{\"ts\":2000,\"event\":\"score\",\"player\":\"B\"}",
                "{\"ts\":4000,\"event\":\"end\"}");
        Replay replay = replayService.createReplay(user.id(), "샘플 리플레이", 5000L, events);
        return ReplayController.ReplayResponse.from(replay);
    }
}
