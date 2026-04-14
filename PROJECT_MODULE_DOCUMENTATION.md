# SAKHI Project Documentation (Instructor Edition)

## Project At a Glance

SAKHI is a full-stack menstrual health companion built to provide practical daily support through cycle tracking, personalized nutrition guidance, mood and symptom monitoring, education, and conversational assistance.

The core value of this project is that it combines:

1. Structured health logging
2. Cycle-aware predictions
3. Context-aware recommendations
4. Evidence-based myth education
5. Safety-first chatbot behavior

This document is organized in two parts:

1. Instructor-ready explanation of what was built and why it matters
2. Detailed module-by-module technical documentation (appendix sections below)

## Problem Statement

Many users track cycle dates in one app, mood in another app, and nutrition in general notes. This creates fragmented data and weak personalization.

SAKHI addresses this by keeping cycle, mood, symptoms, and learning support in one workflow, then using that context to improve guidance quality.

## Project Objectives

1. Build a production-style full-stack wellness application.
2. Support multiple ways of entering cycle data.
3. Generate understandable cycle predictions with confidence indicators.
4. Deliver phase-based nutrition and symptom-aware suggestions.
5. Add emotional wellness support through mood tracking and trend insights.
6. Add misinformation correction through myths/facts education features.
7. Provide chatbot support with safety guardrails and contextual memory.

## What I Implemented

### 1) Full Authentication and Session Handling

1. Signup and login endpoints with validation.
2. Password hashing using bcrypt.
3. JWT-based protected routes.
4. Frontend route guarding and session persistence.

### 2) Adaptive Cycle Tracking and Prediction

1. Cycle entry from single date or multiple historical dates.
2. Period start and period end flows.
3. Prediction outputs:
	- next period date
	- ovulation date
	- fertile window
	- current phase
	- current day in cycle
	- confidence level
	- irregularity flag
4. Calendar-range phase generation to render month-level prediction states.
5. Approximate mode for low-data scenarios and adaptive mode for richer history.

### 3) Dashboard as Control Center

1. Real-time cycle summary cards.
2. Countdown panel for next period and ovulation.
3. Cycle statistics and smart insight panel.
4. Myth of the day block with source attribution.
5. Period-end confirmation prompt for ongoing cycles.

### 4) Interactive Calendar with Day-Level Logging

1. Predicted phase and event overlays.
2. Logged period state overlays (ongoing/completed).
3. Day panel for quick mood and symptom logging.
4. Actions to mark period start/end directly from calendar.
5. Tooltips and indicators for mood and symptom visibility.

### 5) Nutrition Intelligence

1. Phase-specific nutrition recommendations.
2. Symptom-specific food/nutrient enrichment.
3. Personalization rules using user state (energy, sleep, lifestyle).
4. Allergy-based filtering.
5. USDA API enrichment for calories/protein/carbs/fat.
6. Graceful fallback if external nutrition data is unavailable.

### 6) Mood Tracking and Analytics

1. Structured mood logging with intensity and phase context.
2. Trend chart for emotional pattern visualization.
3. Backend mood analysis for:
	- dominant mood
	- phase patterns
	- suggestions
	- alert signals
4. Chat-context handoff from latest mood state.

### 7) Symptom Checker and Trends

1. Frontend symptom analysis with risk and severity labels.
2. Symptom insights and self-care suggestions.
3. Trend persistence with frequency and pain trend summaries.
4. Chat-context handoff from symptom analysis.

### 8) Education Module (Myths vs Facts)

1. Category-based myth exploration.
2. Personalized myth retrieval using phase and symptom context.
3. Flip-card learning mode.
4. Quiz mode with score tracking.
5. User feedback actions (believed/helpful) with backend capture.

### 9) Chatbot with Safety and Hybrid Intelligence

1. Intent detection and rule-based response pipeline.
2. Myth-education routing for misinformation questions.
3. Medical safety response guardrails.
4. Gemini fallback for general conversations.
5. Conversation memory and call-limiting behavior.
6. Mood-aware empathy prefixing.

## Architecture Summary

1. Frontend: React + Vite with Framer Motion/GSAP/Chart.js.
2. Backend: Node.js + Express with feature-based routes/controllers/services.
3. Database: PostgreSQL with normalized tables for users, cycles, logs, moods, and symptoms.
4. Integrations: USDA API and optional Gemini API.

Data flow follows:

1. UI interaction
2. API utility call
3. route
4. controller validation/orchestration
5. service or model
6. database or external API
7. normalized response back to UI

## Key Engineering Decisions

