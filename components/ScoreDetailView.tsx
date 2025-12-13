import React, { useState } from 'react';
import { UserScore, ExamConfig } from '../types';
import { saveUserScore } from '../services/storageService';
import { ArrowLeft, Save } from 'lucide-react';

interface ScoreDetailViewProps {
  score: UserScore;
  config: ExamConfig;
  onBack: () => void;
  onUpdate: (updatedScore: UserScore) => void;
}

const ScoreDetailView: React.FC<ScoreDetailViewProps> = ({ score, config, onBack, onUpdate }) => {
  const [editedScore, setEditedScore] = useState<UserScore>({ ...score });
  const [mcqAnswers, setMcqAnswers] = useState<Record<number, number>>(score.mcqAnswers || {});
  const [subjectiveScores, setSubjectiveScores] = useState<Record<number, number>>(score.subjectiveScores || {});

  const handleSave = () => {
    // 점수 재계산
    let newMcqScore = 0;
    config.mcqs.forEach((q, idx) => {
      const answer = mcqAnswers[idx];
      if (answer !== undefined && answer === q.correctOption) {
        newMcqScore += q.points;
      }
    });

    let newSubjScore = 0;
    config.subjectives.forEach((q, idx) => {
      const score = subjectiveScores[idx] || 0;
      newSubjScore += Math.min(Math.max(0, score), q.points);
    });

    const updated: UserScore = {
      ...editedScore,
      mcqScore: newMcqScore,
      subjectiveScore: newSubjScore,
      totalScore: newMcqScore + newSubjScore,
      mcqAnswers,
      subjectiveScores
    };

    saveUserScore(updated);
    onUpdate(updated);
    alert('수정이 저장되었습니다.');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-lg font-bold text-slate-800">{score.studentName} ({score.studentNumber})</h4>
          <p className="text-sm text-slate-500">총점: {editedScore.totalScore}점 (객관식: {editedScore.mcqScore}점, 주관식: {editedScore.subjectiveScore}점)</p>
        </div>
        <button
          onClick={onBack}
          className="p-2 text-slate-400 hover:text-slate-600 transition-colors"
        >
          <ArrowLeft size={20} />
        </button>
      </div>

      {/* 객관식 답안 수정 */}
      {config.mcqs.length > 0 && (
        <div>
          <h5 className="font-semibold text-slate-700 mb-3">객관식 답안</h5>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {config.mcqs.map((q, idx) => (
              <div key={idx} className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <div className="text-xs text-slate-500 mb-2">{idx + 1}번 ({q.points}점)</div>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((opt) => (
                    <button
                      key={opt}
                      onClick={() => setMcqAnswers({ ...mcqAnswers, [idx]: opt })}
                      className={`w-8 h-8 rounded text-sm font-bold transition-colors ${
                        mcqAnswers[idx] === opt
                          ? 'bg-indigo-600 text-white'
                          : 'bg-white border border-slate-300 text-slate-600 hover:border-indigo-400'
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
                <div className="text-xs text-slate-400 mt-1">정답: {q.correctOption}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 주관식 점수 수정 */}
      {config.subjectives.length > 0 && (
        <div>
          <h5 className="font-semibold text-slate-700 mb-3">주관식 점수</h5>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {config.subjectives.map((q, idx) => (
              <div key={idx} className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <div className="text-sm font-medium text-slate-700 mb-2">
                  {config.mcqs.length + idx + 1}번 (배점: {q.points}점)
                </div>
                <input
                  type="number"
                  min="0"
                  max={q.points}
                  step="0.1"
                  value={subjectiveScores[idx] || 0}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value) || 0;
                    setSubjectiveScores({ ...subjectiveScores, [idx]: Math.min(Math.max(0, val), q.points) });
                  }}
                  className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex gap-3 pt-4">
        <button
          onClick={onBack}
          className="flex-1 px-4 py-2 bg-slate-200 text-slate-700 rounded-lg font-medium hover:bg-slate-300 transition-colors"
        >
          취소
        </button>
        <button
          onClick={handleSave}
          className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2"
        >
          <Save size={18} /> 저장
        </button>
      </div>
    </div>
  );
};

export default ScoreDetailView;



