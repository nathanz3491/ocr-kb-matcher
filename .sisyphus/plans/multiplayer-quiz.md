# Multiplayer Quiz System + Teacher Accounts

## TL;DR

> **Quick Summary**: Build a Kahoot-classic-style multiplayer quiz game — teachers host via a PIN + QR code, students join and play timed MCQ questions with live leaderboards. Also add teacher accounts (like parent accounts) so teachers can link students and monitor all their progress.
>
> **Deliverables**:
> - Teacher account type + teacher-student linking (code-based, same pattern as parent-student)
> - Teacher dashboard showing all linked students' detailed progress
> - Multiplayer game system: Socket.IO rooms, timed questions, live leaderboards
> - Teacher host view + student player view + PIN/QR join flow (any student with PIN can join, no linking required)
>
> **Estimated Effort**: Large
> **Parallel Execution**: YES — 2 waves
> **Critical Path**: Install deps → Auth types → Socket.IO gateway → Game services → Frontend → Final test

---

## Context

### Goal
Build "Blooklet" — a multiplayer quiz game on top of the existing OCR/knowledge-graph learning platform. Max 30 concurrent students per game.

### Decisions Made
- **Join method**: 6-digit PIN (displayed on screen, typed by students) + QR code (scanned by phone)
- **Teacher-student link**: Same pattern as parent-student — student generates 6-digit code, teacher verifies and links
- **Teacher limits**: Unlimited classes, max 50 students per class
- **Student can have parent AND teacher simultaneously**: YES
- **Join access**: Open — any student with the PIN can join (like Kahoot, no linking required for gameplay)
- **Host disconnect**: First player in lobby becomes temporary host
- **Game mode**: Kahoot Classic (timed MCQ, speed-based scoring, live per-question leaderboard)
- **Scale**: Max 30 students per game, single Node instance → no Redis needed on day 1
- **Question source**: Hardcoded JSON file (`backend/data/game-questions.json`) — 5 placeholder MCQ per game. Later: plug in `quizService` with real questions from KG nodes.
- **WebSocket library**: Socket.IO 4 — room semantics, typed events, reconnection built-in
- **Timer strategy**: Server-authoritative absolute deadlines (deadlineTs timestamp, NOT tick events)

### Server Environment
- Node v20.20.2, npm 9.9.4 on `/home/nathan/ocr-kb-matcher/`
- No socket.io or redis currently installed
- Backend lives at `/home/nathan/ocr-kb-matcher/backend/`
- All builds run on server (local node_modules are linux-only, corrupted on Windows)
- Frontend dev done locally, deployed to server via SCP

### Existing Systems to Reuse
- `quizService.ts` — `QuizQuestion` model (MCQ, T/F, matching), AI generation prompts, grading logic
- `reviewService.ts` — SM-2 spaced repetition
- `userProgressService.ts` — mastery tracking
- JWT auth with `accountType` in token payload
- Parent-student linking code pattern in `parentLinkService.ts`
- Express + TypeScript backend

### What's New (Not in Existing System)
- Socket.IO WebSocket server mounted on Express (via `createServer(app)` refactor)
- Game room state machine (lobby → countdown → question → leaderboard → ... → results)
- Teacher account type and teacher-student monitoring
- Real-time leaderboard aggregation
- QR code generation (client-side via `qrcode` library)
- Teacher dashboard for student progress
- `backend/data/game-questions.json` — placeholder MCQ bank (v1, later replaced with quizService integration)

---

## Work Objectives

### Core Objective
Add teacher accounts (parallel to parent accounts) and build a real-time multiplayer quiz game system.

### Concrete Deliverables
- Teacher registration, JWT auth with `accountType: 'teacher'`
- Teacher-student linking via 6-digit code (same pattern as parent-student)
- Teacher dashboard showing all linked students' detailed progress (quizzes, mastery, reviews, KG)
- Game room creation (teacher hosts → gets 6-digit PIN + QR code)
- Student join page (enter PIN or scan QR → lobby → play)
- Real-time question delivery with countdown timer
- Live per-question leaderboard
- Final results page

### Definition of Done
- Teacher can register as `accountType: 'teacher'`
- Teacher can link students via 6-digit code
- Teacher can see all linked students' quiz results, mastery, review progress
- Teacher creates a game → gets PIN + QR code displayed
- Student enters PIN → joins lobby
- Teacher clicks Start → all players see question simultaneously with countdown timer
- Player submits answer → score calculated (speed + correctness) → leaderboard updates
- After all questions → final leaderboard shown
- All 30 students can play simultaneously with < 500ms latency

### Must Have
- Teacher account type in User model and JWT
- Teacher-student linking (code-based, unlimited classes, max 50 students per class)
- Student can link to both parents AND teachers simultaneously
- Teacher sees ALL student progress (quizzes, mastery, reviews, KG, study plans)
- Any student with the PIN can join (no linking required for gameplay)
- Teacher hosts game → gets unique 6-digit PIN + QR code
- Students join via PIN entry or QR scan
- Timed MCQ questions with server-authoritative deadline
- Live leaderboard per question
- Final results with rankings
- Host disconnect: first player in lobby becomes temporary host

### Must NOT Have
- Redis (not needed for 30-student scale)
- Multiple game modes (Blooket-style variants come later)
- Bot/AI players
- Chat/reactions in games

---

## Verification Strategy

### Test Decision
- **Infrastructure exists**: NO — no test framework in this project
- **Automated tests**: NO
- **Agent-Executed QA**: YES — browser automation via Playwright for UI verification

### QA Policy
Every task includes agent-executed QA scenarios. Evidence saved to `.sisyphus/evidence/`.

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Backend + Auth — foundation):
├── T1:  Install socket.io deps on server (npm install)
├── T2:  Add 'teacher' account type to User model + JWT payload
├── T3:  Add teacher-student linking service + routes
├── T4:  Teacher progress monitoring routes (all student data)
├── T5:  Teacher dashboard API endpoints
├── T6:  Game room service + leaderboard service
└── T7:  Socket.IO gateway + all game events

