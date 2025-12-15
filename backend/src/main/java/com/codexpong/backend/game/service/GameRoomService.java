package com.codexpong.backend.game.service;

import com.codexpong.backend.game.GameResult;
import com.codexpong.backend.game.GameResultService;
import com.codexpong.backend.game.domain.GameRoom;
import com.codexpong.backend.game.domain.MatchType;
import com.codexpong.backend.game.engine.model.GameSnapshot;
import com.codexpong.backend.game.engine.model.PaddleInput;
import com.codexpong.backend.user.domain.User;
import java.io.IOException;
import java.time.Duration;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.ScheduledFuture;
import java.util.concurrent.TimeUnit;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Service;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;

/**
 * [서비스] backend/src/main/java/com/codexpong/backend/game/service/GameRoomService.java
 * 설명:
 *   - 경기 방 생성/관리와 틱 루프 실행, 상태 브로드캐스트를 담당한다.
 *   - 방이 종료되면 GameResultService를 통해 DB에 기록한다.
 * 버전: v0.4.0
 * 관련 설계문서:
 *   - design/backend/v0.4.0-ranking-system.md
 *   - design/realtime/v0.4.0-ranking-aware-events.md
 */
@Service
public class GameRoomService {

    private static final Duration TICK_INTERVAL = Duration.ofMillis(50);

    private final Map<String, GameRoom> rooms = new ConcurrentHashMap<>();
    private final Map<String, ScheduledFuture<?>> loopHandles = new ConcurrentHashMap<>();
    private final Map<String, Map<Long, WebSocketSession>> roomSessions = new ConcurrentHashMap<>();

    private final ScheduledExecutorService scheduler = Executors.newScheduledThreadPool(2);
    private final GameResultService gameResultService;
    private final ObjectMapper objectMapper;

    public GameRoomService(GameResultService gameResultService, ObjectMapper objectMapper) {
        this.gameResultService = gameResultService;
        this.objectMapper = objectMapper;
    }

    public GameRoom createRoom(User left, User right, MatchType matchType) {
        GameRoom room = new GameRoom(left, right, matchType);
        rooms.put(room.getRoomId(), room);
        return room;
    }

    public Optional<GameRoom> findRoom(String roomId) {
        return Optional.ofNullable(rooms.get(roomId));
    }

    public void removeRoom(String roomId) {
        Optional.ofNullable(loopHandles.remove(roomId)).ifPresent(handle -> handle.cancel(true));
        rooms.remove(roomId);
        roomSessions.remove(roomId);
    }

    public void updateInput(String roomId, Long userId, PaddleInput input) {
        GameRoom room = rooms.get(roomId);
        if (room != null && room.contains(userId)) {
            room.updateInput(userId, input);
        }
    }

    public void registerSession(GameRoom room, Long userId, WebSocketSession session) {
        roomSessions.computeIfAbsent(room.getRoomId(), key -> new ConcurrentHashMap<>())
                .put(userId, session);
        if (!loopHandles.containsKey(room.getRoomId()) && hasBothPlayers(room.getRoomId())) {
            startLoop(room);
        }
    }

    private boolean hasBothPlayers(String roomId) {
        Map<Long, WebSocketSession> sessions = roomSessions.get(roomId);
        if (sessions == null) {
            return false;
        }
        GameRoom room = rooms.get(roomId);
        return room != null
                && sessions.containsKey(room.getLeftPlayer().getId())
                && sessions.containsKey(room.getRightPlayer().getId());
    }

    private void startLoop(GameRoom room) {
        ScheduledFuture<?> handle = scheduler.scheduleAtFixedRate(() -> runTick(room), 0,
                TICK_INTERVAL.toMillis(), TimeUnit.MILLISECONDS);
        loopHandles.put(room.getRoomId(), handle);
    }

    private void runTick(GameRoom room) {
        GameSnapshot snapshot = room.tick(TICK_INTERVAL);
        broadcastState(room.getRoomId(), snapshot, room.getMatchType(), null);
        if (snapshot.finished()) {
            finishRoom(room, snapshot);
        }
    }

    private void broadcastState(String roomId, GameSnapshot snapshot, MatchType matchType,
            GameResult ratingResult) {
        Map<Long, WebSocketSession> sessions = roomSessions.get(roomId);
        if (sessions == null) {
            return;
        }
        GameServerMessage message = new GameServerMessage("STATE", snapshot, matchType.name(),
                ratingResult == null ? null : GameServerMessage.RatingChange.from(ratingResult));
        try {
            String payload = objectMapper.writeValueAsString(message);
            sessions.values().forEach(session -> {
                try {
                    if (session.isOpen()) {
                        session.sendMessage(new TextMessage(payload));
                    }
                } catch (IOException ignored) {
                }
            });
        } catch (IOException ignored) {
        }
    }

    private void finishRoom(GameRoom room, GameSnapshot snapshot) {
        GameResult result = gameResultService.recordResult(
                room.getRoomId(),
                room.getLeftPlayer(),
                room.getRightPlayer(),
                snapshot.leftScore(),
                snapshot.rightScore(),
                room.getMatchType(),
                room.getStartedAt(),
                room.getFinishedAt() != null ? room.getFinishedAt() : LocalDateTime.now(ZoneId.of("Asia/Seoul"))
        );
        broadcastState(room.getRoomId(), snapshot, room.getMatchType(), result);
        removeRoom(room.getRoomId());
    }

    public record GameServerMessage(String type, GameSnapshot snapshot, String matchType, RatingChange ratingChange) {

        public record RatingChange(Long winnerId, int winnerDelta, Long loserId, int loserDelta) {

            static RatingChange from(GameResult result) {
                if (!result.isRanked()) {
                    return null;
                }
                Long winnerId = result.getScoreA() == result.getScoreB()
                        ? null
                        : (result.getScoreA() > result.getScoreB() ? result.getPlayerA().getId()
                                : result.getPlayerB().getId());
                int deltaA = result.getRatingChangeA();
                int deltaB = result.getRatingChangeB();
                if (winnerId == null) {
                    return new RatingChange(null, deltaA, null, deltaB);
                }
                boolean playerAWin = winnerId.equals(result.getPlayerA().getId());
                return new RatingChange(winnerId,
                        playerAWin ? deltaA : deltaB,
                        playerAWin ? result.getPlayerB().getId() : result.getPlayerA().getId(),
                        playerAWin ? deltaB : deltaA);
            }
        }
    }
}