1. Complete cycles only for adaptive cycle learning:
Reason: avoids prediction distortion from incomplete ongoing periods.
2. Dual route mount strategy (`/api/*` and plain routes):
Reason: improved compatibility during frontend/backend integration.
3. Separation of concerns:
Reason: routes/controllers/services/models are split for maintainability and easier scaling.
4. LocalStorage context bridge for chatbot:
Reason: allows mood/symptom pages to enrich chat responses without forcing extra user input.
5. In-memory caches for fast iteration:
Reason: simple and fast for development while keeping architecture extensible.

## Safety, Privacy, and Data Handling

1. JWT authentication on protected data routes.
2. Input validation on server-side controllers.
3. Parameterized SQL queries to reduce injection risk.
4. Chat safety layer to avoid medical diagnosis behavior.
5. Mixed persistence model:
	- durable in PostgreSQL
	- contextual helper state in local storage/in-memory services

## Known Limitations (Honest Scope Boundaries)

1. Some supportive state is in-memory and resets on backend restart (chat memory, myth feedback counters, USDA cache).
2. Symptoms page currently performs primary analysis locally in frontend flow.
3. No full production observability stack yet (centralized logs/metrics/tracing).
4. No request rate limiting layer yet.

## Future Enhancements

1. Persist chat memory and myth feedback in database.
2. Add notification/reminder engine.
3. Add clinician-safe escalation flow for high-risk symptom patterns.
4. Add export/report PDF for user history.
5. Add automated test suites and CI quality gates.
6. Add deployment pipeline and environment profiles (dev/staging/prod).

## Instructor Demo Script

Use this sequence to present clearly in class or viva:

1. Start with problem and objective in 30 seconds.
2. Show signup and login.
3. Open dashboard and explain cycle summary cards.
4. Open calendar panel and log mood/symptoms for a date.
5. Mark period start/end and show prediction refresh.
6. Open Cycle Tracker and submit historical dates to show adaptive prediction.
7. Open Nutrition and show phase + symptom based suggestions with USDA metrics.
8. Open Mood Tracker and show chart + backend insights.
9. Open Symptoms page and show severity/risk trend flow.
10. Open Education page and demo flip cards + quiz mode.
11. Open Chatbot and ask:
	- cycle question
	- nutrition question
	- myth question
	- medical-style question to show safety behavior
12. Close with architecture slide and known limitations/future plan.

## Viva Quick Answer Pack

If your instructor asks "What is unique in your project?", answer:

1. It is not just tracking; it combines tracking, prediction, education, and chatbot support in one connected workflow.
2. The chatbot uses real user context from mood and symptom flows.
3. Prediction quality is explained through confidence and regularity indicators.
4. The architecture is modular and ready for production hardening.

If your instructor asks "What did you personally build technically?", answer:

1. End-to-end integration from frontend pages to backend APIs and DB schema.
2. Feature modules for cycle, daily logs, mood, nutrition, myths, and chat.
3. Analyzer services and prediction utilities.
4. Error handling, fallback paths, and safety-first response strategy.

If your instructor asks "How can this be improved?", answer:

1. Persist ephemeral stores to DB.
2. Add testing and deployment automation.
3. Add notifications and richer clinical safety escalation.

## 1. Scope and Coverage

This document covers the canonical application in this workspace:

- Frontend: `sakhi/`
- Backend: `sakhi/sakhi-backend/`

This document intentionally excludes the duplicate top-level backend copy at `sakhi-backend/` (outside the frontend folder), because the active app wiring and conventions in this workspace target `sakhi/sakhi-backend/`.

## 2. System Architecture (High Level)

- UI layer: React + Vite single-page app in `src/`.
- API client layer: `src/utils/api.js` wraps all HTTP calls.
- API layer: Express app (`src/app.js`) with route modules by feature.
- Controller layer: input validation, request orchestration, response shaping.
- Domain service layer: chat intent/response logic, myth personalization, nutrition logic, analyzers.
- Data layer: PostgreSQL via `pg` pool in `src/config/db.js`.
- Persistence split:
- Durable: PostgreSQL tables (`users`, `cycle_history`, `daily_logs`, `symptom_entries`, `mood_entries`).
- Ephemeral in-memory: conversation memory, myth feedback counters, USDA cache.

## 3. Frontend Modules

### 3.1 Root/App Configuration

#### `index.html`
- Purpose: HTML shell and root DOM mount (`#root`) for React.
- Runtime contract: loads `src/main.jsx` via `<script type="module">`.
- App identity: page title `SAKHI - Women's Health Companion`.

#### `public/index.html`
- Purpose: static placeholder document in Vite public folder.
- Status: not the active app entrypoint (root `index.html` is used by Vite for SPA bootstrapping).
- Utility: useful as a visible note for contributors about public folder behavior.

