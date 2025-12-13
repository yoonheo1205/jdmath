import { createClient, SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || ''
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

if (!supabaseUrl || !supabaseKey) {
  console.warn('Supabase 환경 변수가 설정되지 않았습니다. .env 파일을 확인해주세요.');
}

// Row types for Supabase tables
export interface ProfileRow {
  id: string;
  email: string | null;
  username: string | null;
  student_number: string | null;
  name: string | null;
  grade: number | null;
  role: string | null;
  password: string | null;
  created_at?: string;
}

export interface ExamRow {
  id: string;
  title: string | null;
  created_at: string;
  config: any;
  stats: any | null;
}

export interface ScoreRow {
  id: string;
  exam_id: string | null;
  user_id: string | null;
  total_score: number | null;
  detail: any;
  created_at: string;
}

// Create Supabase client without strict typing to allow flexible queries
export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseKey);

// Check if Supabase is properly configured
export const isSupabaseConfigured = (): boolean => {
  return !!(supabaseUrl && supabaseKey);
}
