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

-- Detailed symptom entries table for cycle and wellness analysis
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
  UNIQUE (user_id, entry_date),
  CHECK (symptoms <@ ARRAY['cramps', 'fatigue', 'headache', 'nausea', 'bloating']::TEXT[])
);

-- Mood tracking entries table for emotional pattern analysis
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

CREATE INDEX IF NOT EXISTS idx_cycle_history_user_start_date ON cycle_history (user_id, period_start_date DESC);
CREATE INDEX IF NOT EXISTS idx_cycle_history_user_ongoing ON cycle_history (user_id, is_period_ongoing);
CREATE INDEX IF NOT EXISTS idx_daily_logs_user_log_date ON daily_logs (user_id, log_date DESC);
CREATE INDEX IF NOT EXISTS idx_symptom_entries_user_date ON symptom_entries (user_id, entry_date DESC);
CREATE INDEX IF NOT EXISTS idx_symptom_entries_phase_date ON symptom_entries (user_id, phase, entry_date DESC);
CREATE INDEX IF NOT EXISTS idx_mood_entries_user_date ON mood_entries (user_id, entry_date DESC);
CREATE INDEX IF NOT EXISTS idx_mood_entries_phase_date ON mood_entries (user_id, phase, entry_date DESC);