#### `package.json`
- Purpose: frontend package metadata, scripts, dependency graph.
- Scripts: `dev`, `build`, `lint`, `preview`.
- Core dependencies: React 19, React Router 7, Framer Motion, GSAP, Chart.js stack.

#### `vite.config.js`
- Purpose: Vite build/dev config.
- Export: default Vite config with React plugin.
- Behavior: standard React HMR pipeline, no custom alias/proxy defined.

#### `eslint.config.js`
- Purpose: linting rules for JS/JSX.
- Key behavior:
- Uses `@eslint/js` + `eslint-plugin-react` + hooks + react-refresh rules.
- Ignores `dist` directory.
- Enforces `no-unused-vars` with `_` argument ignore pattern.

#### `README.md`
- Purpose: default Vite template notes.
- Status: generic scaffold content, not project-specific operational documentation.

### 3.2 Frontend Entry and Layout

#### `src/main.jsx`
- Purpose: bootstraps React app in `StrictMode`.
- Dependencies: `react`, `react-dom/client`, `App`, `index.css`.
- Output: renders `App` into `document.getElementById("root")`.

#### `src/index.css`
- Purpose: global design system and page-level styling.
- Key design tokens:
- CSS variables for palette (`--primary`, `--secondary`, `--accent`, etc.), spacing, shadows, radii.
- Global typography uses Manrope from Google Fonts.
- Includes styles for nav, forms, dashboard cards, calendar, chatbot, and responsive behavior.

#### `src/App.jsx`
- Purpose: root router, auth guards, shared layout and top navigation.
- Main modules inside file:
- `AppLayout`: sticky nav, "More" dropdown, route transition stage, animated backdrop control.
- `RequireAuth`: redirects unauthenticated users to `/`.
- `RedirectIfAuthenticated`: redirects logged-in users to `/dashboard`.
- Routes wired:
- Public: `/`, `/signup`.
- Protected: `/dashboard`, `/cycle`, `/nutrition`, `/symptoms`, `/education`, `/mood`, `/chatbot`.
- Dependencies: `react-router-dom`, Framer Motion, GSAP, auth utility.

### 3.3 Reusable Frontend Components

#### `src/components/AnimatedBackdrop.jsx`
- Purpose: decorative animated aurora background on non-login/non-dashboard routes.
- Behavior: GSAP animates 3 blobs with random translate/scale/rotate loops.
- Input/Output: no props; visual-only component.

#### `src/components/PageFrame.jsx`
- Purpose: common page wrapper with motion enter/exit transitions.
- Props:
- `children` (required)
- `className` (optional, default `page-shell`)
- Export: default `PageFrame` component.

#### `src/components/motionPresets.js`
- Purpose: reusable Framer Motion variants.
- Exports:
- `staggerParent`
- `staggerItem`
- Usage: shared animation choreography across pages/cards.

#### `src/components/CycleCalendar.jsx`
- Purpose: interactive cycle calendar embedded in dashboard.
- Core responsibilities:
- Render monthly 6x7 grid with phase/day metadata.
- Overlay predicted events (period, ovulation, fertile window).
- Overlay logged reality (ongoing/completed period, mood, symptoms from daily logs).
- Open per-day side panel for quick logging and insight display.
- API interactions:
- `getDailyLogs`, `getDailyLogForDate`, `addDailyLog`
- `addCycleEntry`, `markPeriodEnd`, `getCycleStatus`
- Props:
- `predictionData` (phase calendar and key dates)
- `cycleHistory`
- `onPredictionRangeRequest(range)` for visible calendar window
- `onCycleLogged(range)` callback after period start/end actions
- Local state includes:
- visible month, selected date, panel state, quick mood/symptom selections, loading flags, messages.

### 3.4 Frontend Data Modules

#### `src/data/mythsFactsData.js`
- Purpose: static myths/facts dataset (frontend-side reference data).
- Shape: array of objects with `id`, `myth`, `fact`, `category`, `source`, `difficulty`.
- Coverage: 25 entries across Menstruation, Nutrition, Hygiene, Exercise, Mental Health.

#### `src/data/nutritionData.json`
- Purpose: nutrition knowledge base by cycle phase and symptom.
- Shape:
- `phases.Menstrual/Follicular/Ovulation/Luteal`
- each phase has `general` and `symptoms` subsets.
- Used by both frontend engine (`src/utils/nutritionEngine.js`) and backend smart nutrition service.

### 3.5 Frontend Utility Modules

