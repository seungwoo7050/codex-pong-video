# CLONE_GUIDE (v0.4.0)

## 1. 목적
- v0.4.0 기준 실시간 1:1 게임 및 랭크 큐/리더보드 흐름을 실행하기 위한 안내서다.
- 백엔드/프런트엔드/인프라와 JWT 시크릿, WebSocket 연결, 랭크 레이팅 계산을 한 번에 검증한다.

## 2. 사전 준비물
- Git
- Docker / Docker Compose
- Node.js 18 (프런트엔드 로컬 실행 시)
- JDK 17 (백엔드 로컬 실행 시)

## 3. 클론 및 기본 구조
```bash
git clone <repo-url>
cd codex-pong
```
- 주요 디렉터리
  - `backend/`: Spring Boot 소스
  - `frontend/`: React + Vite 소스
  - `infra/`: Nginx 설정 등 인프라 자원
  - `design/`: 한국어 설계 문서

## 4. 환경변수
- 백엔드 (docker-compose 기본값)
  - `DB_HOST=db`
  - `DB_NAME=codexpong`
  - `DB_USER=codexpong`
  - `DB_PASSWORD=codexpong`
  - `AUTH_JWT_SECRET` (32바이트 이상, 기본 `change-me-in-prod-secret-please-keep-long`)
  - `AUTH_JWT_EXPIRATION_SECONDS` (선택, 기본 3600)
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
  - REST 예시: `/api/auth/register`로 회원가입 후 `/api/match/quick`으로 일반전 티켓, `/api/match/ranked`로 랭크전 티켓 발급

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
### 7.3 프런트엔드 빌드 확인
```bash
cd frontend
npm install
npm run build
```

## 8. 버전별 메모 (v0.4.0)
- 주요 기능: 일반/랭크 대전 분리, 랭크 레이팅 갱신, 리더보드 조회.
- 매칭 절차: 로비에서 원하는 큐 선택 → 일반전 `/api/match/quick`, 랭크전 `/api/match/ranked` 티켓 발급 → roomId로 `/ws/game` 연결.
- 랭크전 종료 시 WebSocket 메시지에 `ratingChange`가 포함되며, `/api/games` 및 리더보드에서 최신 레이팅을 확인할 수 있다.
