# SAKHI - Women's Health Companion System

Version: 2026-04-28
Audience: Final-year project review, viva, internship portfolio, and GitHub readers

---

## A. Project Overview

### What is SAKHI?
SAKHI is a full-stack web application that supports menstrual health awareness and daily wellness. It combines cycle tracking, adaptive prediction, nutrition guidance, mood and symptom logging, myths vs facts education, and a supportive chatbot into one connected system.

### Problem It Solves
- Menstrual health information is often fragmented across multiple apps and websites.
- Most period trackers give only dates and lack context about symptoms, nutrition, and emotional wellbeing.
- Stigma and misinformation make it harder for users to learn reliable facts.

SAKHI solves this by centralizing tracking and guidance, personalizing content based on cycle phase and symptoms, and presenting information in a friendly, non-diagnostic way.

### Target Users
- College students and young adults who want to understand their cycle better
- Working professionals seeking practical, daily wellness guidance
- Anyone looking for a stigma-free, supportive companion for menstrual health

### Key Features
- Secure login and session persistence
- Cycle logging with adaptive prediction and confidence indicators
- Calendar view with day-level logging for mood and symptoms
- Nutrition suggestions based on cycle phase and symptoms
- Mood tracking with simple analytics
- Symptom checker with rule-based guidance (not diagnosis)
- Myth-busting education with personalization
- Chatbot with safety-first responses and optional AI fallback

---

## B. System Architecture

### High-Level Architecture
- Frontend: React + Vite (UI, state, and interactions)
- Backend: Node.js + Express (APIs, validation, orchestration)
- Database: PostgreSQL (durable storage)
- External APIs: USDA FoodData Central (nutrition), optional Gemini fallback (chatbot)

### Data Flow (UI -> Backend -> DB -> UI)
1. User triggers an action in the UI (e.g., log period, view myths).
2. Frontend calls the API client (`shared/utils/api.js`).
3. Express route receives the request and forwards to a controller.
4. Controller validates input and orchestrates logic.
5. Service/model interacts with PostgreSQL or external API.
6. Response is normalized and returned to the frontend.
7. UI updates state and renders results.

### Separation of Concerns
- Frontend focuses on state, rendering, and UX.
- Backend controllers handle validation and orchestration.
- Services contain domain logic (prediction, myths, nutrition, chatbot).
- PostgreSQL handles durable persistence.

---

## C. Module-Wise Deep Explanation

### 1. Cycle Tracking Module

#### How Users Log Periods
- Users can log:
  - A single last period start date
  - A last period date plus cycle length
  - Multiple historical period start dates
- Each entry is validated for date format and sanity.

#### How Cycle Length is Calculated
- If multiple dates are provided, the system computes an average cycle length from intervals.
- If the user provides a cycle length, it is used directly.
- The system stores cycle length on cycle history rows for future adaptive learning.

#### Phase Detection
The cycle is divided into:
- Menstrual
- Follicular
- Ovulation
- Luteal

Phase is determined by:
- Start date of last cycle
- Average cycle length
- Typical ovulation window calculation

#### Prediction Generation
Predictions are created in the backend using a rules-based engine:
- Completed cycles are used for adaptive prediction.
- If data is limited, approximate mode is used.
- Output includes:
  - Next period date
  - Ovulation date
  - Fertile window
  - Current phase
  - Current day in cycle
  - Confidence level
  - Irregularity flag

#### Adaptive Learning Logic
- Only completed cycles are considered for adaptive learning.
- The more completed cycles, the higher the confidence.
- Variations in cycle length are tracked to flag irregularity.

#### Calendar Rendering Logic
- Prediction data includes a phase calendar covering the visible month.
- Each date is mapped to a phase and rendered in the calendar.

#### Edge Case Handling
- Missing end date: treated as ongoing period.
- Overlapping cycles: prevented by validation.
- First-time users: approximate prediction with safe defaults.

---

### 2. Calendar Module

#### Date Mapping
- Each day is mapped to:
  - Phase (Menstrual, Follicular, Ovulation, Luteal)
  - Predicted events (period, ovulation, fertile window)
  - Logged events (mood, symptoms)

#### Color Coding Logic
- Period days override all other events
- Ovulation days override fertile window
- Fertile window overrides neutral days

#### Day Details Flow
1. User clicks a calendar day
2. Panel opens with:
   - Phase
   - Cycle day
   - Mood and symptom logs
3. User can log mood/symptoms directly

#### Real-Time Updates
- After logging, backend is updated and the calendar re-renders
- Predictions refresh when period start/end changes

#### Priority Rendering
Priority order:
1. Logged period days
2. Predicted period days
3. Ovulation day
4. Fertile window
5. Other phases

---

### 3. Symptom Checker Module

#### User Input
- Users select symptoms from a predefined list
- Input is validated and normalized

#### Rule-Based Logic
- Symptoms map to possible conditions or wellness categories
- Rules do not give diagnosis, only guidance

