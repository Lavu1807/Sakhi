-- Create database (run once from PostgreSQL shell)
-- CREATE DATABASE sakhi;

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL,
  password TEXT NOT NULL,
  age INTEGER,
  weight DOUBLE PRECISION,
  height DOUBLE PRECISION,
  lifestyle VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE users ADD COLUMN IF NOT EXISTS age INTEGER;
ALTER TABLE users ADD COLUMN IF NOT EXISTS weight DOUBLE PRECISION;
ALTER TABLE users ADD COLUMN IF NOT EXISTS height DOUBLE PRECISION;
ALTER TABLE users ADD COLUMN IF NOT EXISTS lifestyle VARCHAR(50);
ALTER TABLE users ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Cycle history table
CREATE TABLE IF NOT EXISTS cycle_history (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  period_start_date DATE NOT NULL,
  period_end_date DATE,
  is_period_ongoing BOOLEAN NOT NULL DEFAULT FALSE,
  cycle_length INTEGER,
  flow_intensity VARCHAR(20),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (user_id, period_start_date)
);

ALTER TABLE cycle_history ADD COLUMN IF NOT EXISTS period_end_date DATE;
ALTER TABLE cycle_history ADD COLUMN IF NOT EXISTS is_period_ongoing BOOLEAN DEFAULT FALSE;
ALTER TABLE cycle_history ADD COLUMN IF NOT EXISTS cycle_length INTEGER;
ALTER TABLE cycle_history ADD COLUMN IF NOT EXISTS flow_intensity VARCHAR(20);
ALTER TABLE cycle_history ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

UPDATE cycle_history
SET is_period_ongoing = FALSE
WHERE period_end_date IS NOT NULL;

WITH latest_open_period AS (
  SELECT DISTINCT ON (user_id) id
  FROM cycle_history
  WHERE period_end_date IS NULL
  ORDER BY user_id, period_start_date DESC
)
UPDATE cycle_history
SET is_period_ongoing = CASE
  WHEN cycle_history.id IN (SELECT id FROM latest_open_period) THEN TRUE
  ELSE FALSE
END
WHERE period_end_date IS NULL;

-- Daily health logs table
CREATE TABLE IF NOT EXISTS daily_logs (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  log_date DATE NOT NULL,
  mood VARCHAR(50),
  energy_level INTEGER CHECK (energy_level BETWEEN 1 AND 5),
  stress_level INTEGER CHECK (stress_level BETWEEN 1 AND 5),
  sleep_hours DOUBLE PRECISION,
  cramps BOOLEAN,
  headache BOOLEAN,
  fatigue BOOLEAN,
  bloating BOOLEAN,
  water_intake DOUBLE PRECISION,
  exercise_done BOOLEAN,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (user_id, log_date)
);

