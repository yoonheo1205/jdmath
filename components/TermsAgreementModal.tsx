import React, { useState, useRef, useEffect } from 'react';
import { X, Check, ChevronDown, FileText, Shield } from 'lucide-react';

// 서비스 이용약관
export const SERVICE_TERMS = `제 1 장 총 칙

제 1 조 (목적) 본 약관은 허윤(이하 "개발자")이 제공하는 성적 처리 및 분석 웹 서비스(이하 "서비스")의 이용조건 및 절차, 개발자와 회원의 권리, 의무 및 책임사항, 기타 필요한 사항을 규정함을 목적으로 합니다.

제 2 조 (약관의 효력 및 변경)

본 약관은 서비스 화면에 게시하거나 기타의 방법으로 회원에게 공지함으로써 효력이 발생합니다.

개발자는 필요하다고 인정되는 경우 본 약관을 변경할 수 있으며, 변경된 약관은 서비스에 공지함으로써 효력을 발생합니다. 회원이 변경된 약관에 동의하지 않을 경우 회원 탈퇴를 요청할 수 있으며, 변경된 약관의 효력 발생일 이후에도 서비스를 계속 사용할 경우 약관의 변경 사항에 동의한 것으로 간주합니다.

제 2 장 이용계약의 체결

제 3 조 (이용계약의 성립) 이용계약은 회원이 본 약관 내용에 대한 동의와 이용신청에 대하여 개발자가 이용을 승낙함으로써 성립합니다.

제 4 조 (이용신청 및 정보의 정확성)

회원은 서비스 가입 시 본인의 실명, 학번, 이메일 등 개발자가 요청하는 모든 정보를 정확하게 기재해야 합니다.

타인의 명의(이름, 학번, 이메일 등)를 도용하거나 허위 정보를 등록한 경우, 회원은 서비스 이용권한이 즉시 박탈되며 관계 법령에 따라 민·형사상 책임을 질 수 있습니다.

개발자는 회원이 기재한 정보가 허위라고 의심되는 경우, 이에 대한 증빙 자료를 요청하거나 직권으로 이용을 제한 및 삭제할 수 있습니다.

제 3 장 의무 및 책임

제 5 조 (회원의 의무)

회원은 관계 법령, 본 약관의 규정, 이용안내 및 서비스상에 공지한 주의사항을 준수해야 하며, 기타 개발자의 업무에 방해되는 행위를 하여서는 안 됩니다.

회원은 다음 각 호의 행위를 하여서는 안 됩니다.
① 회원가입 신청 또는 변경 시 허위 내용의 등록
② 타인의 정보 도용 및 부정 사용
③ 본인의 성적이 아닌 허위 성적 데이터를 입력하여 통계(등급컷, 표준편차 등)를 고의로 왜곡하는 행위
④ 서비스의 버그나 취약점을 악용하거나 해킹을 시도하는 행위
⑤ 서비스 및 개발자(허윤)를 비방하거나, 명예를 훼손하거나, 모욕하는 일체의 행위
⑥ 개발자의 사전 승낙 없이 서비스를 이용하여 영리 목적의 활동을 하는 행위

제 6 조 (위반 시 제재 및 책임) 회원이 제 5조의 의무를 위반할 경우, 개발자는 즉시 계정 영구 정지 조치를 취할 수 있으며, 해당 위반 행위로 인해 발생한 모든 유무형의 손해에 대해 회원은 민사상 손해배상 책임 및 형사상 책임을 집니다.

제 4 장 데이터의 권리 및 활용

제 7 조 (성적 데이터의 귀속 및 사용권)

회원이 입력한 성적 데이터의 저작권은 회원 본인에게 있으나, 회원은 서비스를 이용함과 동시에 개발자에게 해당 데이터에 대한 비독점적, 영구적, 무상의 사용권(라이선스)을 부여하는 것으로 간주합니다.

개발자는 회원이 입력한 데이터를 다음의 목적으로 자유롭게 활용할 수 있으며, 회원은 이에 대해 이의를 제기할 수 없습니다.
① 서비스 내 통계 산출, 등급컷 추정, 모집단 분석 및 시각화
② 학문적 연구, 논문 작성, 기술 개발 및 개선을 위한 분석
③ 서비스 홍보, 마케팅 자료 활용 및 상업적 목적의 2차 저작물 작성
④ 서비스 고도화를 위한 AI 학습 데이터 활용

개발자는 데이터의 무결성 검증을 위해 회원이 입력한 성적 데이터를 열람하고 확인할 권한을 가집니다.

제 5 장 손해배상 및 면책조항

제 8 조 (손해배상) 회원이 본 약관의 규정을 위반함으로 인하여 개발자에게 손해가 발생하게 되는 경우, 위반 회원은 개발자에게 발생하는 모든 손해(변호사 비용 포함)를 배상하여야 합니다.

제 9 조 (면책조항)

개발자는 천재지변, 서버 장애, 디도스(DDoS) 공격 또는 이에 준하는 불가항력으로 인하여 서비스를 제공할 수 없는 경우 서비스 제공에 관한 책임이 면제됩니다.

개발자는 회원이 서비스에 입력한 정보, 자료, 사실의 신뢰도, 정확성 등에 관하여 일체의 책임을 지지 않습니다. 특히 회원이 입력한 부정확한 데이터로 인해 산출된 잘못된 등급컷 예측 결과에 대해 개발자는 어떠한 책임도 지지 않습니다.

회원이 아이디 및 비밀번호 관리를 소홀히 하여 발생한 모든 손해에 대한 책임은 회원 본인에게 있으며 개발자는 이에 대해 책임지지 않습니다.

개발자는 무료로 제공되는 서비스 이용과 관련하여 관련법에 특별한 규정이 없는 한 책임을 지지 않습니다.

제 10 조 (관할법원) 서비스 이용과 관련하여 개발자와 회원 사이에 분쟁이 발생할 경우, 개발자의 거주지 관할 법원을 전속 관할 법원으로 합니다.`;

