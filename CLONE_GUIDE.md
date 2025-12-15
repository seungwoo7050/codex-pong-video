# CLONE_GUIDE (v0.6.0)

## 1. 목적
- v0.6.0 기준 리플레이 저장, FFmpeg/ffprobe 검증, WebGL 기본 렌더러와 Canvas2D 폴백, WebAudio 큐를 포함한 데모 실행 절차를 안내한다.
- docker compose 단일 커맨드로 backend/frontend/worker/db/redis를 구동하고, 제출용 데모 스크립트 실행 방법을 명시한다.

## 2. 사전 준비물
- Git
- Docker / Docker Compose
- Node.js 18 (프런트엔드 또는 워커 로컬 실행 시)
- JDK 17 (백엔드 로컬 실행 시)

## 3. 클론 및 기본 구조
```bash
git clone <repo-url>
cd codex-pong-video
```
- 주요 디렉터리
  - `backend/`: Spring Boot 소스
  - `frontend/`: React + Vite(WebGL 기본, Canvas2D 폴백)
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
  - `EXPORT_HW_ACCEL` (기본 `false`, `true` 시 지원되는 하드웨어 가속을 요청하고 미지원 시 자동 폴백)
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

## 6. 제출용 데모 실행 절차
- docker compose가 기동된 상태에서 아래 스크립트를 실행한다.
```bash
./scripts/demo_v0_6.sh
```
- 흐름
  1. UTF-8 닉네임으로 계정 생성/로그인
  2. 샘플 리플레이 생성 및 MP4 내보내기 요청
  3. 작업 완료까지 폴링 후 산출물 다운로드
  4. worker 컨테이너 내부 ffprobe + 트리비얼 프레임 가드로 재검증(성공 시 0, 실패 시 종료 코드 1)

## 7. 개별 서비스 로컬 실행 (선택)
### 7.1 백엔드
```bash
cd backend
./gradlew bootRun
```
### 7.2 프런트엔드
```bash
cd frontend
npm install
npm run dev -- --host --port 5173
```
### 7.3 워커
```bash
cd worker
npm install
npm run build
npm run start   # Redis Streams를 실시간 소비하는 엔트리
npm test        # ffprobe/프레임 가드/하드웨어 폴백 유닛 테스트
```

## 8. 테스트 실행
### 8.1 백엔드 테스트
```bash
cd backend
./gradlew test
```
### 8.2 프런트엔드 테스트
```bash
cd frontend
npm install
npm test
```
### 8.3 워커 테스트
```bash
cd worker
npm test
```
### 8.4 프런트엔드 빌드 확인
```bash
cd frontend
npm install
npm run build
```

## 9. 버전별 메모 (v0.6.0)
- 주요 기능: WebGL 우선 렌더러 + Canvas2D 폴백, WebAudio 큐 알림음, 하드웨어 인코딩 플래그와 안전한 소프트웨어 폴백, UTF-8 왕복 테스트, 데모 자동화 스크립트.
- worker 컨테이너에 ffmpeg/ffprobe가 포함되어 호스트 설치 없이 검증 가능.
- 하드웨어 가속은 `EXPORT_HW_ACCEL=true`일 때만 시도하며, 미지원 시 `HWACCEL_UNAVAILABLE` 로그 후 libx264로 전환한다.
