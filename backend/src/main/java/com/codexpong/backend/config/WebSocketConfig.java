package com.codexpong.backend.config;

import com.codexpong.backend.game.EchoWebSocketHandler;
import com.codexpong.backend.game.GameWebSocketHandler;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.socket.config.annotation.EnableWebSocket;
import org.springframework.web.socket.config.annotation.WebSocketConfigurer;
import org.springframework.web.socket.config.annotation.WebSocketHandlerRegistry;

/**
 * [설정] backend/src/main/java/com/codexpong/backend/config/WebSocketConfig.java
 * 설명:
 *   - WebSocket 핸들러 등록을 통해 기본 에코 엔드포인트를 노출한다.
 *   - JWT 기반 핸드셰이크를 통해 인증 사용자 정보를 세션에 연결한다.
 * 버전: v0.2.0
 * 관련 설계문서:
 *   - design/realtime/v0.1.0-basic-websocket-wiring.md
 *   - design/backend/v0.2.0-auth-and-profile.md
 * 변경 이력:
 *   - v0.1.0: 에코 핸들러 등록 추가
 *   - v0.2.0: JWT 인증 인터셉터와 핸드셰이크 핸들러 연결
 */
@Configuration
@EnableWebSocket
public class WebSocketConfig implements WebSocketConfigurer {

    private final EchoWebSocketHandler echoWebSocketHandler;
    private final GameWebSocketHandler gameWebSocketHandler;
    private final WebSocketAuthHandshakeInterceptor webSocketAuthHandshakeInterceptor;

    public WebSocketConfig(EchoWebSocketHandler echoWebSocketHandler,
            GameWebSocketHandler gameWebSocketHandler,
            WebSocketAuthHandshakeInterceptor webSocketAuthHandshakeInterceptor) {
        this.echoWebSocketHandler = echoWebSocketHandler;
        this.gameWebSocketHandler = gameWebSocketHandler;
        this.webSocketAuthHandshakeInterceptor = webSocketAuthHandshakeInterceptor;
    }

    @Override
    public void registerWebSocketHandlers(WebSocketHandlerRegistry registry) {
        registry.addHandler(echoWebSocketHandler, "/ws/echo")
                .addInterceptors(webSocketAuthHandshakeInterceptor)
                .setHandshakeHandler(new WebSocketUserHandshakeHandler())
                .setAllowedOrigins("*");

        registry.addHandler(gameWebSocketHandler, "/ws/game")
                .addInterceptors(webSocketAuthHandshakeInterceptor)
                .setHandshakeHandler(new WebSocketUserHandshakeHandler())
                .setAllowedOrigins("*");
    }
}
