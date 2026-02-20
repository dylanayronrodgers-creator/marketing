-- =============================================
-- Top Reviewa - Supabase Database Schema
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor → New Query)
-- =============================================

-- 1. Reviews table
CREATE TABLE IF NOT EXISTS reviews (
  id TEXT PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  source TEXT NOT NULL DEFAULT 'Google',
  rating SMALLINT,
  sentiment TEXT NOT NULL DEFAULT 'Neutral',
  status TEXT NOT NULL DEFAULT 'Pending',
  agent TEXT NOT NULL DEFAULT 'Unknown',
  team TEXT NOT NULL DEFAULT 'Unknown',
  theme TEXT DEFAULT '',
  keywords TEXT[] DEFAULT '{}',
  tv_snippet TEXT DEFAULT '',
  text TEXT DEFAULT '',
  manager_rating SMALLINT,
  reviewer_name TEXT,
  reviewer_thumbnail TEXT,
  reviewer_link TEXT,
  likes INTEGER DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Agents table
CREATE TABLE IF NOT EXISTS agents (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  team TEXT NOT NULL DEFAULT 'Unknown',
  email TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Settings table (key-value store for brand, teams, tv config)
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_reviews_status ON reviews(status);
CREATE INDEX IF NOT EXISTS idx_reviews_agent ON reviews(agent);
CREATE INDEX IF NOT EXISTS idx_reviews_source ON reviews(source);
CREATE INDEX IF NOT EXISTS idx_reviews_created_at ON reviews(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reviews_sentiment ON reviews(sentiment);
CREATE INDEX IF NOT EXISTS idx_agents_team ON agents(team);

-- 5. Auto-update updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER reviews_updated_at
  BEFORE UPDATE ON reviews
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER settings_updated_at
  BEFORE UPDATE ON settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- 6. Enable Row Level Security (allow all via anon key for internal tool)
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- Allow full access via anon key (internal tool, no auth needed)
CREATE POLICY "Allow all on reviews" ON reviews FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on agents" ON agents FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on settings" ON settings FOR ALL USING (true) WITH CHECK (true);

-- 7. Insert default settings
INSERT INTO settings (key, value) VALUES
  ('brand', '{"name": "Axxess", "primary": "#0099cc"}'::jsonb),
  ('teams', '["Sales", "Support", "Fibre Orders", "Accounts", "Walk-In Centre"]'::jsonb),
  ('tv_config', '{"brandColor": "#0099cc", "companyName": "Axxess", "tvTitle": "Top Reviewa", "tvSubtitle": "Axxess Team Portal", "logoUrl": "", "bgTheme": "dark-gradient", "layout": "default", "slideInterval": 8, "showStats": true, "showWeekly": true, "showMonthly": true, "showHighlights": true, "showTicker": true, "showClock": true}'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- 8. Insert default agents
INSERT INTO agents (id, name, team, email) VALUES
  ('AG-001', 'Leah Mokoena', 'Support', 'leah.mokoena@axxess.local'),
  ('AG-002', 'Kyle Jacobs', 'Sales', 'kyle.jacobs@axxess.local'),
  ('AG-003', 'Nandi Dlamini', 'Fibre Orders', 'nandi.dlamini@axxess.local'),
  ('AG-004', 'Ethan Naidoo', 'Accounts', 'ethan.naidoo@axxess.local'),
  ('AG-005', 'Ayesha Khan', 'Walk-In Centre', 'ayesha.khan@axxess.local'),
  ('AG-006', 'Siyabonga Zulu', 'Support', 'siya.zulu@axxess.local'),
  ('AG-007', 'Mia van Wyk', 'Sales', 'mia.vanwyk@axxess.local'),
  ('AG-008', 'Thabo Maseko', 'Fibre Orders', 'thabo.maseko@axxess.local'),
  ('AG-009', 'Priya Pillay', 'Accounts', 'priya.pillay@axxess.local'),
  ('AG-010', 'Liam Smith', 'Walk-In Centre', 'liam.smith@axxess.local')
ON CONFLICT (id) DO NOTHING;
