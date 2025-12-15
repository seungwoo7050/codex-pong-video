# STACK_DESIGN.md

This document defines the **authoritative tech stack and architecture** for this project.

> This file is in **English** for AI/tooling.  
> **All implementation comments and human-facing documentation MUST be written in Korean**, as defined in `AGENTS.md` / `CODING_GUIDE.md`.

This project is a **Korean-market oriented real-time game service**, with an explicit **portfolio track** focused on:
- Replay recording
- FFmpeg-based export pipeline
- WebGL/WebAudio rendering concerns
- Async job processing (IPC / Redis Streams)

---

## 1. High-level architecture

### 1.1 Components

- **Frontend (SPA)**
  - React + TypeScript
  - Canvas/WebGL rendering for match + replay
  - WebSocket client for realtime match + job progress
- **Backend**
  - Spring Boot (Java 17+ or Kotlin)
  - REST API + WebSocket endpoint
  - Owns DB schema, auth, match lifecycle, ranking, replay metadata, job state machine
- **Worker (internal service; portfolio track)**
  - Node.js + TypeScript (under `worker/`)
  - Consumes export jobs via Redis Streams
  - Runs FFmpeg/FFprobe as OS processes
  - Emits progress/result messages back to backend
  - **Not** a public API service
- **Data stores**
  - MariaDB (primary relational store; charset utf8mb4)
  - Redis (cache, room/match ephemeral state as needed, **Streams for async jobs**)
- **Infra**
  - Nginx reverse proxy (static assets, routing, TLS termination as needed)
  - Docker + Docker Compose for local/dev orchestration

### 1.2 Directory layout (expected)

```text
backend/
frontend/
worker/          # Node.js + TypeScript export worker (internal)
infra/
design/
```

---

## 2. Realtime & async processing

### 2.1 Realtime gameplay (match)

- WebSocket is used for real-time gameplay events and match state.
- The exact WS framing (raw vs STOMP) must be consistent and documented under `design/realtime/`.

### 2.2 Async export pipeline (replay → MP4/thumbnail)

- Backend publishes job requests to **Redis Streams**.
- Worker consumes jobs and executes FFmpeg.
- Worker reports:
  - progress messages
  - completion/failure result messages
- Backend persists job status and pushes progress to client via WebSocket.

Hard requirements:
- Explicit persisted job state machine
- Idempotency (same jobId must not duplicate outputs)
- Strict output validation (ffprobe + trivial-frame guard)
- Timeouts and safe process management

---

## 3. Media export details (portfolio track)

### 3.1 Storage model

- v0.5.0 default:
  - Replay event files: local named volume
  - Export artifacts (mp4/thumbnail): local named volume
- v0.13+ (deferred):
  - Optional object storage adapter (e.g., S3) behind feature flags

### 3.2 FFmpeg invocation model

- Worker MUST use `spawn` and stream stdout/stderr.
- “ffmpeg exit 0” is not success:
  - success requires validation of the produced artifact
- Worker must provide stable failure classification via `error_code`.

---

## 4. Korean-market constraints

- Timezone: `Asia/Seoul`
- Charset: `utf8mb4` (Korean + emoji)
- UTF-8 correctness must be proven via regression tests (v0.6.0).

---

## 5. Technology constraints (do not break these)

- Public backend MUST remain Spring Boot (do not migrate to Express/Nest).
- Node.js is allowed **only** for the internal export worker under `worker/`.
- MariaDB remains the primary relational DB.
- Redis remains the async queue mechanism (Streams) for portfolio track.
