# SAKHI - Menstrual Health Companion

SAKHI is a full-stack menstrual wellness platform that combines cycle tracking, prediction, nutrition guidance, mood/symptom monitoring, myth education, and chatbot support in one connected workflow.

This repository contains:

1. Frontend application (React + Vite): `sakhi/`
2. Backend API (Node.js + Express + PostgreSQL): `sakhi/sakhi-backend/`

## Why This Project

Many users track cycle dates, symptoms, nutrition, and emotional patterns in separate places. SAKHI centralizes these journeys and uses context-aware logic to provide better day-to-day support.

## Core Features

1. Authentication and secure session handling
2. Adaptive cycle tracking and prediction
3. Dashboard with cycle summary, countdown, and insights
4. Interactive calendar with quick day-level logging
5. Phase and symptom-aware nutrition guidance
6. Mood tracking with trend analytics and insights
7. Symptom checker with risk/severity and trends
8. Myths vs facts education with quiz mode
9. Context-aware support chatbot with safety guardrails

## Tech Stack

Frontend:

1. React 19
2. Vite
3. React Router
4. Framer Motion + GSAP
5. Chart.js + react-chartjs-2

Backend:

1. Node.js
2. Express
3. PostgreSQL (pg)
4. JWT auth + bcrypt
5. Axios
6. Google Generative AI SDK (Gemini fallback)

## Architecture Overview

1. UI actions trigger API calls from `src/utils/api.js`
2. Express routes map requests to controllers
3. Controllers validate and orchestrate logic
4. Services handle domain behavior (prediction, chat, analyzers)
5. Models and DB utilities persist/retrieve data
6. Responses are normalized and rendered by frontend pages/components

Persistence model:

1. Durable: PostgreSQL tables (users, cycle, logs, mood, symptoms)
2. Ephemeral: in-memory chat memory, myth feedback counters, USDA cache

## Project Structure

```text
sakhi/
	src/                      # Frontend pages, components, utils
	public/
	package.json
	PROJECT_MODULE_DOCUMENTATION.md
	USER_MANUAL.md
	sakhi-backend/
		src/
			routes/
			controllers/
			services/
			models/
			middleware/
			config/
			utils/
		sql/schema.sql
		API_EXAMPLES.md
		package.json
```

## Setup Guide

## 1) Install Dependencies

Frontend:

```bash
cd sakhi
npm install
```

Backend:

```bash
cd sakhi/sakhi-backend
npm install
```

## 2) Configure PostgreSQL

1. Create a database (default name expected by backend: `sakhi`)
2. Execute schema:

```bash
psql -U <your_user> -d sakhi -f sakhi/sakhi-backend/sql/schema.sql
```

## 3) Create Backend .env

Create `sakhi/sakhi-backend/.env`:

```env
PORT=5000
CORS_ORIGIN=http://localhost:5173

DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=your_password
DB_NAME=sakhi

JWT_SECRET=your_jwt_secret

USDA_API_KEY=your_usda_api_key
GEMINI_API_KEY=your_gemini_api_key
GEMINI_SESSION_CALL_LIMIT=8
```

Optional frontend .env (`sakhi/.env`):

```env
VITE_API_BASE_URL=http://localhost:5000/api
```

## 4) Run the App

Start backend:

```bash
cd sakhi/sakhi-backend
npm run dev
```

Start frontend:

```bash
cd sakhi
npm run dev
```

Open:

1. Frontend: http://localhost:5173
2. Backend: http://localhost:5000
3. Health check: http://localhost:5000/api/health

## Scripts

Frontend (`sakhi/package.json`):

1. `npm run dev` - start Vite dev server
2. `npm run build` - production build
3. `npm run preview` - preview build
4. `npm run lint` - run ESLint

Backend (`sakhi/sakhi-backend/package.json`):

1. `npm run dev` - start backend with nodemon
2. `npm start` - start backend with node

## API Surface (High Level)

Main namespaced endpoints:

1. `/api/auth/*`
2. `/api/cycle/*`
3. `/api/daily-logs/*`
4. `/api/mood/*`
5. `/api/symptoms/*`
6. `/api/myths/*`
7. `/api/nutrition/*`
8. `/api/chat/*`
9. `/api/prediction/*`

Detailed request/response samples: `sakhi/sakhi-backend/API_EXAMPLES.md`.

## Instructor Demo Flow

Suggested live demo order:

1. Signup/login
2. Dashboard summary
3. Calendar quick logging
4. Cycle tracker prediction refresh
5. Nutrition recommendations
6. Mood tracker analytics
7. Symptoms checker trends
8. Education (cards + quiz)
9. Chatbot with cycle/nutrition/myth/safety queries

## Documentation Index

1. Full instructor + technical documentation: `PROJECT_MODULE_DOCUMENTATION.md`
2. End-user manual: `USER_MANUAL.md`
3. Backend API examples: `sakhi-backend/API_EXAMPLES.md`

## Known Limitations

1. In-memory stores reset when backend restarts (chat memory, myth feedback counters, USDA cache)
2. Symptoms page currently performs primary analysis in frontend flow
3. No production-grade observability and rate limiting yet

## Future Improvements

1. Persist ephemeral stores into PostgreSQL
2. Add automated tests and CI checks
3. Add notification and reminder engine
4. Add deployment profiles for dev/staging/prod
