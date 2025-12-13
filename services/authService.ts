import { supabase, isSupabaseConfigured } from './supabaseClient';

export interface SignUpData {
  email: string;
  password: string;
  metadata?: {
    name?: string;
    student_number?: string;
    grade?: number;
    username?: string;
  };
}

export interface AuthResponse {
  data: any;
  error: any;
}

/**
 * 회원가입 - Magic Link 이메일 전송
 * @param email 사용자 이메일
 * @param password 사용자 비밀번호
 * @param metadata 추가 메타데이터 (이름, 학번, 학년, 아이디)
 * @returns { data, error }
 */
export const signUp = async (
  email: string,
  password: string,
  metadata?: SignUpData['metadata']
): Promise<AuthResponse> => {
  if (!isSupabaseConfigured()) {
    return {
      data: null,
      error: { message: 'Supabase가 구성되지 않았습니다.' }
    };
  }

  try {
    console.log('[authService.signUp] Starting signup...', { email, metadata });

    // CRITICAL: emailRedirectTo must be set to window.location.origin
    // This ensures the email link redirects back to the current website
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password: password.trim(),
      options: {
        emailRedirectTo: window.location.origin,
        data: metadata || {},
      }
    });

    if (error) {
      console.error('[authService.signUp] Error:', error);
      return { data: null, error };
    }

    console.log('[authService.signUp] Signup initiated successfully, email sent');
    return { data, error: null };
  } catch (error: any) {
    console.error('[authService.signUp] Unexpected error:', error);
    return {
      data: null,
      error: { message: error.message || '회원가입 중 오류가 발생했습니다.' }
    };
  }
};

/**
 * 로그인
 * @param email 사용자 이메일
 * @param password 사용자 비밀번호
 * @returns { data, error }
 */
export const signIn = async (
  email: string,
  password: string
): Promise<AuthResponse> => {
  if (!isSupabaseConfigured()) {
    return {
      data: null,
      error: { message: 'Supabase가 구성되지 않았습니다.' }
    };
  }

  try {
    console.log('[authService.signIn] Starting signin...', { email });

    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password: password.trim(),
    });

    if (error) {
      console.error('[authService.signIn] Error:', error);
      return { data: null, error };
    }

    console.log('[authService.signIn] Signin successful');
    return { data, error: null };
  } catch (error: any) {
    console.error('[authService.signIn] Unexpected error:', error);
    return {
      data: null,
      error: { message: error.message || '로그인 중 오류가 발생했습니다.' }
    };
  }
};

/**
 * 로그아웃
 * @returns { data, error }
 */
export const signOut = async (): Promise<AuthResponse> => {
  if (!isSupabaseConfigured()) {
    return {
      data: null,
      error: { message: 'Supabase가 구성되지 않았습니다.' }
    };
  }

  try {
    console.log('[authService.signOut] Signing out...');

    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error('[authService.signOut] Error:', error);
      return { data: null, error };
    }

    console.log('[authService.signOut] Signout successful');
    return { data: {}, error: null };
  } catch (error: any) {
    console.error('[authService.signOut] Unexpected error:', error);
    return {
      data: null,
      error: { message: error.message || '로그아웃 중 오류가 발생했습니다.' }
    };
  }
};

/**
 * 현재 세션 가져오기
 * @returns { data, error }
 */
export const getSession = async (): Promise<AuthResponse> => {
  if (!isSupabaseConfigured()) {
    return {
      data: null,
      error: { message: 'Supabase가 구성되지 않았습니다.' }
    };
  }

  try {
    const { data, error } = await supabase.auth.getSession();

    if (error) {
      console.error('[authService.getSession] Error:', error);
      return { data: null, error };
    }

    return { data, error: null };
  } catch (error: any) {
    console.error('[authService.getSession] Unexpected error:', error);
    return {
      data: null,
      error: { message: error.message || '세션 가져오기 중 오류가 발생했습니다.' }
    };
  }
};

