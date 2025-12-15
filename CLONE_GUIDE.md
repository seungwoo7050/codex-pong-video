# CLONE_GUIDE (v0.5.0)

## 1. 목적
- v0.5.0 기준 리플레이 저장과 FFmpeg 기반 비동기 내보내기 파이프라인을 실행하기 위한 안내서다.
- 백엔드/프런트엔드/워커/인프라와 JWT 시크릿, WebSocket, Redis Streams 배선, 스토리지 구성을 한 번에 검증한다.

## 2. 사전 준비물
- Git
- Docker / Docker Compose
- Node.js 18 (프런트엔드 또는 워커 로컬 실행 시)
- JDK 17 (백엔드 로컬 실행 시)

## 3. 클론 및 기본 구조
```bash
git clone <repo-url>
cd codex-pong
```
- 주요 디렉터리
  - `backend/`: Spring Boot 소스
  - `frontend/`: React + Vite 소스
  - `worker/`: FFmpeg/ffprobe 기반 내보내기 워커 (Node.js + TS)
  - `infra/`: Nginx 설정 등 인프라 자원
  - `design/`: 한국어 설계 문서 및 계약서

## 4. 환경변수
- 백엔드 (docker-compose 기본값)
  - `DB_HOST=db`
  - `DB_NAME=codexpong`
  - `DB_USER=codexpong`
  - `DB_PASSWORD=codexpong`
  - `AUTH_JWT_SECRET` (32바이트 이상, 기본 `change-me-in-prod-secret-please-keep-long`)
  - `AUTH_JWT_EXPIRATION_SECONDS` (선택, 기본 3600)
  - `APP_STORAGE_ROOT` (기본 `/app/storage`)
  - `APP_STORAGE_REPLAY_EVENTS` (기본 `replay-events`)
  - `APP_STORAGE_EXPORT` (기본 `exports`)
  - `REDIS_HOST` (기본 `redis`)
- 프런트엔드
  - `VITE_BACKEND_URL` (기본 `http://localhost:8080`)
  - `VITE_BACKEND_WS` (기본 `ws://localhost:8080`)

## 5. Docker Compose 실행
```bash
docker compose build --progress=plain
docker compose up -d
```
- 접속 경로
  - 웹: http://localhost/
  - 리더보드: http://localhost/leaderboard
  - 헬스체크: http://localhost/api/health
  - WebSocket: ws://localhost/ws/echo (쿼리 파라미터 `token` 필요)
  - 게임 WebSocket: ws://localhost/ws/game?roomId=<매칭된-방>&token=<JWT>
  - 작업 WebSocket: ws://localhost/ws/jobs?token=<JWT>
- REST 예시: `/api/auth/register`로 회원가입 후 `/api/replays/sample`(dev 프로파일)로 샘플 리플레이 생성 → `/api/replays/{id}/exports/mp4`로 작업 생성
- 포함 서비스: backend / frontend / db / redis / worker / nginx (worker는 `npm run start`로 Redis Streams 소비)
- 볼륨: `replay_events`, `export_artifacts` (리플레이 이벤트/산출물 공유)

## 6. 개별 서비스 로컬 실행 (선택)
### 6.1 백엔드
```bash
cd backend
./gradlew bootRun
```
### 6.2 프런트엔드
```bash
cd frontend
npm install
npm run dev -- --host --port 5173
```
### 6.3 워커
```bash
cd worker
npm install
npm run build
npm run start   # Redis Streams를 실시간 소비하는 엔트리
npm test        # ffprobe/프레임 가드 유닛 테스트
```

## 7. 테스트 실행
### 7.1 백엔드 테스트
```bash
cd backend
./gradlew test
```
### 7.2 프런트엔드 테스트
```bash
cd frontend
npm install
npm test
```
### 7.3 워커 테스트
```bash
cd worker
npm test
```
### 7.4 프런트엔드 빌드 확인
```bash
cd frontend
npm install
npm run build
```

## 8. 버전별 메모 (v0.5.0)
- 주요 기능: 리플레이 메타/이벤트 조회, 내보내기 작업 생성, Redis Streams 기반 워커 진행률, WebSocket 진행률 푸시.
- 리플레이 파일은 `APP_STORAGE_ROOT` 하위 `replay-events`에 JSONL_V1로 저장되며, 산출물은 `exports` 하위에서 공유된다.
- 워커 컨테이너는 ffmpeg/ffprobe를 사전 설치하고, 검증 실패 시 안정적인 `error_code`를 반환하도록 설계되었다.
- dev 프로파일에서는 `/api/replays/sample`로 샘플 리플레이를 즉시 생성할 수 있으며, 완성된 산출물은 `/api/jobs/{jobId}/download`로 바로 내려받는다.