// 개인정보 수집 및 활용 동의서
export const PRIVACY_TERMS = `1. 수집하는 개인정보 항목

필수항목: 이름, 학번, 이메일 주소, 접속 IP 정보, 쿠키

서비스 이용 과정에서 수집되는 항목: 사용자가 입력한 모든 시험 점수(객관식, 주관식 포함) 및 답안 데이터

2. 개인정보의 수집 및 이용 목적

회원 식별 및 부정이용 방지

성적 자동 채점, 등급컷 산출, 백분위 분석 등 서비스 핵심 기능 제공

통계 데이터 생성 및 학술적/상업적 연구 분석 자료 활용

서비스 이용 기록 분석 및 서비스 개선

3. 개인정보의 보유 및 이용 기간

보유 기간: 서비스 종료 시까지 또는 회원 탈퇴 시까지

단, 관계 법령 위반에 따른 수사 의뢰가 필요하거나 부정 이용이 확인된 경우, 해당 회원의 정보는 영구 보관될 수 있습니다.

통계 분석을 위해 가공된 성적 데이터(익명화된 데이터)는 회원 탈퇴 후에도 영구적으로 보존 및 활용될 수 있습니다.

4. 동의 거부 권리 및 불이익

귀하는 개인정보 수집 및 이용에 대한 동의를 거부할 권리가 있습니다. 단, 동의를 거부할 경우 회원가입 및 서비스 이용이 불가능합니다.`;

