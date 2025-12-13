
import React, { useState } from 'react';
import { UserSession } from '../types';
import { 
  checkUsernameExists, 
  checkEmailExists, 
  recordUserLoginIp,
  loginWithSupabase,
  registerUser
} from '../services/storageService';
import { supabase, isSupabaseConfigured } from '../services/supabaseClient';
import { signUp } from '../services/authService';
import { Shield, User, Key, School, Mail, CheckCircle, ArrowRight, Loader2 } from 'lucide-react';
import { SignupTermsModal } from './TermsAgreementModal';

interface LoginProps {
  onLogin: (session: UserSession) => void;
  onCancel?: () => void;
}

const Login: React.FC<LoginProps> = ({ onLogin, onCancel }) => {
  const [activeTab, setActiveTab] = useState<'STUDENT' | 'ADMIN'>('STUDENT');
  const [studentMode, setStudentMode] = useState<'LOGIN' | 'SIGNUP'>('LOGIN');

  // Admin State
  const [adminId, setAdminId] = useState('');
  const [adminPw, setAdminPw] = useState('');
  
  // Student Login State
  const [loginId, setLoginId] = useState('');
  const [loginPw, setLoginPw] = useState('');

  // Student Sign Up State
  const [regId, setRegId] = useState('');
  const [regPw, setRegPw] = useState('');
  const [regName, setRegName] = useState('');
  const [regStudentNumber, setRegStudentNumber] = useState('');
  const [regEmail, setRegEmail] = useState('');
  
  // Signup loading state
  const [isSigningUp, setIsSigningUp] = useState(false);
  
  // Terms Agreement State
  const [showTermsModal, setShowTermsModal] = useState(false);
  
  // Loading State
  const [isLoading, setIsLoading] = useState(false);

  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (adminId.trim() === 'joongdongmath' && adminPw.trim() === 'panorama') {
      onLogin({ role: 'ADMIN' });
    } else {
      alert('아이디 또는 비밀번호가 올바르지 않습니다.');
    }
  };

  const handleStudentLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const loginInput = loginId.trim();
    const password = loginPw.trim();
    
    if (!loginInput || !password) {
      alert('아이디/이메일과 비밀번호를 입력해주세요.');
      return;
    }
    
    setIsLoading(true);
    
    try {
      // Use the new unified login function
      const result = await loginWithSupabase(loginInput, password);
      
      if (result.success && result.session) {
        onLogin(result.session);
    } else {
        alert(result.error || '아이디 또는 비밀번호가 일치하지 않습니다.');
      }
    } catch (error: any) {
      console.error('Login error:', error);
      alert('로그인 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  // Magic Link 기반 회원가입 플로우
  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();

    // 입력 검증
    if (!regEmail || !regPw || !regName || !regStudentNumber) {
      alert('모든 정보를 입력해주세요.');
      return;
    }

    // 이메일 도메인 검증
    if (!regEmail.includes('@')) {
      alert('올바른 이메일 주소를 입력해주세요.');
      return;
    }
    
    const emailParts = regEmail.split('@');
    if (emailParts.length !== 2 || emailParts[1] !== 'joongdong.hs.kr') {
      alert('joongdong.hs.kr 도메인의 이메일만 사용 가능합니다.');
      return;
    }
    
    // 이메일 ID에서 학년 추출
    const emailId = emailParts[0].toLowerCase();
    let detectedGrade: 1 | 2 | 3 | undefined;
    if (emailId.startsWith('h23')) {
      detectedGrade = 3;
    } else if (emailId.startsWith('h24')) {
      detectedGrade = 2;
    } else if (emailId.startsWith('h25')) {
      detectedGrade = 1;
    }
    
    if (!detectedGrade) {
      alert('이메일 ID가 h23, h24, h25로 시작해야 합니다.\n예: h23xxx@joongdong.hs.kr (3학년)');
      return;
    }
    
    // 중복 체크
    if (checkEmailExists(regEmail.trim())) {
      alert('이미 사용 중인 이메일입니다.');
      return;
    }
    
    const finalUsername = regId.trim() || regEmail.split('@')[0];
    if (checkUsernameExists(finalUsername)) {
      alert('이미 사용 중인 아이디입니다.');
      return;
    }

    setIsSigningUp(true);

    try {
      // Supabase에서 이메일 중복 체크
      if (isSupabaseConfigured()) {
        const { data: existingUsers } = await supabase
          .from('profiles')
          .select('email')
          .eq('email', regEmail.trim())
          .limit(1);
        
        if (existingUsers && existingUsers.length > 0) {
          alert('이미 사용 중인 이메일입니다.');
          setIsSigningUp(false);
          return;
        }
      }

      // 약관 동의 모달 표시
      setShowTermsModal(true);
    } catch (error: any) {
      console.error('[handleSignUp] Error:', error);
      alert(`회원가입 중 오류가 발생했습니다: ${error.message || '알 수 없는 오류'}`);
      setIsSigningUp(false);
    }
  };

  // 약관 동의 완료 후 Magic Link 이메일 전송
  const handleSignUpAfterTerms = async () => {
    setShowTermsModal(false);
    setIsSigningUp(true);

    const emailParts = regEmail.split('@');
    const emailId = emailParts[0].toLowerCase();
    let detectedGrade: 1 | 2 | 3 | undefined;
    if (emailId.startsWith('h23')) {
      detectedGrade = 3;
    } else if (emailId.startsWith('h24')) {
      detectedGrade = 2;
    } else if (emailId.startsWith('h25')) {
      detectedGrade = 1;
    }

    const finalUsername = regId.trim() || regEmail.split('@')[0];

    try {
      // authService.signUp()을 호출하여 Magic Link 이메일 전송
      const result = await signUp(
        regEmail.trim(),
        regPw.trim(),
        {
          name: regName.trim(),
          student_number: regStudentNumber.trim(),
          grade: detectedGrade,
          username: finalUsername,
        }
      );

      if (result.error) {
        console.error('[handleSignUpAfterTerms] SignUp error:', result.error);
        const errorMsg = result.error.message || '회원가입 중 오류가 발생했습니다.';
        
        // 이미 존재하는 사용자 오류인 경우
        if (errorMsg.includes('already registered') || errorMsg.includes('already exists')) {
          alert('이미 등록된 이메일입니다.');
        } else {
          alert(`오류: ${errorMsg}`);
        }
        setIsSigningUp(false);
        return;
      }

      // Magic Link 이메일 전송 성공
      console.log('[handleSignUpAfterTerms] Magic Link email sent successfully');
      alert('이메일 확인 링크가 전송되었습니다.\n\n이메일을 확인하여 링크를 클릭해주세요.\n링크를 클릭하면 자동으로 로그인됩니다.');
      
      // 폼 초기화
      setRegEmail('');
      setRegPw('');
      setRegName('');
      setRegStudentNumber('');
      setRegId('');
      setStudentMode('LOGIN');
    } catch (error: any) {
      console.error('[handleSignUpAfterTerms] Unexpected error:', error);
      alert(`회원가입 중 오류가 발생했습니다: ${error.message || '알 수 없는 오류'}`);
    } finally {
      setIsSigningUp(false);
    }
  };


  const inputClass = "w-full pl-10 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-400 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all";

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-md overflow-hidden relative">
        {onCancel && (
          <button
            onClick={onCancel}
            className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition-colors"
            title="취소"
          >
            ✕
          </button>
        )}
        {/* Top Tabs */}
        <div className="flex border-b border-slate-100">
          <button
            onClick={() => setActiveTab('STUDENT')}
            className={`flex-1 py-4 text-sm font-semibold flex items-center justify-center gap-2 transition-colors ${
              activeTab === 'STUDENT' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-500 hover:bg-slate-50'
            }`}
          >
            <User size={18} /> 학생
          </button>
          <button
            onClick={() => setActiveTab('ADMIN')}
            className={`flex-1 py-4 text-sm font-semibold flex items-center justify-center gap-2 transition-colors ${
              activeTab === 'ADMIN' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-500 hover:bg-slate-50'
            }`}
          >
            <Shield size={18} /> 관리자
          </button>
        </div>

        <div className="p-8">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-slate-900 mb-2">
              JDMATH GRADE SYSTEM
            </h1>
            <p className="text-slate-500 text-sm">
              {activeTab === 'ADMIN' 
                ? '관리자 계정으로 접속하세요.' 
                : (studentMode === 'LOGIN' ? '시험 응시를 위해 로그인하세요.' : '새 계정을 생성하세요.')}
            </p>
          </div>

          {activeTab === 'ADMIN' ? (
            <form onSubmit={handleAdminLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">관리자 ID</label>
                <div className="relative">
                  <User className="absolute left-3 top-2.5 text-slate-400" size={18} />
                  <input
                    type="text"
                    value={adminId}
                    onChange={(e) => setAdminId(e.target.value)}
                    className={inputClass}
                    placeholder="ID 입력"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">비밀번호</label>
                <div className="relative">
                  <Key className="absolute left-3 top-2.5 text-slate-400" size={18} />
                  <input
                    type="password"
                    value={adminPw}
                    onChange={(e) => setAdminPw(e.target.value)}
                    className={inputClass}
                    placeholder="비밀번호 입력"
                  />
                </div>
              </div>
              <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-lg transition-colors shadow-md mt-4">
                관리자 접속
              </button>
            </form>
          ) : (
            // STUDENT TAB
            studentMode === 'LOGIN' ? (
              <form onSubmit={handleStudentLogin} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">아이디 또는 이메일</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-2.5 text-slate-400" size={18} />
                    <input
                      type="text"
                      value={loginId}
                      onChange={(e) => setLoginId(e.target.value)}
                      className={inputClass}
                      placeholder="아이디 또는 이메일 입력"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">비밀번호</label>
                  <div className="relative">
                    <Key className="absolute left-3 top-2.5 text-slate-400" size={18} />
                    <input
                      type="password"
                      value={loginPw}
                      onChange={(e) => setLoginPw(e.target.value)}
                      className={inputClass}
                      placeholder="비밀번호 입력"
                    />
                  </div>
                </div>
                <button 
                  type="submit" 
                  disabled={isLoading}
                  className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3 rounded-lg transition-colors shadow-md mt-4 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? <><Loader2 size={18} className="animate-spin" /> 로그인 중...</> : '로그인'}
                </button>
                <p className="text-center text-sm text-slate-500 mt-4">
                  계정이 없으신가요? 
                  <button 
                    type="button" 
                    onClick={() => setStudentMode('SIGNUP')}
                    className="ml-2 text-indigo-600 font-semibold hover:underline"
                  >
                    회원가입
                  </button>
                </p>
              </form>
            ) : (
              // SIGN UP FORM
              <form onSubmit={handleSignUp} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">이름</label>
                    <input
                      type="text"
                      value={regName}
                      onChange={(e) => setRegName(e.target.value)}
                      className={`${inputClass} pl-3`}
                      placeholder="이름"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">학번</label>
                    <input
                      type="text"
                      value={regStudentNumber}
                      onChange={(e) => setRegStudentNumber(e.target.value)}
                      className={`${inputClass} pl-3`}
                      placeholder="예: 2024001"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">아이디 (선택사항)</label>
                  <input
                    type="text"
                    value={regId}
                    onChange={(e) => setRegId(e.target.value)}
                    className={`${inputClass} pl-3`}
                    placeholder="사용할 아이디 (없으면 이메일 ID 사용)"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">비밀번호</label>
                  <input
                    type="password"
                    value={regPw}
                    onChange={(e) => setRegPw(e.target.value)}
                    className={`${inputClass} pl-3`}
                    placeholder="비밀번호"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">학교 이메일</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-2.5 text-slate-400" size={16} />
                    <input
                      type="email"
                      value={regEmail}
                      onChange={(e) => setRegEmail(e.target.value)}
                      className={`${inputClass} pl-10`}
                      placeholder="example@joongdong.hs.kr"
                      required
                    />
                  </div>
                </div>

                <div className="pt-4">
                  <button
                    type="submit"
                    disabled={isSigningUp}
                    className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3 rounded-lg transition-colors shadow-md flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSigningUp ? (
                      <>
                        <Loader2 size={18} className="animate-spin" />
                        처리 중...
                      </>
                    ) : (
                      <>
                        <CheckCircle size={18} />
                        가입하기
                      </>
                    )}
                  </button>
                  <p className="text-center text-sm text-slate-500 mt-4">
                    이미 계정이 있으신가요? 
                    <button 
                      type="button" 
                      onClick={() => setStudentMode('LOGIN')}
                      className="ml-2 text-indigo-600 font-semibold hover:underline"
                    >
                      로그인하기
                    </button>
                  </p>
                </div>
              </form>
            )
          )}
        </div>
      </div>
      
      {/* 약관 동의 모달 */}
      <SignupTermsModal
        isOpen={showTermsModal}
        onClose={() => setShowTermsModal(false)}
        onComplete={handleSignUpAfterTerms}
      />
    </div>
  );
};

export default Login;