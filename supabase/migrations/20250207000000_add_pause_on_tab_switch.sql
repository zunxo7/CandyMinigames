-- Add pause_on_tab_switch to profiles (Settings: pause game when switching tabs).
-- Run this in Supabase SQL Editor if the column doesn't exist.
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS pause_on_tab_switch boolean DEFAULT true;

COMMENT ON COLUMN profiles.pause_on_tab_switch IS 'When true, game pauses when user switches tabs (Alt+Tab).';
