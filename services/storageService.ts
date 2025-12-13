
import { ExamConfig, UserScore, RegisteredUser, ExamComment, ExamReview, UserSession } from '../types';
import { supabase, isSupabaseConfigured, ProfileRow, ExamRow, ScoreRow } from './supabaseClient';

const KEY_EXAMS = 'app_exams';
const KEY_SCORES = 'app_scores';
const KEY_USERS = 'app_users';
const KEY_COMMENTS = 'app_comments';
const KEY_ANONYMOUS_COUNTER = 'app_anonymous_counter';

// =============================================================================
// SUPABASE-BASED FUNCTIONS (Primary - with localStorage fallback)
// =============================================================================

// --- Supabase Exam Functions ---

export const getExamsFromSupabase = async (): Promise<ExamConfig[]> => {
  if (!isSupabaseConfigured()) {
    return getExams(); // Fallback to localStorage
  }
  
  try {
    const { data, error } = await supabase
      .from('exams')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    
    if (!data || data.length === 0) {
      return getExams(); // Fallback to localStorage if no data
    }
    
    // Merge config JSONB with id and title
    return (data as ExamRow[]).map(row => ({
      ...row.config,
      id: row.id,
      title: row.title || row.config?.title,
    })) as ExamConfig[];
  } catch (error) {
    console.error('Error fetching exams from Supabase:', error);
    return getExams(); // Fallback to localStorage
  }
};

export const getExamByIdFromSupabase = async (id: string): Promise<ExamConfig | undefined> => {
  if (!isSupabaseConfigured()) {
    return getExamById(id);
  }
  
  try {
    const { data, error } = await supabase
      .from('exams')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error || !data) {
      return getExamById(id);
    }
    
    const row = data as ExamRow;
    return {
      ...row.config,
      id: row.id,
      title: row.title || row.config?.title,
    } as ExamConfig;
  } catch (error) {
    console.error('Error fetching exam from Supabase:', error);
    return getExamById(id);
  }
};

export const saveExamToSupabase = async (exam: ExamConfig): Promise<boolean> => {
  // Always save to localStorage first (as backup)
  saveExam(exam);
  
  if (!isSupabaseConfigured()) {
    return true;
  }
  
  try {
    const { error } = await supabase
      .from('exams')
      .upsert({
        id: exam.id,
        title: exam.title,
        config: exam,
        created_at: new Date(exam.createdAt).toISOString(),
      });
    
    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error saving exam to Supabase:', error);
    return true; // Still return true since localStorage succeeded
  }
};

export const deleteExamFromSupabase = async (id: string): Promise<boolean> => {
  // Delete from localStorage first
  deleteExam(id);
  
  if (!isSupabaseConfigured()) {
    return true;
  }
  
  try {
    // Delete related scores first
    await supabase.from('scores').delete().eq('exam_id', id);
    
    // Delete the exam
    const { error } = await supabase.from('exams').delete().eq('id', id);
    
    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error deleting exam from Supabase:', error);
    return true;
  }
};

// --- Supabase Score Functions ---

export const getScoresByExamIdFromSupabase = async (examId: string): Promise<UserScore[]> => {
  if (!isSupabaseConfigured()) {
    return getScoresByExamId(examId);
  }
  
  try {
    const { data, error } = await supabase
      .from('scores')
      .select('*')
      .eq('exam_id', examId)
      .order('total_score', { ascending: false });
    
    if (error) throw error;
    
    if (!data || data.length === 0) {
      return getScoresByExamId(examId);
    }
    
    // Map detail JSONB back to UserScore
    return (data as ScoreRow[]).map(row => ({
      ...row.detail,
      id: row.id,
      examId: row.exam_id,
      totalScore: row.total_score,
    })) as UserScore[];
  } catch (error) {
    console.error('Error fetching scores from Supabase:', error);
    return getScoresByExamId(examId);
  }
};

export const saveUserScoreToSupabase = async (score: UserScore): Promise<boolean> => {
  // Always save to localStorage first
  saveUserScore(score);
  
  if (!isSupabaseConfigured()) {
    return true;
  }
  
  try {
    const { error } = await supabase
      .from('scores')
      .upsert({
        id: score.id,
        exam_id: score.examId,
        user_id: score.userId || null,
        total_score: score.totalScore,
        detail: score,
        created_at: new Date(score.timestamp).toISOString(),
      });
    
    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error saving score to Supabase:', error);
    return true;
  }
};

export const deleteUserScoreFromSupabase = async (scoreId: string): Promise<boolean> => {
  deleteUserScore(scoreId);
  
  if (!isSupabaseConfigured()) {
    return true;
  }
  
  try {
    const { error } = await supabase.from('scores').delete().eq('id', scoreId);
    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error deleting score from Supabase:', error);
    return true;
  }
};