// 성적 데이터 제출 및 활용 동의서
export const DATA_SUBMISSION_TERMS = `본인은 JDMATH GRADE SYSTEM에 답안 및 점수를 제출함에 있어 다음 사항을 확인하였으며, 이에 전적으로 동의합니다.

1. 데이터의 진위 보증 (허위 입력 금지)

본인이 입력하는 객관식 답안 및 주관식 점수는 본인이 실제 응시한 시험 결과와 일치함을 보증합니다.

고의적으로 허위 점수(가짜 만점, 임의 입력 등)를 제출하여 전체 통계(표준편차, 등급컷)를 왜곡하거나 서비스의 정상적인 운영을 방해하는 경우, 「형법」 제314조(업무방해) 등에 의거하여 민·형사상 책임을 질 수 있음을 인지합니다.

개발자는 비정상적인 패턴의 데이터(매크로, 통계적 이상치 등)를 사전 통보 없이 삭제하거나 해당 계정을 영구 정지할 권한을 가집니다.

2. 데이터의 영구적 활용 권한 부여

제출된 성적 데이터(점수, 답안 마킹 정보, 오답 패턴 등)에 대한 일체의 사용 권한을 개발자(허윤)에게 영구적으로 부여합니다.

개발자는 제출된 데이터를 다음과 같은 목적으로 제한 없이 활용할 수 있습니다.

• 전체 응시자 통계 산출 및 등급컷 예측 알고리즘 고도화
• 학업 성취도 분석 관련 학술적 연구 및 논문 작성
• 서비스 홍보, 마케팅 자료 생성 및 상업적 목적의 2차 가공

본 동의는 회원이 추후 서비스를 탈퇴하거나 데이터를 삭제 요청하더라도, 이미 통계적 모집단에 반영되어 익명화 처리된 데이터에는 소급 적용되지 않습니다.

3. 예측 결과의 한계 및 면책

본 서비스가 제공하는 예상 등급, 백분위, 등급컷은 수집된 표본 데이터를 바탕으로 추정한 결과이며, 실제 학교 측의 최종 산출 결과와 다를 수 있습니다.

본 서비스의 예측 결과를 신뢰하여 발생한 학업 계획의 차질, 입시 전략의 실패 등 모든 결과에 대한 책임은 사용자 본인에게 있으며, 개발자는 이에 대해 어떠한 법적 책임도 지지 않습니다.`;

interface TermsContentProps {
  title: string;
  content: string;
  isAgreed: boolean;
  onAgree: () => void;
  icon?: React.ReactNode;
}

