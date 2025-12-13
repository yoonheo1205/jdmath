
import React, { useEffect, useState } from 'react';
import { UserScore, ExamConfig, CutoffResult, ExamComment } from '../types';
import { getScoresByExamId, getExamById, generateMockData, getCommentsByExamId, addComment, getNextAnonymousId, hasUserCommented, hasUserRated, isSpecialMember, saveRefinedPrediction, getRefinedPrediction, updateComment, deleteComment, updateUserScore, deleteUserScore } from '../services/storageService';
import ScoreDetailView from './ScoreDetailView';
import RefinedPredictionModal from './RefinedPredictionModal';
import { calculateMean, calculateStdDev, calculatePercentile, calculateCutoffs, CSAT_TIERS, RELATIVE_5_TIERS, calculateRefinedMean, calculateRefinedStdDev, predictIntegratedGrades, predictRefinedIntegratedGrades } from '../services/mathService';
import { BarChart, Activity, Users, RefreshCw, Star, MessageSquare, Send, TrendingUp, Edit2, Trash2, Eye, EyeOff } from 'lucide-react';
import { BarChart as ReBarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';

interface ResultStatsProps {
  examId: string;
  currentResultId?: string; // If viewing just after taking exam
  isAdminView?: boolean; // New prop for admin mode
  currentUserId?: string; // 현재 사용자 ID (댓글 작성용)
  currentUserEmail?: string; // 현재 사용자 이메일 (댓글 작성용)
  onClose: () => void;
}

const ResultStats: React.FC<ResultStatsProps> = ({ examId, currentResultId, isAdminView = false, currentUserId, currentUserEmail, onClose }) => {
  const [config, setConfig] = useState<ExamConfig | undefined>(undefined);
  const [scores, setScores] = useState<UserScore[]>([]);
  const [currentUserScore, setCurrentUserScore] = useState<UserScore | undefined>(undefined);
  const [selectedScoreDetail, setSelectedScoreDetail] = useState<UserScore | null>(null);
  
  // Stats State
  const [stats, setStats] = useState({ mean: 0, stdDev: 0, count: 0, userPercentile: 0 });
  const [csatCutoffs, setCsatCutoffs] = useState<CutoffResult[]>([]);
  const [rel5Cutoffs, setRel5Cutoffs] = useState<CutoffResult[]>([]);
  const [distData, setDistData] = useState<any[]>([]);
  const [userGrade, setUserGrade] = useState<number | null>(null);
  
  // Comment State
  const [comments, setComments] = useState<ExamComment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [newDifficulty, setNewDifficulty] = useState(0);
  const [averageDifficulty, setAverageDifficulty] = useState(0);
  const [hasCommented, setHasCommented] = useState(false);
  const [hasRated, setHasRated] = useState(false); // 별점은 시험당 1개만
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState('');
  const [editingDifficulty, setEditingDifficulty] = useState(0);
  // 성적 수정 상태
  const [isEditingScore, setIsEditingScore] = useState(false);
  const [editingMcqAnswers, setEditingMcqAnswers] = useState<Record<number, number>>({});
  const [editingSubjScores, setEditingSubjScores] = useState<Record<number, number>>({});
  const [wrongAnswerStats, setWrongAnswerStats] = useState<{
    mcqWrongAnswers: Array<{ questionNum: number; wrongRate: number }>;
    subjectiveLowScores: Array<{ questionNum: number; avgScoreRatio: number }>;
  }>({ mcqWrongAnswers: [], subjectiveLowScores: [] });
  const [showAllWrongAnswers, setShowAllWrongAnswers] = useState(false);
  const [integratedPrediction, setIntegratedPrediction] = useState<any>(null);
  const [showRefinedModal, setShowRefinedModal] = useState(false);
  const [refinedPrediction, setRefinedPrediction] = useState<any>(null);

  useEffect(() => {
    loadData();
  }, [examId, currentResultId]);

  const loadData = () => {
    const loadedConfig = getExamById(examId);
    const loadedScores = getScoresByExamId(examId);
    const loadedComments = getCommentsByExamId(examId);
    
    setConfig(loadedConfig);
    setScores(loadedScores);
    setComments(loadedComments);

    // 사용자가 이미 댓글/별점을 남겼는지 확인
    if (currentUserId) {
      setHasCommented(hasUserCommented(examId, currentUserId));
      setHasRated(hasUserRated(examId, currentUserId)); // 별점은 시험당 1개만
    }

    // 난이도 평균 계산
    const difficulties = loadedComments
      .filter(c => c.difficulty > 0)
      .map(c => c.difficulty);
    if (difficulties.length > 0) {
      const avg = difficulties.reduce((a, b) => a + b, 0) / difficulties.length;
      setAverageDifficulty(avg);
    } else {
      setAverageDifficulty(0);
    }

    // 현재 사용자의 점수 찾기 (currentResultId가 있거나, userId로 찾기)
    if (!isAdminView) {
      let userScore: UserScore | undefined;
      
      if (currentResultId) {
        userScore = loadedScores.find(s => s.id === currentResultId);
      }
      
      // currentResultId가 없거나 찾지 못한 경우, userId로 찾기
      if (!userScore && currentUserId) {
        userScore = loadedScores.find(s => s.userId === currentUserId || s.studentNumber === currentUserId);
      }
      
      setCurrentUserScore(userScore);
    }
    
    // 오답률 계산
    if (loadedConfig && loadedScores.length > 0) {
      calculateWrongAnswerStats(loadedConfig, loadedScores);
    }
    
    // 통합 등급컷 예측 (기말고사인 경우 또는 midtermStats가 있는 경우)
    if (loadedConfig && (loadedConfig.examType === 'FINAL' || loadedConfig.examType === 'FINAL_ONLY') && 
        (loadedConfig.parentExamId || loadedConfig.midtermStats)) {
      calculateIntegratedPrediction(loadedConfig, loadedScores);
    }
    
    // 저장된 정교화된 예측 불러오기
    if (currentUserId && loadedConfig) {
      const savedRefinedPrediction = getRefinedPrediction(examId, currentUserId);
      if (savedRefinedPrediction) {
        setRefinedPrediction(savedRefinedPrediction);
      }
    }
  };
  
  const calculateIntegratedPrediction = (finalConfig: ExamConfig, finalScores: UserScore[]) => {
    const finalTotalPoints = Math.round((finalConfig.mcqs.reduce((s,q) => s+q.points,0) + finalConfig.subjectives.reduce((s,q) => s+q.points, 0)) * 100) / 100;
    const gradingSystem = finalConfig.gradingSystem === 'ABSOLUTE' ? 'CSAT' : (finalConfig.gradingSystem || 'CSAT');
    
    // 중간고사가 있는 경우
    if (finalConfig.parentExamId) {
      const midtermConfig = getExamById(finalConfig.parentExamId);
      if (!midtermConfig) return;
      
      const midtermScores = getScoresByExamId(finalConfig.parentExamId);
      
      // 같은 사용자의 중간고사와 기말고사 점수를 매칭
      const userScoreMap = new Map<string, { midterm?: number; final?: number }>();
      
      midtermScores.forEach(score => {
        const userId = score.userId || score.studentNumber;
        if (!userScoreMap.has(userId)) {
          userScoreMap.set(userId, {});
        }
        userScoreMap.get(userId)!.midterm = score.totalScore;
      });
      
      finalScores.forEach(score => {
        const userId = score.userId || score.studentNumber;
        if (!userScoreMap.has(userId)) {
          userScoreMap.set(userId, {});
        }
        userScoreMap.get(userId)!.final = score.totalScore;
      });
      
      // 둘 다 있는 사용자만 필터링
      const matchedScores = Array.from(userScoreMap.values())
        .filter(s => s.midterm !== undefined && s.final !== undefined)
        .map(s => ({ midterm: s.midterm!, final: s.final! }));
      
      if (matchedScores.length < 30) {
        setIntegratedPrediction(null);
        return;
      }
      
      const midtermScoreArray = matchedScores.map(s => s.midterm);
      const finalScoreArray = matchedScores.map(s => s.final);
      
      const totalPoints = {
        midterm: Math.round((midtermConfig.mcqs.reduce((s,q) => s+q.points,0) + midtermConfig.subjectives.reduce((s,q) => s+q.points, 0)) * 100) / 100,
        final: finalTotalPoints
      };
      
      const prediction = predictIntegratedGrades(
        midtermScoreArray,
        finalScoreArray,
        totalPoints.midterm,
        totalPoints.final,
        gradingSystem
      );
      
      if (prediction) {
        setIntegratedPrediction({
          ...prediction,
          midtermExamId: finalConfig.parentExamId,
          finalExamId: finalConfig.id
        });
      }
    } 
    // 중간고사 없이 관리자가 입력한 통계 데이터로 계산
    else if (finalConfig.midtermStats) {
      const { mean: midtermMean, stdDev: midtermStdDev, totalPoints: midtermTotalPoints } = finalConfig.midtermStats;
      
      // 기말고사 점수만으로 시뮬레이션
      const finalScoreArray = finalScores.map(s => s.totalScore);
      if (finalScoreArray.length < 5) {
        setIntegratedPrediction(null);
        return;
      }
      
      // 중간고사 점수 시뮬레이션 (정규분포 가정)
      const simulatedMidtermScores = finalScoreArray.map(() => {
        // Box-Muller 변환을 이용한 정규분포 랜덤 생성
        const u1 = Math.random();
        const u2 = Math.random();
        const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
        const score = midtermMean + z * midtermStdDev;
        return Math.max(0, Math.min(midtermTotalPoints, score));
      });
      
      const prediction = predictIntegratedGrades(
        simulatedMidtermScores,
        finalScoreArray,
        midtermTotalPoints,
        finalTotalPoints,
        gradingSystem
      );
      
      if (prediction) {
        setIntegratedPrediction({
          ...prediction,
          midtermExamId: null,
          finalExamId: finalConfig.id,
          isSimulated: true // 시뮬레이션 데이터임을 표시
        });
      }
    }
  };

  const handleRefinedPredictionSubmit = (previousScore: number | null, previousRank: number | null) => {
    if (!config || !currentUserScore || !integratedPrediction) {
      alert('예측을 위한 데이터가 부족합니다.');
      setShowRefinedModal(false);
      return;
    }
    
    // 시뮬레이션 기반인 경우 (midtermStats 사용)
    if (config.midtermStats && !config.parentExamId) {
      const { mean: midtermMean, stdDev: midtermStdDev, totalPoints: midtermTotalPoints } = config.midtermStats;
      const finalScores = getScoresByExamId(examId);
      const finalTotalPoints = Math.round((config.mcqs.reduce((s,q) => s+q.points,0) + config.subjectives.reduce((s,q) => s+q.points, 0)) * 100) / 100;
      
      // 사용자의 정보를 바탕으로 개인화된 예측
      let estimatedMidtermScore = midtermMean;
      if (previousScore !== null) {
        estimatedMidtermScore = previousScore;
      } else if (previousRank !== null) {
        // 등수를 바탕으로 점수 추정 (정규분포 가정)
        const percentile = 1 - (previousRank / finalScores.length);
        const zScore = percentile > 0.5 ? 
          Math.sqrt(-2 * Math.log(1 - percentile)) : 
          -Math.sqrt(-2 * Math.log(percentile));
        estimatedMidtermScore = midtermMean + zScore * midtermStdDev;
      }
      
      // 통합 점수 계산
      const integratedScore = estimatedMidtermScore * 0.5 + currentUserScore.totalScore * 0.5;
      
      // 기존 통합 등급컷에서 해당 사용자의 등급 찾기
      const userGrade = integratedPrediction.integratedCutoffs.find((c: CutoffResult) => integratedScore >= c.minScore);
      
      const refinedResult = {
        ...integratedPrediction,
        userEstimatedMidterm: estimatedMidtermScore,
        userIntegratedScore: integratedScore,
        userEstimatedGrade: userGrade ? userGrade.grade : 9
      };
      
      setRefinedPrediction(refinedResult);
      
      // localStorage에 저장
      if (currentUserId) {
        saveRefinedPrediction(examId, currentUserId, refinedResult);
      }
      
      setShowRefinedModal(false);
      alert(`정교화된 예측이 적용되었습니다!\n예상 중간고사 점수: ${estimatedMidtermScore.toFixed(1)}점\n통합 점수: ${integratedScore.toFixed(1)}점`);
      return;
    }
    
    // 실제 중간고사 데이터가 있는 경우
    if (!config.parentExamId) {
      setShowRefinedModal(false);
      return;
    }
    
    const midtermConfig = getExamById(config.parentExamId);
    if (!midtermConfig) {
      setShowRefinedModal(false);
      return;
    }
    
    const midtermScores = getScoresByExamId(config.parentExamId);
    const finalScores = getScoresByExamId(examId);
    
    // 같은 사용자의 중간고사와 기말고사 점수를 매칭
    const userScoreMap = new Map<string, { midterm?: number; final?: number }>();
    
    midtermScores.forEach(score => {
      const userId = score.userId || score.studentNumber;
      if (!userScoreMap.has(userId)) {
        userScoreMap.set(userId, {});
      }
      userScoreMap.get(userId)!.midterm = score.totalScore;
    });
    
    finalScores.forEach(score => {
      const userId = score.userId || score.studentNumber;
      if (!userScoreMap.has(userId)) {
        userScoreMap.set(userId, {});
      }
      userScoreMap.get(userId)!.final = score.totalScore;
    });
    
    // 둘 다 있는 사용자만 필터링
    const matchedScores = Array.from(userScoreMap.values())
      .filter(s => s.midterm !== undefined && s.final !== undefined)
      .map(s => ({ midterm: s.midterm!, final: s.final! }));
    
    if (matchedScores.length < 30) {
      alert('표본이 부족합니다. (최소 30명 필요)');
      setShowRefinedModal(false);
      return;
    }
    
    const midtermScoreArray = matchedScores.map(s => s.midterm);
    const finalScoreArray = matchedScores.map(s => s.final);
    
    const totalPoints = {
      midterm: Math.round((midtermConfig.mcqs.reduce((s,q) => s+q.points,0) + midtermConfig.subjectives.reduce((s,q) => s+q.points, 0)) * 100) / 100,
      final: Math.round((config.mcqs.reduce((s,q) => s+q.points,0) + config.subjectives.reduce((s,q) => s+q.points, 0)) * 100) / 100
    };
    
    const gradingSystem = config.gradingSystem === 'ABSOLUTE' ? 'CSAT' : (config.gradingSystem || 'CSAT');
    
    // 전체 학생 수 추정 (표본 수를 기반으로)
    const estimatedTotalStudents = Math.max(matchedScores.length * 2, 100); // 표본의 2배 또는 최소 100명
    
    const refinedPred = predictRefinedIntegratedGrades(
      midtermScoreArray,
      finalScoreArray,
      totalPoints.midterm,
      totalPoints.final,
      gradingSystem,
      previousScore,
      previousRank,
      estimatedTotalStudents
    );
    
    if (refinedPred) {
      const refinedResult = {
        ...refinedPred,
        midtermExamId: config.parentExamId,
        finalExamId: config.id
      };
      
      setRefinedPrediction(refinedResult);
      
      // localStorage에 저장
      if (currentUserId) {
        saveRefinedPrediction(examId, currentUserId, refinedResult);
      }
      
      setShowRefinedModal(false);
      alert('정교화된 예측이 적용되었습니다!');
    } else {
      alert('정교화된 예측 계산에 실패했습니다.');
      setShowRefinedModal(false);
    }
  };
  
  const calculateWrongAnswerStats = (examConfig: ExamConfig, allScores: UserScore[]) => {
    // 객관식 오답률 계산
    const mcqStats: Record<number, { total: number; wrong: number }> = {};
    examConfig.mcqs.forEach((q, idx) => {
      mcqStats[idx] = { total: 0, wrong: 0 };
    });
    
    allScores.forEach(score => {
      if (score.mcqAnswers) {
        examConfig.mcqs.forEach((q, idx) => {
          mcqStats[idx].total++;
          const userAnswer = score.mcqAnswers?.[idx];
          if (userAnswer !== undefined && userAnswer !== q.correctOption) {
            mcqStats[idx].wrong++;
          }
        });
      }
    });
    
    const mcqWrongAnswers = Object.entries(mcqStats)
      .map(([idx, stat]) => ({
        questionNum: parseInt(idx) + 1,
        wrongRate: stat.total > 0 ? (stat.wrong / stat.total) * 100 : 0
      }))
      .sort((a, b) => b.wrongRate - a.wrongRate)
      .slice(0, showAllWrongAnswers ? undefined : 10);
    
    // 주관식 낮은 점수 비율 계산
    const subjectiveStats: Record<number, { total: number; totalScore: number; maxScore: number }> = {};
    examConfig.subjectives.forEach((q, idx) => {
      subjectiveStats[idx] = { total: 0, totalScore: 0, maxScore: q.points };
    });
    
    allScores.forEach(score => {
      if (score.subjectiveScores) {
        examConfig.subjectives.forEach((q, idx) => {
          const userScore = score.subjectiveScores?.[idx];
          if (userScore !== undefined) {
            subjectiveStats[idx].total++;
            subjectiveStats[idx].totalScore += userScore;
          }
        });
      }
    });
    
    const subjectiveLowScores = Object.entries(subjectiveStats)
      .map(([idx, stat]) => ({
        questionNum: examConfig.mcqs.length + parseInt(idx) + 1,
        avgScoreRatio: stat.total > 0 ? (stat.totalScore / stat.total) / stat.maxScore : 0
      }))
      .sort((a, b) => a.avgScoreRatio - b.avgScoreRatio)
      .slice(0, showAllWrongAnswers ? undefined : 10);
    
    setWrongAnswerStats({ mcqWrongAnswers, subjectiveLowScores });
  };

  // showAllWrongAnswers 변경 시 오답률 재계산
  useEffect(() => {
    if (scores.length > 0 && config) {
      calculateWrongAnswerStats(config, scores);
    }
  }, [showAllWrongAnswers, scores, config]);

  useEffect(() => {
    if (scores.length > 0 && config) {
      // Filter out any corrupted NaN scores
      const numericScores = scores
        .map(s => s.totalScore)
        .filter(s => typeof s === 'number' && !isNaN(s));
        
      // 정교화된 알고리즘 사용 (상위권 쏠림, 가짜 성적 처리)
      const mean = calculateRefinedMean(numericScores);
      const stdDev = calculateRefinedStdDev(numericScores, mean);
      
      let userPercentile = 0;
      if (currentUserScore && !isNaN(currentUserScore.totalScore)) {
        userPercentile = calculatePercentile(currentUserScore.totalScore, numericScores);
      }

      setStats({ mean, stdDev, count: numericScores.length, userPercentile });

      if (numericScores.length >= 30) {
        const calculatedCsatCutoffs = calculateCutoffs(numericScores, CSAT_TIERS);
        const calculatedRel5Cutoffs = calculateCutoffs(numericScores, RELATIVE_5_TIERS);
        
        setCsatCutoffs(calculatedCsatCutoffs);
        setRel5Cutoffs(calculatedRel5Cutoffs);
        
        // Calculate User Grade based on Config System
        if (currentUserScore && !isNaN(currentUserScore.totalScore)) {
           const targetCutoffs = config.gradingSystem === 'RELATIVE_5' ? calculatedRel5Cutoffs : calculatedCsatCutoffs;
           const maxGrade = config.gradingSystem === 'RELATIVE_5' ? 5 : 9;

           const gradeInfo = targetCutoffs.find(c => currentUserScore.totalScore >= c.minScore);
           if (gradeInfo) {
             setUserGrade(gradeInfo.grade);
           } else {
             setUserGrade(maxGrade); 
           }
        }

        // Prepare distribution data for chart
        const totalPoints = Math.round((config.mcqs.reduce((s,q) => s+q.points,0) + config.subjectives.reduce((s,q) => s+q.points, 0)) * 100) / 100;
        const bucketSize = Math.max(5, Math.ceil(totalPoints / 10)); // ~10 buckets
        const buckets: Record<string, number> = {};
        
        // Initialize buckets
        for(let i=0; i<=totalPoints; i+= bucketSize) {
           const label = `${i}~${Math.min(i+bucketSize-1, totalPoints)}`;
           buckets[label] = 0;
        }

        numericScores.forEach(score => {
          const bucketIndex = Math.floor(score / bucketSize) * bucketSize;
           const label = `${bucketIndex}~${Math.min(bucketIndex+bucketSize-1, totalPoints)}`;
           if (buckets[label] !== undefined) buckets[label]++;
        });

        const chartData = Object.keys(buckets).map(key => ({
           range: key,
           count: buckets[key]
        }));
        setDistData(chartData);
      } else {
         setUserGrade(null);
      }
    }
  }, [scores, config, currentUserScore, isAdminView]);

  const handleSimulate = (count: number = 35) => {
    if (!config) return;
    generateMockData(config, count);
    loadData();
  };

  const handleSubmitComment = async () => {
    // 별점은 한 번만, 댓글은 여러 번 가능
    const canSubmitRating = !hasRated && newDifficulty > 0;
    const hasNewComment = newComment.trim().length > 0;
    
    if (!hasNewComment && !canSubmitRating) {
      alert('댓글을 입력하거나 별점을 선택해주세요.');
      return;
    }
    
    if (!currentUserId) {
      alert('로그인이 필요합니다.');
      return;
    }
    
    const anonymousId = getNextAnonymousId();
    const comment: ExamComment = {
      id: `comment-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      examId,
      userId: currentUserId,
      anonymousId,
      content: hasNewComment ? newComment.trim() : '',
      difficulty: canSubmitRating ? newDifficulty : 0, // 별점은 처음만 저장
      timestamp: Date.now(),
      email: currentUserEmail || ''
    };
    
    await addComment(comment);
    loadData(); // 데이터 다시 로드
    setNewComment('');
    setNewDifficulty(0);
    
    if (canSubmitRating) {
      setHasRated(true);
    }
  };

  // 댓글 수정 시작
  const handleStartEdit = (comment: ExamComment) => {
    setEditingCommentId(comment.id);
    setEditingContent(comment.content);
    setEditingDifficulty(comment.difficulty);
  };

  // 댓글 수정 저장
  const handleSaveEdit = (commentId: string) => {
    if (!editingContent.trim() && editingDifficulty === 0) {
      alert('댓글 내용이나 별점을 입력해주세요.');
      return;
    }
    
    updateComment(examId, commentId, {
      content: editingContent.trim(),
      difficulty: editingDifficulty
    });
    
    setEditingCommentId(null);
    setEditingContent('');
    setEditingDifficulty(0);
    loadData();
  };

  // 댓글 수정 취소
  const handleCancelEdit = () => {
    setEditingCommentId(null);
    setEditingContent('');
    setEditingDifficulty(0);
  };

  // 댓글 삭제
  const handleDeleteComment = (commentId: string) => {
    if (confirm('정말 이 댓글을 삭제하시겠습니까?')) {
      deleteComment(examId, commentId);
      loadData();
    }
  };

  // 특별 회원 황금색 표시 토글
  const handleToggleGolden = (comment: ExamComment) => {
    const newShowGolden = comment.showGolden === undefined ? false : !comment.showGolden;
    updateComment(examId, comment.id, { showGolden: newShowGolden });
    loadData();
  };

  // 댓글 수정/삭제 권한 확인
  const canModifyComment = (comment: ExamComment) => {
    // 관리자는 모든 댓글 수정/삭제 가능
    if (isAdminView) return true;
    // 본인 댓글만 수정/삭제 가능
    return currentUserId && comment.userId === currentUserId;
  };

  // 특별 회원 황금색 토글 권한 확인
  const canToggleGolden = (comment: ExamComment) => {
    // 특별 회원 본인만 황금색 토글 가능
    return currentUserEmail && isSpecialMember(currentUserEmail) && comment.email === currentUserEmail;
  };

  // 성적 수정 시작
  const handleStartEditScore = () => {
    if (!currentUserScore || !config) return;
    setEditingMcqAnswers(currentUserScore.mcqAnswers || {});
    setEditingSubjScores(currentUserScore.subjectiveScores || {});
    setIsEditingScore(true);
  };

  // 성적 수정 저장
  const handleSaveScore = async () => {
    if (!currentUserScore || !config) return;
    
    // 점수 재계산
    let mcqScore = 0;
    config.mcqs.forEach((q, idx) => {
      if (editingMcqAnswers[idx] === q.correctOption) {
        mcqScore += q.points;
      }
    });
    
    let subjScore = 0;
    config.subjectives.forEach((q, idx) => {
      subjScore += editingSubjScores[idx] || 0;
    });
    
    const totalScore = Math.round((mcqScore + subjScore) * 100) / 100;
    
    try {
      await updateUserScore(currentUserScore.id, {
        mcqAnswers: editingMcqAnswers,
        subjectiveScores: editingSubjScores,
        mcqScore: Math.round(mcqScore * 100) / 100,
        subjectiveScore: Math.round(subjScore * 100) / 100,
        totalScore
      });
      
      setIsEditingScore(false);
      loadData();
      alert('성적이 수정되었습니다.');
    } catch (error: any) {
      console.error('Error updating score:', error);
      alert(`성적 수정 중 오류가 발생했습니다: ${error.message || '알 수 없는 오류'}`);
    }
  };

  // 성적 수정 취소
  const handleCancelEditScore = () => {
    setIsEditingScore(false);
    setEditingMcqAnswers({});
    setEditingSubjScores({});
  };

  // 성적 삭제
  const handleDeleteScore = async () => {
    if (!currentUserScore) return;
    if (confirm('정말 성적을 삭제하시겠습니까? 삭제 후 다시 시험을 응시할 수 있습니다.')) {
      try {
        await deleteUserScore(currentUserScore.id);
        loadData();
        alert('성적이 삭제되었습니다.');
      } catch (error: any) {
        console.error('Error deleting score:', error);
        alert(`성적 삭제 중 오류가 발생했습니다: ${error.message || '알 수 없는 오류'}`);
      }
    }
  };

  if (!config) return null;

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-8 space-y-6 md:space-y-8">
      
      {/* 성적 수정 모달 */}
      {isEditingScore && currentUserScore && config && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="bg-indigo-600 px-6 py-4 text-white">
              <h2 className="text-xl font-bold">성적 수정</h2>
              <p className="text-sm opacity-80 mt-1">잘못 입력한 답안을 수정할 수 있습니다.</p>
            </div>
            
            <div className="p-6 space-y-6">
              {/* 객관식 */}
              {config.mcqs.length > 0 && (
                <div>
                  <h3 className="font-bold text-slate-800 mb-3">객관식 답안</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                    {config.mcqs.map((q, idx) => (
                      <div key={idx} className="bg-slate-50 p-3 rounded-lg">
                        <p className="text-xs text-slate-500 mb-2">{idx + 1}번 ({q.points}점)</p>
                        <div className="flex gap-1">
                          {[1, 2, 3, 4, 5].map((opt) => (
                            <button
                              key={opt}
                              onClick={() => setEditingMcqAnswers({ ...editingMcqAnswers, [idx]: opt })}
                              className={`w-7 h-7 rounded-full text-xs font-bold transition-colors ${
                                editingMcqAnswers[idx] === opt
                                  ? opt === q.correctOption
                                    ? 'bg-green-500 text-white'
                                    : 'bg-indigo-600 text-white'
                                  : 'bg-white border border-slate-200 text-slate-500 hover:border-indigo-300'
                              }`}
                            >
                              {opt}
                            </button>
                          ))}
                        </div>
                        {editingMcqAnswers[idx] === q.correctOption && (
                          <p className="text-xs text-green-600 mt-1">✓ 정답</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* 주관식/서술형 */}
              {config.subjectives.length > 0 && (
                <div>
                  <h3 className="font-bold text-slate-800 mb-3">서술형 점수</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {config.subjectives.map((q, idx) => (
                      <div key={idx} className="bg-slate-50 p-3 rounded-lg">
                        <p className="text-xs text-slate-500 mb-2">서술형 {idx + 1}번 (배점: {q.points}점)</p>
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            min="0"
                            max={q.points}
                            step="0.5"
                            value={editingSubjScores[idx] ?? ''}
                            onChange={(e) => {
                              const val = parseFloat(e.target.value);
                              if (!isNaN(val) && val >= 0 && val <= q.points) {
                                setEditingSubjScores({ ...editingSubjScores, [idx]: val });
                              } else if (e.target.value === '') {
                                setEditingSubjScores({ ...editingSubjScores, [idx]: 0 });
                              }
                            }}
                            className="w-16 p-2 text-center text-sm border border-slate-200 rounded-md focus:ring-2 focus:ring-indigo-500 outline-none"
                          />
                          <span className="text-xs text-slate-400">/ {q.points}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* 예상 총점 */}
              <div className="bg-indigo-50 p-4 rounded-lg">
                <p className="text-sm text-slate-600">수정 후 예상 총점:</p>
                <p className="text-2xl font-bold text-indigo-700">
                  {Math.round((
                    config.mcqs.reduce((sum, q, idx) => sum + (editingMcqAnswers[idx] === q.correctOption ? q.points : 0), 0) +
                    config.subjectives.reduce((sum, q, idx) => sum + (editingSubjScores[idx] || 0), 0)
                  ) * 100) / 100}점
                </p>
              </div>
            </div>
            
            <div className="border-t border-slate-200 p-4 flex gap-3 justify-end">
              <button
                onClick={handleCancelEditScore}
                className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors"
              >
                취소
              </button>
              <button
                onClick={handleSaveScore}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
              >
                저장하기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header Result Card */}
      <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-indigo-50">
        <div className="bg-indigo-600 px-8 py-6 text-white flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">{isAdminView ? '채점 통계 대시보드' : '채점 결과 분석'}</h1>
            <p className="opacity-80 mt-1">{config.title}</p>
          </div>
          <button 
            onClick={onClose}
            className="bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            {isAdminView ? '목록으로' : '메인으로'}
          </button>
        </div>
        
        <div className="p-4 md:p-8">
          {currentUserScore ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
              <div className="text-center md:text-left">
                <p className="text-slate-500 text-xs md:text-sm font-medium uppercase tracking-wide">내 점수</p>
                <div className="flex items-end gap-2 md:gap-3 justify-center md:justify-start">
                   <p className="text-4xl md:text-6xl font-bold text-slate-800 mt-2">{Math.round(currentUserScore.totalScore * 100) / 100}점</p>
                   {stats.count >= 30 && userGrade && config.gradingSystem !== 'ABSOLUTE' && (
                      <span className="mb-2 md:mb-3 px-2 md:px-3 py-1 bg-indigo-100 text-indigo-700 font-bold rounded-full text-base md:text-lg">
                        {userGrade} 등급
                      </span>
                   )}
                   {config.gradingSystem === 'ABSOLUTE' && (
                      <span className={`mb-2 md:mb-3 px-2 md:px-3 py-1 font-bold rounded-full text-base md:text-lg ${
                        currentUserScore.totalScore >= 80 ? 'bg-green-100 text-green-700' :
                        currentUserScore.totalScore >= 60 ? 'bg-blue-100 text-blue-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {currentUserScore.totalScore >= 80 ? 'A' : currentUserScore.totalScore >= 60 ? 'B' : 'C'}
                      </span>
                   )}
                </div>
                
                <div className="flex gap-3 md:gap-4 mt-3 md:mt-4 text-xs md:text-sm text-slate-500 justify-center md:justify-start">
                  <span>객관식: <b className="text-slate-700">{Math.round(currentUserScore.mcqScore * 100) / 100}</b></span>
                  <span>주관식: <b className="text-slate-700">{Math.round(currentUserScore.subjectiveScore * 100) / 100}</b></span>
                </div>
                
                {stats.count >= 30 && stats.stdDev > 0 && (
                  <div className="mt-2 md:mt-3 text-xs md:text-sm">
                    <span className="text-slate-500">표준점수: </span>
                    <span className="font-bold text-indigo-600">
                      {((currentUserScore.totalScore - stats.mean) / stats.stdDev * 20 + 100).toFixed(1)}
                    </span>
                  </div>
                )}
                
                {/* 성적 수정 버튼 */}
                {!isAdminView && (
                  <div className="mt-4 flex gap-2 justify-center md:justify-start">
                    <button
                      onClick={handleStartEditScore}
                      className="flex items-center gap-1 px-3 py-1.5 text-xs bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors"
                    >
                      <Edit2 size={12} /> 성적 수정
                    </button>
                    <button
                      onClick={handleDeleteScore}
                      className="flex items-center gap-1 px-3 py-1.5 text-xs bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
                    >
                      <Trash2 size={12} /> 삭제
                    </button>
                  </div>
                )}
              </div>
              
              <div className="col-span-2 flex items-center justify-around bg-slate-50 rounded-xl p-6 border border-slate-100">
                {stats.count >= 30 ? (
                  <>
                    <div className="text-center">
                      <p className="text-sm text-slate-500 mb-1">전체 평균</p>
                      <p className="text-2xl font-bold text-slate-700">{stats.mean.toFixed(1)}</p>
                    </div>
                    <div className="h-10 w-px bg-slate-200"></div>
                    <div className="text-center">
                      <p className="text-sm text-slate-500 mb-1">표준편차</p>
                      <p className="text-2xl font-bold text-slate-700">{stats.stdDev.toFixed(1)}</p>
                    </div>
                    <div className="h-10 w-px bg-slate-200"></div>
                    <div className="text-center">
                      <p className="text-sm text-slate-500 mb-1">내 위치 (백분위)</p>
                      <p className="text-2xl font-bold text-indigo-600">상위 {Math.round(100 - stats.userPercentile)}%</p>
                    </div>
                  </>
                ) : (
                   <div className="text-center w-full">
                     <div className="flex justify-center mb-2 text-amber-500"><Activity /></div>
                     <p className="font-semibold text-slate-700">데이터 수집 중</p>
                     <p className="text-sm text-slate-500 mt-1">
                       분석을 위해 최소 30명의 데이터가 필요합니다. (현재 {stats.count}명)
                     </p>
                   </div>
                )}
              </div>
            </div>
          ) : (
             // ADMIN OR NO USER SCORE VIEW
             <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-center">
                <div className="text-center md:text-left">
                    <p className="text-slate-500 text-sm font-medium uppercase tracking-wide">현재 채점 인원</p>
                    <p className="text-5xl font-bold text-slate-800 mt-2">{stats.count}명</p>
                </div>
                
                <div className="col-span-2 flex items-center justify-around bg-slate-50 rounded-xl p-6 border border-slate-100">
                   {stats.count >= 30 ? (
                     <>
                        <div className="text-center">
                          <p className="text-sm text-slate-500 mb-1">전체 평균</p>
                          <p className="text-3xl font-bold text-slate-800">{stats.mean.toFixed(1)}점</p>
                        </div>
                        <div className="h-12 w-px bg-slate-200"></div>
                        <div className="text-center">
                          <p className="text-sm text-slate-500 mb-1">표준편차</p>
                          <p className="text-3xl font-bold text-slate-800">{stats.stdDev.toFixed(1)}</p>
                        </div>
                     </>
                   ) : (
                      <div className="text-center w-full">
                         <p className="font-semibold text-slate-700 text-lg">데이터 수집 중...</p>
                         <p className="text-slate-500">통계 분석을 위해 30명 이상의 데이터가 필요합니다.</p>
                      </div>
                   )}
                </div>
             </div>
          )}
        </div>
      </div>

      {/* Main Stats Area */}
      {stats.count < 30 ? (
         <div className="bg-white border-2 border-dashed border-slate-200 rounded-xl p-12 text-center">
            <Users size={48} className="mx-auto text-slate-300 mb-4" />
            <h3 className="text-xl font-semibold text-slate-700">등급컷 산출 불가</h3>
            <p className="text-slate-500 max-w-md mx-auto mt-2 mb-8">
              정확한 등급 산출과 백분위 계산을 위해 최소 30명의 성적 데이터가 필요합니다.
            </p>
            {isAdminView && (
              <div className="flex flex-wrap gap-3 justify-center">
              <button 
                  onClick={() => handleSimulate(35)}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold rounded-lg transition-colors border border-indigo-200"
              >
                  <RefreshCw size={16} /> 35명 생성
              </button>
                <button 
                  onClick={() => handleSimulate(50)}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-green-50 hover:bg-green-100 text-green-700 font-semibold rounded-lg transition-colors border border-green-200"
                >
                  <RefreshCw size={16} /> 50명 생성
                </button>
                <button 
                  onClick={() => handleSimulate(100)}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-purple-50 hover:bg-purple-100 text-purple-700 font-semibold rounded-lg transition-colors border border-purple-200"
                >
                  <RefreshCw size={16} /> 100명 생성
                </button>
              </div>
            )}
         </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* Grade Cuts: Show Primary System First */}
          {config.gradingSystem === 'CSAT' && (
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 lg:col-span-1 border-indigo-200 ring-4 ring-indigo-50/50">
              <h3 className="text-lg font-bold text-indigo-700 mb-4 flex items-center gap-2">
                <BarChart size={20} />
                9등급제 (2학년용) 등급컷 (적용됨)
              </h3>
               <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-slate-500 uppercase bg-slate-50">
                    <tr>
                      <th className="px-4 py-3">등급</th>
                      <th className="px-4 py-3">기준</th>
                      <th className="px-4 py-3 text-right">추정 등급컷</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {csatCutoffs.map((tier) => {
                       const isMyGrade = userGrade === tier.grade;
                       return (
                        <tr key={tier.grade} className={isMyGrade ? "bg-indigo-100" : (tier.grade === 1 ? "bg-indigo-50/50" : "")}>
                          <td className="px-4 py-3 font-medium text-slate-900 flex items-center gap-2">
                            {tier.grade}등급
                            {isMyGrade && <span className="text-xs bg-indigo-600 text-white px-1.5 py-0.5 rounded">ME</span>}
                          </td>
                          <td className="px-4 py-3 text-slate-500">{tier.cumulativePercent.toFixed(1)}% 이내</td>
                          <td className="px-4 py-3 text-right font-bold text-slate-700">{tier.minScore}점</td>
                        </tr>
                       );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

           {config.gradingSystem === 'RELATIVE_5' && (
             <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 lg:col-span-1 border-teal-200 ring-4 ring-teal-50/50">
              <h3 className="text-lg font-bold text-teal-700 mb-4 flex items-center gap-2">
                <BarChart size={20} />
                5등급제 (1학년용) 등급컷 (적용됨)
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-slate-500 uppercase bg-slate-50">
                    <tr>
                      <th className="px-4 py-3">등급</th>
                      <th className="px-4 py-3">기준</th>
                      <th className="px-4 py-3 text-right">추정 등급컷</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {rel5Cutoffs.map((tier) => {
                       const isMyGrade = userGrade === tier.grade;
                       return (
                        <tr key={tier.grade} className={isMyGrade ? "bg-teal-100" : (tier.grade === 1 ? "bg-teal-50/50" : "")}>
                           <td className="px-4 py-3 font-medium text-slate-900 flex items-center gap-2">
                            {tier.grade}등급
                            {isMyGrade && <span className="text-xs bg-teal-600 text-white px-1.5 py-0.5 rounded">ME</span>}
                          </td>
                          <td className="px-4 py-3 text-slate-500">{tier.cumulativePercent.toFixed(1)}% 이내</td>
                          <td className="px-4 py-3 text-right font-bold text-slate-700">{tier.minScore}점</td>
                        </tr>
                       );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
           )}

           {config.gradingSystem === 'ABSOLUTE' && (
             <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 lg:col-span-1 border-purple-200 ring-4 ring-purple-50/50">
              <h3 className="text-lg font-bold text-purple-700 mb-4 flex items-center gap-2">
                <BarChart size={20} />
                절대평가 (A/B/C)
              </h3>
              <div className="space-y-4">
                {(() => {
                  const numericScores = scores
                    .map(s => s.totalScore)
                    .filter(s => typeof s === 'number' && !isNaN(s));
                  
                  const totalPoints = Math.round((config.mcqs.reduce((s,q) => s+q.points,0) + config.subjectives.reduce((s,q) => s+q.points, 0)) * 100) / 100;
                  
                  const gradeA = numericScores.filter(s => s >= 80).length;
                  const gradeB = numericScores.filter(s => s >= 60 && s < 80).length;
                  const gradeC = numericScores.filter(s => s < 60).length;
                  const total = numericScores.length;
                  
                  const gradeAPercent = total > 0 ? (gradeA / total * 100) : 0;
                  const gradeBPercent = total > 0 ? (gradeB / total * 100) : 0;
                  const gradeCPercent = total > 0 ? (gradeC / total * 100) : 0;
                  
                  const userGrade = currentUserScore ? (
                    currentUserScore.totalScore >= 80 ? 'A' :
                    currentUserScore.totalScore >= 60 ? 'B' : 'C'
                  ) : null;
                  
                  return (
                    <>
                      <div className={`p-4 rounded-lg border-2 ${userGrade === 'A' ? 'bg-green-50 border-green-300' : 'bg-slate-50 border-slate-200'}`}>
                        <div className="flex justify-between items-center">
                          <div>
                            <span className="font-bold text-lg text-slate-900">A (80점 이상)</span>
                            {userGrade === 'A' && <span className="ml-2 text-xs bg-green-600 text-white px-1.5 py-0.5 rounded">ME</span>}
                          </div>
                          <span className="font-bold text-green-600">{gradeAPercent.toFixed(1)}% ({gradeA}명)</span>
                        </div>
                      </div>
                      <div className={`p-4 rounded-lg border-2 ${userGrade === 'B' ? 'bg-blue-50 border-blue-300' : 'bg-slate-50 border-slate-200'}`}>
                        <div className="flex justify-between items-center">
                          <div>
                            <span className="font-bold text-lg text-slate-900">B (60점 이상 80점 미만)</span>
                            {userGrade === 'B' && <span className="ml-2 text-xs bg-blue-600 text-white px-1.5 py-0.5 rounded">ME</span>}
                          </div>
                          <span className="font-bold text-blue-600">{gradeBPercent.toFixed(1)}% ({gradeB}명)</span>
                        </div>
                      </div>
                      <div className={`p-4 rounded-lg border-2 ${userGrade === 'C' ? 'bg-red-50 border-red-300' : 'bg-slate-50 border-slate-200'}`}>
                        <div className="flex justify-between items-center">
                          <div>
                            <span className="font-bold text-lg text-slate-900">C (60점 미만)</span>
                            {userGrade === 'C' && <span className="ml-2 text-xs bg-red-600 text-white px-1.5 py-0.5 rounded">ME</span>}
                          </div>
                          <span className="font-bold text-red-600">{gradeCPercent.toFixed(1)}% ({gradeC}명)</span>
                        </div>
                      </div>
                    </>
                  );
                })()}
              </div>
            </div>
           )}

          <div className="space-y-8">
            {/* Secondary Table (The one not selected) */}
             {config.gradingSystem !== 'CSAT' && (
               <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 opacity-75 hover:opacity-100 transition-opacity">
                 <h3 className="text-sm font-bold text-slate-500 mb-2">참고: 9등급제 (2학년용)</h3>
                  <div className="overflow-x-auto max-h-48 overflow-y-auto">
                     <table className="w-full text-xs text-left">
                       <tbody className="divide-y divide-slate-100">
                         {csatCutoffs.map(tier => (
                            <tr key={tier.grade}>
                              <td className="px-2 py-1 text-slate-700">{tier.grade}등급</td>
                              <td className="px-2 py-1 text-right">{tier.minScore}점</td>
                            </tr>
                         ))}
                       </tbody>
                     </table>
                  </div>
               </div>
             )}
              
             {config.gradingSystem !== 'RELATIVE_5' && (
               <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 opacity-75 hover:opacity-100 transition-opacity">
                 <h3 className="text-sm font-bold text-slate-500 mb-2">참고: 5등급제 (1학년용)</h3>
                 <div className="overflow-x-auto">
                     <table className="w-full text-xs text-left">
                       <tbody className="divide-y divide-slate-100">
                         {rel5Cutoffs.map(tier => (
                            <tr key={tier.grade}>
                              <td className="px-2 py-1 text-slate-700">{tier.grade}등급</td>
                              <td className="px-2 py-1 text-right">{tier.minScore}점</td>
                            </tr>
                         ))}
                       </tbody>
                     </table>
                  </div>
               </div>
             )}

            {/* Distribution Chart */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
               <h3 className="text-lg font-bold text-slate-800 mb-4">점수 분포 그래프</h3>
               <div className="h-48 w-full">
                 <ResponsiveContainer width="100%" height="100%">
                    <ReBarChart data={distData}>
                      <XAxis dataKey="range" tick={{fontSize: 10}} />
                      <YAxis tick={{fontSize: 10}} allowDecimals={false} />
                      <Tooltip />
                      <Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]} name="인원수" />
                      {currentUserScore && (
                        <ReferenceLine x={currentUserScore.totalScore} stroke="red" label="나" />
                      )}
                    </ReBarChart>
                 </ResponsiveContainer>
               </div>
            </div>
          </div>

        </div>
      )}

      {/* Integrated Grade Prediction (기말고사인 경우 또는 응시한 시험) */}
      {integratedPrediction && config && (config.examType === 'FINAL' || config.examType === 'FINAL_ONLY' || currentUserScore) && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
            <BarChart size={20} /> 통합 등급컷 예측 (중간고사 + 기말고사)
            {integratedPrediction.isSimulated && (
              <span className="text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded-full ml-2">
                시뮬레이션 기반
              </span>
            )}
          </h3>
          {integratedPrediction.isSimulated && (
            <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-700">
              ⚠️ 이 예측은 관리자가 입력한 중간고사 대략 데이터를 기반으로 한 시뮬레이션입니다. 실제 결과와 다를 수 있습니다.
            </div>
          )}
          
          {/* 통합 등급컷 - 전체 너비 */}
          <div className="mb-6">
            <h4 className="font-semibold text-slate-700 mb-3">통합 등급컷 (중간 50% + 기말 50%)</h4>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border border-slate-200 rounded-lg overflow-hidden">
                <thead className="bg-indigo-50">
                  <tr>
                    {(refinedPrediction?.integratedCutoffs || integratedPrediction.integratedCutoffs).map((cutoff: CutoffResult) => (
                      <th key={cutoff.grade} className="px-4 py-3 text-center font-bold text-indigo-800 border-r border-indigo-100 last:border-r-0">
                        {cutoff.grade}등급
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr className="bg-white">
                    {(refinedPrediction?.integratedCutoffs || integratedPrediction.integratedCutoffs).map((cutoff: CutoffResult) => (
                      <td key={cutoff.grade} className="px-4 py-3 text-center font-bold text-slate-800 border-r border-slate-100 last:border-r-0">
                        {cutoff.minScore.toFixed(1)}점
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
          
          {currentUserScore && (
            <div className="mt-4 p-4 bg-indigo-50 rounded-lg border border-indigo-200">
              <div className="flex flex-wrap justify-between items-center gap-2 mb-3">
                <h4 className="font-semibold text-indigo-800">나의 통합 등급 예측</h4>
                <button
                  onClick={() => setShowRefinedModal(true)}
                  className="flex items-center gap-1 px-3 py-1.5 bg-indigo-600 text-white text-xs rounded-lg hover:bg-indigo-700 transition-colors"
                >
                  <TrendingUp size={14} /> {refinedPrediction ? '예측 다시 받기' : '더 정교화된 예측 받기'}
                </button>
              </div>
              <div className="space-y-2 text-sm">
                {/* 중간고사 점수 */}
                {refinedPrediction?.userEstimatedMidterm !== undefined ? (
                  <p>중간고사 예상 점수: <span className="font-bold text-indigo-700">{refinedPrediction.userEstimatedMidterm.toFixed(1)}점</span> <span className="text-xs text-slate-500">(입력 기반 추정)</span></p>
                ) : (
                  <p>중간고사 점수: {(() => {
                    const midtermScore = getScoresByExamId(config.parentExamId || '')
                      .find(s => (s.userId || s.studentNumber) === (currentUserScore.userId || currentUserScore.studentNumber))?.totalScore;
                    return midtermScore !== undefined ? `${midtermScore}점` : (config.midtermStats ? '추정 중' : '없음');
                  })()}</p>
                )}
                <p>기말고사 점수: <span className="font-bold">{Math.round(currentUserScore.totalScore * 100) / 100}점</span></p>
                
                {/* 통합 점수 및 등급 */}
                {refinedPrediction?.userIntegratedScore !== undefined ? (
                  <>
                    <p className="font-bold text-lg mt-2">
                      통합 점수: {refinedPrediction.userIntegratedScore.toFixed(1)}점 
                      <span className="ml-2 px-2 py-1 bg-indigo-600 text-white rounded-md">
                        예상 {refinedPrediction.userEstimatedGrade || 9}등급
                      </span>
                    </p>
                    <p className="text-xs text-green-600 mt-2 flex items-center gap-1">
                      ✓ 정교화된 예측이 적용되었습니다
                    </p>
                  </>
                ) : (
                  <p className="font-bold">통합 점수: {(() => {
                    const midtermScore = getScoresByExamId(config.parentExamId || '')
                      .find(s => (s.userId || s.studentNumber) === (currentUserScore.userId || currentUserScore.studentNumber))?.totalScore || 
                      (config.midtermStats?.mean || 0);
                    const integrated = midtermScore * 0.5 + currentUserScore.totalScore * 0.5;
                    const prediction = integratedPrediction;
                    const grade = prediction?.integratedCutoffs?.find((c: CutoffResult) => integrated >= c.minScore);
                    return `${integrated.toFixed(1)}점 (예상 등급: ${grade ? grade.grade : '9'}등급)`;
                  })()}</p>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Comments and Rating Section */}
      {!isAdminView && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <MessageSquare size={20} /> 시험 후기 및 난이도 평가
          </h3>
            {averageDifficulty > 0 && (
              <div className="text-sm text-slate-600">
                평균 난이도: <span className="font-bold text-indigo-600">{averageDifficulty.toFixed(1)}</span> / 5.0
              </div>
            )}
          </div>
          
          {/* Comment Input - 별점은 1번만, 댓글은 여러번 가능 */}
          <div className="mb-6 space-y-4">
            {/* 별점 (한 번만 가능) */}
            {hasRated ? (
              <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-sm text-green-700 flex items-center gap-2">
                  <Star size={16} className="fill-current text-yellow-400" /> 별점을 이미 등록하셨습니다.
                </p>
              </div>
            ) : (
            <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">난이도 평가 (별 5개) - 시험당 1회만 가능</label>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setNewDifficulty(star)}
                    className={`p-2 transition-colors ${
                      newDifficulty >= star ? 'text-yellow-400' : 'text-slate-300'
                    }`}
                  >
                    <Star size={24} fill={newDifficulty >= star ? 'currentColor' : 'none'} />
                  </button>
                ))}
                {newDifficulty > 0 && (
                  <span className="ml-2 text-sm text-slate-600">{newDifficulty}점</span>
                )}
              </div>
            </div>
            )}
            
            {/* 댓글 (여러번 가능) */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">댓글 작성 (여러 개 가능)</label>
              <textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none resize-none"
                rows={3}
                placeholder="시험에 대한 후기를 남겨주세요..."
              />
            </div>
            
            <button
              onClick={handleSubmitComment}
              disabled={!newComment.trim() && (hasRated || newDifficulty === 0)}
              className="flex items-center gap-2 px-6 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send size={18} /> 등록하기
            </button>
          </div>
          
          {/* Comments List */}
          <div className="space-y-4 border-t border-slate-200 pt-6">
            {comments.length === 0 ? (
              <p className="text-center text-slate-400 py-8">아직 댓글이 없습니다.</p>
            ) : (
              comments
                .sort((a, b) => b.timestamp - a.timestamp)
                .map((comment) => {
                  const isGoldenUser = comment.email && isSpecialMember(comment.email);
                  const showGolden = isGoldenUser && comment.showGolden !== false; // 기본값은 true
                  const isEditing = editingCommentId === comment.id;
                  
                  return (
                    <div key={comment.id} className={`p-4 rounded-lg border ${showGolden ? 'bg-amber-50 border-amber-200' : 'bg-slate-50 border-slate-100'}`}>
                      {isEditing ? (
                        // 수정 모드
                        <div className="space-y-3">
                          <div>
                            <label className="block text-xs font-medium text-slate-600 mb-1">별점</label>
                            <div className="flex gap-1">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <button
                                  key={star}
                                  type="button"
                                  onClick={() => setEditingDifficulty(star)}
                                  className={`p-1 transition-colors ${editingDifficulty >= star ? 'text-yellow-400' : 'text-slate-300'}`}
                                >
                                  <Star size={18} fill={editingDifficulty >= star ? 'currentColor' : 'none'} />
                                </button>
                              ))}
                            </div>
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-slate-600 mb-1">댓글</label>
                            <textarea
                              value={editingContent}
                              onChange={(e) => setEditingContent(e.target.value)}
                              className="w-full p-2 text-sm bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
                              rows={2}
                            />
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleSaveEdit(comment.id)}
                              className="px-3 py-1 bg-indigo-600 text-white text-sm rounded-md hover:bg-indigo-700"
                            >
                              저장
                            </button>
                            <button
                              onClick={handleCancelEdit}
                              className="px-3 py-1 bg-slate-200 text-slate-700 text-sm rounded-md hover:bg-slate-300"
                            >
                              취소
                            </button>
                          </div>
                        </div>
                      ) : (
                        // 보기 모드
                        <>
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center gap-2">
                              <span className={`font-semibold ${showGolden ? 'text-amber-600' : 'text-slate-800'}`}>
                                {comment.anonymousId}
                                {showGolden && <span className="ml-1 text-xs bg-amber-400 text-white px-1.5 py-0.5 rounded-full">★</span>}
                              </span>
                        <div className="flex items-center gap-1">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star
                              key={star}
                              size={14}
                              className={comment.difficulty >= star ? 'text-yellow-400 fill-current' : 'text-slate-300'}
                            />
                          ))}
                        </div>
                      </div>
                            <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-400">
                        {new Date(comment.timestamp).toLocaleString()}
                      </span>
                              {/* 특별 회원 황금색 토글 */}
                              {canToggleGolden(comment) && (
                                <button
                                  onClick={() => handleToggleGolden(comment)}
                                  className={`p-1 rounded transition-colors ${showGolden ? 'text-amber-500 hover:text-amber-600' : 'text-slate-400 hover:text-slate-500'}`}
                                  title={showGolden ? '황금색 숨기기' : '황금색 표시하기'}
                                >
                                  {showGolden ? <Eye size={14} /> : <EyeOff size={14} />}
                                </button>
                              )}
                              {/* 수정/삭제 버튼 */}
                              {canModifyComment(comment) && (
                                <>
                                  <button
                                    onClick={() => handleStartEdit(comment)}
                                    className="p-1 text-slate-400 hover:text-indigo-600 transition-colors"
                                    title="수정"
                                  >
                                    <Edit2 size={14} />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteComment(comment.id)}
                                    className="p-1 text-slate-400 hover:text-red-600 transition-colors"
                                    title="삭제"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                </>
                              )}
                            </div>
                    </div>
                    <p className="text-slate-700">{comment.content}</p>
                        </>
                      )}
                    </div>
                  );
                })
            )}
          </div>
        </div>
      )}

      {/* Wrong Answer Statistics */}
      {stats.count > 0 && config && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <BarChart size={20} /> 오답률 분석
            </h3>
            <button
              onClick={() => setShowAllWrongAnswers(!showAllWrongAnswers)}
              className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
            >
              {showAllWrongAnswers ? 'Top 10만 보기' : '전체 보기'}
            </button>
          </div>
          
          <div className="grid md:grid-cols-2 gap-6">
            {/* 객관식 오답률 Top 10 */}
            <div>
              <h4 className="font-semibold text-slate-700 mb-3">객관식 오답률 Top {showAllWrongAnswers ? '전체' : '10'}</h4>
              <div className="space-y-2">
                {wrongAnswerStats.mcqWrongAnswers.length === 0 ? (
                  <p className="text-sm text-slate-400">데이터가 없습니다.</p>
                ) : (
                  wrongAnswerStats.mcqWrongAnswers.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between p-2 bg-slate-50 rounded">
                      <span className="text-sm font-medium text-slate-700">{item.questionNum}번</span>
                      <span className="text-sm font-bold text-red-600">{item.wrongRate.toFixed(1)}%</span>
                  </div>
                ))
            )}
          </div>
            </div>
            
            {/* 주관식 낮은 점수 비율 Top 10 */}
            <div>
              <h4 className="font-semibold text-slate-700 mb-3">주관식 낮은 점수 비율 Top {showAllWrongAnswers ? '전체' : '10'}</h4>
              <div className="space-y-2">
                {wrongAnswerStats.subjectiveLowScores.length === 0 ? (
                  <p className="text-sm text-slate-400">데이터가 없습니다.</p>
                ) : (
                  wrongAnswerStats.subjectiveLowScores.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between p-2 bg-slate-50 rounded">
                      <span className="text-sm font-medium text-slate-700">{item.questionNum}번</span>
                      <span className="text-sm font-bold text-orange-600">{(item.avgScoreRatio * 100).toFixed(1)}%</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Admin Sample Analysis */}
      {isAdminView && scores.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <Users size={20} /> 표본 상세 분석
            </h3>
            <button
              onClick={() => setSelectedScoreDetail(null)}
              className={`text-sm ${selectedScoreDetail ? 'text-indigo-600 hover:text-indigo-700' : 'text-slate-400'} font-medium`}
            >
              {selectedScoreDetail ? '목록으로' : ''}
            </button>
          </div>
          
          {selectedScoreDetail ? (
            <ScoreDetailView 
              score={selectedScoreDetail} 
              config={config!}
              onBack={() => setSelectedScoreDetail(null)}
              onUpdate={(updatedScore) => {
                const updatedScores = scores.map(s => s.id === updatedScore.id ? updatedScore : s);
                setScores(updatedScores);
                setSelectedScoreDetail(updatedScore);
                // 저장
                const allScores = getScoresByExamId(examId);
                const index = allScores.findIndex(s => s.id === updatedScore.id);
                if (index >= 0) {
                  allScores[index] = updatedScore;
                  localStorage.setItem('app_scores', JSON.stringify(allScores));
                }
              }}
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 text-left">이름</th>
                    <th className="px-4 py-3 text-left">학번</th>
                    <th className="px-4 py-3 text-right">총점</th>
                    <th className="px-4 py-3 text-right">객관식</th>
                    <th className="px-4 py-3 text-right">주관식</th>
                    <th className="px-4 py-3 text-center">작업</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {scores
                    .sort((a, b) => b.totalScore - a.totalScore)
                    .map((score) => (
                      <tr key={score.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3 font-medium text-slate-900">{score.studentName}</td>
                        <td className="px-4 py-3 text-slate-600">{score.studentNumber}</td>
                        <td className="px-4 py-3 text-right font-bold text-slate-800">{Math.round(score.totalScore * 100) / 100}점</td>
                        <td className="px-4 py-3 text-right text-slate-600">{Math.round(score.mcqScore * 100) / 100}점</td>
                        <td className="px-4 py-3 text-right text-slate-600">{Math.round(score.subjectiveScore * 100) / 100}점</td>
                        <td className="px-4 py-3 text-center">
                          <button
                            onClick={() => setSelectedScoreDetail(score)}
                            className="text-indigo-600 hover:text-indigo-700 font-medium text-xs"
                          >
                            상세보기
                          </button>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Admin Comments View (with real user names) */}
      {isAdminView && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <MessageSquare size={20} /> 시험 후기 (관리자용 - 실제 사용자 정보 표시)
          </h3>
            {averageDifficulty > 0 && (
              <div className="text-sm text-slate-600">
                평균 난이도: <span className="font-bold text-indigo-600">{averageDifficulty.toFixed(1)}</span> / 5.0
              </div>
            )}
          </div>
          
          {comments.length === 0 ? (
            <p className="text-center text-slate-400 py-8">아직 댓글이 없습니다.</p>
          ) : (
          <div className="space-y-4">
            {comments
              .sort((a, b) => b.timestamp - a.timestamp)
                .map((comment) => {
                  const isGoldenUser = comment.email && isSpecialMember(comment.email);
                  return (
                    <div key={comment.id} className={`p-4 rounded-lg border ${isGoldenUser ? 'bg-amber-50 border-amber-200' : 'bg-slate-50 border-slate-100'}`}>
                  <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`font-semibold ${isGoldenUser ? 'text-amber-600' : 'text-slate-800'}`}>
                            {comment.anonymousId}
                            {isGoldenUser && <span className="ml-1 text-xs bg-amber-400 text-white px-1.5 py-0.5 rounded-full">★ 특별회원</span>}
                          </span>
                      <span className="text-xs text-slate-500">(실제: {comment.userId})</span>
                          {comment.email && (
                            <span className="text-xs text-blue-600">이메일: {comment.email}</span>
                          )}
                          {comment.ipAddress && (
                            <span className="text-xs text-purple-600">IP: {comment.ipAddress}</span>
                          )}
                      <div className="flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            size={14}
                            className={comment.difficulty >= star ? 'text-yellow-400 fill-current' : 'text-slate-300'}
                          />
                        ))}
                      </div>
                    </div>
                    <span className="text-xs text-slate-400">
                      {new Date(comment.timestamp).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-slate-700">{comment.content}</p>
                </div>
                  );
                })}
          </div>
          )}
        </div>
      )}

      {/* Refined Prediction Modal */}
      {config && integratedPrediction && (
        <RefinedPredictionModal
          isOpen={showRefinedModal}
          onClose={() => setShowRefinedModal(false)}
          onSubmit={handleRefinedPredictionSubmit}
          previousExamTitle={config.parentExamId ? getExamById(config.parentExamId)?.title : '중간고사'}
        />
      )}
    </div>
  );
};

export default ResultStats;
