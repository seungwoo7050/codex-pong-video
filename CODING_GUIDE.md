# CODING_GUIDE.md

This document defines coding conventions for **all code** in this repository:

- Backend (Spring Boot)
- Frontend (React + TypeScript)
- Realtime (WebSocket / game logic)
- Infra (Docker, Nginx, DB/Redis configs)
- Worker (Node.js + TypeScript) for replay export (portfolio track)

It is written in English for AI/tooling.  
**All comments and human-facing documentation MUST be written in Korean.**

---

## 1. Global rules (MANDATORY)

### 1.1 Language policy
- Source-code comments: **Korean only**
- Human-facing docs: **Korean only**
  - `design/` documents
  - `CLONE_GUIDE.md`
  - project READMEs/guides
- Code identifiers: English only

### 1.2 Version tags in code and docs
For any significant module/file, include a Korean header comment:
- `버전: v0.x.y`
- `관련 설계문서: design/...`

Keep these consistent with `VERSIONING.md`.

### 1.3 Contracts-first rule (portfolio track)
Any new externally-visible contract MUST be written **before** implementation:
- REST API shapes
- WebSocket event payloads
- Redis Streams message schemas
- Job state transitions and error codes

Location:
- `design/contracts/`

If the folder does not exist, create it.  
Implementation MUST follow the contract doc (not the other way around).

### 1.4 Directory layout (expected)
```text
backend/
frontend/
worker/
infra/
design/
```

---

## 2. Backend (Spring Boot)

### 2.1 General
- Prefer explicit modules (Auth/User/Game/Match/Ranking/Replay/Jobs).
- Use structured logging with correlation IDs (`matchId`, `jobId`).

### 2.2 Jobs (replay export)
- Long-running work MUST be job-based (never block HTTP/WS threads).
- State machine MUST be explicit and persisted.
- Idempotency is mandatory:
  - same `jobId` MUST NOT duplicate artifacts
- Failures MUST include stable `error_code`.

### 2.3 UTF-8
- DB charset: utf8mb4
- REST + WS must safely handle Korean + emoji.
- Provide regression tests (v0.6.0 requirement).

---

## 3. Realtime (WebSocket)

### 3.1 Ownership
- Backend is authoritative about match lifecycle and job states.
- Client must treat WS as unreliable:
  - reconnect path
  - resync via REST

### 3.2 Event naming
Use clear, stable event names (string constants):
- `job.progress`
- `job.completed`
- `job.failed`

Document them under `design/contracts/`.

---

## 4. Frontend (React + TypeScript)

### 4.1 State boundaries
- Server state via a single client (e.g., React Query).
- WebSocket handling MUST be centralized (no scattered sockets).

### 4.2 Rendering and performance
- Avoid layout thrashing in replay viewer and job progress UI.
- Use Canvas/WebGL for high-frequency rendering.
- Any perf claim must have evidence in `design/frontend/*perf-audit*.md`.

---

## 5. Worker (Node.js + TypeScript) – `worker/`

### 5.1 Baseline
- Node.js 20+ (LTS), TypeScript
- Queue: Redis Streams
- Process execution: `child_process.spawn` (NOT `exec`)

### 5.2 Process execution rules
- Always set:
  - `-nostdin`, `-hide_banner`
- Always capture stdout/stderr (keep last N lines in memory and persist summary in job result).
- Enforce hard timeouts; kill the process on timeout.
- Atomic output:
  - write temp file → validate → rename/move to final path
- Never mark a job SUCCEEDED before validation passes.

### 5.3 Output validation rules (MANDATORY)
“의미없는 영상더미”는 성공이 아니라 실패다.

Minimum validation:
1) ffprobe structural validation:
   - at least 1 video stream
   - duration > 0
   - width/height > 0
2) trivial-frame guard:
   - extract 2 frames from far timestamps (10% and 90%)
   - hash frames
   - if identical → FAIL with `EXPORT_TRIVIAL_FRAMES`
3) checksum:
   - store checksum in job result metadata

Stable error codes (examples):
- `FFMPEG_EXIT_NONZERO`
- `FFMPEG_TIMEOUT`
- `FFPROBE_INVALID_OUTPUT`
- `EXPORT_TRIVIAL_FRAMES`
- `OUTPUT_ATOMIC_MOVE_FAILED`

### 5.4 Progress parsing
- Prefer `ffmpeg -progress pipe:1`.
- Map `out_time_ms / duration_ms` to 0..100.
- If exact mapping is not possible, define phased progress with bounded ranges and document it.

### 5.5 Worker tests (minimum)
- Unit: ffprobe parser + trivial-frame guard.
- Integration: tiny fixture export + validation (CPU-only).

---

## 6. Infra (Docker/Nginx)

- Compose must include:
  - backend
  - frontend
  - redis
  - db
  - worker (portfolio track)
- Named volumes:
  - replay events
  - export artifacts
