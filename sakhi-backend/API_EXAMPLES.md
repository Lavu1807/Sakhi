# SAKHI Backend API Examples

Base URL: http://localhost:5000

Note: Both plain and namespaced routes are supported.
- Plain: /signup, /login, /cycle, /daily-logs, /symptoms, /prediction
- Namespaced: /api/auth/signup, /api/auth/login, /api/cycle, /api/daily-logs, /api/symptoms, /api/prediction

## 1) Signup
POST /signup

Request body:
```json
{
  "name": "Ananya",
  "email": "ananya@example.com",
  "password": "secret123",
  "age": 24,
  "weight": 58.5,
  "height": 162,
  "lifestyle": "active"
}
```

Success response (201):
```json
{
  "message": "Signup successful.",
  "user": {
    "id": 1,
    "name": "Ananya",
    "email": "ananya@example.com",
    "age": 24,
    "weight": 58.5,
    "height": 162,
    "lifestyle": "active",
    "created_at": "2026-04-08T11:20:47.263Z"
  }
}
```

## 2) Login
POST /login

Request body:
```json
{
  "email": "ananya@example.com",
  "password": "secret123"
}
```

Success response (200):
```json
{
  "message": "Login successful.",
  "token": "<jwt_token>",
  "user": {
    "id": 1,
    "name": "Ananya",
    "email": "ananya@example.com",
    "age": 24,
    "weight": 58.5,
    "height": 162,
    "lifestyle": "active",
    "created_at": "2026-04-08T11:20:47.263Z"
  }
}
```

## 3) Add Cycle Entry
POST /cycle
Header: `Authorization: Bearer <jwt_token>`

Request body:
```json
{
  "period_start_date": "2026-04-01",
  "period_end_date": "2026-04-05",
  "cycle_length": 28,
  "flow_intensity": "medium"
}
```

Success response (201):
```json
{
  "message": "Cycle entry added successfully.",
  "entry": {
    "id": 1,
    "user_id": 1,
    "period_start_date": "2026-04-01",
    "period_end_date": "2026-04-05",
    "cycle_length": 28,
    "flow_intensity": "medium",
    "created_at": "2026-04-08T11:21:27.263Z"
  }
}
```

## 4) Get Cycle History
GET /cycle
Header: `Authorization: Bearer <jwt_token>`

Success response (200):
```json
{
  "entries": [
    {
      "id": 2,
      "user_id": 1,
      "period_start_date": "2026-04-29",
      "period_end_date": "2026-05-03",
      "cycle_length": 28,
      "flow_intensity": "light",
      "created_at": "2026-05-03T11:25:12.901Z"
    },
    {
      "id": 1,
      "user_id": 1,
      "period_start_date": "2026-04-01",
      "period_end_date": "2026-04-05",
      "cycle_length": 28,
      "flow_intensity": "medium",
      "created_at": "2026-04-08T11:21:27.263Z"
    }
  ]
}
```

## 5) Add Daily Log
POST /daily-logs
Header: `Authorization: Bearer <jwt_token>`

Request body:
```json
{
  "log_date": "2026-05-10",
  "mood": "irritated",
  "energy_level": 2,
  "stress_level": 4,
  "sleep_hours": 6.5,
  "cramps": true,
  "headache": false,
  "fatigue": true,
  "bloating": true,
  "water_intake": 1.8,
  "exercise_done": false,
  "notes": "Mild cramps today"
}
```

Success response (201):
```json
{
  "message": "Daily log saved successfully.",
  "entry": {
    "id": 12,
    "user_id": 1,
    "log_date": "2026-05-10",
    "mood": "irritated",
    "energy_level": 2,
    "stress_level": 4,
    "sleep_hours": 6.5,
    "cramps": true,
    "headache": false,
    "fatigue": true,
    "bloating": true,
    "water_intake": 1.8,
    "exercise_done": false,
    "notes": "Mild cramps today",
    "created_at": "2026-05-10T12:01:02.202Z"
  }
}
```

## 6) Get Daily Logs
GET /daily-logs?from=2026-05-01&to=2026-05-31
Header: `Authorization: Bearer <jwt_token>`

Success response (200):
```json
{
  "entries": [
    {
      "id": 12,
      "user_id": 1,
      "log_date": "2026-05-10",
      "mood": "irritated",
      "energy_level": 2,
      "stress_level": 4,
      "sleep_hours": 6.5,
      "cramps": true,
      "headache": false,
      "fatigue": true,
      "bloating": true,
      "water_intake": 1.8,
      "exercise_done": false,
      "notes": "Mild cramps today",
      "created_at": "2026-05-10T12:01:02.202Z"
    }
  ]
}
```

## 7) Get Prediction
GET /prediction?defaultCycleLength=28
Header: `Authorization: Bearer <jwt_token>`

Success response (200):
```json
{
  "latestPeriodDate": "2026-04-29",
  "nextPeriodDate": "2026-05-27",
  "ovulationDate": "2026-05-13",
  "currentPhase": "Follicular",
  "currentDay": 9,
  "ovulationDay": 14,
  "cycleLengthUsed": 28,
  "phaseMessage": "Energy may rise now; this is a good time for planning and activity.",
  "averageCycleLength": 28,
  "confidenceLevel": "Medium",
  "irregularityFlag": false,
  "cycleCount": 4,
  "variation": 4
}
```

## 8) Add Symptom Entry
POST /symptoms
Header: `Authorization: Bearer <jwt_token>`

Request body:
```json
{
  "date": "2026-05-12",
  "cycleDay": 13,
  "phase": "Ovulation",
  "painLevel": 4,
  "flowLevel": "light",
  "mood": "anxious",
  "symptoms": ["cramps", "bloating"],
  "sleepHours": 6.8,
  "activityLevel": "moderate"
}
```

Success response (201):
```json
{
  "message": "Symptom entry saved successfully.",
  "entry": {
    "id": 3,
    "userId": 1,
    "date": "2026-05-12",
    "cycleDay": 13,
    "phase": "Ovulation",
    "painLevel": 4,
    "flowLevel": "light",
    "mood": "anxious",
    "symptoms": ["cramps", "bloating"],
    "sleepHours": 6.8,
    "activityLevel": "moderate",
    "createdAt": "2026-05-12T09:25:48.181Z"
  }
}
```

## 9) Get Symptom Entries
GET /symptoms?from=2026-05-01&to=2026-05-31&phase=Ovulation&limit=100
Header: `Authorization: Bearer <jwt_token>`

Success response (200):
```json
{
  "entries": [
    {
      "id": 3,
      "userId": 1,
      "date": "2026-05-12",
      "cycleDay": 13,
      "phase": "Ovulation",
      "painLevel": 4,
      "flowLevel": "light",
      "mood": "anxious",
      "symptoms": ["cramps", "bloating"],
      "sleepHours": 6.8,
      "activityLevel": "moderate",
      "createdAt": "2026-05-12T09:25:48.181Z"
    }
  ]
}
```
