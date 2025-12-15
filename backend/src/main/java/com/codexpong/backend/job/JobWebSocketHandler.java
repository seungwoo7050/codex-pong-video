package com.codexpong.backend.job;

import com.codexpong.backend.auth.model.AuthenticatedUser;
import com.codexpong.backend.config.WebSocketAuthHandshakeInterceptor;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.io.IOException;
import java.util.Collections;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.TextWebSocketHandler;

/**
 * [WS 핸들러] backend/src/main/java/com/codexpong/backend/job/JobWebSocketHandler.java
 * 설명:
 *   - 작업 진행률/완료/실패 이벤트를 해당 사용자에게만 전달한다.
 *   - 인증된 사용자별 세션 풀을 유지하며, 백엔드 서비스가 메시지를 전송할 수 있도록 한다.
 * 버전: v0.5.0
 * 관련 설계문서:
 *   - design/contracts/v0.5.0-replay-export-contract.md
 */
@Component
public class JobWebSocketHandler extends TextWebSocketHandler {

    private static final Logger log = LoggerFactory.getLogger(JobWebSocketHandler.class);

    private final ObjectMapper objectMapper;
    private final ConcurrentHashMap<Long, Set<WebSocketSession>> sessionsByUser = new ConcurrentHashMap<>();

    public JobWebSocketHandler(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    @Override
    public void afterConnectionEstablished(WebSocketSession session) {
        AuthenticatedUser user = (AuthenticatedUser) session.getAttributes().get(WebSocketAuthHandshakeInterceptor.AUTH_USER_KEY);
        if (user == null) {
            closeSilently(session);
            return;
        }
        sessionsByUser.computeIfAbsent(user.id(), key -> ConcurrentHashMap.newKeySet()).add(session);
    }

    @Override
    public void afterConnectionClosed(WebSocketSession session, CloseStatus status) {
        AuthenticatedUser user = (AuthenticatedUser) session.getAttributes().get(WebSocketAuthHandshakeInterceptor.AUTH_USER_KEY);
        if (user != null) {
            Set<WebSocketSession> set = sessionsByUser.getOrDefault(user.id(), Collections.emptySet());
            set.remove(session);
        }
    }

    public void sendToUser(Long userId, Object payload) {
        Set<WebSocketSession> sessions = sessionsByUser.getOrDefault(userId, Collections.emptySet());
        for (WebSocketSession session : sessions) {
            if (session.isOpen()) {
                try {
                    session.sendMessage(new TextMessage(objectMapper.writeValueAsString(payload)));
                } catch (JsonProcessingException e) {
                    log.warn("웹소켓 직렬화 실패", e);
                } catch (IOException e) {
                    log.warn("웹소켓 전송 실패", e);
                }
            }
        }
    }

    private void closeSilently(WebSocketSession session) {
        try {
            session.close(CloseStatus.NOT_ACCEPTABLE.withReason("인증 필요"));
        } catch (IOException e) {
            log.debug("웹소켓 종료 실패 무시", e);
        }
    }
}