// --- Supabase Auth & Profile Functions ---

export interface SignUpData {
  email: string;
  password: string;
  username: string;
  name: string;
  studentNumber: string;
  grade?: 1 | 2 | 3;
}

export const signUpWithSupabase = async (userData: SignUpData): Promise<{ success: boolean; error?: string; userId?: string }> => {
  if (!isSupabaseConfigured()) {
    // Fallback to localStorage registration
    const success = registerUser({
      username: userData.username,
      password: userData.password,
      name: userData.name,
      studentNumber: userData.studentNumber,
      email: userData.email,
      grade: userData.grade,
    });
    return { success, error: success ? undefined : '이미 존재하는 아이디 또는 이메일입니다.' };
  }
  
  try {
    // 1. Sign up with Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: userData.email,
      password: userData.password,
      options: {
        emailRedirectTo: `${window.location.origin}`,
        data: {
          name: userData.name,
          student_number: userData.studentNumber,
          grade: userData.grade,
          username: userData.username,
        }
      }
    });

    if (authError) {
      console.error('Supabase auth error:', authError);
      // Fallback to localStorage
      const success = registerUser({
        username: userData.username,
        password: userData.password,
        name: userData.name,
        studentNumber: userData.studentNumber,
        email: userData.email,
        grade: userData.grade,
      });
      return { success, error: success ? undefined : '회원가입에 실패했습니다.' };
    }

    if (authData.user) {
      // 2. Insert into profiles table with password
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: authData.user.id,
          email: userData.email,
          username: userData.username,
          student_number: userData.studentNumber,
          name: userData.name,
          grade: userData.grade,
          role: 'STUDENT',
          password: userData.password, // Store raw password as requested
        });

      if (profileError) {
        console.error('Profile creation error:', profileError);
      }

      // Also save to localStorage for compatibility
      registerUser({
        username: userData.username,
        password: userData.password,
        name: userData.name,
        studentNumber: userData.studentNumber,
        email: userData.email,
        grade: userData.grade,
        supabaseUserId: authData.user.id,
      });

      return { success: true, userId: authData.user.id };
    }

    return { success: false, error: '회원가입에 실패했습니다.' };
  } catch (error: any) {
    console.error('Sign up error:', error);
    // Fallback to localStorage
    const success = registerUser({
      username: userData.username,
      password: userData.password,
      name: userData.name,
      studentNumber: userData.studentNumber,
      email: userData.email,
      grade: userData.grade,
    });
    return { success, error: success ? undefined : error.message };
  }
};

export const loginWithSupabase = async (emailOrUsername: string, password: string): Promise<{ success: boolean; session?: UserSession; error?: string }> => {
  const isEmail = emailOrUsername.includes('@');
  
  if (!isSupabaseConfigured()) {
    // Fallback to localStorage authentication
    const user = authenticateUser(emailOrUsername, password);
    if (user) {
      await recordUserLoginIp(emailOrUsername);
      return {
        success: true,
        session: {
          role: 'STUDENT',
          name: user.name,
          studentNumber: user.studentNumber,
          username: user.username,
          grade: user.grade,
          email: user.email,
          userId: user.supabaseUserId || user.username,
        }
      };
    }
    return { success: false, error: '아이디 또는 비밀번호가 일치하지 않습니다.' };
  }
  
  try {
    if (isEmail) {
      // Try Supabase auth for email login
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: emailOrUsername,
        password: password,
      });

      if (!authError && authData.user) {
        // Fetch profile data
        const { data: profileDataRaw } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', authData.user.id)
          .single();

        const profileData = profileDataRaw as ProfileRow | null;
        await recordUserLoginIp(profileData?.username || authData.user.email || emailOrUsername);

        return {
          success: true,
          session: {
            role: 'STUDENT',
            name: profileData?.name || authData.user.email?.split('@')[0] || 'User',
            studentNumber: profileData?.student_number || '',
            username: profileData?.username || authData.user.email || emailOrUsername,
            grade: profileData?.grade as 1 | 2 | 3 | undefined,
            email: authData.user.email || '',
            userId: authData.user.id,
          }
        };
      }
    }

    // Try username login by checking profiles table
    const { data: profileByUsernameRaw } = await supabase
      .from('profiles')
      .select('*')
      .eq('username', emailOrUsername)
      .eq('password', password)
      .single();

    const profileByUsername = profileByUsernameRaw as ProfileRow | null;

    if (profileByUsername) {
      await recordUserLoginIp(profileByUsername.username || emailOrUsername);
      return {
        success: true,
        session: {
          role: 'STUDENT',
          name: profileByUsername.name || 'User',
          studentNumber: profileByUsername.student_number || '',
          username: profileByUsername.username || emailOrUsername,
          grade: profileByUsername.grade as 1 | 2 | 3 | undefined,
          email: profileByUsername.email || '',
          userId: profileByUsername.id,
        }
      };
    }

    // Fallback to localStorage
    const user = authenticateUser(emailOrUsername, password);
    if (user) {
      await recordUserLoginIp(emailOrUsername);
      return {
        success: true,
        session: {
          role: 'STUDENT',
          name: user.name,
          studentNumber: user.studentNumber,
          username: user.username,
          grade: user.grade,
          email: user.email,
          userId: user.supabaseUserId || user.username,
        }
      };
    }

    return { success: false, error: '아이디 또는 비밀번호가 일치하지 않습니다.' };
  } catch (error: any) {
    console.error('Login error:', error);
    // Fallback to localStorage
    const user = authenticateUser(emailOrUsername, password);
    if (user) {
      await recordUserLoginIp(emailOrUsername);
      return {
        success: true,
        session: {
          role: 'STUDENT',
          name: user.name,
          studentNumber: user.studentNumber,
          username: user.username,
          grade: user.grade,
          email: user.email,
          userId: user.supabaseUserId || user.username,
        }
      };
    }
    return { success: false, error: error.message || '로그인 중 오류가 발생했습니다.' };
  }
};