const TermsContent: React.FC<TermsContentProps> = ({ title, content, isAgreed, onAgree, icon }) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canAgree, setCanAgree] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);

  const handleScroll = () => {
    if (scrollRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
      const progress = (scrollTop / (scrollHeight - clientHeight)) * 100;
      setScrollProgress(Math.min(progress, 100));
      
      // 스크롤이 90% 이상 되면 동의 버튼 활성화
      if (scrollTop + clientHeight >= scrollHeight - 20) {
        setCanAgree(true);
      }
    }
  };

  useEffect(() => {
    const scrollEl = scrollRef.current;
    if (scrollEl) {
      // 콘텐츠가 짧아서 스크롤이 필요 없는 경우 바로 활성화
      if (scrollEl.scrollHeight <= scrollEl.clientHeight) {
        setCanAgree(true);
        setScrollProgress(100);
      }
    }
  }, []);

  return (
    <div className="border border-slate-200 rounded-lg overflow-hidden bg-white">
      <div className="bg-slate-100 px-3 md:px-4 py-2.5 md:py-3 border-b border-slate-200 flex items-center gap-2 flex-wrap">
        {icon || <FileText size={16} className="text-indigo-600 md:w-[18px] md:h-[18px]" />}
        <h3 className="font-bold text-slate-800 text-xs md:text-sm flex-1">{title}</h3>
        {isAgreed && (
          <span className="bg-green-100 text-green-700 text-[10px] md:text-xs px-1.5 md:px-2 py-0.5 rounded-full flex items-center gap-1">
            <Check size={10} className="md:w-3 md:h-3" /> 완료
          </span>
        )}
      </div>
      
      {/* 스크롤 진행률 바 */}
      <div className="h-1 bg-slate-200">
        <div 
          className="h-full bg-indigo-500 transition-all duration-200"
          style={{ width: `${scrollProgress}%` }}
        />
      </div>
      
      <div 
        ref={scrollRef}
        onScroll={handleScroll}
        className="h-36 md:h-48 overflow-y-auto p-3 md:p-4 text-[11px] md:text-xs text-slate-700 leading-relaxed whitespace-pre-wrap"
      >
        {content}
      </div>
      
      <div className="px-3 md:px-4 py-2.5 md:py-3 bg-slate-50 border-t border-slate-200">
        {!canAgree && (
          <div className="flex items-center justify-center gap-1.5 md:gap-2 text-amber-600 text-[10px] md:text-xs mb-2">
            <ChevronDown size={12} className="animate-bounce md:w-3.5 md:h-3.5" />
            약관을 끝까지 읽어주세요
          </div>
        )}
        <button
          onClick={onAgree}
          disabled={!canAgree || isAgreed}
          className={`w-full py-2 md:py-2.5 rounded-lg text-xs md:text-sm font-bold transition-all flex items-center justify-center gap-1.5 md:gap-2 active:scale-[0.98] ${
            isAgreed
              ? 'bg-green-100 text-green-700 cursor-default'
              : canAgree
                ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                : 'bg-slate-200 text-slate-400 cursor-not-allowed'
          }`}
        >
          {isAgreed ? (
            <>
              <Check size={14} className="md:w-4 md:h-4" /> 동의 완료
            </>
          ) : canAgree ? (
            <>
              <Check size={14} className="md:w-4 md:h-4" /> 동의합니다
            </>
          ) : (
            '스크롤을 완료해주세요'
          )}
        </button>
      </div>
    </div>
  );
};

// 회원가입용 약관 동의 모달
interface SignupTermsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
}

