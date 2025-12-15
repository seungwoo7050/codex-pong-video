# VERSIONING.md

This document defines the **only** version roadmap for this repository.

- Start point: **v0.4.0 is already implemented** (baseline).
- From v0.4.0 onward, the roadmap is **redefined** to a compact, Vrew-aligned portfolio track.
- Versions that existed in older drafts (e.g. 0.7+ or “future social/tournament/admin versions”) are **removed**.

Authoritative docs:
- What to build: `PRODUCT_SPEC.md`
- Stack/architecture: `STACK_DESIGN.md`
- Coding rules: `CODING_GUIDE.md`
- Agent rules: `AGENTS.md`

---

## 1. Versioning rules

- Version format: `MAJOR.MINOR.PATCH` (e.g. `0.5.0`).
- `0.x.y`:
  - iterative development; APIs can evolve.
- PATCH (`0.x.Z` where only Z changes):
  - bug fixes, refactors, docs, tests, infra tweaks.
  - MUST NOT add new feature groups.

All work MUST target exactly one version in this file.

---

## 2. Baseline (assumed complete)

### v0.4.0 — Ranked mode & basic ranking system
**Status**: implemented baseline

This repo assumes the following already exist and are stable enough to build on:
- core realtime match flow
- ranked queue
- rating update
- basic leaderboard

No new features are planned for v0.4.0. Only PATCH fixes are allowed.

---

## 3. Roadmap (redefined after v0.4.0)

Only two versions exist after v0.4.0:

- **v0.5.0** — Replay + Export MVP (FFmpeg + async jobs + validation)
- **v0.6.0** — Portfolio-grade media UX (WebGL/WebAudio + perf/utf8 hardening)

No versions are planned beyond v0.6.0 in this repository.

---

## 4. v0.5.0 — Replay + Export MVP (FFmpeg + async jobs + validation)

**Status**: implemented
**Goal**: produce a short, high-signal demo aligned to “web video editor” engineering.

### 4.1 Demo story (must be possible)
1) Finish a match → replay recorded  
2) Open replay viewer (play/pause/seek/speed)  
3) Click “Export MP4” → async job starts  
4) Progress updates live → download a **real playable MP4** (validated)  

### 4.2 Non-goals (explicitly out of scope)
- friends / chat / tournaments / spectator / admin console UI
- S3/AWS credentials in CI
- complex editor timeline features (cuts, transitions, multi-track)

### 4.3 Scope

#### Backend (Spring Boot)
**Replay**
- Persist replay metadata in DB (`replay`).
- Persist replay events to disk under a single storage root:
  - environment variable: `APP_STORAGE_ROOT`
- Fixed replay format: `JSONL_V1` (one event per line, UTF-8).
- APIs (minimum):
  - `GET /api/replays` (paging/sort)
  - `GET /api/replays/{replayId}` (metadata)
  - `GET /api/replays/{replayId}/events` (download/stream)

**Jobs**
- `job` table with strict state machine:
  - `QUEUED → RUNNING → (SUCCEEDED | FAILED | CANCELLED)`
- Job idempotency is mandatory:
  - retrying the same request MUST NOT create duplicated artifacts.
- APIs (minimum):
  - `POST /api/replays/{replayId}/exports/mp4` → `{ jobId }`
  - `POST /api/replays/{replayId}/exports/thumbnail` → `{ jobId }`
  - `GET /api/jobs/{jobId}`
  - `GET /api/jobs/{jobId}/result`

**Progress delivery**
- WebSocket push (owner only):
  - `job.progress`
  - `job.completed`
  - `job.failed`

#### Queue / IPC
- Use Redis Streams for job requests and progress/result messages.
- Every message MUST include `schemaVersion`.

#### Worker (Node.js + TypeScript) — `worker/`
- Separate process/container.
- Consumes Redis Streams and executes FFmpeg/FFprobe.
- Output artifacts saved under storage root:
  - MP4 file
  - thumbnail image

**Hard safety rails (mandatory)**
- “ffmpeg exit 0” is NOT success.
- Success requires validation:
  1) `ffprobe` structural validation:
     - at least one video stream
     - duration > 0
     - width/height > 0
  2) trivial-frame guard:
     - extract two far-apart frames (e.g. 10% and 90%)
     - compare hashes; if identical → FAIL
- On validation failure: job MUST end as `FAILED` with stable `error_code`.