#### `src/utils/api.js`
- Purpose: central HTTP client wrapper.
- Base URL: `import.meta.env.VITE_API_BASE_URL` fallback `http://localhost:5000/api`.
- Internal helper: `request(path, { method, body, token })`.
- Exports:
- auth: `signupUser`, `loginUser`
- cycle: `addCycleEntry`, `getCycleHistory`, `getCycleStatus`, `markPeriodEnd`, `getPrediction`
- daily logs: `addDailyLog`, `getDailyLogs`, `getDailyLogForDate`
- mood: `addMoodEntry`, `getMoodEntries`
- nutrition: `getFoodNutrition`
- myths/chat: `getMyths`, `getRandomMyth`, `sendMythFeedback`, `sendChatMessage`
- Error contract: throws `Error(message)` from API response payload when `response.ok === false`.

#### `src/utils/auth.js`
- Purpose: local auth session persistence.
- Storage keys:
- `sakhi_auth_token`
- `sakhi_auth_user`
- Exports: `saveAuthSession`, `getAuthToken`, `getAuthUser`, `clearAuthSession`.

#### `src/utils/cycleUtils.js`
- Purpose: cycle data normalization, date helpers, phase label derivation.
- Exports:
- constants: `CYCLE_STORAGE_KEY`, `EMPTY_CYCLE_DATA`
- helpers: `parseInputDate`, `addDays`, `formatDisplayDate`, `getCurrentPhase`, `formatOvulationWindow`, `formatDateRange`
- persistence: `readCycleData`, `saveCycleData`
- Notes:
- stores normalized cycle prediction payload in localStorage.
- frontend phase labels can include `"... Phase"` suffix.

#### `src/utils/moodContext.js`
- Purpose: chat personalization context from mood tracker.
- Storage key: `sakhi_mood_chat_context`.
- Exports: `saveMoodChatContext`, `getMoodChatContext`, `clearMoodChatContext`.

#### `src/utils/symptomContext.js`
- Purpose: chat personalization context from symptoms checker.
- Storage key: `sakhi_symptom_chat_context`.
- Exports: `saveSymptomChatContext`, `getSymptomChatContext`, `clearSymptomChatContext`.

#### `src/utils/nutritionEngine.js`
- Purpose: client-side smart nutrition recommendation pipeline.
- Inputs:
- `phase`, selected `symptoms[]`, user fields (`energy`, `sleep`, `lifestyle`, `allergies`).
- Core behavior:
- phase alias normalization
- merge general + symptom foods/nutrients
- personalization enrichment (low energy/sleep/active lifestyle)
- allergen filtering
- grouped food reasoning generation
- Exports:
- `allergyMap`, `filterAllergies`, `personalizeFoods`, `getNutrition`, `getSymptomOptionsForPhase`, `getSmartNutrition`.

### 3.6 Frontend Page Modules

#### `src/pages/Login.jsx`
- Purpose: user login form and token session creation.
- Validation: non-empty password + email format.
- API call: `loginUser`.
- Success behavior: `saveAuthSession` then navigate to `/dashboard`.

#### `src/pages/Signup.jsx`
- Purpose: user registration form.
- Validation: name/email/password required with email format check.
- API call: `signupUser`.
- Success behavior: navigate to `/` (login).

#### `src/pages/Dashboard.jsx`
- Purpose: central home dashboard and cycle intelligence hub.
- Main responsibilities:
- refresh prediction and cycle history
- refresh ongoing period status and period-end prompt logic
- load/cached "Myth of the Day"
- render summary cards, countdowns, statistics, smart insights
- host `CycleCalendar`
- APIs used: `getPrediction`, `getCycleHistory`, `getCycleStatus`, `markPeriodEnd`, `getRandomMyth`.
- Local storage interactions:
- cycle cache (`cycleUtils`)
- myth-of-day cache key
- period prompt suppression key

#### `src/pages/CycleTracker.jsx`
- Purpose: explicit cycle input and prediction page.
- Input modes:
- single date (+ optional cycle length)
- multiple historical period start dates
- API sequence:
- `addCycleEntry` -> `getPrediction` -> `getCycleHistory`
- Writes normalized prediction payload to local storage via `saveCycleData`.

#### `src/pages/Nutrition.jsx`
- Purpose: personalized nutrition recommendations + USDA metrics.
- Data sources:
- local recommendation engine (`getSmartNutrition`)
- external nutrition enrichment (`getFoodNutrition` API)
- Behavior:
- symptom filters constrained by current phase options
- lazy loads USDA data for foods missing in local cache state
- displays nutrient cards (calories/protein/carbs/fat)

