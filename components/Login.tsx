
import React, { useState } from 'react';
import { UserSession } from '../types';
import { 
  authenticateUser, 
  registerUser, 
  sendVerificationEmail, 
  checkUsernameExists, 
  checkEmailExists, 
  recordUserLoginIp,
  loginWithSupabase,
  signUpWithSupabase 
} from '../services/storageService';
import { supabase, isSupabaseConfigured } from '../services/supabaseClient';
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
  
  // Verification State
  const [verificationCode, setVerificationCode] = useState('');
  const [sentCode, setSentCode] = useState('');
  const [isVerified, setIsVerified] = useState(false);
  const [isSendingCode, setIsSendingCode] = useState(false);
  const [isVerifyingCode, setIsVerifyingCode] = useState(false);
  
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

  const sendVerificationCode = async () => {
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
    
    // 이메일 중복 체크
    if (checkEmailExists(regEmail.trim())) {
      alert('이미 사용 중인 이메일입니다.');
      return;
    }
    
    // 아이디 중복 체크 (아이디가 입력된 경우)
    if (regId.trim() && checkUsernameExists(regId.trim())) {
      alert('이미 사용 중인 아이디입니다.');
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
      alert('이메일 ID가 h23, h24, h25로 시작해야 합니다.\n예: h23xxx@joongdong.co.kr (3학년)');
      return;
    }
    
    setIsSendingCode(true);
    
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
          setIsSendingCode(false);
          return;
        }
      }
      
      // Supabase OTP를 사용하여 실제 이메일로 인증 코드 전송
      if (isSupabaseConfigured()) {
        console.log('[sendVerificationCode] Sending OTP via Supabase to:', regEmail.trim());
        const { data, error } = await supabase.auth.signInWithOtp({
          email: regEmail.trim(),
          options: {
            shouldCreateUser: false, // 회원가입 전이므로 사용자 생성하지 않음
            emailRedirectTo: `${window.location.origin}`,
          }
        });

        if (error) {
          console.error('[sendVerificationCode] Supabase OTP error:', error);
          // Supabase OTP 실패 시 폴백: 로컬 코드 생성
          const code = Math.floor(1000 + Math.random() * 9000).toString();
          setSentCode(code);
          localStorage.setItem(`email_verification_${regEmail}`, code);
          alert(`인증 코드가 생성되었습니다.\n\n인증 코드: ${code}\n\n(Supabase 이메일 전송 실패, 로컬 코드 사용)`);
          setIsSendingCode(false);
          return;
        }

        if (data) {
          console.log('[sendVerificationCode] OTP sent successfully via Supabase');
          alert('인증 코드가 이메일로 전송되었습니다.\n\n이메일을 확인하여 인증 코드를 입력해주세요.');
          setIsSendingCode(false);
          return;
        }
      }
      
      // Supabase가 구성되지 않은 경우 폴백
      const code = Math.floor(1000 + Math.random() * 9000).toString();
      setSentCode(code);
      localStorage.setItem(`email_verification_${regEmail}`, code);
      alert(`인증 코드가 생성되었습니다.\n\n인증 코드: ${code}\n\n(Supabase 미구성, 로컬 코드 사용)`);
    } catch (error: any) {
      console.error('[sendVerificationCode] Error:', error);
      // 에러 발생 시 폴백
      const code = Math.floor(1000 + Math.random() * 9000).toString();
      setSentCode(code);
      localStorage.setItem(`email_verification_${regEmail}`, code);
      alert(`인증 코드가 생성되었습니다.\n\n인증 코드: ${code}\n\n(오류 발생, 로컬 코드 사용)`);
    } finally {
      setIsSendingCode(false);
    }
  };

  const verifyCode = async () => {
    if (!verificationCode.trim()) {
      alert('인증 코드를 입력해주세요.');
      return;
    }

    setIsVerifyingCode(true);

    try {
      // Supabase OTP 검증
      if (isSupabaseConfigured()) {
        console.log('[verifyCode] Verifying OTP via Supabase...');
        const { data, error } = await supabase.auth.verifyOtp({
          email: regEmail.trim(),
          token: verificationCode.trim(),
          type: 'email'
        });

        if (error) {
          console.error('[verifyCode] Supabase OTP verification error:', error);
          // Supabase 검증 실패 시 폴백: 로컬 코드 검증
          const storedCode = localStorage.getItem(`email_verification_${regEmail}`);
          if (verificationCode === sentCode && sentCode !== '' || verificationCode === storedCode) {
            setIsVerified(true);
            localStorage.removeItem(`email_verification_${regEmail}`);
            alert('인증되었습니다. (로컬 코드 사용)');
            setIsVerifyingCode(false);
            return;
          } else {
            alert(`인증 코드가 올바르지 않습니다: ${error.message}`);
            setIsVerifyingCode(false);
            return;
          }
        }

        if (data) {
          console.log('[verifyCode] OTP verified successfully via Supabase');
      setIsVerified(true);
          localStorage.removeItem(`email_verification_${regEmail}`);
      alert('인증되었습니다.');
          setIsVerifyingCode(false);
          return;
        }
      }

      // Supabase가 구성되지 않은 경우 폴백: 로컬 코드 검증
      const storedCode = localStorage.getItem(`email_verification_${regEmail}`);
      if ((verificationCode === sentCode && sentCode !== '') || verificationCode === storedCode) {
        setIsVerified(true);
        localStorage.removeItem(`email_verification_${regEmail}`);
        alert('인증되었습니다. (로컬 코드 사용)');
    } else {
      alert('인증 코드가 올바르지 않습니다.');
      }
    } catch (error: any) {
      console.error('[verifyCode] Error:', error);
      alert(`인증 중 오류가 발생했습니다: ${error.message || '알 수 없는 오류'}`);
    } finally {
      setIsVerifyingCode(false);
    }
  };

  // 약관 동의 전 검증
  const handleSignUpClick = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isVerified) {
      alert('학교 이메일 인증을 완료해주세요.');
      return;
    }
    if (!regEmail || !regPw || !regName || !regStudentNumber) {
      alert('모든 정보를 입력해주세요.');
      return;
    }

    // 최종 중복 체크
    const finalUsername = regId.trim() || regEmail.split('@')[0];
    if (checkUsernameExists(finalUsername)) {
      alert('이미 사용 중인 아이디입니다.');
      return;
    }
    
    if (checkEmailExists(regEmail.trim())) {
      alert('이미 사용 중인 이메일입니다.');
      return;
    }

    // 약관 동의 모달 표시
    setShowTermsModal(true);
  };

  // 약관 동의 완료 후 실제 회원가입 처리
  const handleSignUpComplete = async () => {
    setShowTermsModal(false);
    setIsLoading(true);

    // 이메일에서 학년 추출
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
      // Use the new unified signup function
      const result = await signUpWithSupabase({
        email: regEmail.trim(),
      password: regPw.trim(),
        username: finalUsername,
      name: regName.trim(),
      studentNumber: regStudentNumber.trim(),
        grade: detectedGrade,
      });

      if (result.success) {
        const gradeText = detectedGrade ? `${detectedGrade}학년으로 등록되었습니다` : '등록되었습니다';
        const emailAuthNote = isSupabaseConfigured() ? '\n이메일 인증을 완료한 후 로그인해주세요.' : '';
        alert(`회원가입이 완료되었습니다. (${gradeText})${emailAuthNote}`);
      setStudentMode('LOGIN');
      setRegId(''); setRegPw(''); setRegName(''); setRegStudentNumber(''); setRegEmail('');
      setIsVerified(false); setVerificationCode(''); setSentCode('');
    } else {
        alert(result.error || '회원가입에 실패했습니다.');
      }
    } catch (error: any) {
      console.error('Signup error:', error);
      alert('회원가입 중 오류가 발생했습니다: ' + (error.message || '알 수 없는 오류'));
    } finally {
      setIsLoading(false);
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
              <form onSubmit={handleSignUpClick} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">이름</label>
                    <input
                      type="text"
                      value={regName}
                      onChange={(e) => setRegName(e.target.value)}
                      className={`${inputClass} pl-3`}
                      placeholder="이름"
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
                  />
                </div>

                {/* Email Verification */}
                <div className="pt-2 border-t border-slate-100">
                  <label className="block text-xs font-medium text-slate-700 mb-1">학교 이메일 인증</label>
                  <div className="flex gap-2 mb-2">
                     <div className="relative flex-1">
                      <Mail className="absolute left-3 top-2.5 text-slate-400" size={16} />
                      <input
                        type="email"
                        value={regEmail}
                        onChange={(e) => setRegEmail(e.target.value)}
                        disabled={isVerified}
                        className={`${inputClass} py-1.5 text-sm`}
                        placeholder="example@school.ac.kr"
                      />
                    </div>
                    <button 
                      type="button"
                      onClick={sendVerificationCode}
                      disabled={isVerified || isSendingCode}
                      className={`px-3 py-1 rounded text-xs font-medium transition-colors whitespace-nowrap flex items-center gap-1 ${isVerified ? 'bg-green-100 text-green-700' : 'bg-slate-200 text-slate-700 hover:bg-slate-300'} ${isSendingCode ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      {isSendingCode ? (
                        <>
                          <Loader2 size={12} className="animate-spin" />
                          전송 중...
                        </>
                      ) : isVerified ? (
                        '인증됨'
                      ) : (
                        '인증코드 발송'
                      )}
                    </button>
                  </div>
                  
                  {!isVerified && (
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={verificationCode}
                        onChange={(e) => setVerificationCode(e.target.value)}
                        className={`${inputClass} py-1.5 pl-3 text-sm`}
                        placeholder="인증코드 입력"
                      />
                      <button 
                        type="button"
                        onClick={verifyCode}
                        disabled={isVerifyingCode}
                        className={`px-3 py-1 bg-indigo-600 text-white rounded text-xs font-medium hover:bg-indigo-700 whitespace-nowrap flex items-center gap-1 ${isVerifyingCode ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        {isVerifyingCode ? (
                          <>
                            <Loader2 size={12} className="animate-spin" />
                            확인 중...
                          </>
                        ) : (
                          '확인'
                        )}
                      </button>
                    </div>
                  )}
                </div>

                <div className="pt-4">
                  <button 
                    type="submit" 
                    disabled={isLoading}
                    className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3 rounded-lg transition-colors shadow-md flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoading ? <><Loader2 size={18} className="animate-spin" /> 처리 중...</> : <><CheckCircle size={18} /> 가입하기</>}
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
        onComplete={handleSignUpComplete}
      />
    </div>
  );
};

export default Login;