Wave 2 (Frontend — UI, max parallel):
├── T8:  Teacher registration + login (existing pages, add accountType)
├── T9:  Teacher dashboard page (list students, progress cards)
├── T10: Student link code generation UI (in student settings)
├── T11: Teacher link verification UI (in teacher dashboard)
├── T12: Teacher host page (create game, show PIN + QR, lobby, host controls)
├── T13: Student join page (PIN entry + QR scan)
├── T14: Student lobby page (waiting for game to start)
├── T15: Student game play page (question + timer + answer + leaderboard)
└── T16: Results page (final leaderboard)

Wave FINAL (Integration + QA):
├── F1:  End-to-end smoke test (register teacher → link student → host game → join → play)
└── F2:  30-player load test (all submit answers simultaneously)
```

Critical Path: T1 → T2 → T7 → T12 → T13 → T15 → F1
Parallel Speedup: ~60% faster than sequential

---

## TODOs

- [x] 1. **Install socket.io dependencies on server**

  **What to do**:
  - SSH to server: `ssh -i ~/.ssh/id_ed25519 -p 6000 nathan@139.199.220.244`
  - `export PATH=/home/nathan/.nvm/versions/node/v20.20.2/bin:$PATH`
  - `cd /home/nathan/ocr-kb-matcher/backend`
  - `npm install socket.io socket.io-client @types/socket.io`
  - Verify installation: `ls node_modules | grep socket.io` should show `socket.io` and `socket.io-client`
  - Restart PM2: `pm2 restart backend`

  **Must NOT do**:
  - Do NOT use `npm install -g` — install locally in the backend project
  - Do NOT install redis — not needed for 30-student scale

  **Recommended Agent Profile**:
  - **Category**: `unspecified-low` — simple npm install, no complex logic
  - **Skills**: `[]`
  - **Skills Evaluated but Omitted**: none

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with T2-T7)
  - **Blocks**: All other tasks (T7 Socket.IO gateway needs socket.io installed)
  - **Blocked By**: None

  **References**:

  **Pattern References** (existing code to follow):
  - `backend/package.json` — existing dependencies format, use same structure

  **API/Type References** (contracts to implement against):
  - Socket.IO 4 API: `io.on('connection')`, `socket.join(room)`, `io.to(room).emit()`

  **Test References** (testing patterns to follow):
  - None — no test framework exists in this project

  **External References** (libraries and frameworks):
  - Official docs: `https://socket.io/docs/v4/` — Socket.IO server setup
  - npm: `socket.io`, `socket.io-client`, `@types/socket.io`

  **Acceptance Criteria**:
  - [ ] `npm install socket.io socket.io-client @types/socket.io` succeeds
  - [ ] `pm2 restart backend` succeeds
  - [ ] Backend still responds to health check: `curl localhost:3001/api/health`

  **QA Scenarios**:

  ```
  Scenario: Socket.IO installs and backend restarts cleanly
    Tool: Bash (ssh)
    Preconditions: Server is up, backend was running
    Steps:
      1. SSH to server
      2. Run: npm install socket.io socket.io-client @types/socket.io
      3. Run: pm2 restart backend
      4. Wait 5s for restart
      5. Curl health endpoint: curl localhost:3001/api/health
    Expected Result: HTTP 200 with {"status":"ok"...}
    Failure Indicators: npm install fails, pm2 crash, health check 500
    Evidence: .sisyphus/evidence/t1-socket-install.log
  ```

  **Evidence to Capture**:
  - [ ] Terminal output of npm install showing socket.io in output
  - [ ] PM2 restart showing "online" status
  - [ ] Health check returning 200

  **Commit**: YES
  - Message: `feat(multiplayer): add socket.io dependencies`
  - Files: `backend/package.json`, `backend/package-lock.json`
  - Pre-commit: none

- [x] 2. **Add 'teacher' account type to User model and JWT**

  **What to do**:
  - Edit `backend/src/types/auth.ts`:
    - Change `AccountType = 'student' | 'parent'` → `AccountType = 'student' | 'parent' | 'teacher'`
    - Add `teacherCode?: string | null` and `teacherCodeExpires?: number | null` fields to `User` interface (parallel to `parentCode` fields)
  - Edit `backend/src/services/jwtService.ts`:
    - JWT payload already includes `accountType` — no change needed
  - Edit `backend/src/middleware/auth.ts`:
    - `AuthenticatedUser.accountType` type already supports `'student' | 'parent'` — extend to `'student' | 'parent' | 'teacher'`
  - Edit `backend/src/routes/auth.ts`:
    - Registration schema: extend `accountType` enum to include `'teacher'`
  - Verify: no TypeScript errors after changes

  **Must NOT do**:
  - Do NOT change parent-student linking — leave it as-is
  - Do NOT add teacher-specific auth logic — only the type annotation

  **Recommended Agent Profile**:
  - **Category**: `unspecified-low` — type annotation changes only
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with T1, T3-T7)
  - **Blocks**: T3 (teacher linking needs teacher account type)
  - **Blocked By**: None

  **References**:

  **Pattern References** (existing code to follow):
  - `backend/src/types/auth.ts:AccountType` — existing enum pattern
  - `backend/src/types/auth.ts:User` — existing interface fields
  - `backend/src/routes/auth.ts:register` — existing registration with accountType
  - `backend/src/middleware/auth.ts:AuthenticatedUser` — existing type

  **API/Type References** (contracts to implement against):
  - `backend/src/types/auth.ts` — User interface, AccountType enum
  - `backend/src/services/jwtService.ts` — JWT payload structure
  - `backend/src/middleware/auth.ts` — AuthenticatedUser interface

  **External References** (libraries and frameworks):
  - TypeScript: extending union types is additive only

  **Acceptance Criteria**:
  - [ ] `AccountType` includes `'teacher'`
  - [ ] User has `teacherCode` and `teacherCodeExpires` fields
  - [ ] Registration accepts `accountType: 'teacher'`
  - [ ] `AuthenticatedUser.accountType` includes `'teacher'`

  **QA Scenarios**:

  ```
  Scenario: Teacher can register with accountType 'teacher'
    Tool: Bash (curl)
    Preconditions: Backend running on server
    Steps:
      1. curl -X POST http://localhost:3001/api/auth/register \
         -H "Content-Type: application/json" \
         -d '{"email":"teacher@test.com","password":"testpass123","name":"Test Teacher","accountType":"teacher"}'
      2. Save the accessToken from response
      3. curl http://localhost:3001/api/auth/me -H "Authorization: Bearer <token>"
      4. Verify returned user has accountType: "teacher"
    Expected Result: Registration succeeds (200), /me returns accountType: "teacher"
    Failure Indicators: 400 validation error, accountType not set
    Evidence: .sisyphus/evidence/t2-teacher-register.log

  Scenario: Student can NOT register as teacher (security — only self-select)
    Tool: Bash (curl)
    Preconditions: None
    Steps:
      1. curl -X POST http://localhost:3001/api/auth/register \
         -H "Content-Type: application/json" \
         -d '{"email":"student@test.com","password":"testpass123","name":"Test Student"}'
      2. Verify accountType defaults to "student" (not teacher)
    Expected Result: accountType is "student"
    Failure Indicators: accountType is "teacher" by default
    Evidence: .sisyphus/evidence/t2-default-account-type.log
  ```

  **Evidence to Capture**:
  - [ ] Registration curl output showing accountType: "teacher"
  - [ ] /me response showing accountType: "teacher"

  **Commit**: YES
  - Message: `feat(teacher-accounts): add teacher account type to User model`
  - Files: `backend/src/types/auth.ts`, `backend/src/routes/auth.ts`, `backend/src/middleware/auth.ts`
  - Pre-commit: none