#### `src/pages/MoodTracker.jsx`
- Purpose: mood logging, trend visualization, and mood insights.
- APIs used: `addMoodEntry`, `getMoodEntries`.
- Chart stack: `chart.js` + `react-chartjs-2` line chart.
- Tracks and forwards latest mood context to chatbot via `saveMoodChatContext`.
- Displays backend-provided analysis:
- dominant mood
- mood frequency
- suggestions
- alerts
- phase insights
- personalized insights

#### `src/pages/Symptoms.jsx`
- Purpose: local symptom checker and trend tracker.
- Important implementation note:
- This page currently does not call backend symptom APIs.
- It computes risk/severity/suggestions on the frontend and stores trend history locally.
- Data persistence:
- local trend entries key `sakhi_symptom_trend_entries`
- chat context via `saveSymptomChatContext`
- Outputs:
- selected symptom tags, severity/risk badges, warnings, insights/suggestions, frequency bars, pain trend chart.

#### `src/pages/Education.jsx`
- Purpose: myths/facts education experience (cards + quiz mode).
- APIs used: `getMyths`, `sendMythFeedback`.
- Personalization context built from:
- symptom context (from `symptomContext`)
- cycle phase (from `cycleUtils`)
- Features:
- category tabs, text search, flip cards, quiz scoring, local feedback persistence, optional backend feedback sync.

#### `src/pages/Chatbot.jsx`
- Purpose: conversational assistant interface.
- API used: `sendChatMessage`.
- Context sent to backend:
- merged symptom + mood contexts
- session id generated client-side (UUID fallback)
- UX:
- quick suggestion chips, animated message list, typing indicator, error fallback message.

## 4. Backend Modules

### 4.1 Backend Package, API Examples, Schema

#### `sakhi-backend/package.json`
- Purpose: backend runtime scripts/dependencies.
- Scripts: `dev` (nodemon), `start` (node), `test` placeholder.
- Core libraries: express, pg, bcrypt, jsonwebtoken, axios, dotenv, Google Generative AI SDK.

#### `sakhi-backend/API_EXAMPLES.md`
- Purpose: human-readable sample payloads and responses for main endpoints.
- Covers: signup/login/cycle/daily logs/prediction/symptoms.
- Includes note on dual route styles (plain and namespaced).

#### `sakhi-backend/sql/schema.sql`
- Purpose: DDL and migration-safe setup script.
- Tables:
- `users`
- `cycle_history`
- `daily_logs`
- `symptom_entries`
- `mood_entries`
- Includes:
- `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` upgrades
- integrity checks and constraints
- indexes for date and phase filtering
- period-state normalization updates for historical rows.

### 4.2 Backend Entry and App Wiring

#### `sakhi-backend/src/server.js`
- Purpose: backend entrypoint and HTTP listener.
- Behavior: loads env, imports app, listens on `PORT || 5000`.

#### `sakhi-backend/src/app.js`
- Purpose: Express app composition.
- Middleware: CORS (from `CORS_ORIGIN` split list or permissive), JSON parser.
- Health endpoint: `GET /api/health`.
- Route mounting:
- Plain mounts: `/`, `/cycle`, `/daily-logs`, `/mood`, `/symptoms`, `/nutrition`, `/prediction`.
- Namespaced mounts: `/api/auth`, `/api/chat`, `/api/cycle`, `/api/daily-logs`, `/api/mood`, `/api/symptoms`, `/api/myths`, `/api/nutrition`, `/api/prediction`.
- Final handlers: 404 JSON and generic 500 JSON.

#### `sakhi-backend/src/config/db.js`
- Purpose: PostgreSQL connection pool config.
- Env keys: `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`.
- Exports: `pool`.

#### `sakhi-backend/src/middleware/authMiddleware.js`
- Purpose: JWT bearer auth guard.
- Input: `Authorization: Bearer <token>`.
- Output:
- on success sets `req.user = { userId, email }`
- on failure returns `401` with token error message.

### 4.3 Backend Route Modules

#### `sakhi-backend/src/routes/authRoutes.js`
- Purpose: auth endpoint registration.
- Endpoints: `POST /signup`, `POST /login`.

#### `sakhi-backend/src/routes/chatRoutes.js`
- Purpose: chat endpoint registration.
- Endpoint: `POST /`.
- Auth: no `authMiddleware` at route level (optional user identity is handled in controller context).

#### `sakhi-backend/src/routes/cycleRoutes.js`
- Purpose: cycle endpoints + auth guard.
- Middleware: `router.use(authMiddleware)`.
- Endpoints: `POST /`, `PATCH /end`, `GET /status`, `GET /`.