// Get all users from Supabase (for admin)
export const getUsersFromSupabase = async (): Promise<RegisteredUser[]> => {
  if (!isSupabaseConfigured()) {
    return getRegisteredUsers();
  }
  
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('name');
    
    if (error) throw error;
    
    if (!data || data.length === 0) {
      return getRegisteredUsers();
    }
    
    return (data as ProfileRow[]).map(row => ({
      username: row.username || '',
      password: row.password || '',
      name: row.name || '',
      studentNumber: row.student_number || '',
      email: row.email || '',
      grade: row.grade as 1 | 2 | 3 | undefined,
      supabaseUserId: row.id,
    }));
  } catch (error) {
    console.error('Error fetching users from Supabase:', error);
    return getRegisteredUsers();
  }
};

// Update user in Supabase
export const updateUserInSupabase = async (userId: string, updates: Partial<RegisteredUser>): Promise<boolean> => {
  // Update localStorage first
  if (updates.username) {
    updateUser(updates.username, updates);
  }
  
  if (!isSupabaseConfigured()) {
    return true;
  }
  
  try {
    const { error } = await supabase
      .from('profiles')
      .update({
        name: updates.name,
        student_number: updates.studentNumber,
        grade: updates.grade,
        email: updates.email,
        username: updates.username,
        password: updates.password,
      })
      .eq('id', userId);
    
    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error updating user in Supabase:', error);
    return true;
  }
};

// Sync all local data to Supabase
export const syncToSupabase = async (): Promise<{ success: boolean; message: string }> => {
  if (!isSupabaseConfigured()) {
    return { success: false, message: 'Supabase가 구성되지 않았습니다.' };
  }
  
  try {
    // Sync exams
    const localExams = getExams();
    for (const exam of localExams) {
      await saveExamToSupabase(exam);
    }
    
    // Sync scores
    const allScores = JSON.parse(localStorage.getItem(KEY_SCORES) || '[]') as UserScore[];
    for (const score of allScores) {
      await saveUserScoreToSupabase(score);
    }
    
    // Sync users (profiles)
    const localUsers = getRegisteredUsers();
    for (const user of localUsers) {
      if (user.supabaseUserId) {
        await updateUserInSupabase(user.supabaseUserId, user);
      }
    }
    
    return { success: true, message: '데이터가 성공적으로 동기화되었습니다.' };
  } catch (error: any) {
    console.error('Sync error:', error);
    return { success: false, message: `동기화 실패: ${error.message}` };
  }
};

// =============================================================================
// LOCALSTORAGE-BASED FUNCTIONS (Legacy - kept for fallback and compatibility)
// =============================================================================

// --- Exam Management ---

export const getExams = (): ExamConfig[] => {
  const data = localStorage.getItem(KEY_EXAMS);
  return data ? JSON.parse(data) : [];
};

export const getExamById = (id: string): ExamConfig | undefined => {
  const exams = getExams();
  return exams.find(e => e.id === id);
};

export const saveExam = (exam: ExamConfig) => {
  const exams = getExams();
  const index = exams.findIndex(e => e.id === exam.id);
  
  if (index >= 0) {
    exams[index] = exam;
  } else {
    exams.push(exam);
  }
  
  localStorage.setItem(KEY_EXAMS, JSON.stringify(exams));
};

export const completeExam = (examId: string) => {
  const exams = getExams();
  const exam = exams.find(e => e.id === examId);
  if (exam) {
    exam.isCompleted = true;
    exam.completedAt = Date.now();
    saveExam(exam);
  }
};

export const getCompletedExams = (): ExamConfig[] => {
  return getExams().filter(exam => exam.isCompleted === true);
};