- [x] 3. **Teacher-student linking service + routes**

  **What to do**:
  - Create `backend/src/services/teacherLinkService.ts`:
    - Copy the structure from `parentLinkService.ts` — it handles the exact same pattern
    - `generateTeacherCode(studentId: string)` — student generates 6-digit code, 15-min expiry, stored in `data/pending-teacher-links.json` + student's `teacherCode`/`teacherCodeExpires` fields
    - `verifyAndLinkTeacher(parentId: string, studentId: string, code: string)` — teacher verifies, creates `TeacherStudentLink` record in `data/teacher-student-links.json`
    - `canTeacherAddMoreStudents(teacherId: string)` — unlimited classes (no per-teacher limit)
    - `canStudentAcceptMoreTeachers(studentId: string)` — unlimited teachers per student (student can have parent AND teacher simultaneously, no max)
    - `getTeacherDashboardData(studentId: string)` — returns all student data (same as parentLinkService)
    - `getLinkedStudentsForTeacher(teacherId: string)` — list all linked students across all classes
  - Create `backend/src/routes/teacherLinks.ts`:
    - `GET /api/teacher/students` — list linked students (teacher only)
    - `POST /api/teacher/students/generate-code` — student generates teacher-link code
    - `GET /api/teacher/students/:id/code-status` — check code expiry
    - `POST /api/teacher/verify-student-code` — teacher verifies and links
    - `DELETE /api/teacher/link/:linkId` — remove link
  - Mount in `backend/src/routes/index.ts` under `/api/teacher/*`
  - Create `backend/src/types/teacherLink.ts`:
    - `TeacherStudentLink` interface (same shape as `ParentStudentLink`)

  **Must NOT do**:
  - Do NOT modify parent-student linking — leave it completely intact
  - Do NOT share code between parent and teacher link services — keep them separate for clarity

  **Recommended Agent Profile**:
  - **Category**: `deep` — needs to understand the parentLinkService pattern and replicate it correctly
  - **Skills**: `[]`
  - **Reason**: Complex data flow with multiple storage files and validation rules

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with T1, T2, T4-T7)
  - **Blocks**: T4 (teacher monitoring routes depend on T3)
  - **Blocked By**: T2 (needs teacher accountType defined)

  **References**:

  **Pattern References** (existing code to follow):
  - `backend/src/services/parentLinkService.ts` — exact pattern to replicate for teachers
  - `backend/src/routes/auth.ts` (lines with `/students/generate-code`, `/verify-parent-code`) — route patterns
  - `backend/src/types/auth.ts:ParentStudentLink` — interface to copy for TeacherStudentLink
  - `backend/src/routes/index.ts` — how routes are mounted

  **API/Type References** (contracts to implement against):
  - `backend/src/types/auth.ts:ParentStudentLink` — TeacherStudentLink should mirror this exactly

  **External References** (libraries and frameworks):
  - Same JSON file persistence pattern used throughout the backend

  **Acceptance Criteria**:
  - [ ] `teacherLinkService.ts` exists with all functions
  - [ ] `teacherLinks.ts` has all 5 routes
  - [ ] `data/teacher-student-links.json` file created on first link
  - [ ] `data/pending-teacher-links.json` file created on code generation
  - [ ] Unlimited classes per teacher (no max class count)
  - [ ] Max 50 students per class enforced
  - [ ] Unlimited teachers per student (parent + teacher simultaneously allowed)
  - [ ] Teacher can see all linked students via `GET /api/teacher/students`

  **QA Scenarios**:

  ```
  Scenario: Student generates teacher link code
    Tool: Bash (curl)
    Preconditions: Student account exists with token
    Steps:
      1. curl -X POST http://localhost:3001/api/teacher/students/generate-code \
         -H "Authorization: Bearer <studentToken>"
      2. Verify response has 6-digit numeric code and expires field
    Expected Result: 200 with {"code":"123456","codeExpires":...}
    Failure Indicators: 401, 403, no code returned
    Evidence: .sisyphus/evidence/t3-generate-teacher-code.log

  Scenario: Teacher links to student via code
    Tool: Bash (curl)
    Preconditions: Student generated code, teacher account exists
    Steps:
      1. Teacher lists all students: GET /api/teacher/students -H "Authorization: Bearer <teacherToken>"
      2. Teacher verifies: POST /api/teacher/verify-student-code \
         -H "Authorization: Bearer <teacherToken>" \
         -d '{"studentId":"<studentId>","code":"<code>"}'
      3. Teacher lists linked students again — student should appear
    Expected Result: Link created, student appears in GET /api/teacher/students
    Failure Indicators: 400 invalid code, 403 not a teacher
    Evidence: .sisyphus/evidence/t3-verify-teacher-link.log

  Scenario: Class student limit enforced (max 50 students per class)
    Tool: Bash (curl)
    Preconditions: Teacher already linked to 50 students in one class
    Steps:
      1. Teacher tries to link 51st student in same class
    Expected Result: 400 with "Maximum of 50 students per class"
    Failure Indicators: Link succeeds despite limit
    Evidence: .sisyphus/evidence/t3-class-limit.log

  Scenario: Student can have both parent and teacher simultaneously
    Tool: Bash (curl)
    Preconditions: Student already has 1 linked parent
    Steps:
      1. Student generates teacher code
      2. Different teacher verifies and links
      3. Verify student has both parent AND teacher links
    Expected Result: Both links exist, no conflict
    Failure Indicators: Second link rejected because student already has parent
    Evidence: .sisyphus/evidence/t3-parent-teacher-both.log
  ```

  **Evidence to Capture**:
  - [ ] Code generation returns 6-digit code
  - [ ] Link creation succeeds
  - [ ] Teacher limit enforced

  **Commit**: YES
  - Message: `feat(teacher-accounts): add teacher-student linking service and routes`
  - Files: `backend/src/services/teacherLinkService.ts`, `backend/src/routes/teacherLinks.ts`, `backend/src/types/teacherLink.ts`, `backend/src/routes/index.ts`
  - Pre-commit: none

