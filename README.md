# CodexPong

> **실시간 웹 게임 + FFmpeg 기반 비동기 영상 처리 파이프라인**  
> Vrew 웹 애플리케이션 개발자 포지션 맞춤 포트폴리오 프로젝트

[![Version](https://img.shields.io/badge/version-0.6.0-blue.svg)](./VERSIONING.md)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](./LICENSE)

## 📋 목차

- [프로젝트 소개](#-프로젝트-소개)
- [핵심 기술 및 특징](#-핵심-기술-및-특징)
- [포트폴리오 하이라이트](#-포트폴리오-하이라이트)
- [빠른 시작](#-빠른-시작)
- [시스템 아키텍처](#-시스템-아키텍처)
- [주요 기능](#-주요-기능)
- [API 엔드포인트](#-api-엔드포인트)
- [3분 데모](#-3분-데모)
- [개발 가이드](#-개발-가이드)
- [테스트](#-테스트)
- [프로젝트 구조](#-프로젝트-구조)
- [환경 변수](#-환경-변수)
- [문서](#-문서)

---

## 🎯 프로젝트 소개

CodexPong은 **실시간 웹 기반 Pong 게임**과 **FFmpeg 기반 비동기 영상 처리 파이프라인**을 결합한 포트폴리오 프로젝트입니다.

### 왜 이 프로젝트인가?

**Vrew 웹 애플리케이션 개발자** 포지션에서 요구하는 핵심 역량을 실제 동작하는 시스템으로 구현했습니다:

- ✅ **React/TypeScript**: WebGL 렌더러 + Canvas2D 폴백, 실시간 UI 업데이트
- ✅ **Node.js/TypeScript**: FFmpeg 프로세스 관리 워커, Redis Streams 기반 비동기 큐
- ✅ **FFmpeg/ffprobe**: 영상 변환 + 진행률 파싱 + 엄격한 품질 검증
- ✅ **WebGL/Canvas**: GPU 가속 렌더링 + 자동 폴백 메커니즘
- ✅ **WebAudio**: 실시간 오디오 큐 처리
- ✅ **비동기 I/O**: 작업 상태 머신, WebSocket 실시간 진행률 푸시
- ✅ **UTF-8 처리**: 한글/이모지 회귀 테스트 포함

### 핵심 가치

- **"작동하는 것"**: 3분 데모로 전체 플로우 검증 가능
- **"실패 모드"**: 의미없는 영상 더미 감지 및 안정적 에러 코드
- **"근거 있는 주장"**: 성능 감사 문서, 검증 로직, 회귀 테스트

---

## 🛠 핵심 기술 및 특징

### Backend
- **Spring Boot 3.x** (Java 17+)
- MariaDB (utf8mb4), Redis Streams
- REST API + WebSocket (실시간 게임/작업 진행률)
- JWT 인증, ELO 레이팅 시스템

### Frontend
- **React 18** + TypeScript + Vite
- **WebGL 우선 렌더러** (Canvas2D 자동 폴백)
- **WebAudio** 오디오 큐
- React Query (서버 상태 관리)
- WebSocket 클라이언트 (재연결 정책 포함)

### Worker (비동기 영상 처리)
- **Node.js 20** + TypeScript
- **FFmpeg/ffprobe** 프로세스 관리
- Redis Streams 소비자
- 엄격한 출력 검증:
  - ffprobe 구조 검증 (비디오 스트림, duration, width/height)
  - **트리비얼 프레임 가드**: 두 시점 프레임 해시 비교로 "의미없는 영상" 방지
  - 원자적 파일 쓰기 (temp → validate → rename)

### Infrastructure
- Docker Compose (단일 커맨드 실행)
- Nginx 리버스 프록시
- Named Volumes (리플레이 이벤트, 내보내기 산출물)

---

## 💎 포트폴리오 하이라이트

### 1. FFmpeg 비동기 파이프라인
```
경기 종료 → 리플레이 저장(JSONL) → 내보내기 요청
           ↓
    Redis Streams 큐
           ↓
    Worker: FFmpeg 실행 + 진행률 파싱
           ↓
    엄격한 검증 (ffprobe + 프레임 비교)
           ↓
    WebSocket으로 실시간 진행률 푸시
           ↓
    MP4 다운로드
```

**특징**:
- 진행률 실시간 업데이트 (`ffmpeg -progress`)
- **"ffmpeg exit 0 ≠ 성공"**: 반드시 ffprobe + 프레임 검증 통과 필요
- 안정적 에러 코드: `FFPROBE_INVALID_OUTPUT`, `EXPORT_TRIVIAL_FRAMES`, `FFMPEG_TIMEOUT` 등
- Idempotency: 동일 jobId 재시도 시 중복 산출물 방지

### 2. WebGL 렌더러 + 폴백 전략
```typescript
// 자동 감지 및 폴백
const renderer = useWebGLRenderer() ?? useCanvas2DRenderer();
```

- GPU 가속 경로 우선
- WebGL 미지원 환경에서 자동으로 Canvas2D로 전환
- 성능 감사 문서로 리플로우/페인트 최적화 증명

### 3. 엄격한 품질 보증

#### 트리비얼 프레임 가드
```typescript
// 10%와 90% 구간의 프레임 해시 비교
const hash1 = await extractFrameHash(0.1);
const hash2 = await extractFrameHash(0.9);
if (hash1 === hash2) {
  throw new Error('EXPORT_TRIVIAL_FRAMES');
}
```

#### UTF-8 회귀 테스트
```java
@Test
void utf8RoundTrip() {
  String nickname = "테스트🎮";
  User user = userRepository.save(new User(nickname));
  assertThat(user.getNickname()).isEqualTo(nickname);
}
```

### 4. 작업 상태 머신
```
QUEUED → RUNNING → SUCCEEDED
                 ↘ FAILED
```
- 명시적 전이 규칙
- 종단 상태 진입 후 추가 업데이트 금지
- WebSocket으로 상태 변화 실시간 푸시

---

## 🚀 빠른 시작

### 사전 요구사항
- Docker & Docker Compose
- Git

### 1단계: 클론 및 실행
```bash
git clone <repository-url>
cd codex-pong-video

# 모든 서비스 빌드 및 시작 (단일 커맨드)
docker compose up -d
```

### 2단계: 접속 확인
- **웹 UI**: http://localhost
- **헬스체크**: http://localhost/api/health
- **리더보드**: http://localhost/leaderboard

### 3단계: 데모 실행
```bash
# 전체 플로우 자동 검증 (회원가입 → 리플레이 생성 → MP4 내보내기 → 검증)
./scripts/demo_v0_6.sh
```

**데모 스크립트는 다음을 수행합니다**:
1. UTF-8 닉네임(`데모닉😀`)으로 계정 생성
2. 샘플 리플레이 생성
3. MP4 내보내기 작업 시작
4. 작업 완료 대기 (진행률 폴링)
5. MP4 다운로드
6. **Worker 컨테이너 내부**에서 ffprobe + 트리비얼 프레임 가드 재검증
7. 성공 시 exit 0, 실패 시 exit 1

---

## 🏗 시스템 아키텍처

```
┌─────────────┐
│   Browser   │
│  (React)    │
└──────┬──────┘
       │ HTTP/WS
       ↓
┌─────────────┐     ┌──────────────┐
│    Nginx    │────→│   Backend    │
│  (Reverse   │     │ (Spring Boot)│
│   Proxy)    │     └──────┬───────┘
└─────────────┘            │
                           │ Redis Streams
                           ↓
                    ┌──────────────┐
                    │    Worker    │
                    │  (Node.js)   │
                    │   FFmpeg     │
                    └──────────────┘
                           
┌─────────────┐     ┌──────────────┐
│   MariaDB   │     │    Redis     │
│  (utf8mb4)  │     │  (Streams)   │
└─────────────┘     └──────────────┘
```

### 데이터 흐름

#### 실시간 게임
```
Client → WS /ws/game → GameWebSocketHandler → GameEngine → State Broadcast
```

#### 리플레이 내보내기
```
Client → POST /api/replays/{id}/exports/mp4
       ↓
   JobService (상태: QUEUED)
       ↓
   Redis Streams (replay.export.request)
       ↓
   Worker 소비
       ↓
   FFmpeg 실행 + 진행률 파싱
       ↓
   Redis Streams (progress/result)
       ↓
   JobService (상태: RUNNING → SUCCEEDED/FAILED)
       ↓
   WebSocket Push → Client UI 업데이트
```

---

## 🎮 주요 기능

### 1. 실시간 1v1 게임
- WebSocket 기반 저지연 게임플레이
- 서버 권위 물리 엔진
- 매치메이킹 (일반/랭크)
- ELO 레이팅 시스템

### 2. 리플레이 시스템
- 경기 자동 녹화 (JSONL_V1 포맷)
- 리플레이 뷰어 (재생/일시정지/탐색/배속)
- 메타데이터 관리 (DB)

### 3. 비동기 영상 내보내기
- MP4 변환 (FFmpeg)
- 썸네일 생성
- 실시간 진행률 업데이트
- 하드웨어 가속 옵션 (`EXPORT_HW_ACCEL=true`)
  - 지원: h264_nvenc, h264_vaapi, h264_qsv
  - 미지원 시 자동으로 libx264 폴백

### 4. 사용자 관리
- JWT 인증
- 프로필 관리 (닉네임, 아바타, 바이오)
- 한글/이모지 완전 지원 (utf8mb4)

### 5. 랭킹 시스템
- 실시간 리더보드
- ELO 레이팅
- 통계 (승/패, 승률)

---

## 📡 API 엔드포인트

### 인증
```http
POST /api/auth/register
POST /api/auth/login
GET  /api/auth/me
```

### 사용자
```http
GET  /api/users/{id}
PUT  /api/users/profile
```

### 게임
```http
POST /api/matchmaking/quick      # 빠른 매칭
POST /api/matchmaking/ranked     # 랭크 매칭
POST /api/game-results           # 경기 결과 저장
GET  /api/rankings/leaderboard   # 리더보드
```

### 리플레이
```http
GET  /api/replays                    # 목록
GET  /api/replays/{id}               # 메타데이터
GET  /api/replays/{id}/events        # JSONL 다운로드
POST /api/replays/{id}/exports/mp4   # MP4 내보내기
POST /api/replays/{id}/exports/thumbnail  # 썸네일
```

### 작업 (Jobs)
```http
GET  /api/jobs/{jobId}           # 상태 조회
GET  /api/jobs/{jobId}/result    # 결과 메타데이터
GET  /api/jobs/{jobId}/download  # 산출물 다운로드
```

### WebSocket
```
/ws/echo      # 연결 테스트
/ws/game      # 실시간 게임
/ws/jobs      # 작업 진행률 푸시
```

상세한 계약 문서:
- [v0.5.0 리플레이 + 내보내기 계약서](design/contracts/v0.5.0-replay-export-contract.md)
- [v0.6.0 포트폴리오 미디어 계약서](design/contracts/v0.6.0-portfolio-media-contract.md)

---

## 🎬 3분 데모

### 시나리오
1. **회원가입/로그인** (UTF-8 닉네임: `데모닉😀`)
2. **경기 플레이** → 리플레이 자동 저장
3. **리플레이 뷰어** 열기
   - 재생/일시정지
   - 탐색 (타임라인)
   - 배속 (0.5x / 1x / 2x)
4. **MP4 내보내기** 클릭
5. **진행률 실시간 표시** (WebSocket 푸시)
6. **MP4 다운로드** 및 재생 (실제 플레이 가능한 영상)

### 자동화된 데모 실행
```bash
./scripts/demo_v0_6.sh
```

이 스크립트는 **Worker 컨테이너 내부**에서 ffprobe + 트리비얼 프레임 가드를 실행하여 "진짜 영상"임을 증명합니다.

---

## 🔧 개발 가이드

### 로컬 개발 환경 (Docker Compose)

```bash
# 전체 재빌드
docker compose build --no-cache

# 특정 서비스만 재시작
docker compose restart backend

# 로그 확인
docker compose logs -f worker

# 컨테이너 진입
docker compose exec backend bash
docker compose exec worker sh
```

### 개별 서비스 로컬 실행

#### Backend
```bash
cd backend
./gradlew bootRun

# 테스트
./gradlew test
```

#### Frontend
```bash
cd frontend
npm install
npm run dev

# 테스트
npm test

# 빌드
npm run build
```

#### Worker
```bash
cd worker
npm install
npm run build
npm run start

# 테스트
npm test
```

### 데이터베이스 접속
```bash
docker compose exec db mariadb -u codexpong -pcodexpong codexpong
```

### Redis CLI
```bash
docker compose exec redis redis-cli
```

---

## ✅ 테스트

### 전체 테스트 실행
```bash
# Backend 테스트
cd backend && ./gradlew test

# Frontend 테스트
cd frontend && npm test

# Worker 테스트
cd worker && npm test
```

### 주요 테스트 커버리지

#### Backend
- ✅ 인증 플로우 (회원가입/로그인/JWT)
- ✅ 게임 엔진 (물리, 충돌 감지)
- ✅ 매치메이킹 로직
- ✅ 랭킹 업데이트 (ELO)
- ✅ 작업 상태 머신
- ✅ **UTF-8 왕복 테스트** (한글/이모지)

#### Frontend
- ✅ 인증 Provider
- ✅ 리플레이 렌더러 (WebGL/Canvas2D)
- ✅ 오디오 큐
- ✅ 내보내기 진행률 UI

#### Worker
- ✅ ffprobe 파서
- ✅ 트리비얼 프레임 가드
- ✅ 하드웨어 인코더 폴백 로직
- ✅ 진행률 매핑

### 통합 테스트 (E2E)
```bash
# Docker Compose 환경에서 전체 플로우 검증
./scripts/demo_v0_6.sh
```

---

## 📁 프로젝트 구조

```
.
├── backend/                 # Spring Boot 백엔드
│   ├── src/main/java/
│   │   └── com/codexpong/backend/
│   │       ├── auth/        # 인증/인가
│   │       ├── user/        # 사용자 관리
│   │       ├── game/        # 게임 로직/매치메이킹/랭킹
│   │       ├── replay/      # 리플레이 CRUD
│   │       ├── job/         # 작업 상태 관리
│   │       └── config/      # Security, WebSocket
│   └── src/test/java/
│
├── frontend/                # React 프론트엔드
│   ├── src/
│   │   ├── pages/           # 페이지 컴포넌트
│   │   ├── features/auth/   # 인증 로직
│   │   ├── hooks/           # 커스텀 훅 (WebSocket, 게임)
│   │   └── shared/          # 공통 컴포넌트/유틸
│   └── src/test/
│
├── worker/                  # FFmpeg 워커
│   ├── src/
│   │   ├── index.ts         # Redis Streams 소비자
│   │   ├── encoderConfig.ts # 하드웨어/소프트웨어 인코더 선택
│   │   └── validation.ts    # ffprobe + 프레임 가드
│   └── src/*.test.ts
│
├── infra/                   # 인프라 설정
│   └── nginx/
│       └── conf.d/
│
├── design/                  # 설계 문서 (한국어)
│   ├── backend/
│   ├── frontend/
│   ├── contracts/           # API/WS/Queue 계약서
│   └── infra/
│
├── scripts/
│   └── demo_v0_6.sh         # 제출용 데모 스크립트
│
├── docker-compose.yml
├── AGENTS.md                # AI 에이전트 가이드
├── STACK_DESIGN.md          # 기술 스택 정의
├── PRODUCT_SPEC.md          # 제품 명세
├── CODING_GUIDE.md          # 코딩 컨벤션
├── VERSIONING.md            # 버전 로드맵
├── CLONE_GUIDE.md           # 클론/실행 가이드
└── README.md                # 이 문서
```

---

## ⚙️ 환경 변수

### Backend (Spring Boot)
```bash
# 데이터베이스
DB_HOST=db                    # MariaDB 호스트
DB_NAME=codexpong             # 데이터베이스 이름
DB_USER=codexpong             # 사용자
DB_PASSWORD=codexpong         # 비밀번호

# 인증
AUTH_JWT_SECRET=change-me-in-prod-secret-please-keep-long  # 32바이트 이상
AUTH_JWT_EXPIRATION_SECONDS=3600                           # 토큰 유효기간

# 스토리지
APP_STORAGE_ROOT=/app/storage              # 스토리지 루트
APP_STORAGE_REPLAY_EVENTS=replay-events    # 리플레이 이벤트 디렉터리
APP_STORAGE_EXPORT=exports                 # 내보내기 산출물 디렉터리

# Redis
REDIS_HOST=redis
REDIS_PORT=6379

# 기타
SPRING_PROFILES_ACTIVE=dev    # 프로파일 (dev/prod)
TZ=Asia/Seoul                 # 타임존
```

### Frontend (React + Vite)
```bash
VITE_BACKEND_URL=http://localhost:8080    # 백엔드 HTTP URL
VITE_BACKEND_WS=ws://localhost:8080       # 백엔드 WebSocket URL
```

### Worker (Node.js)
```bash
REDIS_HOST=redis                       # Redis 호스트
APP_STORAGE_ROOT=/app/storage          # 스토리지 루트
APP_STORAGE_REPLAY_EVENTS=replay-events
APP_STORAGE_EXPORT=exports
EXPORT_HW_ACCEL=false                  # true 시 하드웨어 인코더 시도
TZ=Asia/Seoul
```

---

## 📚 문서

### 핵심 문서
- [AGENTS.md](AGENTS.md) - AI 에이전트 작업 규칙
- [STACK_DESIGN.md](STACK_DESIGN.md) - 기술 스택 및 아키텍처
- [PRODUCT_SPEC.md](PRODUCT_SPEC.md) - 제품 기능 명세
- [CODING_GUIDE.md](CODING_GUIDE.md) - 코딩 컨벤션
- [VERSIONING.md](VERSIONING.md) - 버전별 로드맵
- [CLONE_GUIDE.md](CLONE_GUIDE.md) - 클론 및 실행 가이드
- [PORTFOLIO_TRACK.md](PORTFOLIO_TRACK.md) - 포트폴리오 트랙 설명

### 설계 문서 (design/)

#### Backend
- [v0.1.0 Core Skeleton](design/backend/v0.1.0-core-skeleton-and-health.md)
- [v0.2.0 Auth & Profile](design/backend/v0.2.0-auth-and-profile.md)
- [v0.3.0 Game & Matchmaking](design/backend/v0.3.0-game-and-matchmaking.md)
- [v0.4.0 Ranking System](design/backend/v0.4.0-ranking-system.md)

#### Frontend
- [v0.1.0 Core Layout](design/frontend/v0.1.0-core-layout-and-routing.md)
- [v0.2.0 Auth & Profile UI](design/frontend/v0.2.0-auth-and-profile-ui.md)
- [v0.3.0 Game Lobby & Play UI](design/frontend/v0.3.0-game-lobby-and-play-ui.md)
- [v0.4.0 Ranking & Leaderboard UI](design/frontend/v0.4.0-ranking-and-leaderboard-ui.md)
- [v0.6.0 Performance Audit](design/frontend/v0.6.0-perf-audit.md)

#### Contracts (API/WS/Queue)
- [v0.5.0 Replay Export Contract](design/contracts/v0.5.0-replay-export-contract.md)
- [v0.6.0 Portfolio Media Contract](design/contracts/v0.6.0-portfolio-media-contract.md)

---

## 🎓 학습 포인트 (면접 대비)

### 1. 비동기 I/O 처리
**Q: FFmpeg 같은 장시간 실행 프로세스를 어떻게 관리했나요?**

A: 
- Node.js `child_process.spawn`으로 프로세스 실행
- stdout/stderr 스트림 실시간 캡처
- `-progress pipe:1` 옵션으로 진행률 파싱
- 하드 타임아웃 설정 및 강제 종료 메커니즘
- Redis Streams로 backend와 비동기 통신

### 2. 엄격한 품질 검증
**Q: "의미없는 영상 더미"를 어떻게 방지했나요?**

A:
- ffprobe로 구조 검증 (비디오 스트림 존재, duration > 0)
- **트리비얼 프레임 가드**: 10%/90% 구간 프레임 해시 비교
- 동일하면 `EXPORT_TRIVIAL_FRAMES` 에러로 실패 처리
- 원자적 파일 쓰기 (temp → validate → rename)

### 3. WebGL 렌더링
**Q: WebGL을 왜 사용했고, 폴백 전략은?**

A:
- GPU 가속으로 고빈도 렌더링 성능 향상
- 런타임에 WebGL 지원 감지
- 미지원 시 자동으로 Canvas2D로 전환
- 동일한 렌더링 인터페이스 유지

### 4. UTF-8 처리
**Q: 한글/이모지 처리에서 주의한 점은?**

A:
- MariaDB charset: utf8mb4
- Spring Boot: UTF-8 기본 인코딩
- 회귀 테스트: REST/WS/DB 왕복 검증
- 테스트 픽스처: `데모닉😀`, `🎮테스트🏆`

### 5. 상태 머신 설계
**Q: 작업 상태 관리는 어떻게 했나요?**

A:
- 명시적 상태 전이 규칙 (QUEUED → RUNNING → SUCCEEDED/FAILED)
- 종단 상태 진입 후 업데이트 금지
- DB 트랜잭션과 Redis 메시지 순서 보장
- Idempotency: 재시도 시 중복 방지

---

## 🔍 트러블슈팅

### Docker 빌드 실패
```bash
# 캐시 없이 재빌드
docker compose build --no-cache

# 특정 서비스만
docker compose build --no-cache backend
```

### Worker가 작업을 소비하지 않음
```bash
# Worker 로그 확인
docker compose logs -f worker

# Redis 스트림 확인
docker compose exec redis redis-cli
> XLEN replay.export.request
```

### ffprobe 검증 실패
```bash
# Worker 컨테이너에서 수동 검증
docker compose exec worker ffprobe -v error -print_format json -show_streams /app/storage/exports/<file>.mp4
```

### WebSocket 연결 실패
- JWT 토큰이 만료되었는지 확인
- 브라우저 개발자 도구 Network 탭에서 Upgrade 요청 확인
- Nginx 로그 확인: `docker compose logs nginx`

---

## 📝 라이선스

MIT License

---

## 👥 기여

이 프로젝트는 포트폴리오 목적으로 제작되었습니다.

---

## 📞 문의

프로젝트 관련 문의사항은 이슈를 등록해주세요.

---

**Built with ❤️ for Vrew Web Application Developer Position**