#### `sakhi-backend/src/routes/dailyLogRoutes.js`
- Purpose: daily log endpoints + auth guard.
- Endpoints: `POST /`, `GET /`.

#### `sakhi-backend/src/routes/moodRoutes.js`
- Purpose: mood endpoints + auth guard.
- Endpoints: `POST /`, `GET /`.

#### `sakhi-backend/src/routes/mythsRoutes.js`
- Purpose: myth education and feedback endpoints.
- Endpoints: `POST /feedback`, `GET /random`, `GET /`.

#### `sakhi-backend/src/routes/nutritionRoutes.js`
- Purpose: external nutrition lookup endpoint.
- Endpoint: `GET /:food`.

#### `sakhi-backend/src/routes/predictionRoutes.js`
- Purpose: cycle prediction endpoint + auth guard.
- Endpoint: `GET /`.

#### `sakhi-backend/src/routes/symptomRoutes.js`
- Purpose: symptom entry/list endpoints + auth guard.
- Endpoints: `POST /`, `GET /`.

### 4.4 Backend Controller Modules

#### `sakhi-backend/src/controllers/authController.js`
- Purpose: signup and login workflows.
- Exports: `signup`, `login`.
- Key behavior:
- validation of required fields and optional numerics.
- password hashing with bcrypt (`SALT_ROUNDS = 10`).
- JWT generation (`7d`) with fallback dev secret.
- Uses `userModel` for DB access.

#### `sakhi-backend/src/controllers/chatController.js`
- Purpose: chat request orchestration.
- Export: `postChatMessage`.
- Conversation key resolution order:
- authenticated user id
- body `sessionId`
- header `x-session-id`
- request IP fallback
- Pipeline:
- fetch memory -> build context -> hybrid response -> update memory -> return intent/reply/context/memory summary.

#### `sakhi-backend/src/controllers/cycleController.js`
- Purpose: cycle data CRUD-like operations + prediction linkage.
- Exports: `addCycleEntry`, `markPeriodEnd`, `getCycleStatus`, `getCycleHistory`.
- `addCycleEntry` supports:
- single or multiple period start dates
- optional cycle length and flow intensity
- upsert semantics on `(user_id, period_start_date)`
- auto-detect input method label and return adaptive prediction payload
- `markPeriodEnd`:
- finds latest ongoing cycle (or specific provided start)
- validates end date and updates entry
- recalculates/returns prediction
- `getCycleStatus`: returns ongoing period status and `shouldPrompt` flag.
- `getCycleHistory`: returns descending mapped entries.

#### `sakhi-backend/src/controllers/dailyLogController.js`
- Purpose: write/read daily wellness log rows.
- Exports: `addDailyLog`, `getDailyLogs`.
- Validation:
- date, bounded integer scales, booleans, numeric ranges.
- Upsert behavior on `(user_id, log_date)` using COALESCE update pattern.

#### `sakhi-backend/src/controllers/moodController.js`
- Purpose: mood entry write/read with analytics.
- Exports: `addMoodEntry`, `getMoodEntries`.
- Behavior:
- strict validation of mood/intensity/cycleDay/phase/note.
- after insert, loads history and computes analysis via `moodAnalyzer`.
- GET returns both `entries` and `analysis`.

#### `sakhi-backend/src/controllers/mythsController.js`
- Purpose: myths retrieval, random myth, and feedback ingestion.
- Exports: `getMyths`, `getRandomMythEntry`, `addMythFeedback`.
- Validation:
- category normalization and allowed set enforcement.
- feedback type restrictions (`believed`, `helpful`).

#### `sakhi-backend/src/controllers/nutritionController.js`
- Purpose: HTTP wrapper over USDA service.
- Export: `getNutritionByFood`.
- Behavior: validates `food` param, calls service, maps failures to `503 Nutrition data unavailable`.

#### `sakhi-backend/src/controllers/predictionController.js`
- Purpose: cycle prediction endpoint.
- Export: `getPrediction`.
- Behavior:
- reads ordered cycle rows
- uses only completed cycles (`period_start_date` + `period_end_date`) for adaptive learning
- resolves default cycle length from query or stored data
- delegates to `buildPrediction` utility
- returns guidance message for sparse/partial data states.

#### `sakhi-backend/src/controllers/symptomController.js`
- Purpose: symptom entry write/read with analysis.
- Exports: `addSymptomEntry`, `getSymptomEntries`.
- Validation:
- date, cycle day, phase, pain range, flow/mood/activity enums, symptom whitelist, sleep range.
- Behavior:
- on insert computes `analysis` and `suggestions` using symptom analyzer + suggestion service.