export const getActiveExams = (): ExamConfig[] => {
  return getExams().filter(exam => !exam.isCompleted);
};

export const hasUserTakenExam = (examId: string, userId: string): boolean => {
  const scores = getAllScores();
  return scores.some(s => s.examId === examId && s.userId === userId);
};

export const deleteExam = (id: string) => {
  const exams = getExams();
  const newExams = exams.filter(e => e.id !== id);
  localStorage.setItem(KEY_EXAMS, JSON.stringify(newExams));
  
  // Also cleanup scores for this exam
  const scores = getAllScores();
  const newScores = scores.filter(s => s.examId !== id);
  localStorage.setItem(KEY_SCORES, JSON.stringify(newScores));
};

// --- Score Management ---

const getAllScores = (): UserScore[] => {
  const data = localStorage.getItem(KEY_SCORES);
  return data ? JSON.parse(data) : [];
};

export const getScoresByExamId = (examId: string): UserScore[] => {
  const scores = getAllScores();
  return scores.filter(s => s.examId === examId);
};

export const saveUserScore = (score: UserScore) => {
  const scores = getAllScores();
  // Update if exists (though usually new) or push
  const index = scores.findIndex(s => s.id === score.id);
  if (index >= 0) {
    scores[index] = score;
  } else {
    scores.push(score);
  }
  localStorage.setItem(KEY_SCORES, JSON.stringify(scores));
};

export const getUserScoreByExamId = (examId: string, userId: string): UserScore | undefined => {
  const scores = getAllScores();
  return scores.find(s => s.examId === examId && s.userId === userId);
};

// 사용자 성적 수정
export const updateUserScore = (scoreId: string, updates: Partial<UserScore>): boolean => {
  const scores = getAllScores();
  const index = scores.findIndex(s => s.id === scoreId);
  if (index === -1) return false;
  
  // 점수 관련 필드는 반올림 처리
  if (updates.totalScore !== undefined) {
    updates.totalScore = Math.round(updates.totalScore * 100) / 100;
  }
  if (updates.mcqScore !== undefined) {
    updates.mcqScore = Math.round(updates.mcqScore * 100) / 100;
  }
  if (updates.subjectiveScore !== undefined) {
    updates.subjectiveScore = Math.round(updates.subjectiveScore * 100) / 100;
  }
  
  scores[index] = { ...scores[index], ...updates };
  localStorage.setItem(KEY_SCORES, JSON.stringify(scores));
  return true;
};

// 사용자 성적 삭제
export const deleteUserScore = (scoreId: string): boolean => {
  const scores = getAllScores();
  const newScores = scores.filter(s => s.id !== scoreId);
  if (newScores.length === scores.length) return false;
  localStorage.setItem(KEY_SCORES, JSON.stringify(newScores));
  return true;
};

export const resetExamScores = (examId: string) => {
  const scores = getAllScores();
  const newScores = scores.filter(s => s.examId !== examId);
  localStorage.setItem(KEY_SCORES, JSON.stringify(newScores));
};

// --- User Management (Sign Up / Auth) ---

export const getRegisteredUsers = (): RegisteredUser[] => {
  const data = localStorage.getItem(KEY_USERS);
  return data ? JSON.parse(data) : [];
};

export const registerUser = (user: RegisteredUser): boolean => {
  const users = getRegisteredUsers();
  if (users.find(u => u.username === user.username)) {
    return false; // User already exists
  }
  users.push(user);
  localStorage.setItem(KEY_USERS, JSON.stringify(users));
  return true;
};

export const authenticateUser = (usernameOrEmail: string, password: string): RegisteredUser | undefined => {
  const users = getRegisteredUsers();
  // 이메일 또는 아이디로 로그인 가능
  return users.find(u => 
    (u.username === usernameOrEmail || u.email === usernameOrEmail) && 
    u.password === password
  );
};

// IP 주소 가져오기
export const getUserIp = async (): Promise<string> => {
  try {
    const response = await fetch('https://api.ipify.org?format=json');
    const data = await response.json();
    return data.ip || 'Unknown';
  } catch (error) {
    console.error('Failed to get IP address:', error);
    return 'Unknown';
  }
};

// 사용자 로그인 시 IP 기록
export const recordUserLoginIp = async (username: string): Promise<void> => {
  try {
    const ip = await getUserIp();
    const users = getRegisteredUsers();
    const userIndex = users.findIndex(u => u.username === username || u.email === username);
    
    if (userIndex >= 0) {
      const user = users[userIndex];
      const loginIps = user.loginIps || [];
      
      // 같은 IP가 이미 있는지 확인 (최근 24시간 내)
      const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
      const recentIps = loginIps.filter(entry => entry.timestamp > oneDayAgo);
      
      // 같은 IP가 없으면 추가
      if (!recentIps.some(entry => entry.ip === ip)) {
        loginIps.push({ ip, timestamp: Date.now() });
      }
      
      // 최근 50개의 IP만 유지
      user.loginIps = loginIps.slice(-50);
      users[userIndex] = user;
      localStorage.setItem(KEY_USERS, JSON.stringify(users));
    }
  } catch (error) {
    console.error('Failed to record user IP:', error);
  }
};

