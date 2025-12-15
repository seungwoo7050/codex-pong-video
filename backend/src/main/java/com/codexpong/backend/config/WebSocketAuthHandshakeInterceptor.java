package com.codexpong.backend.config;

import com.codexpong.backend.auth.model.AuthenticatedUser;
import com.codexpong.backend.auth.service.AuthService;
import com.codexpong.backend.auth.service.AuthTokenService;
import java.net.URI;
import java.util.Map;
import java.util.Optional;
import org.springframework.http.server.ServerHttpRequest;
import org.springframework.http.server.ServerHttpResponse;
import org.springframework.http.server.ServletServerHttpRequest;
import org.springframework.stereotype.Component;
import org.springframework.util.MultiValueMap;
import org.springframework.web.socket.WebSocketHandler;
import org.springframework.web.socket.server.HandshakeInterceptor;
import org.springframework.web.util.UriComponentsBuilder;

/**
 * [인터셉터] backend/src/main/java/com/codexpong/backend/config/WebSocketAuthHandshakeInterceptor.java
 * 설명:
 *   - WebSocket 핸드셰이크 시 전달된 JWT를 검증하고, 연결된 사용자를 속성에 기록한다.
 *   - Authorization 헤더 또는 `token` 쿼리 파라미터를 지원한다.
 * 버전: v0.2.0
 * 관련 설계문서:
 *   - design/backend/v0.2.0-auth-and-profile.md
 * 변경 이력:
 *   - v0.2.0: JWT 검증 기반 핸드셰이크 인터셉터 추가
 */
@Component
public class WebSocketAuthHandshakeInterceptor implements HandshakeInterceptor {

    public static final String AUTH_USER_KEY = "authenticatedUser";

    private final AuthTokenService authTokenService;
    private final AuthService authService;

    public WebSocketAuthHandshakeInterceptor(AuthTokenService authTokenService, AuthService authService) {
        this.authTokenService = authTokenService;
        this.authService = authService;
    }

    @Override
    public boolean beforeHandshake(ServerHttpRequest request, ServerHttpResponse response, WebSocketHandler wsHandler,
            Map<String, Object> attributes) {
        String token = extractToken(request);
        if (token == null) {
            return false;
        }
        Optional<AuthenticatedUser> authenticatedUser = authTokenService.parse(token)
                .flatMap(user -> authService.findById(user.id()).map(authService::toAuthenticatedUser));
        authenticatedUser.ifPresent(user -> attributes.put(AUTH_USER_KEY, user));
        return authenticatedUser.isPresent();
    }

    @Override
    public void afterHandshake(ServerHttpRequest request, ServerHttpResponse response, WebSocketHandler wsHandler,
            Exception exception) {
        // 연결 완료 후 별도 작업 없음
    }

    private String extractToken(ServerHttpRequest request) {
        if (request instanceof ServletServerHttpRequest servletRequest) {
            String header = servletRequest.getServletRequest().getHeader("Authorization");
            if (header != null && header.startsWith("Bearer ")) {
                return header.substring(7);
            }
        }
        URI uri = request.getURI();
        MultiValueMap<String, String> params = UriComponentsBuilder.fromUri(uri).build().getQueryParams();
        return params.getFirst("token");
    }
}