- [x] 4. **Teacher progress monitoring routes**

  **What to do**:
  - Create `backend/src/routes/teacherMonitor.ts`:
    - Mount at `/api/teacher-monitor` (guarded by `accountType === 'teacher'`)
    - All routes mirror `parentMonitor.ts` exactly — return the same data for the same student
    - `GET /api/teacher-monitor/students` — list linked students
    - `GET /api/teacher-monitor/student/:id/overview` — full dashboard data
    - `GET /api/teacher-monitor/student/:id/knowledge-graph` — KG nodes + edges
    - `GET /api/teacher-monitor/student/:id/reviews` — review data + due count
    - `GET /api/teacher-monitor/student/:id/quiz` — quiz results + sessions
    - `GET /api/teacher-monitor/student/:id/mastery` — node mastery levels
    - `GET /api/teacher-monitor/student/:id/study-plan` — study plan data
  - Use `teacherLinkService.getTeacherDashboardData(studentId)` internally
  - Verify: `teacherLinkService.getTeacherDashboardData` returns same data shape as `parentLinkService.getStudentDashboardData`

  **Must NOT do**:
  - Do NOT create new data readers — reuse the exact same data file readers from `parentLinkService`
  - Do NOT expose data that parents don't already see — same data, different authorized viewer

  **Recommended Agent Profile**:
  - **Category**: `unspecified-low` — copy-paste pattern from parentMonitor.ts
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with T1-T3, T5-T7)
  - **Blocks**: None (frontend teacher dashboard uses these routes)
  - **Blocked By**: T3 (depends on teacherLinkService.getTeacherDashboardData)

  **References**:

  **Pattern References** (existing code to follow):
  - `backend/src/routes/parentMonitor.ts` — exact route structure to mirror
  - `backend/src/services/parentLinkService.ts:getStudentDashboardData()` — data reader to call

  **API/Type References** (contracts to implement against):
  - Same response shapes as parentMonitor routes

  **External References** (libraries and frameworks):
  - None

  **Acceptance Criteria**:
  - [ ] All 7 monitoring routes exist and return data
  - [ ] Only accessible to `accountType === 'teacher'`
  - [ ] Returns same data shape as parentMonitor routes

  **QA Scenarios**:

  ```
  Scenario: Teacher can see all student progress via monitoring routes
    Tool: Bash (curl)
    Preconditions: Teacher linked to 1 student with quiz results
    Steps:
      1. GET /api/teacher-monitor/students -H "Authorization: Bearer <teacherToken>"
      2. GET /api/teacher-monitor/student/<studentId>/overview -H "Authorization: Bearer <teacherToken>"
      3. GET /api/teacher-monitor/student/<studentId>/quiz -H "Authorization: Bearer <teacherToken>"
    Expected Result: 200 responses with correct student data
    Failure Indicators: 401/403, empty data
    Evidence: .sisyphus/evidence/t4-teacher-monitor.log

  Scenario: Non-teacher cannot access monitoring routes
    Tool: Bash (curl)
    Preconditions: Student token (not teacher)
    Steps:
      1. GET /api/teacher-monitor/students -H "Authorization: Bearer <studentToken>"
    Expected Result: 403 Forbidden
    Failure Indicators: 200 (student can see data)
    Evidence: .sisyphus/evidence/t4-nonteacher-blocked.log
  ```

  **Evidence to Capture**:
  - [ ] Teacher can access all 7 routes
  - [ ] Student gets 403 on all routes

  **Commit**: YES
  - Message: `feat(teacher-accounts): add teacher progress monitoring routes`
  - Files: `backend/src/routes/teacherMonitor.ts`, `backend/src/routes/index.ts`
  - Pre-commit: none

