
import React, { useState, useEffect } from 'react';
import AdminDashboard from './components/AdminDashboard';
import UserExam from './components/UserExam';
import ResultStats from './components/ResultStats';
import Login from './components/Login';
import ProfileEdit from './components/ProfileEdit';
import { UserSession, ExamConfig } from './types';
import { getExams, getActiveExams, getCompletedExams, hasUserTakenExam, getScoresByExamId, initializeTestAccount, syncSupabaseToLocal } from './services/storageService';
import { isSupabaseConfigured } from './services/supabaseClient';
import { calculateCutoffs, CSAT_TIERS, RELATIVE_5_TIERS } from './services/mathService';
import { LogOut, FileText, BarChart2, Instagram, ChevronDown, Github } from 'lucide-react';

type ViewState = 'LOGIN' | 'HOME' | 'ADMIN' | 'EXAM' | 'RESULT' | 'GRADE_1' | 'GRADE_2' | 'GRADE_3' | 'ABOUT' | 'CUTOFF_1' | 'CUTOFF_2' | 'CUTOFF_3' | 'PAST_1' | 'PAST_2' | 'PAST_3' | 'PROFILE';

const App: React.FC = () => {
  const [session, setSession] = useState<UserSession | null>(null);
  const [view, setView] = useState<ViewState>('HOME');
  
  // Selection State
  const [selectedExamId, setSelectedExamId] = useState<string | null>(null);
  const [currentResultId, setCurrentResultId] = useState<string | undefined>(undefined);
  const [examList, setExamList] = useState<ExamConfig[]>([]);
  const [cutoffYear, setCutoffYear] = useState<number | 'ALL'>(new Date().getFullYear());
  const [cutoffSemester, setCutoffSemester] = useState<1 | 2 | 'ALL'>('ALL'); // 기본값을 전체로 변경

  // 1. Restore session from localStorage on mount + Initialize test account
  useEffect(() => {
    // 테스트 계정 초기화
    initializeTestAccount();
    
    const savedSession = localStorage.getItem('app_session');
    if (savedSession) {
      try {
        const parsedSession = JSON.parse(savedSession);
        setSession(parsedSession);
        if (parsedSession.role === 'ADMIN') {
          setView('ADMIN');
        } else {
          setView('HOME');
        }
      } catch (e) {
        localStorage.removeItem('app_session');
      }
    } else {
      setView('HOME'); // 세션이 없어도 홈 화면 표시
    }
  }, []);

  // Refresh exam list whenever navigating to HOME or grade pages
  useEffect(() => {
    if ((view === 'HOME' || view === 'GRADE_1' || view === 'GRADE_2' || view === 'GRADE_3') && session?.role === 'STUDENT') {
      // 활성 시험만 표시 (종료되지 않은 시험)
      setExamList(getActiveExams());
    }
  }, [view, session]);

  // Auto-sync from cloud every 10 seconds when logged in and Supabase is configured
  useEffect(() => {
    if (!session || !isSupabaseConfigured()) {
      return; // Don't sync if not logged in or Supabase not configured
    }

    console.log('[App] Starting auto-sync from cloud (every 10 seconds)');

    // Initial sync on mount
    syncSupabaseToLocal().then(result => {
      if (result.success) {
        console.log('[App] Initial sync completed:', result.message);
        // Refresh exam list if student view
        if (session?.role === 'STUDENT' && (view === 'HOME' || view === 'GRADE_1' || view === 'GRADE_2' || view === 'GRADE_3')) {
          setExamList(getActiveExams());
        }
      }
    }).catch(error => {
      console.error('[App] Initial sync error:', error);
    });

    // Set up interval for periodic sync
    const syncInterval = setInterval(() => {
      console.log('[App] Auto-syncing from cloud...');
      syncSupabaseToLocal().then(result => {
        if (result.success) {
          console.log('[App] Auto-sync completed:', result.message);
          // Refresh exam list if student view
          if (session?.role === 'STUDENT' && (view === 'HOME' || view === 'GRADE_1' || view === 'GRADE_2' || view === 'GRADE_3')) {
            setExamList(getActiveExams());
          }
        }
      }).catch(error => {
        console.error('[App] Auto-sync error:', error);
      });
    }, 10000); // 10 seconds

    // Cleanup interval on unmount or session change
    return () => {
      console.log('[App] Stopping auto-sync');
      clearInterval(syncInterval);
    };
  }, [session, view]); // Re-run when session or view changes

  const handleLogin = (userSession: UserSession) => {
    setSession(userSession);
    localStorage.setItem('app_session', JSON.stringify(userSession)); // Persist session
    if (userSession.role === 'ADMIN') {
      setView('ADMIN');
    } else {
      setView('HOME');
    }
  };

  const handleLogout = () => {
    setSession(null);
    localStorage.removeItem('app_session'); // Clear session
    setView('HOME'); // 로그아웃 후 홈으로
    setSelectedExamId(null);
    setCurrentResultId(undefined);
  };

  const requireLogin = (action: () => void) => {
    if (!session) {
      if (confirm('로그인이 필요합니다. 로그인하시겠습니까?')) {
        setView('LOGIN');
      }
    } else {
      action();
    }
  };

  const startExam = (examId: string) => {
    requireLogin(() => {
    setSelectedExamId(examId);
    setView('EXAM');
    });
  };
  
  const viewResult = (examId: string, resultId?: string) => {
    requireLogin(() => {
    setSelectedExamId(examId);
    setCurrentResultId(resultId);
    setView('RESULT');
    });
  };

  const renderContent = () => {
    // 로그인 화면
    if (view === 'LOGIN') {
      return <Login onLogin={handleLogin} onCancel={() => setView('HOME')} />;
    }
    
    // 앱 더 알아보기 (로그인 없이도 접근 가능)
    if (view === 'ABOUT') {
      return (
        <div className="max-w-4xl mx-auto p-4 md:p-6">
          <div className="text-center py-6 md:py-10">
            <h1 className="text-2xl md:text-3xl font-bold text-slate-800">앱 더 알아보기</h1>
            <p className="text-sm md:text-base text-slate-500 mt-2">JDMATH GRADE SYSTEM에 대해 알아보세요.</p>
          </div>
          <div className="bg-white p-4 md:p-8 rounded-xl shadow-sm border border-slate-200 space-y-4 md:space-y-6">
            <div>
              <p className="text-sm md:text-base text-slate-700 leading-relaxed mb-3 md:mb-4">
                JDMATH GRADE SYSTEM은 전국 내신 시험 전용 성적 분석·예측 시스템입니다.
              </p>
              <p className="text-sm md:text-base text-slate-700 leading-relaxed mb-3 md:mb-4">
                학생들이 자발적으로 제출한 표본 점수를 기반으로, 응답 편향·극단값·상위권 쏠림 현상을 수학적으로 보정하여 전체 학년의 평균과 표준편차를 정밀하게 추정합니다.
              </p>
              <p className="text-sm md:text-base text-slate-700 leading-relaxed">
                앱 개발에 대한 추가적인 정보는 개발자 인스타그램과 Github를 참조하세요.
              </p>
            </div>
            
            {/* 알고리즘 설명 섹션 */}
            <div className="pt-4 md:pt-6 border-t border-slate-200">
              <h2 className="text-lg md:text-xl font-bold text-slate-800 mb-3 md:mb-4">📊 평균·표준편차 추정 알고리즘</h2>
              
              <div className="space-y-3 md:space-y-4 text-slate-700 leading-relaxed">
                <div className="bg-indigo-50 p-3 md:p-4 rounded-lg border border-indigo-100">
                  <h3 className="font-semibold text-indigo-800 mb-2 text-sm md:text-base">1. 기본 통계 계산</h3>
                  <p className="text-xs md:text-sm mb-2">표본 평균 (Sample Mean):</p>
                  <div className="bg-white p-2 md:p-3 rounded font-mono text-xs md:text-sm text-center border overflow-x-auto">
                    μ̂ = (1/n) × Σxᵢ
                  </div>
                  <p className="text-xs md:text-sm mt-2">표본 표준편차 (Sample Standard Deviation):</p>
                  <div className="bg-white p-2 md:p-3 rounded font-mono text-xs md:text-sm text-center border overflow-x-auto">
                    σ̂ = √[(1/(n-1)) × Σ(xᵢ - μ̂)²]
                  </div>
                </div>
                
                <div className="bg-amber-50 p-3 md:p-4 rounded-lg border border-amber-100">
                  <h3 className="font-semibold text-amber-800 mb-2 text-sm md:text-base">2. 상위권 쏠림 보정</h3>
                  <p className="text-xs md:text-sm mb-2">
                    성적이 높은 학생들이 더 적극적으로 성적을 입력하는 경향이 있어, 평균이 실제보다 높게 추정됩니다.
                  </p>
                  <div className="bg-white p-2 md:p-3 rounded font-mono text-xs md:text-sm text-center border overflow-x-auto">
                    μ_corrected = μ̂ × (1 - bias) + μ_est × bias
                  </div>
                  <p className="text-[10px] md:text-xs text-amber-700 mt-2">
                    * bias_factor는 표본 크기와 점수 분포의 왜도를 기반으로 동적 계산됩니다.
                  </p>
                </div>
                
                <div className="bg-green-50 p-3 md:p-4 rounded-lg border border-green-100">
                  <h3 className="font-semibold text-green-800 mb-2 text-sm md:text-base">3. 극단값 처리</h3>
                  <p className="text-xs md:text-sm mb-2">
                    가짜 점수나 극단적인 값을 제거하기 위해 IQR 방법을 사용합니다:
                  </p>
                  <div className="bg-white p-2 md:p-3 rounded font-mono text-xs md:text-sm text-center border overflow-x-auto">
                    범위: [Q1 - 1.5×IQR, Q3 + 1.5×IQR]
                  </div>
                  <p className="text-[10px] md:text-xs text-green-700 mt-2">
                    * Q1 = 1사분위수, Q3 = 3사분위수, IQR = Q3 - Q1
                  </p>
                </div>
                
                <div className="bg-purple-50 p-3 md:p-4 rounded-lg border border-purple-100">
                  <h3 className="font-semibold text-purple-800 mb-2 text-sm md:text-base">4. 등급컷 계산</h3>
                  <p className="text-xs md:text-sm mb-2">
                    보정된 평균과 표준편차를 사용하여 정규분포 가정 하에 등급컷을 계산합니다:
                  </p>
                  <div className="bg-white p-2 md:p-3 rounded font-mono text-xs md:text-sm text-center border">
                    등급컷 = μ + z × σ
                  </div>
                  <p className="text-[10px] md:text-xs text-purple-700 mt-2">
                    * z는 각 등급의 누적 백분율에 해당하는 표준정규분포의 z-점수입니다.
                  </p>
                </div>
                
                <div className="bg-slate-100 p-3 md:p-4 rounded-lg">
                  <h3 className="font-semibold text-slate-800 mb-2 text-sm md:text-base">5. 신뢰도 지표</h3>
                  <ul className="text-xs md:text-sm space-y-1 list-disc list-inside">
                    <li>표본 크기가 30명 이상일 때 등급컷 산출 가능</li>
                    <li>표본이 많을수록 추정의 정확도 향상</li>
                    <li>중간고사 + 기말고사 데이터 결합 시 통합 등급컷 예측 가능</li>
                  </ul>
                </div>
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 md:gap-4 pt-4 border-t border-slate-200">
              <span className="text-xs md:text-sm font-medium text-slate-700">개발자:</span>
              <div className="flex flex-wrap gap-2 md:gap-3">
                <a
                  href="https://www.instagram.com/yoonheo1205/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 md:gap-2 px-3 md:px-4 py-1.5 md:py-2 bg-gradient-to-r from-pink-500 to-purple-500 text-white rounded-lg hover:from-pink-600 hover:to-purple-600 transition-all shadow-md hover:shadow-lg text-xs md:text-sm"
                >
                  <Instagram size={16} className="md:w-5 md:h-5" />
                  <span>@yoonheo1205</span>
                </a>
                <a
                  href="https://github.com/yoonheo1205"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 md:gap-2 px-3 md:px-4 py-1.5 md:py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-900 transition-all shadow-md hover:shadow-lg text-xs md:text-sm"
                >
                  <Github size={16} className="md:w-5 md:h-5" />
                  <span>GitHub</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      );
    }
    
    // 프로필 수정 화면
    if (view === 'PROFILE' && session) {
      return (
        <div className="max-w-2xl mx-auto p-4 md:p-6">
          <h1 className="text-2xl md:text-3xl font-bold text-slate-800 mb-6">회원정보 수정</h1>
          <ProfileEdit session={session} onUpdate={(updatedSession) => {
            setSession(updatedSession);
            localStorage.setItem('app_session', JSON.stringify(updatedSession));
            setView('HOME');
          }} onCancel={() => setView('HOME')} />
        </div>
      );
    }
    
    // 비로그인 홈 화면
    if (!session && view === 'HOME') {
      return (
        <div className="max-w-4xl mx-auto p-4 md:p-6">
          <div className="text-center py-10 md:py-16">
            <h1 className="text-3xl md:text-4xl font-bold text-slate-800 mb-4">JDMATH GRADE SYSTEM</h1>
            <p className="text-base md:text-lg text-slate-600 mb-8">전국 내신 시험 전용 성적 분석·예측 시스템</p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={() => setView('LOGIN')}
                className="px-8 py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors"
              >
                로그인
              </button>
              <button
                onClick={() => setView('ABOUT')}
                className="px-8 py-3 bg-white border border-slate-300 text-slate-700 rounded-lg font-medium hover:bg-slate-50 transition-colors"
              >
                앱 더 알아보기
              </button>
            </div>
          </div>
          
          <div className="mt-12 grid md:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
              <h2 className="text-xl font-bold text-slate-800 mb-3">시험 채점하기</h2>
              <p className="text-slate-600 mb-4">시험을 채점하고 결과를 확인하세요.</p>
              <button
                onClick={() => requireLogin(() => setView('HOME'))}
                className="w-full px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors"
              >
                채점하기
              </button>
            </div>
            
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
              <h2 className="text-xl font-bold text-slate-800 mb-3">등급 컷 보기</h2>
              <p className="text-slate-600 mb-4">시험별 등급 컷을 확인하세요.</p>
              <button
                onClick={() => requireLogin(() => setView('CUTOFF_1'))}
                className="w-full px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors"
              >
                등급 컷 보기
              </button>
            </div>
          </div>
        </div>
      );
    }
    
    if (!session) {
      return null; // 다른 뷰는 세션이 필요
    }

    // 프로필 수정 화면
    if (view === 'PROFILE' && session) {
      return (
        <div className="max-w-2xl mx-auto p-4 md:p-6">
          <ProfileEdit 
            session={session} 
            onUpdate={(updatedSession) => {
              setSession(updatedSession);
              localStorage.setItem('app_session', JSON.stringify(updatedSession));
              setView('HOME');
            }} 
            onCancel={() => setView('HOME')} 
          />
        </div>
      );
    }

    if (view === 'ADMIN') {
      return <AdminDashboard />;
    }

    if (view === 'EXAM' && selectedExamId) {
      // 학년 검증 (타입 안전성 확보)
      const exam = examList.find(e => e.id === selectedExamId);
      if (exam && exam.grade && session.grade) {
        // 타입을 명시적으로 숫자로 변환하여 비교
        const examGrade = Number(exam.grade);
        const sessionGrade = Number(session.grade);
        
        if (examGrade !== sessionGrade) {
          return (
            <div className="max-w-4xl mx-auto p-6">
              <div className="text-center py-12 bg-white rounded-xl shadow-sm border border-red-200">
                <h2 className="text-2xl font-bold text-red-600 mb-4">시험 응시 불가</h2>
                <p className="text-slate-600 mb-4">
                  이 시험은 {examGrade}학년용입니다. {sessionGrade}학년 학생은 응시할 수 없습니다.
                </p>
                <button 
                  onClick={() => setView('HOME')}
                  className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                >
                  돌아가기
                </button>
              </div>
            </div>
          );
        }
      }
      
      return (
        <UserExam 
          examId={selectedExamId} 
          user={session}
          onComplete={(scoreId) => viewResult(selectedExamId, scoreId)} 
          onCancel={() => setView('HOME')}
        />
      );
    }

    if (view === 'RESULT' && selectedExamId) {
      return (
        <ResultStats 
          examId={selectedExamId}
          currentResultId={currentResultId}
          currentUserId={session.username}
          currentUserEmail={session.email}
          onClose={() => setView('HOME')} 
        />
      );
    }

    // Grade-specific pages or default home
    let currentGrade: 1 | 2 | 3 | null = null;
    if (view === 'GRADE_1' || view === 'CUTOFF_1' || view === 'PAST_1') currentGrade = 1;
    else if (view === 'GRADE_2' || view === 'CUTOFF_2' || view === 'PAST_2') currentGrade = 2;
    else if (view === 'GRADE_3' || view === 'CUTOFF_3' || view === 'PAST_3') currentGrade = 3;
    
    const filteredExams = currentGrade ? examList.filter(exam => exam.grade === currentGrade) : examList;

    // 등급 컷 보기 페이지
    if (view === 'CUTOFF_1' || view === 'CUTOFF_2' || view === 'CUTOFF_3') {
      const allExams = getExams();
      const availableYears = Array.from(new Set(allExams.map(e => e.year || new Date().getFullYear()))).sort((a, b) => b - a);
      const availableSemesters = [1, 2];
      
      // 필터링된 시험들 (연도, 학기, 학년별)
      const filteredExamsByYearSemester = allExams.filter(exam => {
        const matchYear = cutoffYear === 'ALL' || exam.year === cutoffYear;
        const matchSemester = cutoffSemester === 'ALL' || exam.semester === cutoffSemester;
        const matchGrade = exam.grade === currentGrade;
        return matchYear && matchSemester && matchGrade;
      });
      
      // 과목별로 그룹화
      const examsBySubject = filteredExamsByYearSemester.reduce((acc, exam) => {
        const subject = exam.subject || '기타';
        if (!acc[subject]) acc[subject] = [];
        acc[subject].push(exam);
        return acc;
      }, {} as Record<string, ExamConfig[]>);
      
      return (
        <div className="max-w-6xl mx-auto p-4 md:p-6">
          <div className="text-center py-6 md:py-10">
            <h1 className="text-2xl md:text-3xl font-bold text-slate-800">{currentGrade}학년 등급 컷 보기</h1>
            <p className="text-sm md:text-base text-slate-500 mt-2">등급 컷을 확인할 시험을 선택하세요.</p>
          </div>
          
          {/* 연도/학기 필터 */}
          <div className="bg-white p-4 md:p-6 rounded-xl shadow-sm border border-slate-200 mb-6">
            <div className="flex flex-col sm:flex-row gap-4 items-center">
              <label className="text-sm font-medium text-slate-700">연도:</label>
              <select
                value={cutoffYear}
                onChange={(e) => setCutoffYear(e.target.value === 'ALL' ? 'ALL' : parseInt(e.target.value))}
                className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
              >
                <option value="ALL">전체 연도</option>
                {availableYears.map(y => <option key={y} value={y}>{y}년</option>)}
              </select>
              <label className="text-sm font-medium text-slate-700">학기:</label>
              <div className="flex gap-2">
                <button
                  onClick={() => setCutoffSemester(1)}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    cutoffSemester === 1
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  1학기
                </button>
                <button
                  onClick={() => setCutoffSemester(2)}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    cutoffSemester === 2
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  2학기
                </button>
                <button
                  onClick={() => setCutoffSemester('ALL')}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    cutoffSemester === 'ALL'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  전체
                </button>
              </div>
            </div>
          </div>
          
          {/* 과목별 등급컷 표 (메가스터디 스타일) */}
          {Object.keys(examsBySubject).length === 0 ? (
              <div className="text-center p-12 bg-white rounded-xl border border-dashed border-slate-300">
              <p className="text-slate-500">{cutoffYear === 'ALL' ? '' : `${cutoffYear}년 `}{cutoffSemester === 'ALL' ? '' : `${cutoffSemester}학기 `}{currentGrade}학년 시험이 준비 중입니다.</p>
              </div>
            ) : (
            <div className="space-y-6">
              {Object.entries(examsBySubject).map(([subject, exams]) => {
                // 각 시험의 등급컷 계산
                const examCutoffs = exams.map(exam => {
                  const scores = getScoresByExamId(exam.id);
                  const numericScores = scores.map(s => s.totalScore).filter(s => !isNaN(s));
                  const tiers = exam.gradingSystem === 'RELATIVE_5' ? RELATIVE_5_TIERS : CSAT_TIERS;
                  const cutoffs = numericScores.length >= 5 ? calculateCutoffs(numericScores, tiers) : [];
                  const totalPoints = Math.round((exam.mcqs.reduce((s, q) => s + q.points, 0) + exam.subjectives.reduce((s, q) => s + q.points, 0)) * 100) / 100;
                  return { exam, cutoffs, totalPoints, participantCount: scores.length };
                });
                
                const maxGrades = currentGrade === 1 ? 5 : 9;
                
                return (
                  <div key={subject} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="bg-indigo-50 px-6 py-4 border-b border-slate-200">
                      <h2 className="text-xl font-bold text-slate-800">{subject}</h2>
                    </div>
                    <div className="p-3 md:p-6 overflow-x-auto -mx-3 md:mx-0">
                      <table className="w-full text-xs md:text-sm border-collapse min-w-[600px]">
                        <thead>
                          <tr className="bg-slate-100">
                            <th className="px-2 md:px-3 py-2 border border-slate-200 font-semibold text-slate-700 text-left min-w-[120px] md:min-w-[150px]">시험명</th>
                            <th className="px-2 md:px-3 py-2 border border-slate-200 font-semibold text-slate-700 text-center">총점</th>
                            <th className="px-2 md:px-3 py-2 border border-slate-200 font-semibold text-slate-700 text-center">인원</th>
                            {Array.from({ length: maxGrades }, (_, i) => (
                              <th key={i + 1} className="px-1.5 md:px-3 py-2 border border-slate-200 font-semibold text-slate-700 text-center min-w-[36px] md:min-w-[50px]">
                                {i + 1}등급
                              </th>
                            ))}
                            <th className="px-2 md:px-3 py-2 border border-slate-200 font-semibold text-slate-700 text-center">상세</th>
                          </tr>
                        </thead>
                        <tbody>
                          {examCutoffs.map(({ exam, cutoffs, totalPoints, participantCount }) => (
                            <tr key={exam.id} className="hover:bg-slate-50">
                              <td className="px-2 md:px-3 py-2 border border-slate-200">
                                <div className="font-medium text-slate-800 text-xs md:text-sm">{exam.title}</div>
                                <div className="text-[10px] md:text-xs text-slate-400">
                                  {exam.year}년 {exam.semester}학기 | 
                                  {exam.examType === 'MIDTERM' ? ' 중간' : exam.examType === 'FINAL' ? ' 기말' : ''}
                                </div>
                              </td>
                              <td className="px-2 md:px-3 py-2 border border-slate-200 text-center font-medium">{totalPoints}</td>
                              <td className="px-2 md:px-3 py-2 border border-slate-200 text-center">{participantCount}</td>
                              {Array.from({ length: maxGrades }, (_, i) => {
                                const gradeCutoff = cutoffs.find(c => c.grade === i + 1);
                                return (
                                  <td key={i + 1} className="px-1.5 md:px-3 py-2 border border-slate-200 text-center font-mono text-xs">
                                    {gradeCutoff ? `${gradeCutoff.minScore.toFixed(0)}` : '-'}
                                  </td>
                                );
                              })}
                              <td className="px-2 md:px-3 py-2 border border-slate-200 text-center">
                    <button 
                      onClick={() => viewResult(exam.id)}
                                  className="px-2 md:px-3 py-1 bg-indigo-600 text-white rounded text-[10px] md:text-xs font-medium hover:bg-indigo-700 transition-colors active:scale-95"
                    >
                                  상세
                    </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })}
                </div>
            )}
        </div>
      );
    }

    // 기출 정보 페이지
    if (view === 'PAST_1' || view === 'PAST_2' || view === 'PAST_3') {
      // 종료된 시험만 가져오기 (getCompletedExams 직접 호출)
      const allCompletedExams = getCompletedExams();
      const completedExams = currentGrade 
        ? allCompletedExams.filter(exam => exam.grade === currentGrade)
        : allCompletedExams;
        
      return (
        <div className="max-w-4xl mx-auto p-6">
          <div className="text-center py-10">
            <h1 className="text-3xl font-bold text-slate-800">{currentGrade}학년 기출 정보</h1>
            <p className="text-slate-500 mt-2">기출 정보를 확인할 시험을 선택하세요.</p>
          </div>
          <div className="grid gap-4">
            {completedExams.length === 0 ? (
              <div className="text-center p-12 bg-white rounded-xl border border-dashed border-slate-300">
                <p className="text-slate-500">{currentGrade}학년 기출 정보가 준비 중입니다.</p>
              </div>
            ) : (
              completedExams.map(exam => {
                const scores = getScoresByExamId(exam.id);
                const totalPoints = Math.round((exam.mcqs.reduce((s, q) => s + q.points, 0) + exam.subjectives.reduce((s, q) => s + q.points, 0)) * 100) / 100;
                return (
                <div key={exam.id} className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 hover:shadow-md transition-all">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <h3 className="text-xl font-bold text-slate-800">{exam.title}</h3>
                      <p className="text-sm text-slate-500 mt-1">
                          {exam.grade}학년 | {exam.subject || '과목 미지정'} | {exam.year}년 {exam.semester}학기 |
                          총점: {totalPoints}점 | 문항: {exam.mcqs.length + exam.subjectives.length}개 | 
                          인원: {scores.length}명
                        </p>
                        <p className="text-xs text-slate-400 mt-0.5">
                        등록일: {new Date(exam.createdAt).toLocaleDateString()}
                          {exam.completedAt && (
                            <span> | 종료일: {new Date(exam.completedAt).toLocaleDateString()}</span>
                          )}
                      </p>
                    </div>
                    <button 
                      onClick={() => viewResult(exam.id)}
                      className="flex items-center justify-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors"
                    >
                        <FileText size={18} /> 기출 정보 보기
                    </button>
                  </div>
                </div>
                );
              })
            )}
          </div>
        </div>
      );
    }

    // Default: Student Home (Exam Selection) or Grade-specific page
    return (
      <div className="max-w-4xl mx-auto p-4 md:p-6">
        <div className="text-center py-6 md:py-10">
          <h1 className="text-2xl md:text-3xl font-bold text-slate-800">
            {currentGrade ? `${currentGrade}학년 시험 선택` : '시험 선택'}
          </h1>
          <p className="text-sm md:text-base text-slate-500 mt-2">채점할 시험을 선택하거나 결과를 확인하세요.</p>
        </div>
        
        <div className="grid gap-4">
          {filteredExams.length === 0 ? (
            <div className="text-center p-8 md:p-12 bg-white rounded-xl border border-dashed border-slate-300">
               <p className="text-sm md:text-base text-slate-500">
                 {currentGrade ? `${currentGrade}학년 시험이 준비 중입니다.` : '현재 등록된 시험이 없습니다.'}
               </p>
            </div>
          ) : (
            filteredExams.map(exam => {
              const userId = session.userId || session.username;
              const hasTaken = userId ? hasUserTakenExam(exam.id, userId) : false;
              return (
                <div key={exam.id} className="bg-white p-4 md:p-6 rounded-xl shadow-sm border border-slate-200 hover:shadow-md transition-all">
                  <div className="flex flex-col gap-4">
                  <div>
                      <h3 className="text-lg md:text-xl font-bold text-slate-800">{exam.title}</h3>
                      <p className="text-xs md:text-sm text-slate-500 mt-1">
                        {exam.grade}학년 | {exam.subject || '과목 미지정'} | {exam.year}년 {exam.semester}학기 |
                        총점: {Math.round((exam.mcqs.reduce((s, q) => s + q.points, 0) + exam.subjectives.reduce((s, q) => s + q.points, 0)) * 100) / 100}점 | 
                        문항: {exam.mcqs.length + exam.subjectives.length}개 | 
                        인원: {(() => { const scores = getScoresByExamId(exam.id); return scores.length; })()}명
                    </p>
                  </div>
                    <div className="flex flex-col sm:flex-row gap-3">
                      {hasTaken ? (
                        <button 
                          onClick={() => viewResult(exam.id)}
                          className="flex-1 flex items-center justify-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors"
                        >
                          <BarChart2 size={18} /> 결과 보기
                        </button>
                      ) : (
                        <>
                     <button 
                      onClick={() => startExam(exam.id)}
                            className="flex-1 flex items-center justify-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors"
                    >
                      <FileText size={18} /> 채점 하기
                    </button>
                    <button 
                      onClick={() => viewResult(exam.id)}
                            className="flex-1 flex items-center justify-center gap-2 px-5 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-lg font-medium hover:bg-slate-50 transition-colors"
                    >
                      <BarChart2 size={18} /> 결과/통계
                    </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <nav className="bg-white border-b border-slate-200 px-3 md:px-6 py-3 md:py-4 sticky top-0 z-50 shadow-sm">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-3 md:gap-6">
            <div 
              onClick={() => setView(session?.role === 'ADMIN' ? 'ADMIN' : 'HOME')} 
              className="font-bold text-lg md:text-xl text-slate-900 flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity"
            >
              <div className="w-7 h-7 md:w-8 md:h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white text-sm md:text-base">
                J
              </div>
              <span className="hidden sm:inline">JDMATH GRADE SYSTEM</span>
              <span className="sm:hidden">JDMATH</span>
              {session && (
              <span className="text-xs font-normal text-white bg-slate-500 px-2 py-0.5 rounded-full">
                {session.role === 'ADMIN' ? '관리자' : '학생'}
              </span>
              )}
            </div>
            
            <div className="flex items-center gap-3 md:gap-6 w-full md:w-auto justify-between md:justify-end">
               {session && session.role === 'STUDENT' && (
                 <>
                   <div className="flex items-center gap-1 border-l border-r border-slate-200 px-2 md:px-4 flex-wrap text-xs md:text-sm">
                     <NavDropdown 
                       label="시험 채점하기" 
                       view={view}
                       onSelect={(grade) => {
                         if (grade === 1) setView('GRADE_1');
                         else if (grade === 2) setView('GRADE_2');
                         else if (grade === 3) setView('GRADE_3');
                         else setView('HOME');
                       }}
                       isActive={view === 'HOME' || view === 'GRADE_1' || view === 'GRADE_2' || view === 'GRADE_3'}
                     />
                     <NavDropdown 
                       label="등급 컷 보기" 
                       view={view}
                       onSelect={(grade) => {
                         if (grade === 1) setView('CUTOFF_1');
                         else if (grade === 2) setView('CUTOFF_2');
                         else if (grade === 3) setView('CUTOFF_3');
                         else {
                           // 대표 페이지로 이동 (현재는 HOME으로)
                           setView('HOME');
                         }
                       }}
                       isActive={view === 'CUTOFF_1' || view === 'CUTOFF_2' || view === 'CUTOFF_3'}
                     />
                     <NavDropdown 
                       label="기출 정보" 
                       view={view}
                       onSelect={(grade) => {
                         if (grade === 1) setView('PAST_1');
                         else if (grade === 2) setView('PAST_2');
                         else if (grade === 3) setView('PAST_3');
                         else {
                           // 대표 페이지로 이동
                           setView('HOME');
                         }
                       }}
                       isActive={view === 'PAST_1' || view === 'PAST_2' || view === 'PAST_3'}
                     />
                     <button
                       onClick={() => setView('ABOUT')}
                       className={`font-medium transition-colors px-2 md:px-3 py-1.5 md:py-2 rounded-md ${
                         view === 'ABOUT' ? 'text-indigo-600 bg-indigo-50' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                       }`}
                     >
                       <span className="hidden md:inline">앱 더 알아보기</span>
                       <span className="md:hidden">앱</span>
                     </button>
                   </div>
                   <button 
                     onClick={() => setView('PROFILE')} 
                     className="text-xs md:text-sm text-slate-600 hover:text-indigo-600 transition-colors cursor-pointer"
                   >
                     환영합니다, <span className="font-semibold text-slate-900">{session.name}</span>님
                   </button>
                 </>
               )}
               {session && session.role === 'ADMIN' && (
                 <>
                   <div className="flex items-center gap-1 border-l border-r border-slate-200 px-2 md:px-4 flex-wrap text-xs md:text-sm">
                     <button
                       onClick={() => setView('ADMIN')}
                       className={`font-medium transition-colors px-2 md:px-3 py-1.5 md:py-2 rounded-md ${
                         view === 'ADMIN' ? 'text-indigo-600 bg-indigo-50' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                       }`}
                     >
                       시험 관리
                     </button>
                     <button
                       onClick={() => setView('ABOUT')}
                       className={`font-medium transition-colors px-2 md:px-3 py-1.5 md:py-2 rounded-md ${
                         view === 'ABOUT' ? 'text-indigo-600 bg-indigo-50' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                       }`}
                     >
                       앱 더 알아보기
                     </button>
                   </div>
                   <div className="text-xs md:text-sm text-slate-600">
                     관리자: <span className="font-semibold text-slate-900">{session.name || 'Admin'}</span>
                   </div>
                 </>
               )}
              {!session && (
                <div className="flex items-center gap-1 border-l border-r border-slate-200 px-2 md:px-4 flex-wrap text-xs md:text-sm">
                  <NavDropdown 
                    label="등급 컷 보기" 
                    view={view}
                    onSelect={() => {
                      if (confirm('로그인이 필요합니다. 로그인하시겠습니까?')) {
                        setView('LOGIN');
                      }
                    }}
                    isActive={false}
                  />
                  <NavDropdown 
                    label="기출 정보" 
                    view={view}
                    onSelect={() => {
                      if (confirm('로그인이 필요합니다. 로그인하시겠습니까?')) {
                        setView('LOGIN');
                      }
                    }}
                    isActive={false}
                  />
                  <button
                    onClick={() => setView('ABOUT')}
                    className={`font-medium transition-colors px-2 md:px-3 py-1.5 md:py-2 rounded-md ${
                      view === 'ABOUT' ? 'text-indigo-600 bg-indigo-50' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <span className="hidden md:inline">앱 더 알아보기</span>
                    <span className="md:hidden">앱</span>
                  </button>
                </div>
              )}
              {session ? (
               <button 
                onClick={handleLogout}
                  className="text-xs md:text-sm font-medium text-slate-500 hover:text-red-600 flex items-center gap-1 transition-colors"
                >
                  <LogOut size={14} className="md:w-4 md:h-4" /> <span className="hidden sm:inline">로그아웃</span>
                </button>
              ) : (
                <button 
                  onClick={() => setView('LOGIN')}
                  className="text-xs md:text-sm font-medium text-indigo-600 hover:text-indigo-700 flex items-center gap-1 transition-colors"
                >
                  로그인
               </button>
              )}
            </div>
          </div>
        </nav>

      <main className="flex-1 pb-4 md:pb-0">
        {renderContent()}
      </main>

      <footer className="bg-white border-t border-slate-200 py-6 md:py-8 mt-8 md:mt-12">
        <div className="max-w-7xl mx-auto px-4 md:px-6 flex flex-col items-center gap-3 md:gap-4">
          <a 
            href="https://www.instagram.com/yoonheo1205/" 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-pink-600 hover:text-pink-700 font-semibold transition-colors text-sm md:text-base"
          >
            <Instagram size={20} className="md:w-6 md:h-6" />
            <span>@yoonheo1205</span>
          </a>
          <div className="text-slate-400 text-xs md:text-sm">
            &copy; {new Date().getFullYear()} JDMATH GRADE SYSTEM.
          </div>
        </div>
      </footer>
    </div>
  );
};

// 드롭다운 네비게이션 컴포넌트
const NavDropdown: React.FC<{
  label: string;
  view: ViewState;
  onSelect: (grade: 1 | 2 | 3 | null) => void;
  isActive: boolean;
}> = ({ label, onSelect, isActive }) => {
  const [isOpen, setIsOpen] = useState(false);
  const closeTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  const handleMouseEnter = () => {
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
    setIsOpen(true);
  };

  const handleMouseLeave = () => {
    closeTimeoutRef.current = setTimeout(() => {
      setIsOpen(false);
    }, 300); // 300ms 딜레이 (모바일 터치 고려)
  };

  const handleClick = () => {
    // 모바일에서는 클릭으로 토글
    setIsOpen(!isOpen);
  };

  return (
    <div className="relative" onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
      <button
        onClick={handleClick}
        className={`text-xs md:text-sm font-medium transition-colors px-2 md:px-3 py-1.5 md:py-2 rounded-md flex items-center gap-0.5 md:gap-1 whitespace-nowrap ${
          isActive ? 'text-indigo-600 bg-indigo-50' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
        }`}
      >
        <span className="hidden sm:inline">{label}</span>
        <span className="sm:hidden">{label.replace('시험 ', '').replace(' 보기', '')}</span>
        <ChevronDown size={12} className={`md:w-3.5 md:h-3.5 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      {isOpen && (
        <div
          className="absolute top-full left-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg z-50 min-w-[100px] md:min-w-[120px]"
        >
          <button
            onClick={() => {
              onSelect(3);
              setIsOpen(false);
            }}
            className="w-full text-left px-3 md:px-4 py-2 text-xs md:text-sm text-slate-700 hover:bg-indigo-50 hover:text-indigo-600 transition-colors first:rounded-t-lg active:bg-indigo-100"
          >
            3학년
          </button>
          <button
            onClick={() => {
              onSelect(2);
              setIsOpen(false);
            }}
            className="w-full text-left px-3 md:px-4 py-2 text-xs md:text-sm text-slate-700 hover:bg-indigo-50 hover:text-indigo-600 transition-colors active:bg-indigo-100"
          >
            2학년
          </button>
          <button
            onClick={() => {
              onSelect(1);
              setIsOpen(false);
            }}
            className="w-full text-left px-3 md:px-4 py-2 text-xs md:text-sm text-slate-700 hover:bg-indigo-50 hover:text-indigo-600 transition-colors last:rounded-b-lg active:bg-indigo-100"
          >
            1학년
          </button>
        </div>
      )}
    </div>
  );
};

export default App;