### 4.5 Backend Model Modules

#### `sakhi-backend/src/models/userModel.js`
- Purpose: user table queries.
- Exports: `findUserByEmail`, `createUser`.
- Contract: returns DB row objects mapped by SQL `RETURNING` fields.

#### `sakhi-backend/src/models/moodEntryModel.js`
- Purpose: mood_entries DB interaction and mapping.
- Exports: `createMoodEntry`, `listMoodEntries`.
- Features:
- optional filters (`from`, `to`, `phase`)
- bounded limit (1..365)
- maps snake_case DB fields to camelCase API shape.

#### `sakhi-backend/src/models/symptomEntryModel.js`
- Purpose: symptom_entries DB interaction and mapping.
- Exports: `createSymptomEntry`, `listSymptomEntries`.
- Features mirror mood model:
- optional range/phase filters
- bounded limit
- shape normalization for response payloads.

### 4.6 Backend Service Modules

#### `sakhi-backend/src/services/intentService.js`
- Purpose: keyword-based intent detection for chat.
- Export: `detectIntent`.
- Intents: `pain`, `mood`, `cycle`, `nutrition`, `greeting`, fallback `general`.

#### `sakhi-backend/src/services/contextService.js`
- Purpose: normalize and merge user context + conversation history.
- Export: `buildContext`.
- Output contract:
- `phase`, `symptoms`, `lifestyle`, mood metadata, symptom analysis summary.
- history with messages and last detected intent.

#### `sakhi-backend/src/services/conversationMemoryService.js`
- Purpose: in-memory conversation state per conversation key.
- Exports:
- `getConversationMemory`, `updateConversationMemory`, `getGeminiCallCount`, `incrementGeminiCallCount`.
- Limits:
- max 5 remembered messages per key.
- no persistence across process restart.

#### `sakhi-backend/src/services/geminiFallback.js`
- Purpose: AI fallback response generator (Gemini).
- Export: `getGeminiResponse`.
- Behavior:
- no-op fallback response when API key missing/placeholder.
- constrains output to short 2-3 lines.
- includes context-aware prompt pieces (phase, symptoms, top suggestion).

#### `sakhi-backend/src/services/aiFallback.js`
- Purpose: combined safety + Gemini fallback wrapper.
- Export: `getFallbackResponse`.
- Behavior:
- returns fixed medical safety response for medical-query patterns.
- otherwise delegates to Gemini fallback.
- Integration note: currently not called by other backend modules.

#### `sakhi-backend/src/services/safetyService.js`
- Purpose: medical safety guardrail pattern matching.
- Exports: `MEDICAL_SAFETY_RESPONSE`, `shouldUseMedicalSafetyResponse`.
- Trigger set includes diagnosis/medicine/treatment/prescription terms.

#### `sakhi-backend/src/services/mythsService.js`
- Purpose: myth dataset provider + personalization + education matching + feedback counters.
- Exports:
- category and dataset helpers
- personalization and question matching
- random selection and feedback submission
- Key behavior:
- static in-file myth dataset (mirrors frontend myths data set)
- symptom/phase weighted scoring for personalized list order
- in-memory feedback totals by myth id (`believed`, `helpful`).

#### `sakhi-backend/src/services/hybridChatService.js`
- Purpose: orchestrates chat reply strategy.
- Export: `getHybridChatResponse`.
- Decision order:
- safety override
- myth education detection
- rule-based intent response
- symptom-aware general handling
- fallback to Gemini with per-conversation call limit
- Adds empathy prefix when latest mood context is `sad`.

#### `sakhi-backend/src/services/responseService.js`
- Purpose: rule-based natural-language response builders.
- Export: `generateResponse`.
- Provides intent-specific response templates for:
- pain, mood, cycle, nutrition, greeting, general.
- Includes:
- symptom-aware reply generation
- phase expectation statements
- nutrition guidance composition from smart nutrition service
- mandatory safety note appended (except greeting path).

#### `sakhi-backend/src/services/smartNutritionService.js`
- Purpose: backend-side nutrition reasoning engine.
- Export: `getSmartNutrition`.
- Implementation notes:
- loads JSON from frontend data file path (`../../../src/data/nutritionData.json`).
- mirrors frontend nutrition engine logic (phase normalization, personalization, allergy filter, grouped reasons).

#### `sakhi-backend/src/services/moodAnalyzer.js`
- Purpose: derive mood analytics from mood entry history.
- Export: `analyzeMood`.
- Output includes:
- dominant mood, mood frequency, suggestions, pattern flags, phase mood frequency, phase insights, alerts, personalized insights.
- Alert examples: repeated low mood / repeated anxiety.