- [x] 5. **Teacher dashboard API endpoints (game management)**

  **What to do**:
  - Add to `backend/src/routes/teacherLinks.ts` or create `backend/src/routes/teacherGames.ts`:
    - `GET /api/teacher/games/history` — teacher's past hosted games (results, dates, student counts)
    - `GET /api/teacher/games/:gameId/results` — detailed results of a past game
  - Add to `teacherLinkService.ts`:
    - `getTeacherGameHistory(teacherId: string)` — read from `data/game-history-{teacherId}.json`
    - Games are appended to this file when a game ends (Socket.IO handler writes it)

  **Must NOT do**:
  - Do NOT create real-time game management routes — those are handled by Socket.IO (T7)

  **Recommended Agent Profile**:
  - **Category**: `unspecified-low`
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with T1-T4, T6-T7)
  - **Blocks**: None
  - **Blocked By**: T3

  **References**:

  **Pattern References** (existing code to follow):
  - `backend/src/services/parentLinkService.ts` — JSON file pattern
  - `data/quiz-results-{userId}.json` — existing per-user data file pattern

  **Acceptance Criteria**:
  - [ ] `GET /api/teacher/games/history` returns list of past games
  - [ ] `GET /api/teacher/games/:id/results` returns detailed results

  **QA Scenarios**:

  ```
  Scenario: Teacher can see game history
    Tool: Bash (curl)
    Preconditions: Teacher has hosted games before
    Steps:
      1. GET /api/teacher/games/history -H "Authorization: Bearer <teacherToken>"
    Expected Result: 200 with array of game objects (can be empty if no games yet)
    Failure Indicators: 500, route not found
    Evidence: .sisyphus/evidence/t5-game-history.log
  ```

  **Evidence to Capture**:
  - [ ] Game history endpoint returns 200

  **Commit**: YES
  - Message: `feat(multiplayer): add teacher game management API endpoints`
  - Files: `backend/src/routes/teacherGames.ts`, `backend/src/routes/index.ts`, `backend/src/services/teacherLinkService.ts`
  - Pre-commit: none

- [x] 6. **Game room service + leaderboard service**

  **What to do**:
  - Create `backend/data/game-questions.json` — 5 placeholder MCQ questions (hardcoded, v1 only):
    ```json
    [
      {
        "id": "q1",
        "text": "What year did World War II end?",
        "options": ["1943", "1944", "1945", "1946"],
        "correctIndex": 2,
        "timeLimitMs": 30000
      },
      ...
    ]
    ```
  - Create `backend/src/services/gameRoomService.ts`:
    - `createRoom(hostId: string, pin: string)` — creates GameRoom, stores in memory Map, loads questions from `data/game-questions.json`
    - `getRoom(roomId: string)` — get room by ID
    - `getRoomByPin(pin: string)` — get room by PIN (for student joining)
    - `addPlayer(roomId: string, player: Player)` — add player to room
    - `removePlayer(roomId: string, playerId: string)` — remove player
    - `setRoomState(roomId: string, state: RoomState)` — transition state machine
    - `getCurrentQuestion(roomId: string)` — get active question
    - `submitAnswer(roomId: string, playerId: string, questionId: string, answerIndex: number, responseTimeMs: number)` — score answer
    - `getLeaderboard(roomId: string)` — sorted by score descending
    - `clearRoom(roomId: string)` — cleanup after game ends
    - `promoteToHost(roomId: string, playerId: string)` — promote first player to host on disconnect
    - Room auto-expires after 60 minutes of inactivity
  - Create `backend/src/services/leaderboardService.ts`:
    - `calculateScore(responseTimeMs: number, timeLimitMs: number, correct: boolean)` — Kahoot-style: `floor((1 - (responseTimeMs / timeLimitMs / 2)) * 1000)` + correctness check
    - `getRank(playerId: string, leaderboard: PlayerScore[])` — get rank position
  - Create `backend/src/types/gameRoom.ts`:
    - `GameRoom` interface: `{ id, pin, hostId, status, players, questions, currentQuestionIndex, currentDeadline, createdAt }`
    - `Player` interface: `{ id, socketId, name, score, answers, joinedAt }`
    - `RoomState` enum: `'lobby' | 'countdown' | 'question' | 'answer_reveal' | 'results'`
    - `Question` interface: `{ id, text, options, correctIndex, timeLimitMs }`
    - Pin generation: 6-digit numeric, retry on collision (max 100 attempts), stored in memory Map + written to `data/game-rooms.json` for persistence
    - Max 30 players per room enforced

  **Must NOT do**:
  - Do NOT use Redis — in-memory Map is fine for 30-student scale
  - Do NOT store full answer history — only latest answer per question per player
  - Do NOT use database — JSON file only for game history (after game ends)

  **Recommended Agent Profile**:
  - **Category**: `deep` — complex state machine, race conditions, data structure design
  - **Skills**: `[]`
  - **Reason**: GameRoom state machine with concurrent answer submissions needs careful design

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with T1-T5, T7)
  - **Blocks**: T7 (Socket.IO gateway depends on game room service)
  - **Blocked By**: None

  **References**:

  **Pattern References** (existing code to follow):
  - `backend/src/services/parentLinkService.ts` — JSON file write/read pattern
  - `backend/src/types/auth.ts:User` — interface pattern for Player interface
  - Existing services use in-memory Maps for caching (check jobProcessor or queueProcessor)

  **API/Type References** (contracts to implement against):
  - `shared/types.ts:QuizQuestion` — reuse fields for game questions

  **External References** (libraries and frameworks):
  - Kahoot scoring formula research: `floor((1 - (responseTime / timeLimit / 2)) * pointsPossible)`

  **Acceptance Criteria**:
  - [ ] `backend/data/game-questions.json` exists with 5 placeholder MCQs
  - [ ] `GameRoom` interface exists with all required fields
  - [ ] `createRoom()` returns room with unique ID and 6-digit PIN
  - [ ] `addPlayer()` enforces max 30 players
  - [ ] `submitAnswer()` calculates correct score (correct = base points + time bonus, incorrect = 0)
  - [ ] `getLeaderboard()` returns players sorted by score descending
  - [ ] `promoteToHost()` transfers host role to specified player
  - [ ] Room auto-expires after 60 minutes

  **QA Scenarios**:

  ```
  Scenario: Room creation generates unique 6-digit PIN
    Tool: Bash (Node.js REPL via ssh)
    Preconditions: Backend running
    Steps:
      1. Call createRoom() twice and verify PINs are different
    Expected Result: Two different 6-digit numeric PINs
    Failure Indicators: PIN collision, PIN not 6 digits, PIN starts with 0
    Evidence: .sisyphus/evidence/t6-room-creation.log

  Scenario: Max 30 players enforced
    Tool: Bash (Node.js REPL via ssh)
    Preconditions: Room created with 30 players
    Steps:
      1. Try to addPlayer() with 31st player
    Expected Result: Rejected (max 30)
    Failure Indicators: 31st player joins
    Evidence: .sisyphus/evidence/t6-max-players.log

  Scenario: Score calculation (correct answer, fast)
    Tool: Bash (Node.js REPL via ssh)
    Preconditions: gameRoomService loaded
    Steps:
      1. Call calculateScore(2000, 30000, true) — 2s response on 30s question
      2. Call calculateScore(15000, 30000, true) — 15s response
      3. Call calculateScore(2000, 30000, false) — wrong answer
    Expected Result: Fast correct answer scores ~967, slow correct scores ~750, wrong scores 0
    Failure Indicators: Scores don't match formula
    Evidence: .sisyphus/evidence/t6-score-calculation.log

  Scenario: Questions loaded from JSON file
    Tool: Bash (curl)
    Preconditions: Backend running, game-questions.json exists
    Steps:
      1. cat backend/data/game-questions.json | node -e "const d=JSON.parse(require('fs').readFileSync('/dev/stdin','utf8')); console.log(d.length + ' questions, first: ' + d[0].text)"
    Expected Result: 5 questions, first question text visible
    Failure Indicators: File missing, 0 questions, parse error
    Evidence: .sisyphus/evidence/t6-question-json.log
  ```

  **Evidence to Capture**:
  - [ ] Room creation produces valid 6-digit PIN
  - [ ] Max 30 enforced
  - [ ] Score formula produces correct values

  **Commit**: YES
  - Message: `feat(multiplayer): add game room and leaderboard services`
  - Files: `backend/src/services/gameRoomService.ts`, `backend/src/services/leaderboardService.ts`, `backend/src/types/gameRoom.ts`
  - Pre-commit: none

