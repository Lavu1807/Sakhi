# SAKHI User Manual

Version: April 13, 2026
Audience: End users, testers, demo reviewers, and support teams

## 1. What This Manual Covers

This manual explains how to use every user-facing feature in the SAKHI app in detail.

It includes:

1. Setup and first run
2. Signup and login
3. Every page and feature flow
4. Data saved locally vs data saved in database
5. Error handling and troubleshooting
6. Daily usage best practices

## 2. Application Overview

SAKHI is a menstrual wellness companion with these primary feature areas:

1. Account and session management
2. Dashboard and cycle summary
3. Cycle tracking and prediction
4. Calendar-based day logging
5. Nutrition guidance by phase and symptoms
6. Mood tracking and insights
7. Symptom checking and trend tracking
8. Myth vs fact education and quiz
9. Context-aware support chatbot

## 3. System Requirements and First Run

## 3.1 Prerequisites

Install the following on your machine:

1. Node.js and npm
2. PostgreSQL
3. Internet access for USDA nutrition lookup and optional Gemini fallback

## 3.2 Database Setup

1. Create a PostgreSQL database named sakhi (or any name you choose).
2. Run schema from sakhi/sakhi-backend/sql/schema.sql.
3. Confirm tables are created:
- users
- cycle_history
- daily_logs
- symptom_entries
- mood_entries

## 3.3 Backend Environment Setup

Create a .env file inside sakhi/sakhi-backend with at least:

1. PORT
2. CORS_ORIGIN
3. DB_HOST
4. DB_PORT
5. DB_USER
6. DB_PASSWORD
7. DB_NAME
8. JWT_SECRET
9. USDA_API_KEY (for nutrition API results)
10. GEMINI_API_KEY (optional, for AI fallback)
11. GEMINI_SESSION_CALL_LIMIT (optional)

## 3.4 Start Backend

From sakhi/sakhi-backend:

1. Run npm install
2. Run npm run dev
3. Confirm backend starts at http://localhost:5000

## 3.5 Start Frontend

From sakhi:

1. Run npm install
2. Run npm run dev
3. Open http://localhost:5173

## 4. Access, Authentication, and Navigation

## 4.1 Public Routes

1. Login page: /
2. Signup page: /signup

## 4.2 Protected Routes

Accessible only after login:

1. /dashboard
2. /cycle
3. /nutrition
4. /chatbot
5. /symptoms
6. /mood
7. /education

## 4.3 Session Behavior

1. On successful login, token and user profile are stored in local browser storage.
2. If token is missing or invalid, protected pages redirect back to login.
3. Logout clears local session and redirects to login.

## 4.4 Top Navigation Behavior

1. On login page, top navigation is hidden.
2. After login, top navigation appears.
3. Main quick links: Dashboard, Cycle, Nutrition, Chatbot.
4. More dropdown includes: Symptoms, Mood, Education.

## 5. Signup Feature (Create Account)

Page: /signup

## 5.1 Inputs

1. Name (required)
2. Email (required)
3. Password (required)

## 5.2 Validation Rules

1. Name cannot be empty.
2. Email must match valid email format.
3. Password cannot be empty.

## 5.3 User Steps

1. Open Signup.
2. Fill all fields.
3. Click Register.
4. On success, app redirects to Login.

## 5.4 Common Errors

1. Invalid email format
2. Empty name or password
3. Email already exists (backend conflict)

## 6. Login Feature

Page: /

## 6.1 Inputs

1. Email
2. Password

## 6.2 Validation Rules

1. Email is required and must be valid format.
2. Password is required.

## 6.3 User Steps

1. Enter email and password.
2. Click Continue.
3. On success, app opens Dashboard.

## 6.4 Common Errors

1. Invalid email format
2. Empty password
3. Invalid email or password
4. Expired or broken backend session

## 7. Dashboard Feature Guide

Page: /dashboard

The Dashboard is the command center of the app.

## 7.1 Main Sections

1. Welcome header and user greeting
2. Cycle summary cards
3. Myth of the Day
4. Countdown section
5. Cycle statistics
6. Interactive cycle calendar
7. Smart insights
8. Quick action buttons

## 7.2 Cycle Summary Cards Explained

Cards can include:

1. Current Phase
2. Next Period
3. Ovulation Day
4. Fertile Window
5. Confidence
6. Day In Cycle
7. Cycle Pattern

How to interpret:

