package com.codexpong.backend;

import static org.assertj.core.api.Assertions.assertThat;

import com.codexpong.backend.auth.dto.AuthResponse;
import com.codexpong.backend.auth.dto.LoginRequest;
import com.codexpong.backend.auth.dto.RegisterRequest;
import com.codexpong.backend.user.domain.User;
import com.codexpong.backend.user.repository.UserRepository;
import java.net.URI;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketHttpHeaders;
import org.springframework.web.socket.client.standard.StandardWebSocketClient;
import org.springframework.web.socket.handler.TextWebSocketHandler;

/**
 * [통합테스트] backend/src/test/java/com/codexpong/backend/Utf8RoundTripTest.java
 * 설명:
 *   - 한글+이모지 닉네임이 REST/DB/웹소켓 왕복에서 손실 없이 유지되는지 검증한다.
 *   - v0.6.0 UTF-8 회귀 요구사항을 충족하는지 확인한다.
 * 버전: v0.6.0
 * 관련 설계문서:
 *   - design/contracts/v0.6.0-portfolio-media-contract.md
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@ActiveProfiles("test")
class Utf8RoundTripTest {

    @Autowired
    private TestRestTemplate restTemplate;

    @Autowired
    private UserRepository userRepository;

    @LocalServerPort
    private int port;

    @Test
    void koreanEmojiNickname_survives_rest_db_ws_roundtrip() throws Exception {
        String nickname = "한글닉😀🚀";
        RegisterRequest registerRequest = new RegisterRequest("utf8user", "password123", nickname, "http://example.com/avatar.png");
        AuthResponse register = restTemplate.postForObject(
                String.format("http://localhost:%d/api/auth/register", port), registerRequest, AuthResponse.class);
        assertThat(register).isNotNull();
        assertThat(register.getUser().getNickname()).isEqualTo(nickname);

        User stored = userRepository.findByUsername("utf8user").orElseThrow();
        assertThat(stored.getNickname()).isEqualTo(nickname);

        LoginRequest loginRequest = new LoginRequest("utf8user", "password123");
        AuthResponse login = restTemplate.postForObject(
                String.format("http://localhost:%d/api/auth/login", port), loginRequest, AuthResponse.class);
        assertThat(login).isNotNull();
        assertThat(login.getUser().getNickname()).isEqualTo(nickname);

        String token = login.getToken();
        String payload = "메시지😀🔥";
        CountDownLatch latch = new CountDownLatch(1);
        StringBuilder echoed = new StringBuilder();

        StandardWebSocketClient client = new StandardWebSocketClient();
        client.doHandshake(new TextWebSocketHandler() {
            @Override
            public void afterConnectionEstablished(org.springframework.web.socket.WebSocketSession session) throws Exception {
                session.sendMessage(new TextMessage(payload));
            }

            @Override
            protected void handleTextMessage(org.springframework.web.socket.WebSocketSession session, TextMessage message)
                    throws Exception {
                echoed.append(message.getPayload());
                latch.countDown();
            }
        }, new WebSocketHttpHeaders(), URI.create(String.format("ws://localhost:%d/ws/echo?token=%s", port, token))).get();

        boolean completed = latch.await(3, TimeUnit.SECONDS);
        assertThat(completed).isTrue();
        assertThat(echoed.toString()).contains(nickname).contains(payload);
    }
}