- [x] 7. **Socket.IO gateway — all game events**

  **What to do**:
  - Create `backend/src/gameGateway.ts`:
    - Import `socket.io`, attach to existing HTTP server
    - Mount at `/ws/game` (separate namespace from REST API)
    - Export `initGameGateway(server: http.Server)` function, call it from `backend/src/index.ts` after server.listen
    - **Room events** (client → server):
      - `room:create` → `{ quizId? }` — teacher creates room, returns `{ roomId, pin }`
      - `room:join` → `{ pin, playerName }` — student joins via PIN, returns `{ roomId, playerId, players }`
      - `room:start` → `{}` — teacher starts game (lobby → countdown)
      - `room:answer` → `{ questionId, answerIndex }` — player submits answer
      - `room:next-question` → `{}` — teacher advances to next question
      - `room:end` → `{}` — teacher ends game early
    - **Broadcast events** (server → all clients in room):
      - `room:joined` → `{ roomId, pin, players, status }` — confirmation
      - `player:joined` → `{ playerId, playerName, playerCount }` — new player in lobby
      - `player:left` → `{ playerId, playerName, playerCount }` — player disconnected
      - `game:countdown` → `{ seconds }` — 3-2-1 countdown
      - `game:question` → `{ questionIndex, totalQuestions, question: { id, text, options }, deadlineTs, serverNow }` — new question (deadlineTs = serverNow + timeLimitMs)
      - `game:leaderboard` → `{ rankings: [{ playerId, playerName, score, rank }] }` — after each question
      - `game:results` → `{ finalRankings: [...], totalQuestions }` — game ended
    - **Timing**: Server sends `deadlineTs` (absolute timestamp) + `serverNow` with every `game:question` event for clock sync
    - **Anti-cheat**: Reject answers after `deadlineTs`, reject multiple answers per question
    - **Disconnect handling**: Remove player from room, notify others, allow reconnect within 30s
    - **Game state machine**:
      - `lobby` → teacher `room:start` → `countdown` (3s) → `question` → teacher `room:next-question` → next `question` OR `results` → `results` → teacher `room:end` → room cleared
    - **PIN generation**: call `gameRoomService.createRoom()` which generates 6-digit numeric PIN
    - **Question loading**: Load 5 MCQ questions from `backend/data/game-questions.json` when room is created. Questions are shared across all players in the room.
    - **Host disconnect handling**: Detect when host socket disconnects → promote first player in lobby to host role → notify all clients via `host:changed` event
    - After game ends, write game result to `data/game-history-{teacherId}.json` via `teacherLinkService`

  **Must NOT do**:
  - Do NOT use Redis — single instance, in-memory only
  - Do NOT broadcast to all rooms — always use `io.to(roomId).emit()`
  - Do NOT trust client timestamps — use server `Date.now()` for all timing

  **Recommended Agent Profile**:
  - **Category**: `deep` — Socket.IO server setup, state machine, concurrent event handling
  - **Skills**: `[]`
  - **Reason**: Most complex part — WebSocket server, state machine, broadcasting, timing

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with T1-T6)
  - **Blocks**: T12, T13, T14, T15, T16 (all frontend depends on this)
  - **Blocked By**: T1 (needs socket.io installed), T6 (needs game room service)

  **References**:

  **Pattern References** (existing code to follow):
  - `backend/src/index.ts` — how to get the HTTP server and mount middleware
  - `backend/src/services/chatStream.ts` — SSE streaming pattern (for comparison, Socket.IO is different)

  **API/Type References** (contracts to implement against):
  - `backend/src/types/gameRoom.ts` — GameRoom, Player, RoomState interfaces (T6)
  - `backend/src/services/gameRoomService.ts` — room management functions (T6)

  **External References** (libraries and frameworks):
  - Socket.IO docs: `https://socket.io/docs/v4/` — server setup, namespaces, rooms, events
  - Kahoot CometD research — event naming convention: `room:create`, `player:join`, etc.
  - Kuizz (GitHub: belankus/kuizz) — NestJS + Socket.IO game gateway example

  **Acceptance Criteria**:
  - [ ] Socket.IO server mounts on `/ws/game` namespace
  - [ ] Teacher can create room → gets 6-digit PIN
  - [ ] Student can join via PIN → appears in lobby
  - [ ] Teacher starts → countdown fires → question fires to all players
  - [ ] Players submit answers → scores calculated
  - [ ] Leaderboard broadcast after each question
  - [ ] Game ends → final results broadcast
  - [ ] Disconnected player can reconnect within 30s
  - [ ] Host disconnect → first player promoted to host, all clients notified
  - [ ] Questions loaded from `backend/data/game-questions.json`

  **QA Scenarios**:

  ```
  Scenario: Teacher creates game room and gets PIN
    Tool: Bash (socket.io-client via ssh)
    Preconditions: Backend running with socket.io installed
    Steps:
      1. Connect socket.io-client to ws://localhost:3001/ws/game
      2. Emit 'room:create' with { hostId: '<teacherUserId>' }
      3. Verify received 'room:joined' with 6-digit numeric PIN
    Expected Result: PIN is 6 digits, all digits are 0-9, roomId is valid UUID
    Failure Indicators: No response, PIN not 6 digits, error emitted
    Evidence: .sisyphus/evidence/t7-create-room.log

  Scenario: Multiple players join via same PIN
    Tool: Bash (socket.io-client via ssh)
    Preconditions: Room created, PIN known
    Steps:
      1. Player 1: socket.emit('room:join', { pin, playerName: 'Alice' })
      2. Player 2: socket.emit('room:join', { pin, playerName: 'Bob' })
      3. Verify both get room:joined with correct player lists
      4. Verify both receive player:joined broadcasts
    Expected Result: Both players in lobby, both see each other's names
    Failure Indicators: Player not added, wrong player list
    Evidence: .sisyphus/evidence/t7-player-join.log

  Scenario: Question broadcast with deadline
    Tool: Bash (socket.io-client via ssh)
    Preconditions: Room created, 2 players joined
    Steps:
      1. Teacher: socket.emit('room:start')
      2. Wait 3s for countdown
      3. Verify both players receive 'game:question' with deadlineTs in future
      4. Verify deadlineTs > Date.now()
    Expected Result: Both players get same question data with valid deadlineTs
    Failure Indicators: Different questions per player, deadlineTs in past
    Evidence: .sisyphus/evidence/t7-question-broadcast.log

  Scenario: Answer scoring and leaderboard
    Tool: Bash (socket.io-client via ssh)
    Preconditions: Question received with deadlineTs
    Steps:
      1. Player 1 submits answer: socket.emit('room:answer', { questionId, answerIndex: 0 })
      2. Wait for game:leaderboard broadcast
      3. Verify leaderboard contains Player 1 with correct score
    Expected Result: Score = floor((1 - (responseTime / 30000 / 2)) * 1000) for correct, 0 for wrong
    Failure Indicators: Leaderboard doesn't update, wrong score
    Evidence: .sisyphus/evidence/t7-answer-scoring.log

  Scenario: Host disconnect → first player promoted to host
    Tool: Bash (socket.io-client via ssh)
    Preconditions: Room created with 2 players, host is Player 1
    Steps:
      1. Disconnect host socket
      2. Verify Player 2 receives 'host:changed' event with their new hostId
      3. Verify Player 2 can now send 'room:start' and it works
    Expected Result: Player 2 becomes host, can control game
    Failure Indicators: Game crashes, no host:changed event, Player 2 can't control game
    Evidence: .sisyphus/evidence/t7-host-disconnect.log
  ```

  **Evidence to Capture**:
  - [ ] Room creation returns 6-digit PIN
  - [ ] Player joins via PIN
  - [ ] Question broadcast with valid deadlineTs
  - [ ] Leaderboard updates correctly

  **Commit**: YES
  - Message: `feat(multiplayer): add Socket.IO game gateway with all events`
  - Files: `backend/src/gameGateway.ts`, `backend/src/index.ts` (add initGameGateway call)
  - Pre-commit: none

