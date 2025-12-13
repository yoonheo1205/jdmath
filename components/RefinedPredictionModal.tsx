import React, { useState, useEffect } from 'react';
import { X, AlertCircle } from 'lucide-react';

interface RefinedPredictionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (previousScore: number | null, previousRank: number | null) => void;
  previousExamTitle?: string;
}

const RefinedPredictionModal: React.FC<RefinedPredictionModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  previousExamTitle
}) => {
  const [previousScore, setPreviousScore] = useState<string>('');
  const [previousRank, setPreviousRank] = useState<string>('');
  const [dontKnowScore, setDontKnowScore] = useState(false);
  const [dontKnowRank, setDontKnowRank] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 모달이 열릴 때 폼 초기화
  useEffect(() => {
    if (isOpen) {
      setPreviousScore('');
      setPreviousRank('');
      setDontKnowScore(false);
      setDontKnowRank(false);
      setError(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = () => {
    setError(null);

    // 원점수 처리
    let scoreValue: number | null = null;
    if (!dontKnowScore) {
      if (!previousScore.trim()) {
        setError('원점수를 입력하거나 "모른다"를 체크해주세요.');
        return;
      }
      const parsedScore = parseFloat(previousScore);
      if (isNaN(parsedScore) || parsedScore < 0) {
        setError('올바른 원점수를 입력해주세요. (0 이상의 숫자, 소수점 한자리까지)');
        return;
      }
      scoreValue = Math.round(parsedScore * 10) / 10; // 소수점 한자리로 반올림
    }

    // 등수 처리
    let rankValue: number | null = null;
    if (!dontKnowRank) {
      if (!previousRank.trim()) {
        setError('등수를 입력하거나 "모른다"를 체크해주세요.');
        return;
      }
      const parsedRank = parseInt(previousRank);
      if (isNaN(parsedRank) || parsedRank < 1) {
        setError('올바른 등수를 입력해주세요. (1 이상의 정수)');
        return;
      }
      rankValue = parsedRank;
    }

    // onSubmit을 호출하면 부모 컴포넌트에서 모달을 닫음
    // 폼 초기화는 handleClose에서만 수행
    onSubmit(scoreValue, rankValue);
  };

  const handleClose = () => {
    setPreviousScore('');
    setPreviousRank('');
    setDontKnowScore(false);
    setDontKnowRank(false);
    setError(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-slate-800">정교화된 예측을 위한 정보 입력</h2>
          <button
            onClick={handleClose}
            className="p-1 hover:bg-slate-100 rounded-full transition-colors"
          >
            <X size={24} className="text-slate-500" />
          </button>
        </div>

        {previousExamTitle && (
          <p className="text-sm text-slate-600 mb-4">
            직전 시험: <span className="font-semibold">{previousExamTitle}</span>
          </p>
        )}

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700 text-sm">
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}

        <div className="space-y-4">
          {/* 원점수 입력 */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              직전 시험 원점수 (소수점 한자리까지)
            </label>
            <div className="flex items-center gap-3">
              <input
                type="number"
                step="0.1"
                min="0"
                value={previousScore}
                onChange={(e) => {
                  setPreviousScore(e.target.value);
                  setDontKnowScore(false);
                }}
                disabled={dontKnowScore}
                className={`flex-1 px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none ${
                  dontKnowScore ? 'bg-slate-100 text-slate-400' : 'bg-white'
                }`}
                placeholder="예: 85.5"
              />
              <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
                <input
                  type="checkbox"
                  checked={dontKnowScore}
                  onChange={(e) => {
                    setDontKnowScore(e.target.checked);
                    if (e.target.checked) {
                      setPreviousScore('');
                    }
                  }}
                  className="w-4 h-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500"
                />
                <span>모른다</span>
              </label>
            </div>
          </div>

          {/* 등수 입력 */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              직전 시험 등수
            </label>
            <div className="flex items-center gap-3">
              <input
                type="number"
                min="1"
                value={previousRank}
                onChange={(e) => {
                  setPreviousRank(e.target.value);
                  setDontKnowRank(false);
                }}
                disabled={dontKnowRank}
                className={`flex-1 px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none ${
                  dontKnowRank ? 'bg-slate-100 text-slate-400' : 'bg-white'
                }`}
                placeholder="예: 15"
              />
              <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
                <input
                  type="checkbox"
                  checked={dontKnowRank}
                  onChange={(e) => {
                    setDontKnowRank(e.target.checked);
                    if (e.target.checked) {
                      setPreviousRank('');
                    }
                  }}
                  className="w-4 h-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500"
                />
                <span>모른다</span>
              </label>
            </div>
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={handleClose}
            className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg font-medium hover:bg-slate-50 transition-colors"
          >
            취소
          </button>
          <button
            onClick={handleSubmit}
            className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors"
          >
            확인
          </button>
        </div>
      </div>
    </div>
  );
};

export default RefinedPredictionModal;