// 사용자의 IP 목록 가져오기 (관리자용)
export const getUserLoginIps = (username: string): Array<{ ip: string; timestamp: number }> => {
  const users = getRegisteredUsers();
  const user = users.find(u => u.username === username);
  return user?.loginIps || [];
};

export const checkUsernameExists = (username: string): boolean => {
  const users = getRegisteredUsers();
  return users.some(u => u.username === username);
};

export const checkEmailExists = (email: string): boolean => {
  const users = getRegisteredUsers();
  return users.some(u => u.email === email);
};

// 사용자 정보 수정 (관리자용)
export const updateUser = (username: string, updatedData: Partial<RegisteredUser>): boolean => {
  const users = getRegisteredUsers();
  const index = users.findIndex(u => u.username === username);
  if (index >= 0) {
    users[index] = { ...users[index], ...updatedData };
    localStorage.setItem(KEY_USERS, JSON.stringify(users));
    return true;
  }
  return false;
};

// 사용자 삭제 (관리자용)
export const deleteUser = (username: string): boolean => {
  const users = getRegisteredUsers();
  const newUsers = users.filter(u => u.username !== username);
  if (newUsers.length !== users.length) {
    localStorage.setItem(KEY_USERS, JSON.stringify(newUsers));
    return true;
  }
  return false;
};

// 특별 회원 관리
const KEY_SPECIAL_MEMBERS = 'app_special_members';

export const getSpecialMembers = (): string[] => {
  const data = localStorage.getItem(KEY_SPECIAL_MEMBERS);
  // 기본 특별 회원 포함
  const defaultSpecial = ['h2410431@joongdong.hs.kr'];
  const stored = data ? JSON.parse(data) : [];
  return [...new Set([...defaultSpecial, ...stored])];
};

export const addSpecialMember = (email: string): boolean => {
  const members = getSpecialMembers();
  if (!members.includes(email)) {
    const stored = localStorage.getItem(KEY_SPECIAL_MEMBERS);
    const storedList = stored ? JSON.parse(stored) : [];
    storedList.push(email);
    localStorage.setItem(KEY_SPECIAL_MEMBERS, JSON.stringify(storedList));
    return true;
  }
  return false;
};

export const removeSpecialMember = (email: string): boolean => {
  // 기본 특별 회원은 제거 불가
  if (email === 'h2410431@joongdong.hs.kr') return false;
  
  const stored = localStorage.getItem(KEY_SPECIAL_MEMBERS);
  const storedList = stored ? JSON.parse(stored) : [];
  const newList = storedList.filter((e: string) => e !== email);
  localStorage.setItem(KEY_SPECIAL_MEMBERS, JSON.stringify(newList));
  return true;
};

export const isSpecialMember = (email: string): boolean => {
  const members = getSpecialMembers();
  return members.includes(email);
};

// 테스트 계정 초기화
export const initializeTestAccount = () => {
  const users = getRegisteredUsers();
  const testUser = users.find(u => u.username === 'jdmath');
  if (!testUser) {
    registerUser({
      username: 'jdmath',
      password: '1234',
      name: '김중동',
      studentNumber: '2024001',
      email: 'test@joongdong.hs.kr',
      grade: 2
    });
  }
};