1. Confidence grows with better cycle history.
2. Cycle pattern may show regular or irregular behavior.
3. If little data exists, values may show placeholders.

## 7.3 Myth of the Day

1. Dashboard loads one myth/fact daily.
2. Item is cached for that day in local browser storage.
3. Shows myth text, fact text, source, and category.

## 7.4 Countdown Panel

1. Shows days until next period.
2. Shows days until ovulation.
3. If date has passed or missing, text reflects unavailable status.

## 7.5 Cycle Statistics Panel

Shows:

1. Average cycle length
2. Total cycles recorded
3. Last cycle length
4. Variation in cycle length

## 7.6 Period End Prompt

When an ongoing period exists, Dashboard can show a prompt:

1. Question: Has your period ended?
2. Options:
- Yes, mark it ended
- No, still ongoing
3. If dismissed, prompt can be suppressed for the day.

## 7.7 Quick Actions

Buttons can navigate to:

1. Track Cycle
2. Nutrition
3. Mood Tracker
4. Chat Support
5. Logout

## 8. Cycle Tracker Feature Guide

Page: /cycle

Cycle Tracker supports multiple input styles for prediction.

## 8.1 Input Methods Supported

1. Last period start date only
2. Last period start date plus cycle length
3. Multiple past period start dates
4. Calendar logging from Dashboard (alternative path)

## 8.2 Input Fields

1. Last Period Date (date picker)
2. Past Period Start Dates (textarea)
3. Cycle Length in days (number)

## 8.3 Validation Rules

1. Must provide either:
- last period date
or
- at least 2 valid past dates
2. Cycle length, if provided, must be positive number.
3. Date format expected: YYYY-MM-DD.

## 8.4 How to Use

1. Enter your preferred data format.
2. Click Save and Predict.
3. App sends data to backend and fetches prediction.
4. Results panel appears with prediction metrics.

## 8.5 Output Fields Explained

1. Next Period Date
2. Ovulation Date
3. Fertile Window
4. Current Phase
5. Current Day
6. Ovulation Day
7. Confidence
8. Cycle Pattern
9. Input Mode
10. Prediction Type (Adaptive or Approximate)
11. Phase Message

## 8.6 Saved Entries Section

1. Shows latest cycle history entries.
2. Most recent entries are shown first.

## 8.7 Why Approximate Prediction Appears

Approximate prediction appears when adaptive learning data is still limited.

## 9. Calendar Feature Guide (Inside Dashboard)

Component location: Dashboard calendar card

This calendar is one of the richest features in SAKHI.

## 9.1 Calendar Visual Layers

1. Predicted phase background coloring
2. Predicted event markers:
- Next period
- Ovulation
- Fertile window
3. Logged period state markers:
- Ongoing period
- Completed period
4. Daily indicators:
- Mood emoji
- Symptom icons

## 9.2 Month Navigation

1. Use previous and next buttons to change month.
2. Calendar requests prediction range for visible month grid.

## 9.3 Day Selection

1. Click any day cell.
2. Day details panel opens.
3. Panel shows cycle day, phase, mood, symptoms.

## 9.4 Quick Mood Log in Day Panel

1. Select one mood from quick buttons.
2. Click Save Mood.
3. Daily log updates instantly for selected date.
4. Mood context also updates for chatbot support.

## 9.5 Quick Symptom Log in Day Panel

1. Toggle one or more symptom chips.
2. Click Save Symptoms.
3. Daily log updates instantly for selected date.

## 9.6 Mark Period Start

1. Open day panel on intended start date.
2. Click Mark Period Start.
3. System updates cycle history and refreshes prediction.

## 9.7 Mark Period End

Rules:

1. An ongoing period must exist.
2. Selected date must be on or after that ongoing period start date.

Steps:

1. Open valid day.
2. Click Mark Period End.
3. Prediction refreshes with updated cycle state.

## 9.8 Day Insights in Panel

Panel also shows:

1. Phase insight text
2. Historical pattern note
3. Approximate prediction note when relevant

## 10. Nutrition Guidance Feature Guide

Page: /nutrition

Nutrition combines phase-aware recommendations and external food metrics.

## 10.1 Data Sources

1. Internal smart nutrition engine based on cycle phase and symptoms
2. USDA nutrition API for calories, protein, carbs, fat

## 10.2 What You See

1. Current phase card
2. Nutrition focus card
3. Selected symptoms summary
4. Symptom selector list
5. Explanation panel
6. Key nutrient tags
7. Food category cards with reasoning and nutrient tiles

