-- Run this once in the Supabase SQL Editor to create the insights table.
-- The generate-insight.js script writes to this table weekly.
-- The dashboard reads the latest row on every page load.

CREATE TABLE IF NOT EXISTS insights (
  id          bigint generated always as identity primary key,
  generated_at timestamptz default now() not null,
  week_label  text,          -- e.g. "25 Jun 2026"
  prose       text not null  -- 2–4 sentence AI-written overview
);

-- Only the service role key writes here; anon key reads.
-- If you have RLS enabled on this project, add a SELECT policy:
-- CREATE POLICY "public read" ON insights FOR SELECT USING (true);