#### `sakhi-backend/src/services/symptomSuggestionService.js`
- Purpose: map symptom set to self-care suggestion strings.
- Export: `buildSymptomSuggestions`.
- Uses symptom-specific suggestion map with fallback generic guidance.

#### `sakhi-backend/src/services/symptomAnalyzer.js`
- Purpose: symptom risk/severity and insight engine.
- Export: `analyzeSymptoms`.
- Key behavior:
- phase-aware expected-vs-attention insights
- risk tiering (`low`, `medium`, `high`) including red flags
- personalized pattern detection from historical cycle-day similarity
- combines with suggestion service output.

#### `sakhi-backend/src/services/usdaService.js`
- Purpose: external USDA nutrition integration.
- Export: `getFoodNutrition`.
- Features:
- 10s timeout
- in-memory cache (20 min TTL)
- in-flight deduplication for concurrent requests by food key
- normalized nutrient extraction (calories/protein/carbs/fat)
- requires `USDA_API_KEY`.

### 4.7 Backend Utility Modules

#### `sakhi-backend/src/utils/predictionUtils.js`
- Purpose: cycle prediction math and phase calendar generation.
- Exports:
- sorting/stats helpers
- confidence and variation computations
- phase day determination
- calendar range generator
- main `buildPrediction`
- Core prediction outputs:
- `latestPeriodDate`, `nextPeriodDate`, `ovulationDate`, fertile window bounds
- `currentPhase`, `currentDay`, `ovulationDay`
- `cycleLengthUsed`, `confidenceLevel`, `irregularityFlag`, `variation`, `cycleCount`
- `isApproximatePrediction`, `predictionMode`, `phaseCalendar[]`.

## 5. Environment Variables

### Frontend (`sakhi/.env` if present)

- `VITE_API_BASE_URL`: API base URL consumed by `src/utils/api.js`.

### Backend (`sakhi/sakhi-backend/.env`)

- `PORT`
- `CORS_ORIGIN`
- `DB_HOST`
- `DB_PORT`
- `DB_USER`
- `DB_PASSWORD`
- `DB_NAME`
- `JWT_SECRET`
- `GEMINI_API_KEY`
- `USDA_API_KEY`
- `GEMINI_SESSION_CALL_LIMIT`

## 6. End-to-End Module Flows

### 6.1 Login Flow

1. `src/pages/Login.jsx` validates form.
2. `src/utils/api.js -> loginUser` calls `POST /api/auth/login`.
3. `authRoutes -> authController.login -> userModel.findUserByEmail`.
4. JWT + user payload returned.
5. `src/utils/auth.js` stores token/user; router transitions to dashboard.

### 6.2 Cycle Update Flow (Calendar)

1. `src/components/CycleCalendar.jsx` marks period start/end.
2. API calls: `addCycleEntry` or `markPeriodEnd`.
3. `cycleRoutes -> cycleController` updates `cycle_history`.
4. Controller recomputes prediction via `predictionUtils.buildPrediction`.
5. Dashboard refresh callbacks update summary and visible calendar range.

### 6.3 Mood Insight Flow

1. `src/pages/MoodTracker.jsx` posts mood entry.
2. `moodController.addMoodEntry` writes via `moodEntryModel`.
3. Controller recalculates analytics with `moodAnalyzer.analyzeMood`.
4. Response returns `entry + analysis`; UI updates chart/history/insights.
5. Latest mood context is persisted for chatbot personalization.

### 6.4 Education Flow

1. `src/pages/Education.jsx` resolves personalization context (phase + symptoms).
2. Calls `getMyths(category, { phase, symptoms })`.
3. `mythsController -> mythsService.getPersonalizedMyths` returns ranked myths.
4. Optional feedback (`sendMythFeedback`) updates backend in-memory counters.

### 6.5 Chat Flow

1. `src/pages/Chatbot.jsx` builds payload with text + session + merged contexts.
2. `chatController` resolves conversation key and builds normalized context.
3. `hybridChatService` selects safety/rule-based/myth/Gemini path.
4. Memory updated in `conversationMemoryService`.
5. Reply and metadata returned to UI.

## 7. Important Implementation Notes

- Duplicate backend directories exist in workspace; active canonical backend here is `sakhi/sakhi-backend`.
- Backend `app.js` exposes both plain and `/api/*` route styles.
- `src/pages/Symptoms.jsx` is currently frontend-local analysis and does not use backend symptom endpoints.
- Chat memory, myth feedback counts, and USDA cache are in-memory only and reset on backend restart.
- `aiFallback.js` exists but is not currently integrated into route/controller flow.
