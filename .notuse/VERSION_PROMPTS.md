# VERSION_PROMPTS.md

이 문서는 **v0.4.0 구현 완료 상태**에서 시작해서,
v0.5.0 → v0.6.0만 구현하도록 에이전트에게 던질 프롬프트를 제공한다.

전제:
- AGENTS.md / STACK_DESIGN.md / PRODUCT_SPEC.md / CODING_GUIDE.md / VERSIONING.md 를 읽고 시작한다.
- 모든 주석/문서는 한국어.
- v0.5.0, v0.6.0 외 버전 작업 금지.

---

## 공통 규칙 (에이전트에게 항상 포함)

```text
1) 이번 작업은 VERSIONING.md의 단일 버전(v0.5.0 또는 v0.6.0)만 대상으로 한다.
2) 친구/채팅/토너먼트/관전/관리자UI 등은 절대 추가하지 마라.
3) 구현 전에 contracts(REST/WS/Queue/job 상태머신/error_code)를 문서로 먼저 고정한다.
   - 폴더가 없으면 생성한다: design/contracts/
4) FFmpeg는 exit 0이어도 성공 처리 금지. ffprobe + trivial-frame 검증 통과가 성공 조건이다.
5) 테스트가 없는 기능은 “완료”가 아니다.
```

---

## v0.5.0 – Replay + Export MVP

```text
AGENTS.md, STACK_DESIGN.md, PRODUCT_SPEC.md, CODING_GUIDE.md, VERSIONING.md를 읽어라.
현재 구현은 v0.4.0까지 완료되어 있다고 가정한다.

목표 버전: v0.5.0 (리플레이 + 비동기 내보내기 MVP)
범위 밖(소셜/채팅/토너먼트/관전/관리자UI/모니터링 대시보드)은 건드리지 마라.

[0) 계약 문서 선작성(필수)]
폴더가 없으면 생성: design/contracts/
아래 문서를 먼저 작성하고, 이 계약에 맞춰 구현해라(한국어):
- design/contracts/v0.5.0-replay-export-contract.md

계약 문서에 반드시 포함:
- REST API: 요청/응답/에러 포맷
- WebSocket 이벤트: job.progress / job.completed / job.failed
- Redis Streams 메시지 스키마(schemaVersion 포함)
- job 상태 머신 전이 규칙
- 안정적인 error_code 목록(최소 5개)

[1) 백엔드(Spring Boot)]
- Replay:
  - replay 메타데이터 테이블
  - 이벤트 파일 저장(APP_STORAGE_ROOT 하위, JSONL_V1)
  - GET /api/replays
  - GET /api/replays/{id}
  - GET /api/replays/{id}/events
- Jobs:
  - job 테이블 + 상태 머신(QUEUED/RUNNING/SUCCEEDED/FAILED/CANCELLED)
  - idempotency(중복 산출물 금지)
  - POST /api/replays/{id}/exports/mp4 → jobId
  - POST /api/replays/{id}/exports/thumbnail → jobId
  - GET /api/jobs/{jobId}
  - GET /api/jobs/{jobId}/result
- Progress push:
  - owner에게만 WS로 진행률/완료/실패 푸시

[2) 큐/IPC]
- Redis Streams 사용
- request/progress/result 모두 schemaVersion 포함

[3) 워커(Node.js + TS) — worker/]
- docker compose에 worker 서비스 추가
- Redis Streams 소비
- FFmpeg로 MP4/썸네일 생성
- 진행률:
  - ffmpeg -progress pipe:1 기반 파싱(가능하면)
- 안전장치(필수):
  - exit 0 성공 처리 금지
  - ffprobe 검증(스트림/길이/해상도)
  - trivial-frame 방지(두 시점 프레임 해시 비교)
  - 검증 실패 시 FAILED + error_code 기록

[4) 프론트엔드(React + TS)]
- 리플레이 목록 + 뷰어(play/pause/seek/speed 0.5/1/2)
- Export 버튼 + 진행률 UI + 다운로드 링크
- 실패 시 error_code/error_message 표시

[5) 테스트(최소)]
- backend: job 상태 머신 + idempotency
- worker: ffprobe 검증 + trivial-frame 거부
- frontend: export 진행률 UI 스모크

[6) 문서(테스트 통과 후)]
- CLONE_GUIDE.md에 worker/ffmpeg/볼륨/실행법 추가(한국어)
- VERSIONING.md에서 v0.5.0 완료 표시
```

---

## v0.6.0 – WebGL/WebAudio + perf/utf8 hardening

```text
v0.5.0 구현 상태를 읽고 파악한 다음 작업해라.
목표 버전: v0.6.0 (포트폴리오 마감 품질)

[프론트엔드]
- 렌더러 2중 경로:
  - WebGL 기본 + Canvas2D fallback 자동
- WebAudio:
  - 최소 1개 실제 오디오 큐
- 퍼포먼스 증거(필수):
  - 화면 2개 선정 → reflow/perf audit 문서 작성(캡처 포함)

[워커]
- HW encode 옵션(선택 + 안전):
  - EXPORT_HW_ACCEL=true/false
  - 미지원이면 자동 fallback
- v0.5.0 검증 규칙 완화 금지

[백엔드/실시간]
- UTF-8 회귀 테스트:
  - 한글+이모지 닉네임
  - REST + WebSocket payload 왕복
  - DB round-trip(utf8mb4)
- WS 비동기 패턴 정리:
  - 에러/재연결 정책을 코드+문서로 고정

[완료 조건(= 제출 게이트)]
- WebGL path + fallback 동작(브라우저 2종 이상에서 확인 권장)
- CPU-only 환경 export 동작(필수), HW encode는 옵션이지만 안전하게 fallback
- “성공=검증 통과” 유지(ffprobe + trivial-frame). exit 0만으로 SUCCEEDED 금지
- docker compose 원커맨드 부팅:
  - backend/frontend/worker/db/redis가 모두 뜸
  - worker 컨테이너 안에 ffmpeg/ffprobe 포함(호스트 설치 불필요)
- 데모 자동화 스크립트 추가(필수):
  - 예: scripts/demo_v0_6.sh (이름은 자유)
  - 리플레이 fixture 로딩/생성 → export 호출 → 완료 대기 → 파일 다운로드 → 검증 재실행
  - 실패 시 non-zero exit
- audit 문서(2화면, 캡처 포함) 커밋
- UTF-8 회귀 테스트(REST+WS+DB round-trip, 한글+이모지) 안정적으로 통과
- CLONE_GUIDE.md에 “제출용 데모 실행 절차”를 명령어 단위로 명시
- VERSIONING.md에서 v0.6.0 완료 표시
```
