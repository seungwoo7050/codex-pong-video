package com.codexpong.backend.auth.controller;

import com.codexpong.backend.auth.dto.AuthResponse;
import com.codexpong.backend.auth.dto.LoginRequest;
import com.codexpong.backend.auth.dto.RegisterRequest;
import com.codexpong.backend.auth.model.AuthenticatedUser;
import com.codexpong.backend.auth.service.AuthService;
import jakarta.validation.Valid;
import java.util.Map;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * [컨트롤러] backend/src/main/java/com/codexpong/backend/auth/controller/AuthController.java
 * 설명:
 *   - 회원가입, 로그인, 로그아웃 API를 제공해 프런트엔드 인증 흐름을 완성한다.
 *   - JWT를 이용해 발급된 토큰과 사용자 정보를 반환하며, 로그아웃은 클라이언트 토큰 폐기를 안내한다.
 * 버전: v0.2.0
 * 관련 설계문서:
 *   - design/backend/v0.2.0-auth-and-profile.md
 * 변경 이력:
 *   - v0.2.0: 인증 API 최초 구현
 */
@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    /**
     * 설명:
     *   - 중복 아이디를 검사하고 새 계정을 생성한 뒤 JWT를 발급한다.
     * 입력:
     *   - RegisterRequest: username, password, nickname, avatarUrl
     * 출력:
     *   - AuthResponse: 토큰 문자열과 만료 시각, 사용자 프로필
     */
    @PostMapping("/register")
    public AuthResponse register(@Valid @RequestBody RegisterRequest request) {
        return authService.register(request);
    }

    /**
     * 설명:
     *   - 아이디/비밀번호를 검증하고 인증 토큰을 발급한다.
     * 입력:
     *   - LoginRequest: username, password
     * 출력:
     *   - AuthResponse: 토큰 문자열과 만료 시각, 사용자 프로필
     */
    @PostMapping("/login")
    public AuthResponse login(@Valid @RequestBody LoginRequest request) {
        return authService.login(request);
    }

    /**
     * 설명:
     *   - 서버 측 세션 상태를 사용하지 않으므로 클라이언트에게 토큰 폐기 지침만 전달한다.
     * 출력:
     *   - message 필드를 가진 간단한 Map
     */
    @PostMapping("/logout")
    public Map<String, String> logout(@AuthenticationPrincipal AuthenticatedUser user) {
        String nickname = user != null ? user.nickname() : "";
        return Map.of("message", "로그아웃되었습니다.", "user", nickname);
    }
}