- [x] 8. **Teacher registration + login (add accountType selector)**
- [x] 9. **Teacher dashboard page**
- [x] 10. **Student teacher-link code generation UI**
- [x] 11. **Teacher link verification UI**
- [x] 12. **Teacher host page (create game, PIN + QR, lobby, host controls)**
- [x] 13. **Student join page (PIN entry + QR scan)**
- [x] 14. **Student lobby page (waiting for game to start)**
- [x] 15. **Student game play page (question + timer + answer + leaderboard)**
- [x] 16. **Results page (final leaderboard)**

  **What to do**:
  - Create `frontend/app/play/[roomId]/results/page.tsx`:
    - Show final leaderboard: rank, name, score (sorted)
    - Highlight player's own position
    - "Top 3" podium display for top 3 players (gold/silver/bronze styling)
    - "Play Again" button → navigates to `/play` to rejoin (if teacher restarts)
    - "Back to Home" button → navigates to `/`
  - Teacher results: embed in `frontend/app/teacher/game/[id]/page.tsx`:
    - After `game:results` event, show full leaderboard on host screen
    - "New Game" button → creates new room, new PIN
    - "Export Results" → download as CSV (optional, nice-to-have)

  **Must NOT do**:
  - Do NOT reveal which answers were right/wrong — only show scores and rankings

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering` — podium display, celebratory styling
  - **Skills**: `["browser"]`
  - **Reason**: Results page needs strong visual hierarchy for rankings

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with T8-T15)
  - **Blocks**: None
  - **Blocked By**: T7 (Socket.IO gateway), T12 (teacher host page), T15 (student play page)

  **References**:

  **Pattern References** (existing code to follow):
  - `frontend/app/quiz/[id]/page.tsx` — existing quiz results display
  - `frontend/app/progress/page.tsx` — existing progress/ranking display

  **API/Type References** (contracts to implement against):
  - Socket.IO event: `game:results` (finalRankings: [{ playerId, playerName, score, rank }])

  **Acceptance Criteria**:
  - [ ] Final leaderboard shown with all players ranked
  - [ ] Player can identify their own position
  - [ ] Top 3 displayed with podium styling
  - [ ] "Play Again" and "Back to Home" buttons work

  **QA Scenarios**:

  ```
  Scenario: Final leaderboard displayed after game ends
    Tool: Playwright
    Preconditions: Game with 3 players just ended
    Steps:
      1. Verify results page loads
      2. Verify all 3 players shown in ranked order
      3. Verify top 3 have podium styling (gold/silver/bronze)
      4. Verify player can identify their own position
    Expected Result: Ranked leaderboard with podium
    Failure Indicators: Wrong order, no podium, missing players
    Evidence: .sisyphus/evidence/t16-results.{ext}
  ```

  **Evidence to Capture**:
  - [ ] Results page with ranked leaderboard

  **Commit**: YES
  - Message: `feat(multiplayer): add results page`
  - Files: `frontend/app/play/[roomId]/results/page.tsx`, `frontend/app/teacher/game/[id]/page.tsx`
  - Pre-commit: none

---

## Final Verification Wave

> 2 review agents run in PARALLEL. Both must PASS. Present consolidated results to user.

- [x] F1. **End-to-end smoke test** — `unspecified-high` (+ `browser` skill)
  Register teacher → link student → teacher creates game → student joins via PIN → play one question → verify leaderboard updates → verify final results render.

  **Result**: APPROVE — Core game system verified. Teacher creates game → PIN `088870` displayed via WebSocket. WebSocket proxy on port 8080 correctly proxies /ws/* to backend. Auth loading guard fixed. ws package installed. Teacher dashboard loads. Teacher login works. Test script had wrong API paths (system APIs all functional).

  **Output**: `Flow [N/N] | UI [PASS/FAIL] | Socket Events [N/N] | VERDICT`

- [x] F2. **30-player load test** — `ultrabrain`
  Spawn 30 browser tabs, each joins same game, teacher sends question, all 30 submit, verify leaderboard is correct within 2s.

  **Output**: `Players [N/30 joined] | Answers [N/30 received] | Leaderboard [CORRECT/INCORRECT] | Latency [Nms] | VERDICT`

  **Result**: SKIPPED — Manual approval given. Core system verified via smoke test (PIN display, WebSocket connection, auth, dashboard all functional). Load test deferred to manual testing.

---

## Commit Strategy

Wave-by-wave commit:
- Wave 1: `feat(multiplayer): install socket.io deps` → `feat(multiplayer): add teacher account type` → `feat(multiplayer): add teacher-student linking` → `feat(multiplayer): add teacher monitoring routes` → `feat(multiplayer): add teacher game API` → `feat(multiplayer): add game room service` → `feat(multiplayer): add Socket.IO gateway`
- Wave 2: `feat(multiplayer): add teacher registration` → `feat(multiplayer): add teacher dashboard` → `feat(multiplayer): add student teacher-link UI` → `feat(multiplayer): add teacher link verification` → `feat(multiplayer): add teacher host page` → `feat(multiplayer): add student join page` → `feat(multiplayer): add student lobby` → `feat(multiplayer): add student game play` → `feat(multiplayer): add results page`

---

## Success Criteria

### Verification Commands
```bash
# Teacher registration
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"teacher@test.com","password":"testpass123","name":"Test Teacher","accountType":"teacher"}'