// Helper to simulate data for testing N >= 30 condition
export const generateMockData = (exam: ExamConfig, count: number = 30) => {
  const currentScores = getAllScores();
  const maxMcqScore = exam.mcqs.reduce((acc, q) => acc + q.points, 0);
  const maxSubjScore = exam.subjectives.reduce((acc, q) => acc + q.points, 0);
  const maxScore = maxMcqScore + maxSubjScore;
  
  const newScores: UserScore[] = Array.from({ length: count }).map((_, i) => {
    // Generate a normally distributed-ish score
    const u = 1 - Math.random(); 
    const v = Math.random();
    const z = Math.sqrt( -2.0 * Math.log( u ) ) * Math.cos( 2.0 * Math.PI * v );
    
    // Mean at 70% of max, StdDev approx 15% of max
    // 학생 실력 수준 (0 = 평균, 양수 = 잘함, 음수 = 못함)
    const studentAbility = z;
    
    // 객관식 답안 생성 (실력에 따라 정답률 달라짐)
    const mcqAnswers: Record<number, number> = {};
    let mcqScore = 0;
    exam.mcqs.forEach((q, idx) => {
      // 정답 확률 = 기본 60% + 실력에 따른 조정 (최대 95%, 최소 20%)
      const correctProb = Math.min(0.95, Math.max(0.20, 0.60 + studentAbility * 0.15));
      const isCorrect = Math.random() < correctProb;
      
      if (isCorrect) {
        mcqAnswers[idx] = q.correctOption;
        mcqScore += q.points;
      } else {
        // 틀린 답 중 하나를 랜덤으로 선택 (1~5 중 정답 제외)
        const wrongOptions = [1, 2, 3, 4, 5].filter(opt => opt !== q.correctOption);
        mcqAnswers[idx] = wrongOptions[Math.floor(Math.random() * wrongOptions.length)];
      }
    });
    
    // 주관식 점수 생성
    const subjectiveScores: Record<number, number> = {};
    let subjScore = 0;
    exam.subjectives.forEach((q, idx) => {
      // 점수 비율 = 기본 60% + 실력에 따른 조정 + 약간의 랜덤
      const scoreRatio = Math.min(1.0, Math.max(0, 0.60 + studentAbility * 0.15 + (Math.random() - 0.5) * 0.3));
      const score = Math.round(q.points * scoreRatio * 10) / 10; // 소수점 1자리
      subjectiveScores[idx] = Math.min(q.points, Math.max(0, score));
      subjScore += subjectiveScores[idx];
    });
    
    const simulatedTotal = mcqScore + subjScore;

    return {
      id: `mock-${exam.id}-${Date.now()}-${i}`,
      examId: exam.id,
      studentName: `학생${i+1}`,
      studentNumber: `2024${1000+i}`,
      userId: `mock-user-${i}`,
      totalScore: Math.round(simulatedTotal * 10) / 10,
      mcqScore: mcqScore, 
      subjectiveScore: Math.round(subjScore * 10) / 10,
      mcqAnswers: mcqAnswers,
      subjectiveScores: subjectiveScores,
      timestamp: Date.now()
    };
  });

  localStorage.setItem(KEY_SCORES, JSON.stringify([...currentScores, ...newScores]));
};

// --- Comment Management ---

const getAllComments = (): ExamReview[] => {
  const data = localStorage.getItem(KEY_COMMENTS);
  return data ? JSON.parse(data) : [];
};

export const getCommentsByExamId = (examId: string): ExamComment[] => {
  const reviews = getAllComments();
  const review = reviews.find(r => r.examId === examId);
  return review ? review.comments : [];
};

export const hasUserCommented = (examId: string, userId: string): boolean => {
  const comments = getCommentsByExamId(examId);
  return comments.some(c => c.userId === userId);
};

// 별점만 제출했는지 확인 (댓글은 여러 개 가능하지만, 별점은 한 번만 가능)
export const hasUserRated = (examId: string, userId: string): boolean => {
  const comments = getCommentsByExamId(examId);
  return comments.some(c => c.userId === userId && c.difficulty > 0);
};

export const addComment = async (comment: ExamComment) => {
  // IP 주소 가져오기 (간단한 방법)
  let ipAddress = 'Unknown';
  try {
    // 클라이언트 측에서 IP 주소를 가져오는 것은 제한적이지만, 
    // 외부 서비스를 사용하거나 서버에서 처리해야 합니다.
    // 여기서는 간단히 시도만 합니다.
    const response = await fetch('https://api.ipify.org?format=json');
    const data = await response.json();
    ipAddress = data.ip || 'Unknown';
  } catch (error) {
    console.error('Failed to get IP address:', error);
  }
  
  const commentWithMetadata = {
    ...comment,
    ipAddress,
    email: comment.email || 'Unknown'
  };
  
  const reviews = getAllComments();
  let review = reviews.find(r => r.examId === comment.examId);
  
  if (!review) {
    review = { examId: comment.examId, comments: [] };
    reviews.push(review);
  }
  
  review.comments.push(commentWithMetadata);
  localStorage.setItem(KEY_COMMENTS, JSON.stringify(reviews));
};

export const getNextAnonymousId = (): string => {
  const counter = parseInt(localStorage.getItem(KEY_ANONYMOUS_COUNTER) || '0', 10);
  const nextCounter = counter + 1;
  localStorage.setItem(KEY_ANONYMOUS_COUNTER, nextCounter.toString());
  return `위즈원 ${nextCounter}`;
};

// 댓글 수정
export const updateComment = (examId: string, commentId: string, updates: Partial<ExamComment>): boolean => {
  const reviews = getAllComments();
  const review = reviews.find(r => r.examId === examId);
  
  if (!review) return false;
  
  const commentIndex = review.comments.findIndex(c => c.id === commentId);
  if (commentIndex === -1) return false;
  
  review.comments[commentIndex] = { ...review.comments[commentIndex], ...updates };
  localStorage.setItem(KEY_COMMENTS, JSON.stringify(reviews));
  return true;
};

