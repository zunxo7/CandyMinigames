import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://asbpsntmfahxhdwppkwh.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFzYnBzbnRtZmFoeGhkd3Bwa3doIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAxOTQ3ODgsImV4cCI6MjA4NTc3MDc4OH0.ocmJ3rN5BQaFTHl0i7zL__soFwgPJVcYRwcEf2dDEqY';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