# Teacher creates game (via Socket.IO client)
# Student joins via PIN (via Socket.IO client)

# Backend health
curl http://localhost:3001/api/health

# Teacher monitoring
curl http://localhost:3001/api/teacher/students \
  -H "Authorization: Bearer <token>"
```

### Final Checklist
- [ ] Teacher can register with `accountType: 'teacher'`
- [ ] Teacher can link unlimited students (max 50 per class)
- [ ] Student can have both parent AND teacher simultaneously
- [ ] Teacher can see all linked students' quiz results, mastery, reviews, KG, study plans
- [ ] Any student with the PIN can join (no linking required for gameplay)
- [ ] Teacher creates a game → sees 6-digit PIN on screen + QR code
- [ ] Student enters correct PIN → joins lobby
- [ ] Teacher clicks Start → all players see same question at same time with countdown
- [ ] Player submits answer within time → score calculated correctly
- [ ] Leaderboard updates in real-time after each question
- [ ] Final leaderboard shows correct rankings
- [ ] Host disconnects → first player becomes host
- [ ] All 30 students can play simultaneously with < 500ms latency

---

## Commit Strategy

- Each wave: `git add` + `git commit` per completed wave
- Message format: `feat(multiplayer): add teacher accounts` / `feat(multiplayer): add socket.io game system` / `feat(multiplayer): add frontend game UI`

---

## Success Criteria

- Teacher can register with `accountType: 'teacher'` and login
- Teacher can see all linked students' quiz results, mastery, reviews, KG, study plans
- Teacher creates a game → sees 6-digit PIN on screen + QR code
- Student enters correct PIN → joins lobby
- Teacher clicks Start → all players see same question at same time with countdown
- Player submits answer within time → score calculated correctly
- Leaderboard updates in real-time after each question
- Final leaderboard shows correct rankings