export const SignupTermsModal: React.FC<SignupTermsModalProps> = ({ isOpen, onClose, onComplete }) => {
  const [serviceTermsAgreed, setServiceTermsAgreed] = useState(false);
  const [privacyTermsAgreed, setPrivacyTermsAgreed] = useState(false);

  const allAgreed = serviceTermsAgreed && privacyTermsAgreed;

  useEffect(() => {
    if (!isOpen) {
      setServiceTermsAgreed(false);
      setPrivacyTermsAgreed(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-2 md:p-4">
      <div className="bg-white rounded-xl md:rounded-2xl shadow-2xl w-full max-w-2xl max-h-[95vh] md:max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-4 md:px-6 py-3 md:py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div>
            <h2 className="text-lg md:text-xl font-bold text-slate-900">약관 동의</h2>
            <p className="text-[10px] md:text-xs text-slate-500 mt-0.5 md:mt-1">서비스 이용을 위해 아래 약관에 동의해주세요.</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 md:p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
          >
            <X size={18} className="md:w-5 md:h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-3 md:p-6 space-y-3 md:space-y-4">
          <TermsContent
            title="[필수] 서비스 이용약관"
            content={SERVICE_TERMS}
            isAgreed={serviceTermsAgreed}
            onAgree={() => setServiceTermsAgreed(true)}
            icon={<FileText size={16} className="text-indigo-600 md:w-[18px] md:h-[18px]" />}
          />
          
          <TermsContent
            title="[필수] 개인정보 수집 및 활용 동의서"
            content={PRIVACY_TERMS}
            isAgreed={privacyTermsAgreed}
            onAgree={() => setPrivacyTermsAgreed(true)}
            icon={<Shield size={16} className="text-green-600 md:w-[18px] md:h-[18px]" />}
          />
        </div>

        {/* Footer */}
        <div className="px-4 md:px-6 py-3 md:py-4 border-t border-slate-200 bg-slate-50">
          <div className="flex gap-2 md:gap-3">
            <button
              onClick={onClose}
              className="flex-1 py-2.5 md:py-3 border border-slate-300 text-slate-700 rounded-lg font-medium hover:bg-slate-100 transition-colors text-sm md:text-base"
            >
              취소
            </button>
            <button
              onClick={onComplete}
              disabled={!allAgreed}
              className={`flex-1 py-2.5 md:py-3 rounded-lg font-bold transition-all flex items-center justify-center gap-1.5 md:gap-2 text-xs md:text-sm ${
                allAgreed
                  ? 'bg-indigo-600 text-white hover:bg-indigo-700 active:scale-[0.98]'
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed'
              }`}
            >
              {allAgreed ? (
                <>
                  <Check size={16} className="md:w-[18px] md:h-[18px]" /> <span className="hidden sm:inline">모든 약관에 동의하고</span> 가입하기
                </>
              ) : (
                <span className="text-[11px] md:text-sm">모든 약관에 동의해주세요</span>
              )}
            </button>
          </div>
          {!allAgreed && (
            <p className="text-center text-[10px] md:text-xs text-slate-500 mt-2 md:mt-3">
              {!serviceTermsAgreed && !privacyTermsAgreed 
                ? '두 개의 약관에 모두 동의해야 합니다.' 
                : !serviceTermsAgreed 
                  ? '서비스 이용약관에 동의해주세요.'
                  : '개인정보 수집 및 활용 동의서에 동의해주세요.'}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

// 답안 제출용 약관 동의 모달
interface SubmissionTermsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
}

export const SubmissionTermsModal: React.FC<SubmissionTermsModalProps> = ({ isOpen, onClose, onComplete }) => {
  const [dataTermsAgreed, setDataTermsAgreed] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setDataTermsAgreed(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-2 md:p-4">
      <div className="bg-white rounded-xl md:rounded-2xl shadow-2xl w-full max-w-2xl max-h-[95vh] md:max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-4 md:px-6 py-3 md:py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div>
            <h2 className="text-lg md:text-xl font-bold text-slate-900">답안 제출 동의</h2>
            <p className="text-[10px] md:text-xs text-slate-500 mt-0.5 md:mt-1">답안 제출 전 아래 약관을 확인해주세요.</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 md:p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
          >
            <X size={18} className="md:w-5 md:h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-3 md:p-6">
          <TermsContent
            title="[필수] 성적 데이터 제출 및 활용 동의서"
            content={DATA_SUBMISSION_TERMS}
            isAgreed={dataTermsAgreed}
            onAgree={() => setDataTermsAgreed(true)}
            icon={<FileText size={16} className="text-amber-600 md:w-[18px] md:h-[18px]" />}
          />
        </div>

        {/* Footer */}
        <div className="px-4 md:px-6 py-3 md:py-4 border-t border-slate-200 bg-slate-50">
          <div className="flex gap-2 md:gap-3">
            <button
              onClick={onClose}
              className="flex-1 py-2.5 md:py-3 border border-slate-300 text-slate-700 rounded-lg font-medium hover:bg-slate-100 transition-colors text-sm md:text-base"
            >
              취소
            </button>
            <button
              onClick={onComplete}
              disabled={!dataTermsAgreed}
              className={`flex-1 py-2.5 md:py-3 rounded-lg font-bold transition-all flex items-center justify-center gap-1.5 md:gap-2 text-xs md:text-sm ${
                dataTermsAgreed
                  ? 'bg-indigo-600 text-white hover:bg-indigo-700 active:scale-[0.98]'
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed'
              }`}
            >
              {dataTermsAgreed ? (
                <>
                  <Check size={16} className="md:w-[18px] md:h-[18px]" /> <span className="hidden sm:inline">동의하고</span> 답안 제출
                </>
              ) : (
                <span className="text-[11px] md:text-sm">약관에 동의해주세요</span>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default { SignupTermsModal, SubmissionTermsModal };