#### Suggestions
- Suggestions include self-care tips and "when to see a doctor" advice

#### Limitations
- The module is educational only
- It does not replace medical consultation

---

### 4. Mood Tracker Module

#### Logging
- Users log mood, intensity, note, phase, and cycle day

#### Storage
- Saved in PostgreSQL `mood_entries` table

#### Pattern Detection
- Basic trends and dominant moods are calculated
- Phase-wise mood summaries help users observe patterns

#### Scalability
- Future enhancements can add ML-based analysis and richer visualizations

---

### 5. Nutrition Module

#### Recommendation Logic
- Uses a local rules engine based on:
  - Cycle phase
  - Selected symptoms
  - Lifestyle indicators

#### USDA API Integration
- USDA API is used only for calories and macronutrients
- If the API is unavailable, the app falls back to local data

#### Flow
1. User selects symptoms or uses current phase
2. Local rules generate recommended foods
3. USDA API enriches nutrition data
4. Results are displayed in UI

---

### 6. Chatbot Module

#### Local Logic
- Intent detection routes questions to:
  - Cycle guidance
  - Nutrition support
  - Myth explanations
  - General wellness

#### Fallback API
- If local logic cannot handle the query, Gemini fallback is used (optional)

#### Response Handling
- Responses are normalized and safety-checked
- Empathy prefixes are added based on mood context

#### Safety Considerations
- No medical diagnosis
- Encourages professional care when risk is high

---

### 7. Myths vs Facts Module

#### Content Structure
- Myths are stored as structured entries with:
  - Myth
  - Fact
  - Category
  - Source

#### Filtering Logic
- Categories: Menstruation, Nutrition, Hygiene, Exercise, Mental Health
- Search filters myths and facts by keyword

#### Personalization
- Phase and symptoms influence scoring
- Higher relevance myths appear first

---

### 8. Notification Module (Planned)

#### Logic (Planned)
- Reminders for upcoming periods
- Cycle-based self-care nudges
- Notification preferences

#### Future Scope
- Push notifications
- Email reminders
- Scheduled summaries

---

## DETAILED MODULE LOGIC & AI WORKING

This section explains internal logic step-by-step. It focuses on how the system computes results, not on feature descriptions.

### 1. Cycle Prediction Engine (Core Logic)

#### A. Input Data
- Period start dates (from cycle history)
- Period end dates (used to determine completed cycles)
- Cycle length (user input if provided)
- Historical cycle data (ordered by time)

#### B. Core Logic Steps
1. Normalize and validate dates
  - Accept only YYYY-MM-DD format
  - Sort dates in ascending order for interval calculations
2. Calculate cycle length candidates
  - For each pair of consecutive period start dates:
    - cycle_length_i = start_date[i] - start_date[i-1]
3. Resolve average cycle length
  - If user provides a cycle length, prefer it
  - Else compute average of valid intervals
  - If no valid intervals, fallback to 28
4. Phase calculation (day-of-cycle mapping)
  - Day 1 is period start date
  - Menstrual: Day 1 to Day 5
  - Follicular: Day 6 to Day 13
  - Ovulation: around Day 14 (adjusted by cycle length)
  - Luteal: remaining days to cycle end
5. Ovulation prediction
  - Base rule: ovulation_day = cycle_length - 14
  - If cycle length is short or long, adjust ovulation day proportionally
6. Fertile window
  - fertile_start = ovulation_day - 2 or 3
  - fertile_end = ovulation_day + 2
7. Next period prediction
  - next_period_start = last_period_start + average_cycle_length

#### C. Adaptive AI Model (Lightweight)
This is not a heavy ML model. It is a rule-based adaptive algorithm.

How it adapts:
- Only completed cycles are used for adaptive learning
- The system keeps a recent history window (last N cycles)
- A weighted average is computed to capture trends

Example trend adaptation:
- Last 3 cycles: 28, 30, 32
- Simple average = 30
- Weighted average (more weight to latest) shifts toward 31 or 32
- The next prediction uses the weighted value to reflect the upward trend

Why this counts as adaptive AI:
- The system adjusts its future outputs based on observed user history
- It updates the model parameters (average length, variation) over time
- It remains transparent and explainable

#### D. Output
- Next period date
- Ovulation date
- Fertile window
- Current phase and day in cycle
- Confidence level and irregularity flag

#### E. Edge Case Handling
- Missing end date: cycle is marked ongoing, excluded from adaptive learning
- Irregular cycles: high variation triggers irregularity flag
- First-time user: fallback to 28-day approximate mode

---

### 2. Chatbot Module (AI + Fallback)

#### A. Local Chatbot Layer
Step-by-step:
1. Normalize user input (lowercase, trim)
2. Intent detection (keyword and pattern matching)
3. Route to a local response handler:
  - cycle intent -> cycle response
  - nutrition intent -> nutrition response
  - myth intent -> myth response
  - safety intent -> safe response
4. Return response immediately if local handler succeeds

This layer is rule-based and fast, with deterministic responses.

