package com.codexpong.backend.user.dto;

import com.codexpong.backend.user.domain.User;
import java.time.LocalDateTime;

/**
 * [응답 DTO] backend/src/main/java/com/codexpong/backend/user/dto/UserResponse.java
 * 설명:
 *   - 사용자 프로필과 계정 메타 정보를 클라이언트에 전달하기 위한 DTO다.
 *   - v0.4.0에서 랭크 레이팅을 추가해 프로필 UI와 리더보드에서 재사용한다.
 * 버전: v0.4.0
 * 관련 설계문서:
 *   - design/backend/v0.4.0-ranking-system.md
 * 변경 이력:
 *   - v0.2.0: 기본 필드 매핑 추가
 *   - v0.4.0: rating 필드 추가
 */
public class UserResponse {

    private final Long id;
    private final String username;
    private final String nickname;
    private final String avatarUrl;
    private final Integer rating;
    private final LocalDateTime createdAt;
    private final LocalDateTime updatedAt;

    public UserResponse(Long id, String username, String nickname, String avatarUrl, Integer rating,
            LocalDateTime createdAt, LocalDateTime updatedAt) {
        this.id = id;
        this.username = username;
        this.nickname = nickname;
        this.avatarUrl = avatarUrl;
        this.rating = rating;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
    }

    public static UserResponse from(User user) {
        return new UserResponse(
                user.getId(),
                user.getUsername(),
                user.getNickname(),
                user.getAvatarUrl(),
                user.getRating(),
                user.getCreatedAt(),
                user.getUpdatedAt()
        );
    }

    public Long getId() {
        return id;
    }

    public String getUsername() {
        return username;
    }

    public String getNickname() {
        return nickname;
    }

    public String getAvatarUrl() {
        return avatarUrl;
    }

    public Integer getRating() {
        return rating;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }
}
