package com.codexpong.backend;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

/**
 * [부트스트랩] backend/src/main/java/com/codexpong/backend/CodexPongApplication.java
 * 설명:
 *   - Spring Boot 애플리케이션의 진입점이다.
 *   - v0.2.0 기준 인증/프로필, 테스트 게임 API, WebSocket 설정을 함께 구동한다.
 * 버전: v0.2.0
 * 관련 설계문서:
 *   - design/backend/v0.1.0-core-skeleton-and-health.md
 *   - design/realtime/v0.1.0-basic-websocket-wiring.md
 *   - design/backend/v0.2.0-auth-and-profile.md
 * 변경 이력:
 *   - v0.1.0: 프로젝트 부트스트랩 생성
 *   - v0.2.0: 인증/프로필 모듈 구동 항목 반영
 */
@SpringBootApplication
public class CodexPongApplication {

    public static void main(String[] args) {
        SpringApplication.run(CodexPongApplication.class, args);
    }
}
