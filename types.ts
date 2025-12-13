
export interface McqConfig {
  id: number;
  points: number;
  correctOption: number; // 1-5
}

export interface SubjectiveConfig {
  id: number;
  points: number;
  type?: 'SELF' | 'AUTO'; // Default to SELF if undefined
  correctAnswer?: string; // For AUTO type
}

export interface ExamConfig {
  id: string;
  title: string;
  mcqs: McqConfig[];
  subjectives: SubjectiveConfig[];
  gradingSystem?: 'CSAT' | 'RELATIVE_5' | 'ABSOLUTE'; // CSAT (9-Tier), RELATIVE_5 (5-Tier), ABSOLUTE (A/B/C)
  grade?: 1 | 2 | 3; // 학년 (1학년, 2학년, 3학년)
  createdAt: number;
  isCompleted?: boolean; // 시험 종료 여부
  completedAt?: number; // 시험 종료 시간
  subject?: string; // 과목명
  semester?: 1 | 2; // 학기
  year?: number; // 연도 (예: 2024)
  examType?: 'MIDTERM' | 'FINAL' | 'FINAL_ONLY'; // 중간고사, 기말고사, 기말고사 단독
  parentExamId?: string; // 중간고사가 있는 경우 기말고사의 부모 시험 ID
  // 중간고사 없이 통합 등급컷 계산을 위한 관리자 입력 데이터
  midtermStats?: {
    mean: number;
    stdDev: number;
    totalPoints: number;
  };
}

export interface UserScore {
  id: string;
  examId: string;
  studentName: string;
  studentNumber: string; // 학번
  userId?: string; // 사용자 ID (시험 응시 여부 추적용)
  totalScore: number;
  mcqScore: number;
  subjectiveScore: number;
  timestamp: number;
  previousExamGrade?: number | 'UNKNOWN'; // 직전 시험 등급
  lastSemesterGrade?: number | 'UNKNOWN'; // 지난 학기 등급
  lastYearFirstSemesterGrade?: number | 'UNKNOWN'; // 작년 1학기 등급
  lastYearSecondSemesterGrade?: number | 'UNKNOWN'; // 작년 2학기 등급
  mcqAnswers?: Record<number, number>; // 객관식 답안 (오답률 계산용)
  subjectiveScores?: Record<number, number>; // 주관식 점수 (오답률 계산용)
}

export interface RegisteredUser {
  username: string;
  password: string;
  name: string;
  studentNumber: string;
  email: string;
  grade?: 1 | 2 | 3; // 학년
  supabaseUserId?: string; // Supabase 사용자 ID
  loginIps?: Array<{ ip: string; timestamp: number }>; // 접속 IP 기록
  isSpecialMember?: boolean; // 특별 회원 여부
}

export interface GradeTier {
  grade: number;
  percentileRaw: number; // e.g. 4 for top 4%
  label: string;
}

export interface CutoffResult {
  grade: number;
  minScore: number;
  countInTier: number;
  cumulativePercent: number;
}

export type UserRole = 'ADMIN' | 'STUDENT' | null;

// 댓글 및 평가 관련 타입
export interface ExamComment {
  id: string;
  examId: string;
  userId: string; // 실제 사용자 ID (관리자용)
  anonymousId: string; // 익명 ID (위즈원 1, 2, 3...)
  content: string;
  difficulty: number; // 난이도 별점 (1-5)
  timestamp: number;
  ipAddress?: string; // IP 주소 (관리자용)
  email?: string; // 이메일 (관리자용)
  showGolden?: boolean; // 특별 회원 황금색 표시 여부
}

export interface ExamReview {
  examId: string;
  comments: ExamComment[];
}

export interface UserSession {
  role: UserRole;
  name?: string;
  studentNumber?: string;
  username?: string; // ID for logged in user
  grade?: 1 | 2 | 3; // 사용자 학년
  email?: string; // 이메일
  userId?: string; // Supabase 사용자 ID
}
