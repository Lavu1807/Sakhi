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
  cycle_length INTEGER,
  flow_intensity VARCHAR(20),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (user_id, period_start_date)
);

ALTER TABLE cycle_history ADD COLUMN IF NOT EXISTS period_end_date DATE;
ALTER TABLE cycle_history ADD COLUMN IF NOT EXISTS cycle_length INTEGER;
ALTER TABLE cycle_history ADD COLUMN IF NOT EXISTS flow_intensity VARCHAR(20);
ALTER TABLE cycle_history ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

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

CREATE INDEX IF NOT EXISTS idx_cycle_history_user_start_date ON cycle_history (user_id, period_start_date DESC);
CREATE INDEX IF NOT EXISTS idx_daily_logs_user_log_date ON daily_logs (user_id, log_date DESC);
CREATE INDEX IF NOT EXISTS idx_symptom_logs_user_date ON symptom_logs (user_id, date DESC);
