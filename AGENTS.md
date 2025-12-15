# AGENTS.md

This document defines how AI coding agents MUST behave in this repository.

It is written in English for AI/tooling.  
**All comments and human-facing documentation (design docs, CLONE_GUIDE, etc.) MUST be written in Korean.**

This project is a **Korean-market oriented real-time game service** inspired by Pong/ft_transcendence, but it is **NOT** an implementation of the original 42 ft_transcendence subject.

---

## 1. Files you MUST read first

Whenever an AI agent starts working in this repo, it MUST read these files in this order:

1. `AGENTS.md` (this file)
2. `STACK_DESIGN.md`
3. `PRODUCT_SPEC.md`
4. `CODING_GUIDE.md`
5. `DOC_TEMPLATES.md`
6. `VERSIONING.md`
7. If present:
   - `CLONE_GUIDE.md`
   - Any relevant `design/` documents for the target version/domain

You MUST NOT modify:

- `AGENTS.md`
- `STACK_DESIGN.md`
- `PRODUCT_SPEC.md`
- `DOC_TEMPLATES.md`

unless a human explicitly instructs you to do so.

---

## 2. Hard constraints

### 2.1 No original ft_transcendence subject / code

- You MUST treat this repository as an independent project.
- You MUST NOT:
  - Reproduce or follow the original 42 ft_transcendence subject.
  - Copy or imitate existing ft_transcendence implementations.
- The only sources of truth for **what to build** and **how to build it** are:
  - `PRODUCT_SPEC.md`
  - `STACK_DESIGN.md`
  - `VERSIONING.md`
  - Project-specific design docs under `design/` (when they exist)

If information is missing, you MUST wait for human clarification.  
You MUST NOT invent large new features or change the stack on your own.

### 2.2 Language policy

- **All comments in source code MUST be written in Korean.**
- **All human-facing documentation MUST be written in Korean.**
  - This includes:
    - `design/` documents
    - `CLONE_GUIDE.md`
    - Project-specific READMEs or guides
- Code identifiers (variables, functions, classes, packages) MUST be in English.
- Protocol tokens and standard terms (HTTP methods, WebSocket frames, SQL keywords, etc.) MUST remain in their standard form, but explanations around them MUST be written in Korean.

If you accidentally produce English comments/docs, you MUST rewrite them in Korean.

### 2.3 Stack constraints

- You MUST follow the stack and architecture described in `STACK_DESIGN.md`.
- You MUST NOT:
  - Switch backend stack to NestJS/Express or other frameworks.
  - Replace MariaDB with PostgreSQL as primary DB.
  - Use stacks that contradict `STACK_DESIGN.md` unless a human explicitly changes that file first.

### 2.4 Contract-first rule (design/contracts)

- When you introduce or change any externally-visible interface:
  - REST API request/response shapes
  - WebSocket event names/payloads
  - Queue/IPC message schemas (e.g., Redis Streams)
  - Job state transitions and stable error codes
  you MUST first write or update the corresponding contract document under `design/contracts/`.

- If `design/contracts/` does not exist, you MUST create it.
- Implementation MUST follow the contract doc (not the other way around).
- If the contract is ambiguous, you MUST ask for human clarification instead of guessing.

### 2.5 gradle-wrapper.jar binary file policy

To ensure smooth PRs and repository hygiene:
- If gradle-wrapper.jar is missing from the repository and is required for local build or test, you MAY temporarily obtain and use gradle-wrapper.jar for your local workflow.
- After build and test are complete, you MUST delete gradle-wrapper.jar before submitting or merging your PR.
- gradle-wrapper.jar MUST NOT be committed or remain in the repository except by explicit human instruction.

This policy is to prevent unnecessary binary files in the repository while allowing local build/test flexibility.

---

## 3. Versioning rules

- All version definitions and roadmap are in `VERSIONING.md`.
- Version format: `MAJOR.MINOR.PATCH` (e.g. `0.1.0`, `1.0.0`).
- You MUST NOT:
  - Invent new MAJOR/MINOR versions.
  - Change version goals on your own.

PATCH versions:

- You MAY introduce a new PATCH version (e.g. `0.1.1`) for bug fixes / small refactors, but:
  - You MUST add/update its entry in `VERSIONING.md`.
  - Scope MUST be limited to bug fixes/documentation/CI, not new major features.

Every change you make MUST be associated with exactly one target version from `VERSIONING.md`.

---

## 4. Standard development loop

For any task, you MUST follow this loop.  
Example: `v0.1.0` core version, or any later version specified in `VERSIONING.md`.

### Step 1. Select target version

1. Read `VERSIONING.md`.
2. Identify exactly one target version (e.g. `v0.1.0`) and its goals.
3. Confirm:
   - Which feature group(s) it enables or extends.
   - What completion criteria are defined for that version.

You MUST NOT mix work from multiple versions in a single loop unless a human explicitly instructs you to do so.

### Step 2. Understand current state

1. Inspect existing code:
   - Backend (Spring Boot project)
   - Frontend (React/TS project)
   - Infra (Docker, Nginx, DB/Redis config)
2. Read any existing design docs related to:
   - The same or previous versions
   - The same domain (auth, game, matchmaking, ranking, social, chat, tournaments, admin, etc.)
3. Read `CLONE_GUIDE.md` if it exists:
   - Understand how to build, run, and test.

If there is no relevant code or design yet, assume this version is the first one touching that area.

### Step 3. Plan the changes

Before writing code, you MUST:

1. Derive a clear plan from:
   - `PRODUCT_SPEC.md` (what features are required)
   - `STACK_DESIGN.md` (how they must fit into the stack)
   - `VERSIONING.md` (scope and constraints)
2. Decide:
   - Which modules/packages/classes will be created or modified.
   - For backend:
     - Which controllers/services/repositories/entities are involved.
   - For frontend:
     - Which pages/components/hooks will be added or updated.
   - For realtime:
     - Which WebSocket endpoints/events will be added or changed.
3. Ensure:
   - Plan matches the version goals.
   - No feature outside `PRODUCT_SPEC.md` is introduced.

You do **not** write the detailed design doc yet; that is done **after** code and tests are complete.

**Exception (external contract lock-in):**
- If you are introducing or changing any **external contract** that other modules depend on, you MUST first create/update a **minimal contract section** *before* implementing:
  - REST API request/response shapes (including error envelope)
  - WebSocket endpoint paths and authentication handshakes
  - Realtime event names, payload schemas, and message flows
  - Infra-visible ports / env vars / reverse-proxy routes
- Keep this "contract doc" minimal (interfaces + rules only). Detailed internal design is still written/updated in Step 7 after tests pass.

### Step 4. Implement code (with Korean comments)

1. Modify or create source files according to `CODING_GUIDE.md`:
   - Respect directory structure, naming, layering, error handling.
2. For each new or changed:
   - Backend module/class/method
   - Frontend component/hook/module
   - Infra config (Nginx, Docker, DB, Redis)
   You MUST:
   - Add or update comments in **Korean**.
   - For significant modules, include:
     - Version tag (e.g. `v0.1.0`)
     - Reference to the expected design document path (e.g. `design/backend/v0.1.0-auth-and-core-game.md`).

Comment style and examples are defined in `DOC_TEMPLATES.md`.  
You MUST follow those patterns.

### Step 5. Add or update tests

1. For backend:
   - Add unit/integration tests for the new/changed behavior.
2. For frontend:
   - Add tests if applicable (unit/component tests, or at least minimal coverage for critical flows).
3. For realtime:
   - Add tests where possible (e.g. protocol/handler tests, integration harness).

Tests MUST reflect the behavior required by `VERSIONING.md` and `PRODUCT_SPEC.md`.

### Step 6. Run tests
If gradle-wrapper.jar was temporarily added for build or test, you MUST delete gradle-wrapper.jar after all tests pass and before submitting your PR. Do not leave gradle-wrapper.jar in the repository unless explicitly instructed.

1. Use the commands specified in:
   - `CLONE_GUIDE.md`
   - Or project-specific build scripts / README sections.
2. If tests fail:
   - Do NOT mark the version as complete.
   - Fix code, tests, or configuration as needed.
   - Repeat implementation + test steps until all tests pass.

You MUST NOT disable, comment out, or delete failing tests just to make the test run "green".