-- Optional symptom table for deeper analytics
CREATE TABLE IF NOT EXISTS symptom_logs (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  symptom VARCHAR(100) NOT NULL,
  severity INTEGER CHECK (severity BETWEEN 1 AND 5),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Mood tracker entries (used by mood module)
CREATE TABLE IF NOT EXISTS mood_entries (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  entry_date DATE NOT NULL,
  mood VARCHAR(20) NOT NULL CHECK (mood IN ('happy', 'sad', 'irritated', 'anxious', 'calm')),
  intensity INTEGER NOT NULL CHECK (intensity BETWEEN 1 AND 5),
  note TEXT,
  cycle_day INTEGER NOT NULL CHECK (cycle_day BETWEEN 1 AND 60),
  phase VARCHAR(20) NOT NULL CHECK (phase IN ('Menstrual', 'Follicular', 'Ovulation', 'Luteal')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (user_id, entry_date)
);

ALTER TABLE mood_entries ADD COLUMN IF NOT EXISTS entry_date DATE;
ALTER TABLE mood_entries ADD COLUMN IF NOT EXISTS mood VARCHAR(20);
ALTER TABLE mood_entries ADD COLUMN IF NOT EXISTS intensity INTEGER;
ALTER TABLE mood_entries ADD COLUMN IF NOT EXISTS note TEXT;
ALTER TABLE mood_entries ADD COLUMN IF NOT EXISTS cycle_day INTEGER;
ALTER TABLE mood_entries ADD COLUMN IF NOT EXISTS phase VARCHAR(20);
ALTER TABLE mood_entries ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Symptom tracker entries (used by symptom module)
CREATE TABLE IF NOT EXISTS symptom_entries (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  entry_date DATE NOT NULL,
  cycle_day INTEGER NOT NULL CHECK (cycle_day BETWEEN 1 AND 60),
  phase VARCHAR(20) NOT NULL CHECK (phase IN ('Menstrual', 'Follicular', 'Ovulation', 'Luteal')),
  pain_level INTEGER NOT NULL CHECK (pain_level BETWEEN 1 AND 10),
  flow_level VARCHAR(10) NOT NULL CHECK (flow_level IN ('light', 'medium', 'heavy')),
  mood VARCHAR(20) NOT NULL CHECK (mood IN ('happy', 'sad', 'irritated', 'anxious')),
  symptoms TEXT[] NOT NULL DEFAULT '{}',
  sleep_hours DOUBLE PRECISION NOT NULL CHECK (sleep_hours BETWEEN 0 AND 24),
  activity_level VARCHAR(10) NOT NULL CHECK (activity_level IN ('low', 'moderate', 'high')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (user_id, entry_date)
);

ALTER TABLE symptom_entries ADD COLUMN IF NOT EXISTS entry_date DATE;
ALTER TABLE symptom_entries ADD COLUMN IF NOT EXISTS cycle_day INTEGER;
ALTER TABLE symptom_entries ADD COLUMN IF NOT EXISTS phase VARCHAR(20);
ALTER TABLE symptom_entries ADD COLUMN IF NOT EXISTS pain_level INTEGER;
ALTER TABLE symptom_entries ADD COLUMN IF NOT EXISTS flow_level VARCHAR(10);
ALTER TABLE symptom_entries ADD COLUMN IF NOT EXISTS mood VARCHAR(20);
ALTER TABLE symptom_entries ADD COLUMN IF NOT EXISTS symptoms TEXT[];
ALTER TABLE symptom_entries ADD COLUMN IF NOT EXISTS sleep_hours DOUBLE PRECISION;
ALTER TABLE symptom_entries ADD COLUMN IF NOT EXISTS activity_level VARCHAR(10);
ALTER TABLE symptom_entries ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Durable USDA nutrition cache (replaces in-memory Map)
CREATE TABLE IF NOT EXISTS nutrition_cache (
  cache_key VARCHAR(255) PRIMARY KEY,
  nutrition_data JSONB,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Durable conversation memory (replaces in-memory Map)
CREATE TABLE IF NOT EXISTS conversation_memory (
  conversation_key VARCHAR(255) PRIMARY KEY,
  messages JSONB NOT NULL DEFAULT '[]',
  last_intent VARCHAR(50) NOT NULL DEFAULT 'general',
  gemini_call_count INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_cycle_history_user_start_date ON cycle_history (user_id, period_start_date DESC);
CREATE INDEX IF NOT EXISTS idx_cycle_history_user_ongoing ON cycle_history (user_id, is_period_ongoing);
CREATE INDEX IF NOT EXISTS idx_daily_logs_user_log_date ON daily_logs (user_id, log_date DESC);
CREATE INDEX IF NOT EXISTS idx_symptom_logs_user_date ON symptom_logs (user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_mood_entries_user_entry_date ON mood_entries (user_id, entry_date DESC);
CREATE INDEX IF NOT EXISTS idx_symptom_entries_user_entry_date ON symptom_entries (user_id, entry_date DESC);
CREATE INDEX IF NOT EXISTS idx_nutrition_cache_expires ON nutrition_cache (expires_at);
CREATE INDEX IF NOT EXISTS idx_conversation_memory_updated ON conversation_memory (updated_at DESC);

-- Password reset tokens
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token VARCHAR(255) NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_token ON password_reset_tokens (token);
