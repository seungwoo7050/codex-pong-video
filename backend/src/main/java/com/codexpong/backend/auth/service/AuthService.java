package com.codexpong.backend.auth.service;

import com.codexpong.backend.auth.dto.AuthResponse;
import com.codexpong.backend.auth.dto.LoginRequest;
import com.codexpong.backend.auth.dto.RegisterRequest;
import com.codexpong.backend.auth.model.AuthenticatedUser;
import com.codexpong.backend.user.domain.User;
import com.codexpong.backend.user.dto.UserResponse;
import com.codexpong.backend.user.repository.UserRepository;
import java.util.Optional;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

/**
 * [서비스] backend/src/main/java/com/codexpong/backend/auth/service/AuthService.java
 * 설명:
 *   - 회원가입, 로그인, 토큰 생성 흐름을 담당한다.
 *   - 비밀번호 검증 및 사용자 중복 체크를 수행한 뒤 토큰과 사용자 정보를 반환한다.
 * 버전: v0.4.0
 * 관련 설계문서:
 *   - design/backend/v0.4.0-ranking-system.md
 * 변경 이력:
 *   - v0.2.0: JWT 발급 기반 인증 서비스 구현
 *   - v0.4.0: 레이팅 필드 포함 사용자 응답 유지
 */
@Service
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuthTokenService authTokenService;

    public AuthService(UserRepository userRepository, PasswordEncoder passwordEncoder,
            AuthTokenService authTokenService) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.authTokenService = authTokenService;
    }

    public AuthResponse register(RegisterRequest request) {
        if (userRepository.existsByUsername(request.getUsername())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "이미 존재하는 아이디입니다.");
        }
        User user = new User(
                request.getUsername(),
                passwordEncoder.encode(request.getPassword()),
                request.getNickname(),
                request.getAvatarUrl()
        );
        User saved = userRepository.save(user);
        return toAuthResponse(saved);
    }

    public AuthResponse login(LoginRequest request) {
        User user = userRepository.findByUsername(request.getUsername())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "아이디 또는 비밀번호가 올바르지 않습니다."));
        if (!passwordEncoder.matches(request.getPassword(), user.getPassword())) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "아이디 또는 비밀번호가 올바르지 않습니다.");
        }
        return toAuthResponse(user);
    }

    public AuthenticatedUser toAuthenticatedUser(User user) {
        return new AuthenticatedUser(user.getId(), user.getUsername(), user.getNickname());
    }

    public Optional<User> findById(Long id) {
        return userRepository.findById(id);
    }

    private AuthResponse toAuthResponse(User user) {
        AuthenticatedUser authenticated = toAuthenticatedUser(user);
        String token = authTokenService.generateToken(authenticated);
        return new AuthResponse(token, authTokenService.calculateExpiry(), UserResponse.from(user));
    }
}