#### B. Fallback AI API
If no local response is found:
1. Build request payload with user message and context
2. Send request to external AI API (Gemini fallback)
3. Parse response text and sanitize output
4. If API fails, return safe fallback guidance

#### C. Response Flow (End-to-End)
User -> Frontend -> Backend:
1. Backend runs local intent logic
2. If local answer exists, return it
3. Else call fallback API, then return response

#### D. Safety Design
- No medical diagnosis
- High-risk keywords trigger safety responses
- Encourages consulting healthcare professionals when needed

---

### 3. Symptom Checker Logic

Step-by-step:
1. User selects symptoms from predefined list
2. System normalizes symptoms (lowercase, unique)
3. Rule map links symptoms to wellness categories
4. Score each category by number of matching symptoms
5. Return highest scoring categories with guidance text

This is rule-based logic, not ML. The system explains what it suggests and why.

---

### 4. Nutrition Recommendation Engine

#### A. Local Logic (Rule-Based)
1. Input: phase, symptoms, and user preferences
2. Lookup base recommendations for the phase
3. Add symptom-specific foods and nutrients
4. Filter based on allergies or exclusions
5. Rank foods based on relevance to symptoms

#### B. API Integration (USDA)
1. For each recommended food, query USDA FoodData Central
2. Extract calories, protein, carbs, fat
3. Merge nutrition facts with local recommendation cards

Flow summary:
User input -> local filtering -> USDA API -> enriched results

---

### 5. Mood Analysis Logic

Step-by-step:
1. User logs mood, intensity, note, phase, and day
2. Mood entry stored in PostgreSQL
3. Backend aggregates:
  - frequency of each mood
  - dominant mood over time
  - mood by phase
4. Insights are returned to frontend for display

This is analytics logic, not ML. It is explainable and based on counts and trends.

---

### 6. Myths vs Facts Personalization

Step-by-step:
1. Load static myth dataset
2. Apply category filter (if selected)
3. If phase or symptoms are present:
  - score each myth by keyword match
  - boost myths aligned with current phase
4. Sort by score and return ranked list

This is rule-based personalization. It does not use a trained ML model.

---

### 7. Complete Data Flow (End-to-End)

1. User action in UI (log period, request myths, ask chatbot)
2. Frontend calls API client
3. Express route receives request
4. Controller validates and normalizes input
5. Service executes logic:
  - rules engine
  - adaptive algorithm
  - database queries
  - external API calls
6. Response is normalized and returned
7. UI updates local state and renders new data

---

### 8. Logic Differentiation Summary

- Rule-based logic:
  - Symptom checker mapping
  - Nutrition filtering and ranking
  - Myths personalization
  - Local chatbot intents

- Adaptive AI logic (lightweight):
  - Cycle prediction trend adjustment
  - Confidence and irregularity scoring

- API-based intelligence:
  - USDA nutrition enrichment
  - Chatbot fallback (Gemini)

---

## D. Database Design (PostgreSQL)

### Key Tables
- `users`: user profile and authentication data
- `cycle_history`: period start/end, cycle length, flow intensity
- `daily_logs`: daily mood and symptom quick logs
- `symptom_entries`: detailed symptom tracking
- `mood_entries`: mood logs with phase and intensity
- `nutrition_cache`: cached USDA nutrition responses
- `conversation_memory`: chatbot memory (durable)
- `password_reset_tokens`: password reset flow support

### Why PostgreSQL?
- Strong relational integrity
- Reliable transactions for health data
- Works well with structured logs and analytics

---

## E. API Integrations

### USDA FoodData Central API
- Used for macronutrient data
- Only enriches nutrition cards, does not replace local logic

### Chatbot Fallback API
- Optional Gemini fallback for general queries
- Used when rule-based responses are insufficient

---

## F. State Management and Data Flow

### Frontend State
- Local component state for UI rendering
- Shared localStorage for:
  - Auth session
  - Cycle summary
  - Myth of the day
  - Symptom/mood chat context

### Backend Data Flow
- Controllers validate input and call services
- Services use PostgreSQL or external APIs
- Normalized responses return to UI

---

## G. Edge Cases and Validations

- Missing period end date: treated as ongoing
- Overlapping cycles: prevented in validation
- Invalid dates: rejected with clear error
- First-time user: approximate predictions
- Empty datasets: safe fallbacks displayed

---

## H. Limitations

- Not a medical diagnosis tool
- Depends on accurate user input
- Prediction accuracy improves only with completed cycles

---

## I. Future Enhancements

- Machine learning prediction refinement
- Wearable integrations (sleep, activity)
- Advanced analytics dashboards
- Reminder and notification system
- Exportable reports (PDF)

---

## Text-Based Architecture Diagram

```
[User]
  |
  v
[React UI] --> [API Client] --> [Express Routes] --> [Controllers]
                                               |-> [Services]
                                               |-> [PostgreSQL]
                                               |-> [USDA API]
                                               |-> [Gemini Fallback]
```