// 댓글 삭제
export const deleteComment = (examId: string, commentId: string): boolean => {
  const reviews = getAllComments();
  const review = reviews.find(r => r.examId === examId);
  
  if (!review) return false;
  
  const commentIndex = review.comments.findIndex(c => c.id === commentId);
  if (commentIndex === -1) return false;
  
  review.comments.splice(commentIndex, 1);
  localStorage.setItem(KEY_COMMENTS, JSON.stringify(reviews));
  return true;
};

// --- Email Verification ---
// 실제 이메일 발송을 위한 함수
export const sendVerificationEmail = async (email: string): Promise<string> => {
  const code = Math.floor(1000 + Math.random() * 9000).toString();
  const verificationToken = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  // 인증 토큰을 로컬 스토리지에 저장 (인증 페이지에서 사용)
  localStorage.setItem(`email_verification_token_${email}`, verificationToken);
  localStorage.setItem(`email_verification_code_${email}`, code);
  
  try {
    // 실제 이메일 발송 API 호출
    // 백엔드 API 엔드포인트를 여기에 설정하세요
    const apiEndpoint = import.meta.env.VITE_EMAIL_API_URL || '/api/send-verification';
    const verificationUrl = `${window.location.origin}/verify-email?token=${verificationToken}&email=${encodeURIComponent(email)}`;
    
    const response = await fetch(apiEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: email,
        code: code,
        verificationUrl: verificationUrl,
        subject: 'JDMATH GRADE SYSTEM 이메일 인증',
        htmlMessage: `
          <h2>JDMATH GRADE SYSTEM 이메일 인증</h2>
          <p>인증 코드: <strong>${code}</strong></p>
          <p>아래 링크를 클릭하거나 인증 코드를 입력하여 이메일 인증을 완료해주세요.</p>
          <p><a href="${verificationUrl}" style="display: inline-block; padding: 10px 20px; background-color: #4f46e5; color: white; text-decoration: none; border-radius: 5px;">인증 페이지로 이동</a></p>
          <p>또는 인증 코드를 직접 입력하세요: <strong>${code}</strong></p>
        `,
        textMessage: `인증 코드: ${code}\n\n인증 페이지: ${verificationUrl}\n\n이 코드를 입력하여 이메일 인증을 완료해주세요.`
      })
    });

    if (!response.ok) {
      // API가 없거나 실패한 경우, 개발 환경에서는 로컬 스토리지에 저장
      if (import.meta.env.DEV) {
        console.log(`[개발 환경] 이메일 인증 코드가 로컬 스토리지에 저장되었습니다: ${code}`);
        console.log(`[개발 환경] 인증 URL: ${verificationUrl}`);
        console.log(`[개발 환경] 실제 환경에서는 백엔드 API를 통해 이메일이 발송됩니다.`);
        return code;
      }
      throw new Error('이메일 발송에 실패했습니다.');
    }

    const data = await response.json();
    return data.code || code;
  } catch (error) {
    // 개발 환경에서는 로컬 스토리지에 저장
    if (import.meta.env.DEV) {
      console.log(`[개발 환경] 이메일 인증 코드가 로컬 스토리지에 저장되었습니다: ${code}`);
      console.log(`[개발 환경] 실제 환경에서는 백엔드 API를 통해 이메일이 발송됩니다.`);
    }
    // 실제 환경에서는 에러를 throw
    throw error;
  }
};

// --- Refined Prediction Management ---
const KEY_REFINED_PREDICTIONS = 'app_refined_predictions';

export interface RefinedPredictionData {
  examId: string;
  userId: string;
  prediction: any;
  savedAt: number;
}

export const saveRefinedPrediction = (examId: string, userId: string, prediction: any): void => {
  const predictions = getRefinedPredictions();
  const key = `${examId}_${userId}`;
  predictions[key] = {
    examId,
    userId,
    prediction,
    savedAt: Date.now()
  };
  localStorage.setItem(KEY_REFINED_PREDICTIONS, JSON.stringify(predictions));
};

export const getRefinedPrediction = (examId: string, userId: string): any | null => {
  const predictions = getRefinedPredictions();
  const key = `${examId}_${userId}`;
  const data = predictions[key];
  return data ? data.prediction : null;
};

export const getRefinedPredictions = (): Record<string, RefinedPredictionData> => {
  const data = localStorage.getItem(KEY_REFINED_PREDICTIONS);
  return data ? JSON.parse(data) : {};
};

// --- 데이터 백업 및 복원 ---

export interface BackupData {
  version: string;
  timestamp: number;
  exams: ExamConfig[];
  scores: UserScore[];
  users: RegisteredUser[];
  comments: ExamReview[];
  specialMembers: string[];
  anonymousCounter: number;
  refinedPredictions: Record<string, RefinedPredictionData>;
}