## 10.3 How to Use

1. Ensure cycle data exists so current phase can be determined.
2. Select symptoms from available options.
3. Review generated foods and reasons.
4. Wait for USDA cards to load if external data is available.

## 10.4 Nutrition Loading States

1. Loading message appears while USDA metrics are fetched.
2. If API unavailable, cards show Nutrition data unavailable.
3. Recommendations still work even if USDA fails.

## 10.5 Recommendation Logic Highlights

1. Phase-specific nutrition baseline
2. Symptom-specific food enrichment
3. Personalization using energy, sleep, lifestyle where available
4. Allergy filtering when configured

## 11. Mood Tracker Feature Guide

Page: /mood

Mood Tracker supports structured emotional logging with analytics.

## 11.1 Input Fields

1. Mood selection (emoji options)
2. Intensity slider (1 to 5)
3. Date
4. Cycle Day (1 to 60)
5. Phase (Menstrual, Follicular, Ovulation, Luteal)
6. Optional note

## 11.2 How to Log Mood

1. Select mood.
2. Set intensity.
3. Confirm date, cycle day, phase.
4. Add optional note.
5. Click Log Mood.

## 11.3 Trend Chart

1. Line chart shows recent intensity trend.
2. X-axis is date.
3. Y-axis is mood intensity.
4. Point colors indicate cycle phase.

## 11.4 Recent Mood Entries

1. Shows latest entries with date and note.
2. Most recent appears first.

## 11.5 Mood Insights Block

Can include:

1. Current mood highlight
2. Dominant mood
3. Mood frequency distribution
4. Actionable suggestions
5. Alerts
6. Phase patterns
7. Personalized insights

## 11.6 Chatbot Integration

Latest mood context is saved and sent with chatbot messages.

## 12. Symptoms Checker Feature Guide

Page: /symptoms

Symptoms page currently performs local analysis and trend tracking.

## 12.1 Inputs

1. Symptom checkboxes:
- Cramps
- Headache
- Fatigue
- Bloating
- Mood Swings
2. Pain Level slider (1 to 10)

## 12.2 How to Use

1. Select symptoms you feel.
2. Set pain level.
3. Click Check Symptoms.
4. Review analysis result panels.

## 12.3 Output Blocks

1. Selected symptoms tags
2. Severity badge
3. Risk level badge
4. Warning banner when risk is high
5. Insights list
6. Suggestions cards

## 12.4 Trend Analytics

1. Symptom frequency bars from recent entries
2. Pain level trend graph
3. Average pain summary
4. Date range labels for chart

## 12.5 Important Data Note

Current Symptoms page behavior:

1. Analysis is calculated in frontend.
2. Trend history is saved in local browser storage.
3. It is not currently written to backend symptom tables from this page flow.

## 12.6 Chatbot Integration

Symptoms analysis and selected symptoms are saved for chatbot context.

## 13. Education Feature Guide

Page: /education

Education module helps users challenge myths and learn evidence-based facts.

## 13.1 Modes

1. Flip Cards mode
2. Quiz mode

## 13.2 Filters and Search

1. Category tabs:
- All
- Menstruation
- Nutrition
- Hygiene
- Exercise
- Mental Health
2. Search field filters by myth text or category.
3. Personalization hint may appear based on phase and symptoms.

## 13.3 Flip Cards Mode

1. Each card has Myth side and Fact side.
2. Click card to flip.
3. Fact side shows source.
4. Feedback buttons:
- I believed this
- Helpful

## 13.4 Quiz Mode

1. App asks if statement is Myth or Fact.
2. User selects answer.
3. App shows correct answer and explanation.
4. Score updates continuously.
5. Next Question loads another item.

## 13.5 Feedback Persistence

1. Feedback status is stored locally.
2. App also attempts to send feedback to backend.
3. If backend fails, local state still keeps interaction history.

## 14. Chatbot Feature Guide

Page: /chatbot

Chatbot gives supportive responses using context from cycle, mood, and symptoms.

## 14.1 Chat Inputs

1. Manual text input
2. Quick suggestion buttons

## 14.2 Chat Context Sent

1. Session ID
2. Symptom context (if available)
3. Mood context (if available)
4. Auth token when logged in

## 14.3 Response Behavior

Backend may respond using:

1. Rule-based intent responses
2. Myth education path for myth-like questions
3. Safety response for medical diagnosis style questions
4. Gemini fallback for broader general queries

