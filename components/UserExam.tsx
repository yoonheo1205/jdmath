
import React, { useState, useEffect } from 'react';
import { ExamConfig, UserScore, UserSession } from '../types';
import { getExamById, saveUserScore, hasUserTakenExam, getUserScoreByExamId } from '../services/storageService';
import { CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { SubmissionTermsModal } from './TermsAgreementModal';

interface UserExamProps {
  examId: string;
  user: UserSession;
  onComplete: (scoreId: string) => void;
  onCancel: () => void;
}

const UserExam: React.FC<UserExamProps> = ({ examId, user, onComplete, onCancel }) => {
  const [config, setConfig] = useState<ExamConfig | undefined>(undefined);
  const [mcqAnswers, setMcqAnswers] = useState<Record<number, number>>({});
  
  // For subjective scores, we allow empty string in UI state to let user clear input
  const [subjScores, setSubjScores] = useState<Record<number, number | string>>({}); 
  const [subjTextAnswers, setSubjTextAnswers] = useState<Record<number, string>>({});
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // 약관 동의 모달 상태
  const [showTermsModal, setShowTermsModal] = useState(false);
  
  // 등급 입력 상태
  const [showGradeInput, setShowGradeInput] = useState(false);
  const [previousExamGrade, setPreviousExamGrade] = useState<number | '' | 'UNKNOWN'>('');
  const [lastSemesterGrade, setLastSemesterGrade] = useState<number | '' | 'UNKNOWN'>('');
  const [lastYearFirstSemesterGrade, setLastYearFirstSemesterGrade] = useState<number | '' | 'UNKNOWN'>('');
  const [lastYearSecondSemesterGrade, setLastYearSecondSemesterGrade] = useState<number | '' | 'UNKNOWN'>('');
  
  const [hasTaken, setHasTaken] = useState(false);
  const [existingScore, setExistingScore] = useState<UserScore | undefined>(undefined);

  useEffect(() => {
    const loadedConfig = getExamById(examId);
    setConfig(loadedConfig);
    
    // 학년 검증
    if (loadedConfig && user.grade && loadedConfig.grade) {
      // 타입을 명시적으로 숫자로 변환하여 비교
      const examGrade = Number(loadedConfig.grade);
      const userGrade = Number(user.grade);
      
      // 학년이 다를 때만 경고 (같으면 통과)
      if (examGrade !== userGrade && !isNaN(examGrade) && !isNaN(userGrade)) {
        alert(`이 시험은 ${examGrade}학년용입니다. ${userGrade}학년 학생은 응시할 수 없습니다.`);
        setTimeout(() => {
          onCancel();
        }, 100);
        return;
      }
    }
    
    // 시험 응시 여부 확인
    const userId = user.userId || user.username;
    if (userId && loadedConfig) {
      const taken = hasUserTakenExam(examId, userId);
      setHasTaken(taken);
      if (taken) {
        const score = getUserScoreByExamId(examId, userId);
        setExistingScore(score);
      }
    }
  }, [examId, user.grade, user.userId, user.username]);

  if (!config) {
    return (
      <div className="text-center p-12">
        <h2 className="text-2xl font-bold text-slate-800">시험 정보를 불러올 수 없습니다.</h2>
        <button onClick={onCancel} className="mt-4 text-indigo-600 hover:underline">돌아가기</button>
      </div>
    );
  }

  // 이미 시험을 응시한 경우
  if (hasTaken && existingScore) {
    return (
      <div className="max-w-3xl mx-auto p-4 md:p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900">{config.title}</h1>
          <p className="text-slate-500 mt-2">이미 시험을 응시하셨습니다.</p>
        </div>
        
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-4">
          <div className="text-center py-8">
            <h2 className="text-2xl font-bold text-slate-800 mb-4">응시 완료</h2>
            <p className="text-slate-600 mb-6">
              점수: <span className="font-bold text-indigo-600 text-xl">{existingScore.totalScore}점</span>
            </p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => onComplete(existingScore.id)}
                className="px-6 py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors"
              >
                채점 결과 보기
              </button>
              <button
                onClick={onCancel}
                className="px-6 py-3 bg-slate-200 text-slate-700 rounded-lg font-medium hover:bg-slate-300 transition-colors"
              >
                돌아가기
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const handleMcqSelect = (questionIndex: number, option: number) => {
    setMcqAnswers(prev => ({ ...prev, [questionIndex]: option }));
  };

  const handleSubjScoreChange = (questionIndex: number, value: string, max: number) => {
    if (value === '') {
      setSubjScores(prev => ({ ...prev, [questionIndex]: '' }));
      return;
    }
    const numValue = parseFloat(value);
    if (!isNaN(numValue)) {
      const validScore = Math.min(Math.max(0, numValue), max);
      setSubjScores(prev => ({ ...prev, [questionIndex]: validScore }));
    }
  };

  const handleSubjTextChange = (questionIndex: number, text: string) => {
    setSubjTextAnswers(prev => ({ ...prev, [questionIndex]: text }));
  };

  // 제출 버튼 클릭 핸들러
  const handleSubmit = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (isSubmitting) return;

    // 등급 입력이 아직 안 된 경우 등급 입력 화면 표시
    if (!showGradeInput) {
      setShowGradeInput(true);
      return;
    }

    // 약관 동의 모달 표시
    setShowTermsModal(true);
  };

  // 약관 동의 완료 후 실제 제출 처리
  const processSubmission = async () => {
    setShowTermsModal(false);
    setIsSubmitting(true);

    // Use setTimeout to ensure the UI updates to "Processing..." before any heavy lifting
    setTimeout(async () => {
      try {
        if (!config) throw new Error("시험 설정이 로드되지 않았습니다.");

        let calculatedMcqScore = 0;
        config.mcqs.forEach((q, idx) => {
          // Safe check for answer existence
          const answer = mcqAnswers[idx];
          if (answer !== undefined && answer === q.correctOption) {
            calculatedMcqScore += q.points;
          }
        });

        let calculatedSubjScore = 0;
        config.subjectives.forEach((q, idx) => {
          if (q.type === 'AUTO') {
            const userAnswer = (subjTextAnswers[idx] || '').trim();
            const correctAnswer = (q.correctAnswer || '').trim();
            // Case insensitive check could be added here, currently exact match
            if (userAnswer !== '' && userAnswer === correctAnswer) {
              calculatedSubjScore += q.points;
            }
          } else {
            // SELF GRADE
            const rawScore = subjScores[idx];
            // Critical: Ensure we treat empty/undefined as 0 and convert string to number
            let score = 0;
            if (typeof rawScore === 'number') {
              score = rawScore;
            } else if (typeof rawScore === 'string' && rawScore.trim() !== '') {
               score = Number(rawScore);
            }
            
            // Final NaN safety check
            if (isNaN(score)) score = 0;
            
            calculatedSubjScore += score;
          }
        });

        const totalScore = calculatedMcqScore + calculatedSubjScore;

        // 주관식 점수를 숫자로 변환
        const subjectiveScoresRecord: Record<number, number> = {};
        config.subjectives.forEach((q, idx) => {
          if (q.type === 'SELF') {
            const rawScore = subjScores[idx];
            let score = 0;
            if (typeof rawScore === 'number') {
              score = rawScore;
            } else if (typeof rawScore === 'string' && rawScore.trim() !== '') {
              score = Number(rawScore);
            }
            if (!isNaN(score)) {
              subjectiveScoresRecord[idx] = score;
            }
          }
        });

        const record: UserScore = {
          id: `score-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          examId: config.id,
          studentName: user.name || 'Unknown',
          studentNumber: user.studentNumber || '0000',
          userId: user.userId || user.username,
          totalScore,
          mcqScore: calculatedMcqScore,
          subjectiveScore: calculatedSubjScore,
          timestamp: Date.now(),
          mcqAnswers: mcqAnswers, // 오답률 계산용
          subjectiveScores: subjectiveScoresRecord, // 오답률 계산용
          previousExamGrade: previousExamGrade === '' ? undefined : (previousExamGrade === 'UNKNOWN' ? 'UNKNOWN' : Number(previousExamGrade)),
          lastSemesterGrade: lastSemesterGrade === '' ? undefined : (lastSemesterGrade === 'UNKNOWN' ? 'UNKNOWN' : Number(lastSemesterGrade)),
          lastYearFirstSemesterGrade: lastYearFirstSemesterGrade === '' ? undefined : (lastYearFirstSemesterGrade === 'UNKNOWN' ? 'UNKNOWN' : Number(lastYearFirstSemesterGrade)),
          lastYearSecondSemesterGrade: lastYearSecondSemesterGrade === '' ? undefined : (lastYearSecondSemesterGrade === 'UNKNOWN' ? 'UNKNOWN' : Number(lastYearSecondSemesterGrade))
        };

        // Save to LocalStorage and Supabase
        const success = await saveUserScore(record);
        if (!success) {
          throw new Error('성적 저장에 실패했습니다.');
        }
        
        // Navigate to results
        onComplete(record.id);

      } catch (error: any) {
        console.error("Submission error:", error);
        alert(`제출 중 오류가 발생했습니다: ${error.message || '알 수 없는 오류'}`);
        setIsSubmitting(false);
      }
    }, 100);
  };

  const answeredMcqCount = Object.keys(mcqAnswers).length;
  const darkInputClass = "w-full p-3 bg-slate-800 text-white border border-slate-600 rounded-md focus:ring-2 focus:ring-indigo-500 outline-none placeholder-slate-400";
  
  // 등급 입력 화면
  if (showGradeInput) {
    const isGrade1 = user.grade === 1;
    const isGrade2Or3 = user.grade === 2 || user.grade === 3;
    const maxGrade = isGrade1 ? 5 : 9;
    const gradeOptions = Array.from({ length: maxGrade }, (_, i) => i + 1);
    
    const GradeSelector = ({ 
      label, 
      value, 
      onChange 
    }: { 
      label: string; 
      value: number | '' | 'UNKNOWN'; 
      onChange: (val: number | '' | 'UNKNOWN') => void;
    }) => (
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-3">{label}</label>
        <div className="flex flex-wrap gap-2">
          {gradeOptions.map((grade) => (
            <button
              key={grade}
              type="button"
              onClick={() => onChange(value === grade ? '' : grade)}
              className={`w-12 h-12 rounded-lg border-2 flex items-center justify-center font-bold transition-all ${
                value === grade
                  ? 'bg-indigo-600 border-indigo-600 text-white shadow-md scale-105'
                  : 'bg-white border-slate-300 text-slate-600 hover:border-indigo-400 hover:text-indigo-600'
              }`}
            >
              {grade}
            </button>
          ))}
          <button
            type="button"
            onClick={() => onChange(value === 'UNKNOWN' ? '' : 'UNKNOWN')}
            className={`px-4 py-2 rounded-lg border-2 flex items-center justify-center font-medium text-sm transition-all ${
              value === 'UNKNOWN'
                ? 'bg-slate-600 border-slate-600 text-white shadow-md scale-105'
                : 'bg-white border-slate-300 text-slate-600 hover:border-slate-400 hover:text-slate-700'
            }`}
          >
            모르겠음/없음
          </button>
        </div>
        {value && (
          <p className="text-xs text-slate-500 mt-2">
            선택된 등급: {value === 'UNKNOWN' ? '모르겠음/없음' : `${value}등급`}
          </p>
        )}
      </div>
    );
    
    return (
      <div className="max-w-3xl mx-auto p-4 md:p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">등급 정보 입력</h1>
          <p className="text-slate-500">
            채점 전 등급 정보를 입력해주세요. ({isGrade1 ? '5등급제' : '9등급제'})
          </p>
        </div>
        
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-6">
          <GradeSelector
            label="직전 시험 등급"
            value={previousExamGrade}
            onChange={setPreviousExamGrade}
          />
          
          <GradeSelector
            label="지난 학기 등급"
            value={lastSemesterGrade}
            onChange={setLastSemesterGrade}
          />
          
          {isGrade2Or3 && (
            <>
              <GradeSelector
                label="작년 1학기 등급"
                value={lastYearFirstSemesterGrade}
                onChange={setLastYearFirstSemesterGrade}
              />
              
              <GradeSelector
                label="작년 2학기 등급"
                value={lastYearSecondSemesterGrade}
                onChange={setLastYearSecondSemesterGrade}
              />
            </>
          )}
          
          <div className="flex gap-3 pt-4">
            <button
              onClick={() => setShowGradeInput(false)}
              className="flex-1 px-6 py-3 bg-slate-200 text-slate-700 rounded-lg font-medium hover:bg-slate-300 transition-colors"
            >
              뒤로가기
            </button>
            <button
              onClick={(e) => {
                setShowGradeInput(false);
                handleSubmit(e);
              }}
              className="flex-1 px-6 py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors"
            >
              계속하기
            </button>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="max-w-3xl mx-auto p-4 md:p-8">
      <div className="mb-6 md:mb-8 flex justify-between items-start gap-4">
        <div className="flex-1">
           <h1 className="text-2xl md:text-3xl font-bold text-slate-900">{config.title}</h1>
           <p className="text-xs md:text-sm text-slate-500 mt-2">
             {config.grade ? `${config.grade}학년 시험` : '시험'} | 
             채점자: <span className="font-semibold text-slate-800">{user.name}</span> ({user.studentNumber})
           </p>
        </div>
        <button onClick={onCancel} className="text-xs md:text-sm text-slate-400 hover:text-slate-600 whitespace-nowrap">
          나가기
        </button>
      </div>

      <div className="space-y-8">
        {/* MCQ Section */}
        {config.mcqs.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex justify-between items-center">
              <h2 className="text-lg font-semibold text-slate-800">객관식 문항</h2>
              <span className="text-xs font-mono text-slate-500 bg-white px-2 py-1 rounded border border-slate-200">
                {config.mcqs.length} 문항
              </span>
            </div>
            <div className="p-6 space-y-6">
              {config.mcqs.map((q, idx) => (
                <div key={idx} className="flex flex-col sm:flex-row sm:items-center gap-4 pb-4 border-b border-slate-50 last:border-0 last:pb-0">
                  <div className="w-full sm:w-20 flex justify-between sm:block">
                    <span className="font-bold text-slate-700">{idx + 1}번</span>
                    <span className="text-xs text-slate-400 block mt-1">{q.points}점</span>
                  </div>
                  <div className="flex-1 flex justify-between gap-2">
                    {[1, 2, 3, 4, 5].map((opt) => (
                      <button
                        key={opt}
                        onClick={() => handleMcqSelect(idx, opt)}
                        className={`
                          w-10 h-10 sm:w-12 sm:h-12 rounded-full border-2 flex items-center justify-center text-lg font-medium transition-all
                          ${mcqAnswers[idx] === opt 
                            ? 'bg-slate-800 border-slate-800 text-white shadow-lg scale-105' 
                            : 'bg-white border-slate-200 text-slate-400 hover:border-slate-400 hover:text-slate-600'}
                        `}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Subjective Section */}
        {config.subjectives.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
             <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex justify-between items-center">
              <h2 className="text-lg font-semibold text-slate-800">주관식/서술형 문항</h2>
               <span className="text-xs font-mono text-slate-500 bg-white px-2 py-1 rounded border border-slate-200">
                {config.subjectives.length} 문항
              </span>
            </div>
            <div className="p-6 space-y-6">
              {config.subjectives.map((q, idx) => (
                <div key={idx} className="flex flex-col sm:flex-row sm:items-start gap-4">
                  <div className="w-20 pt-2">
                    <span className="font-bold text-slate-700">서술형 {idx + 1}번</span>
                    <span className="text-xs text-slate-400 block mt-1">배점 {q.points}</span>
                  </div>
                  
                  <div className="flex-1">
                    {q.type === 'AUTO' ? (
                      <div>
                        <label className="text-sm text-slate-600 block mb-2">
                          정답을 입력하세요:
                        </label>
                        <input 
                          type="text"
                          value={subjTextAnswers[idx] || ''}
                          onChange={(e) => handleSubjTextChange(idx, e.target.value)}
                          className={darkInputClass}
                          placeholder="정답 텍스트"
                        />
                      </div>
                    ) : (
                      <div>
                        <label className="text-sm text-slate-600 block mb-2">
                          본인의 예상 점수를 입력하세요 (자가채점):
                        </label>
                        <div className="flex items-center gap-3">
                          <input
                            type="number"
                            min="0"
                            max={q.points}
                            step="0.1"
                            value={subjScores[idx] === undefined ? '' : subjScores[idx]}
                            onChange={(e) => handleSubjScoreChange(idx, e.target.value, q.points)}
                            className={`${darkInputClass} w-24 text-center font-bold text-lg`}
                          />
                          <span className="text-slate-400 font-light">/ {q.points} 점</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex flex-col items-center pt-8 pb-12 gap-4">
          {answeredMcqCount < config.mcqs.length && (
            <div className="flex items-center gap-2 text-amber-600 bg-amber-50 px-4 py-2 rounded-full text-sm">
              <AlertCircle size={16} /> 아직 답하지 않은 객관식 문항이 있습니다.
            </div>
          )}
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className={`
              flex items-center gap-3 px-10 py-4 text-white text-lg font-bold rounded-full shadow-xl transition-all active:scale-95
              ${isSubmitting ? 'bg-slate-600 cursor-not-allowed' : 'bg-slate-900 hover:bg-slate-800 hover:shadow-2xl'}
            `}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="animate-spin" /> 처리중...
              </>
            ) : (
              <>
                답안 제출하기 <CheckCircle2 />
              </>
            )}
          </button>
        </div>
      </div>
      
      {/* 약관 동의 모달 */}
      <SubmissionTermsModal
        isOpen={showTermsModal}
        onClose={() => setShowTermsModal(false)}
        onComplete={processSubmission}
      />
    </div>
  );
};

export default UserExam;