### Step 7. Update documentation (after tests pass)

Once all tests pass for the target version:
- If you created/updated any minimal contract docs in Step 3, reconcile them with the final implementation here.

1. **Design documents** (`design/`):
   - If no design doc exists yet for this version and domain:
     - Create a new file under `design/` with a proper path, such as:
       - `design/backend/v0.1.0-auth-and-core-game.md`
       - `design/frontend/v0.1.0-lobby-and-game-ui.md`
       - `design/realtime/v0.1.0-game-loop-and-events.md`
     - Use templates from `DOC_TEMPLATES.md`.
     - Write in Korean.
   - If a design doc exists:
     - Update it to reflect the final implementation.
2. **CLONE_GUIDE.md**:
   - If it does not exist:
     - Create it using `DOC_TEMPLATES.md` as a base.
   - If it exists:
     - Update any changed build/run/test instructions.
     - Document new environment variables, ports, or dependencies.
     - Write everything in Korean.
3. **VERSIONING.md**:
   - Mark the target version as "implemented" or "completed" if all criteria are satisfied.
   - Note any known limitations or TODOs that remain.

### Step 8. Version completion criteria

A version (e.g. `v0.1.0`) is considered **complete** only if:

- All tests pass.
- Code for this version includes Korean comments that follow `DOC_TEMPLATES.md`.
- At least one design document exists for this version and relevant domain(s).
- `CLONE_GUIDE.md` is up-to-date for any changes to cloning/building/running/testing.
- `VERSIONING.md` reflects:
  - The version status (e.g. "completed").
  - Any known limitations or follow-up work.

If any of these conditions are not met, you MUST treat the version as **incomplete** and continue working.

---

## 5. What you MUST NOT do

You MUST NOT:

- Use or mimic the original 42 ft_transcendence subject as a specification.
- Copy code or architecture from existing ft_transcendence repositories.
- Change the tech stack defined in `STACK_DESIGN.md` without explicit human approval and an updated `STACK_DESIGN.md`.
- Introduce new high-level features that are not described in `PRODUCT_SPEC.md`.
- Write comments, design docs, or CLONE_GUIDE contents in English (except for code identifiers and protocol keywords).
- Bypass tests by:
  - Deleting them
  - Commenting them out
  - Changing them to assert trivial behavior
- Mix unrelated work from multiple versions into a single change set without explicit human instruction.

---

## 6. Expected repository structure (guideline)

The repo is expected to gradually evolve into something similar to:

```text
AGENTS.md
STACK_DESIGN.md
PRODUCT_SPEC.md
CODING_GUIDE.md
DOC_TEMPLATES.md
VERSIONING.md
CLONE_GUIDE.md          # created and maintained as versions progress

backend/                # Spring Boot project
frontend/               # React + TypeScript SPA
infra/                  # Docker, Nginx, DB/Redis configs, monitoring

design/
  backend/
    initial-design.md
    v0.1.0-*.md
    v0.2.0-*.md
    ...
  frontend/
    initial-design.md
    v0.1.0-*.md
    ...
  realtime/
    initial-design.md
    v0.1.0-*.md
    ...
  infra/
    initial-design.md
    v0.1.0-*.md
    ...
```

Agents MUST follow this convention when creating new design docs or project modules.

---

## 7. Summary (for agents)

1. Always read:
   `AGENTS.md` → `STACK_DESIGN.md` → `PRODUCT_SPEC.md` → `CODING_GUIDE.md` → `DOC_TEMPLATES.md` → `VERSIONING.md`.
2. Choose exactly one target version from `VERSIONING.md`.
3. Implement backend/frontend/realtime/infra code consistent with `STACK_DESIGN.md` and `CODING_GUIDE.md`.
4. Write all comments and documentation in Korean, following `DOC_TEMPLATES.md`.
5. Add/update tests and run them. Only after all tests pass:

   * Create/update Korean design docs under `design/`.
   * Create/update Korean `CLONE_GUIDE.md`.
   * Update `VERSIONING.md` status.
6. Never reference the original 42 ft_transcendence subject as a spec.
   Only `PRODUCT_SPEC.md` + `STACK_DESIGN.md` define what and how to build in this repo.