// 모든 데이터 내보내기 (백업)
export const exportAllData = (): BackupData => {
  return {
    version: '1.0',
    timestamp: Date.now(),
    exams: getExams(),
    scores: JSON.parse(localStorage.getItem(KEY_SCORES) || '[]'),
    users: getRegisteredUsers(),
    comments: JSON.parse(localStorage.getItem(KEY_COMMENTS) || '[]'),
    specialMembers: JSON.parse(localStorage.getItem('app_special_members') || '[]'),
    anonymousCounter: parseInt(localStorage.getItem(KEY_ANONYMOUS_COUNTER) || '0', 10),
    refinedPredictions: getRefinedPredictions()
  };
};

// 데이터 가져오기 (복원)
export const importAllData = (backup: BackupData): boolean => {
  try {
    if (!backup.version || !backup.timestamp) {
      throw new Error('유효하지 않은 백업 파일입니다.');
    }
    
    // 기존 데이터 백업 (혹시 모를 복구를 위해)
    const currentBackup = exportAllData();
    localStorage.setItem('app_backup_before_import', JSON.stringify(currentBackup));
    
    // 데이터 복원
    localStorage.setItem(KEY_EXAMS, JSON.stringify(backup.exams || []));
    localStorage.setItem(KEY_SCORES, JSON.stringify(backup.scores || []));
    localStorage.setItem(KEY_USERS, JSON.stringify(backup.users || []));
    localStorage.setItem(KEY_COMMENTS, JSON.stringify(backup.comments || []));
    localStorage.setItem('app_special_members', JSON.stringify(backup.specialMembers || []));
    localStorage.setItem(KEY_ANONYMOUS_COUNTER, (backup.anonymousCounter || 0).toString());
    localStorage.setItem('app_refined_predictions', JSON.stringify(backup.refinedPredictions || {}));
    
    return true;
  } catch (error) {
    console.error('데이터 복원 실패:', error);
    return false;
  }
};

// 백업 파일 다운로드
export const downloadBackup = () => {
  const data = exportAllData();
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `jdmath_backup_${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

// 시험별 데이터 다운로드 (CSV)
export const downloadExamData = (examId: string, examTitle: string) => {
  const exam = getExamById(examId);
  const scores = getScoresByExamId(examId);
  const comments = getCommentsByExamId(examId);
  
  if (!exam) return;
  
  // CSV 헤더
  let csv = '\uFEFF'; // BOM for Korean encoding
  csv += '학생명,학번,총점,객관식점수,주관식점수,제출시간';
  
  // 객관식 답안 헤더
  exam.mcqs.forEach((_, idx) => {
    csv += `,객관식${idx + 1}번`;
  });
  
  // 주관식 점수 헤더
  exam.subjectives.forEach((_, idx) => {
    csv += `,서술형${idx + 1}번`;
  });
  
  csv += '\n';
  
  // 데이터 행
  scores.forEach(score => {
    csv += `${score.studentName},${score.studentNumber},${Math.round(score.totalScore * 100) / 100},${Math.round(score.mcqScore * 100) / 100},${Math.round(score.subjectiveScore * 100) / 100},${new Date(score.timestamp).toLocaleString()}`;
    
    // 객관식 답안
    exam.mcqs.forEach((_, idx) => {
      csv += `,${score.mcqAnswers?.[idx] || '-'}`;
    });
    
    // 주관식 점수
    exam.subjectives.forEach((_, idx) => {
      csv += `,${score.subjectiveScores?.[idx] ?? '-'}`;
    });
    
    csv += '\n';
  });
  
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${examTitle.replace(/[^a-zA-Z0-9가-힣]/g, '_')}_채점결과_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

// 시험 설정 데이터 다운로드 (JSON)
export const downloadExamConfig = (examId: string, examTitle: string) => {
  const exam = getExamById(examId);
  const scores = getScoresByExamId(examId);
  const comments = getCommentsByExamId(examId);
  
  if (!exam) return;
  
  const data = {
    exam,
    scores,
    comments,
    exportedAt: Date.now()
  };
  
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${examTitle.replace(/[^a-zA-Z0-9가-힣]/g, '_')}_전체데이터_${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

// 회원 데이터 다운로드 (CSV)
export const downloadUsersData = () => {
  const users = getRegisteredUsers();
  
  // CSV 헤더
  let csv = '\uFEFF'; // BOM for Korean encoding
  csv += '아이디,이름,학번,이메일,학년,가입일,접속IP목록\n';
  
  users.forEach(user => {
    const ips = user.loginIps?.map(ip => ip.ip).join('; ') || '-';
    csv += `${user.username},${user.name},${user.studentNumber},${user.email},${user.grade || '-'},${user.supabaseUserId ? 'Supabase' : 'Local'},"${ips}"\n`;
  });
  
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `회원목록_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};