## 14.4 UI Experience

1. User and bot message bubbles
2. Typing indicator while waiting
3. Friendly fallback message if response fails

## 14.5 Best Use Cases

1. Ask cycle phase guidance questions
2. Ask symptom self-care questions
3. Ask food and nutrition support questions
4. Ask myth clarification questions

## 14.6 Safety Boundary

Chatbot does not provide clinical diagnosis and may direct users to professional care for high-risk medical queries.

## 15. Data Storage and Privacy Behavior

## 15.1 Data Saved in Backend Database

1. User account profile
2. Cycle history entries
3. Daily logs
4. Mood entries
5. Symptom entries (when backend symptom endpoint is used)

## 15.2 Data Saved in Browser Local Storage

1. Auth token and auth user
2. Cycle prediction cache
3. Mood chat context
4. Symptom chat context
5. Myth of the day cache
6. Myth feedback state
7. Dashboard period prompt suppression date
8. Symptoms trend entries

## 15.3 In-Memory Backend Data (Resets on Restart)

1. Chat conversation memory map
2. Myth feedback counters
3. USDA nutrition cache

## 16. Detailed Error and Recovery Guide

## 16.1 Login Fails

Possible causes:

1. Wrong credentials
2. Backend not running
3. Token/session issue

Recovery:

1. Recheck email and password
2. Confirm backend is live on port 5000
3. Try login again

## 16.2 Redirected to Login Unexpectedly

Possible causes:

1. Token expired
2. Token removed from local storage
3. Invalid token signature

Recovery:

1. Login again
2. If persistent, clear local storage and retry

## 16.3 Cycle Prediction Missing

Possible causes:

1. No cycle data entered
2. Invalid dates
3. Backend cycle endpoint failure

Recovery:

1. Add at least one valid period date
2. Use Cycle Tracker save flow again
3. Check backend logs

## 16.4 Nutrition Metrics Not Loading

Possible causes:

1. USDA API key missing or invalid
2. Internet/API timeout
3. Temporary service unavailability

Recovery:

1. Validate USDA_API_KEY
2. Retry after network check
3. Use internal recommendations while API is down

## 16.5 Chatbot Not Replying

Possible causes:

1. Backend not running
2. Chat route failure
3. External AI unavailable

Recovery:

1. Verify backend health endpoint
2. Retry message
3. Continue with manual feature pages if chat is temporarily unavailable

## 16.6 Dashboard Prompt Keeps Appearing

Possible causes:

1. Ongoing period still active
2. Daily suppression date not set due storage issue

Recovery:

1. Use Mark Period End when appropriate
2. Confirm browser allows local storage

## 17. Recommended Daily Usage Workflow

Use this flow for best results:

1. Open Dashboard and review phase, countdown, and insights.
2. Open calendar and log current day mood/symptoms quickly.
3. If needed, update cycle starts or ends.
4. Visit Mood Tracker for detailed emotional check-in.
5. Visit Nutrition for symptom-adjusted food guidance.
6. Use Education cards or quiz for myth awareness.
7. Use Chatbot for quick supportive guidance and reminders.

## 18. FAQ

## 18.1 Do I need to log data every day?

Daily logging is optional but strongly improves insight quality.

## 18.2 Why does prediction confidence change?

Confidence depends on amount and consistency of cycle history.

## 18.3 Can I use only calendar quick logs and skip tracker pages?

Yes. Calendar quick logging supports frequent daily updates.

## 18.4 Is all data synced across devices?

Database data is server-side, but some helper state is local-browser only.

## 18.5 Why do some pages still work when backend is down?

Some features include local fallback behavior and cached states.

## 18.6 Does Symptoms page currently save to backend from that page flow?

Current Symptoms page primarily computes and stores trend data locally while still sharing context with chatbot.

## 19. Support Checklist for Testers and Demo Teams

Before testing:

1. Backend running on port 5000
2. Frontend running on port 5173
3. Database schema applied
4. Environment variables set

During testing, verify:

1. Signup and login flow
2. Dashboard loading prediction and myth
3. Cycle save and prediction refresh
4. Calendar day panel quick save actions
5. Nutrition suggestions and USDA fallback states
6. Mood entry save and chart update
7. Symptoms analysis and trend update
8. Education filtering, feedback, and quiz scoring
9. Chatbot context-aware responses

After testing:

1. Confirm data persistence expectations
2. Confirm token/session behavior after logout
3. Confirm error messages are understandable