#### Frontend (React + TypeScript)
- Replay list (paging) → open viewer.
- Viewer controls:
  - play/pause, seek, speed (0.5x/1x/2x)
- Export UI:
  - start export
  - show progress
  - download link on completion
  - show `error_code` on failure

#### Infra
- Docker Compose includes:
  - backend
  - frontend
  - mariadb
  - redis
  - nginx (if used)
  - **worker**
  - named volumes for:
    - replay events
    - export artifacts

### 4.4 Completion criteria (must all pass)
- Exported MP4 plays in a standard player.
- Validation is enforced (ffprobe + trivial-frame guard).
- Job state machine is consistent across retry/crash cases.
- Minimal tests exist:
  - backend: job state machine + idempotency
  - worker: ffprobe validator + trivial-frame guard
  - frontend: export progress smoke

---

## 5. v0.6.0 — Portfolio-grade media UX (WebGL/WebAudio + perf/utf8 hardening)

**Status**: implemented
**Goal**: upgrade v0.5.0 into a convincing “web video editor” engineering sample.

### 5.1 Scope

#### Frontend
- Renderer:
  - WebGL path when available
  - Canvas2D fallback (automatic)
- WebAudio:
  - at least one real cue (e.g. export complete chime or score tick)
- Performance evidence:
  - choose 2 screens and produce a short perf/reflow audit in `design/`
  - include before/after captures

#### Worker
- Optional HW encode (safe):
  - gated behind env flag (e.g. `EXPORT_HW_ACCEL=true`)
  - detect availability
  - MUST fallback to software encode automatically
- Validation rules from v0.5.0 MUST NOT be relaxed.

#### Backend / Realtime
- UTF-8 regression suite:
  - Korean + emoji in replay/job metadata
  - REST + WebSocket payload round-trip
  - DB round-trip (utf8mb4)
- Async/WS hardening:
  - unify error handling
  - reconnection/backoff policy documented and implemented

#### Infra (optional)
- storage abstraction:
  - local volume remains default
  - optional S3 adapter behind flags (only if time remains)

### 5.2 Completion criteria
- WebGL path works and fallback works (자동 감지 포함).
- Export works in CPU-only environment; HW encode는 옵션이며 안전 폴백 보장.
- Perf audit 문서가 2개 화면에 대해 캡처와 함께 존재함.
- UTF-8 regression tests가 REST + WS + DB에서 통과함.
- WS 비동기 코드가 재연결/에러 정책을 문서화하고 구현함.

### 5.3 Release checklist (submission gate)

v0.6.0 is **not** considered complete until all items below are green and reproducible from a fresh clone.

A) One-command boot
- `docker compose up` brings up: backend / frontend / worker / DB / Redis.
- FFmpeg/FFprobe exist **inside** the worker container (`ffmpeg -version`, `ffprobe -version`).
- No manual host installs are required beyond Docker.

B) Reproducible demo script
- Provide a repo script (e.g. `scripts/demo_v0_6.sh`) that:
  1) loads or generates a fixture replay
  2) triggers MP4 export via API
  3) waits for job completion
  4) downloads the MP4 artifact
  5) runs the **same validation** used by the worker (ffprobe + trivial-frame guard)
- The script MUST exit non-zero on any failure.

C) End-to-end story verified
- Replay viewer supports: play/pause/seek/speed.
- Export MP4 shows progress in UI and results in a playable MP4.

D) Output validity enforced (no “meaningless video dump”)
- Job success is gated by validation (ffprobe + trivial-frame guard).
- Failure surfaces a stable `error_code` in both job result and UI.

E) WebGL and fallback verified
- WebGL path works where supported.
- Canvas2D fallback works when WebGL is unavailable/disabled.

F) WebAudio cue verified
- At least one WebAudio cue triggers during the demo flow.

G) Evidence artifacts committed
- Perf/reflow audit doc with before/after captures for **2 screens** under `design/`.
- UTF-8 regression tests exist and pass:
  - Korean + emoji over REST + WebSocket + DB(utf8mb4) round-trip.
- `CLONE_GUIDE.md` documents exact commands to run the demo and where artifacts are stored.

If any item is missing, v0.6.0 is not done; fix via PATCH within `0.6.x`.


---

## 6. Allowed PATCH releases
PATCH versions are allowed at any time for:
- correctness fixes
- reliability fixes
- test additions
- docs and CLONE_GUIDE updates
But they MUST NOT expand the feature scope beyond the target version.
