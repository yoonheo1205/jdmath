
import { CutoffResult, GradeTier } from '../types';

// 개선된 평균 계산 (응답 편향, 극단값, 상위권 쏠림 보정)
export const calculateMean = (scores: number[]): number => {
  if (scores.length === 0) return 0;
  
  // 기본 평균
  const basicMean = scores.reduce((a, b) => a + b, 0) / scores.length;
  
  // 극단값 제거 (IQR 방법)
  const sorted = [...scores].sort((a, b) => a - b);
  const q1Index = Math.floor(scores.length * 0.25);
  const q3Index = Math.floor(scores.length * 0.75);
  const q1 = sorted[q1Index];
  const q3 = sorted[q3Index];
  const iqr = q3 - q1;
  const lowerBound = q1 - 1.5 * iqr;
  const upperBound = q3 + 1.5 * iqr;
  
  // 극단값 제외한 점수들
  const filteredScores = scores.filter(s => s >= lowerBound && s <= upperBound);
  
  if (filteredScores.length === 0) return basicMean;
  
  // 필터링된 평균
  const filteredMean = filteredScores.reduce((a, b) => a + b, 0) / filteredScores.length;
  
  // 상위권 쏠림 보정 (상위 20%의 가중치 감소)
  const sortedAll = [...scores].sort((a, b) => b - a);
  const top20Percent = Math.ceil(scores.length * 0.2);
  const topScores = sortedAll.slice(0, top20Percent);
  const bottomScores = sortedAll.slice(top20Percent);
  
  // 상위권 점수는 가중치 0.7, 하위권 점수는 가중치 1.0
  const weightedSum = topScores.reduce((a, b) => a + b * 0.7, 0) + 
                      bottomScores.reduce((a, b) => a + b, 0);
  const weightedCount = topScores.length * 0.7 + bottomScores.length;
  const weightedMean = weightedSum / weightedCount;
  
  // 응답 편향 보정 (과대 평가 가능성 고려)
  // 자발적 제출 특성상 상위권이 과다 표집될 가능성이 높음
  // 이를 보정하기 위해 가중 평균 사용
  const responseBiasCorrection = 0.85; // 상위권 쏠림 보정 계수
  
  // 최종 보정된 평균: 필터링된 평균과 가중 평균의 조합
  const correctedMean = filteredMean * 0.6 + weightedMean * 0.4;
  const finalMean = correctedMean * responseBiasCorrection + basicMean * (1 - responseBiasCorrection);
  
  return finalMean;
};

// 개선된 표준편차 계산 (응답 편향, 극단값, 상위권 쏠림 보정)
export const calculateStdDev = (scores: number[], mean: number): number => {
  if (scores.length === 0) return 0;
  
  // 기본 표준편차
  const squareDiffs = scores.map(value => Math.pow(value - mean, 2));
  const avgSquareDiff = calculateMean(squareDiffs);
  const basicStdDev = Math.sqrt(avgSquareDiff);
  
  // 극단값 제거
  const sorted = [...scores].sort((a, b) => a - b);
  const q1Index = Math.floor(scores.length * 0.25);
  const q3Index = Math.floor(scores.length * 0.75);
  const q1 = sorted[q1Index];
  const q3 = sorted[q3Index];
  const iqr = q3 - q1;
  const lowerBound = q1 - 1.5 * iqr;
  const upperBound = q3 + 1.5 * iqr;
  
  const filteredScores = scores.filter(s => s >= lowerBound && s <= upperBound);
  
  if (filteredScores.length === 0) return basicStdDev;
  
  // 필터링된 표준편차
  const filteredMean = filteredScores.reduce((a, b) => a + b, 0) / filteredScores.length;
  const filteredSquareDiffs = filteredScores.map(value => Math.pow(value - filteredMean, 2));
  const filteredAvgSquareDiff = filteredSquareDiffs.reduce((a, b) => a + b, 0) / filteredSquareDiffs.length;
  const filteredStdDev = Math.sqrt(filteredAvgSquareDiff);
  
  // 상위권 쏠림 보정
  // 상위권이 과다 표집되면 표준편차가 과소 추정될 수 있음
  // 이를 보정하기 위해 가중 표준편차 계산
  const sortedAll = [...scores].sort((a, b) => b - a);
  const top20Percent = Math.ceil(scores.length * 0.2);
  const topScores = sortedAll.slice(0, top20Percent);
  const bottomScores = sortedAll.slice(top20Percent);
  
  const topMean = topScores.reduce((a, b) => a + b, 0) / topScores.length;
  const bottomMean = bottomScores.reduce((a, b) => a + b, 0) / bottomScores.length;
  
  // 상위권과 하위권의 분산을 각각 계산
  const topVariance = topScores.reduce((sum, score) => sum + Math.pow(score - topMean, 2), 0) / topScores.length;
  const bottomVariance = bottomScores.reduce((sum, score) => sum + Math.pow(score - bottomMean, 2), 0) / bottomScores.length;
  
  // 전체 분산 추정 (상위권과 하위권의 가중 평균)
  const estimatedVariance = (topVariance * 0.3 + bottomVariance * 0.7) * 1.2; // 보정 계수
  const weightedStdDev = Math.sqrt(estimatedVariance);
  
  // 응답 편향 보정
  // 자발적 제출 특성상 분산이 과소 추정될 가능성
  const varianceCorrection = 1.15; // 분산 보정 계수
  
  // 최종 보정된 표준편차
  const correctedStdDev = Math.sqrt(
    (filteredStdDev * filteredStdDev * 0.5 + weightedStdDev * weightedStdDev * 0.5) * varianceCorrection
  );
  
  return correctedStdDev;
};

export const calculatePercentile = (score: number, allScores: number[]): number => {
  const sorted = [...allScores].sort((a, b) => a - b);
  // Percentile rank = (Number of scores below x / Total number of scores) * 100
  const countBelow = sorted.filter(s => s < score).length;
  return (countBelow / allScores.length) * 100;
};

export const calculateCutoffs = (allScores: number[], tiers: GradeTier[]): CutoffResult[] => {
  const sorted = [...allScores].sort((a, b) => b - a);
  const N = sorted.length;
  
  const results: CutoffResult[] = [];
  
  tiers.forEach((tier, index) => {
    const targetRank = Math.ceil((tier.percentileRaw / 100) * N);
    const cutoffIndex = Math.min(Math.max(0, targetRank - 1), N - 1);
    const minScore = sorted[cutoffIndex];

    const countInTier = sorted.filter(s => {
       return s >= minScore; 
    }).length; 

    results.push({
      grade: tier.grade,
      minScore: minScore,
      countInTier: countInTier, 
      cumulativePercent: (countInTier / N) * 100
    });
  });

  return results;
};

// Korean CSAT Standard (9 Tiers)
export const CSAT_TIERS: GradeTier[] = [
  { grade: 1, percentileRaw: 4, label: '상위 4%' },
  { grade: 2, percentileRaw: 11, label: '상위 11%' },
  { grade: 3, percentileRaw: 23, label: '상위 23%' },
  { grade: 4, percentileRaw: 40, label: '상위 40%' },
  { grade: 5, percentileRaw: 60, label: '상위 60%' },
  { grade: 6, percentileRaw: 77, label: '상위 77%' },
  { grade: 7, percentileRaw: 89, label: '상위 89%' },
  { grade: 8, percentileRaw: 96, label: '상위 96%' },
  { grade: 9, percentileRaw: 100, label: '상위 100%' },
];

// Relative 5-Tier System
export const RELATIVE_5_TIERS: GradeTier[] = [
  { grade: 1, percentileRaw: 10, label: '상위 10%' },
  { grade: 2, percentileRaw: 34, label: '상위 34%' },
  { grade: 3, percentileRaw: 66, label: '상위 66%' },
  { grade: 4, percentileRaw: 90, label: '상위 90%' },
  { grade: 5, percentileRaw: 100, label: '상위 100%' },
];

// 정교화된 평균 계산 (상위권 쏠림, 가짜 성적 처리)
export const calculateRefinedMean = (scores: number[]): number => {
  if (scores.length === 0) return 0;
  
  // 1. 극단값 제거 (IQR 방법)
  const sorted = [...scores].sort((a, b) => a - b);
  const q1Index = Math.floor(scores.length * 0.25);
  const q3Index = Math.floor(scores.length * 0.75);
  const q1 = sorted[q1Index];
  const q3 = sorted[q3Index];
  const iqr = q3 - q1;
  const lowerBound = q1 - 1.5 * iqr;
  const upperBound = q3 + 1.5 * iqr;
  
  // 2. 가짜 성적 필터링 (100점이 너무 많으면 의심)
  const perfectScores = scores.filter(s => s === 100 || s >= 99.9).length;
  const perfectScoreRatio = perfectScores / scores.length;
  
  // 3. 필터링된 점수들
  let filteredScores = scores.filter(s => s >= lowerBound && s <= upperBound);
  
  // 4. 가짜 100점 제거 (비율이 10% 이상이면 상위 50%만 유지)
  if (perfectScoreRatio > 0.1 && filteredScores.length > 10) {
    const sortedFiltered = [...filteredScores].sort((a, b) => b - a);
    const top50Percent = Math.ceil(sortedFiltered.length * 0.5);
    filteredScores = sortedFiltered.slice(0, top50Percent);
  }
  
  if (filteredScores.length === 0) {
    return calculateMean(scores); // 폴백
  }
  
  // 5. 상위권 쏠림 보정
  const sortedAll = [...filteredScores].sort((a, b) => b - a);
  const top20Percent = Math.ceil(filteredScores.length * 0.2);
  const topScores = sortedAll.slice(0, top20Percent);
  const bottomScores = sortedAll.slice(top20Percent);
  
  // 상위권 점수는 가중치 0.6, 하위권 점수는 가중치 1.0
  const weightedSum = topScores.reduce((a, b) => a + b * 0.6, 0) + 
                      bottomScores.reduce((a, b) => a + b, 0);
  const weightedCount = topScores.length * 0.6 + bottomScores.length;
  const weightedMean = weightedSum / weightedCount;
  
  // 6. 기본 평균과 가중 평균의 조합
  const basicMean = filteredScores.reduce((a, b) => a + b, 0) / filteredScores.length;
  const finalMean = basicMean * 0.4 + weightedMean * 0.6;
  
  return finalMean;
};

// 정교화된 표준편차 계산
export const calculateRefinedStdDev = (scores: number[], mean: number): number => {
  if (scores.length === 0) return 0;
  
  // 극단값 제거
  const sorted = [...scores].sort((a, b) => a - b);
  const q1Index = Math.floor(scores.length * 0.25);
  const q3Index = Math.floor(scores.length * 0.75);
  const q1 = sorted[q1Index];
  const q3 = sorted[q3Index];
  const iqr = q3 - q1;
  const lowerBound = q1 - 1.5 * iqr;
  const upperBound = q3 + 1.5 * iqr;
  
  const filteredScores = scores.filter(s => s >= lowerBound && s <= upperBound);
  
  if (filteredScores.length === 0) {
    return calculateStdDev(scores, mean);
  }
  
  // 필터링된 표준편차 계산
  const filteredMean = filteredScores.reduce((a, b) => a + b, 0) / filteredScores.length;
  const squareDiffs = filteredScores.map(value => Math.pow(value - filteredMean, 2));
  const avgSquareDiff = squareDiffs.reduce((a, b) => a + b, 0) / squareDiffs.length;
  const filteredStdDev = Math.sqrt(avgSquareDiff);
  
  // 상위권 쏠림 보정
  const sortedAll = [...filteredScores].sort((a, b) => b - a);
  const top20Percent = Math.ceil(filteredScores.length * 0.2);
  const topScores = sortedAll.slice(0, top20Percent);
  const bottomScores = sortedAll.slice(top20Percent);
  
  const topMean = topScores.reduce((a, b) => a + b, 0) / topScores.length;
  const bottomMean = bottomScores.reduce((a, b) => a + b, 0) / bottomScores.length;
  
  const topVariance = topScores.reduce((sum, score) => sum + Math.pow(score - topMean, 2), 0) / topScores.length;
  const bottomVariance = bottomScores.reduce((sum, score) => sum + Math.pow(score - bottomMean, 2), 0) / bottomScores.length;
  
  const estimatedVariance = (topVariance * 0.3 + bottomVariance * 0.7) * 1.25;
  const weightedStdDev = Math.sqrt(estimatedVariance);
  
  // 최종 보정된 표준편차
  const correctedStdDev = Math.sqrt(
    (filteredStdDev * filteredStdDev * 0.5 + weightedStdDev * weightedStdDev * 0.5) * 1.2
  );
  
  return correctedStdDev;
};

// 중간고사와 기말고사 통합 등급컷 예측
export interface IntegratedGradePrediction {
  midtermExamId: string;
  finalExamId: string;
  midtermCutoffs: CutoffResult[];
  finalCutoffs: CutoffResult[];
  integratedCutoffs: CutoffResult[];
  requiredFinalScores: Record<number, number | 'IMPOSSIBLE'>; // 각 등급을 받기 위해 필요한 기말고사 점수
}

export const predictIntegratedGrades = (
  midtermScores: number[],
  finalScores: number[],
  midtermTotalPoints: number,
  finalTotalPoints: number,
  gradingSystem: 'CSAT' | 'RELATIVE_5'
): IntegratedGradePrediction | null => {
  if (midtermScores.length < 30 || finalScores.length < 30) {
    return null;
  }
  
  const tiers = gradingSystem === 'CSAT' ? CSAT_TIERS : RELATIVE_5_TIERS;
  
  // 정교화된 통계 계산
  const midtermMean = calculateRefinedMean(midtermScores);
  const midtermStdDev = calculateRefinedStdDev(midtermScores, midtermMean);
  const finalMean = calculateRefinedMean(finalScores);
  const finalStdDev = calculateRefinedStdDev(finalScores, finalMean);
  
  // 통합 점수 계산 (중간 50%, 기말 50%)
  const integratedScores = midtermScores.map((mid, idx) => {
    const final = finalScores[idx] || 0;
    return mid * 0.5 + final * 0.5;
  });
  
  const integratedCutoffs = calculateCutoffs(integratedScores, tiers);
  const midtermCutoffs = calculateCutoffs(midtermScores, tiers);
  const finalCutoffs = calculateCutoffs(finalScores, tiers);
  
  // 각 등급을 받기 위해 필요한 기말고사 점수 계산
  const requiredFinalScores: Record<number, number | 'IMPOSSIBLE'> = {};
  tiers.forEach(tier => {
    const integratedCutoff = integratedCutoffs.find(c => c.grade === tier.grade);
    if (integratedCutoff) {
      // 통합 점수에서 중간고사 점수를 빼고 기말고사 점수로 변환
      // integrated = mid * 0.5 + final * 0.5
      // final = (integrated - mid * 0.5) / 0.5 = 2 * integrated - mid
      const avgMidterm = midtermMean;
      const requiredFinal = 2 * integratedCutoff.minScore - avgMidterm;
      
      if (requiredFinal < 0) {
        requiredFinalScores[tier.grade] = 'IMPOSSIBLE';
      } else if (requiredFinal > finalTotalPoints) {
        requiredFinalScores[tier.grade] = 'IMPOSSIBLE';
      } else {
        requiredFinalScores[tier.grade] = Math.max(0, Math.min(finalTotalPoints, requiredFinal));
      }
    }
  });
  
  return {
    midtermExamId: '',
    finalExamId: '',
    midtermCutoffs,
    finalCutoffs,
    integratedCutoffs,
    requiredFinalScores
  };
};

// 사용자별 정보를 반영한 정교화된 통합 등급컷 예측
export const predictRefinedIntegratedGrades = (
  midtermScores: number[],
  finalScores: number[],
  midtermTotalPoints: number,
  finalTotalPoints: number,
  gradingSystem: 'CSAT' | 'RELATIVE_5',
  userPreviousScore: number | null,
  userPreviousRank: number | null,
  totalStudents: number
): IntegratedGradePrediction | null => {
  if (midtermScores.length < 30 || finalScores.length < 30) {
    return null;
  }
  
  const tiers = gradingSystem === 'CSAT' ? CSAT_TIERS : RELATIVE_5_TIERS;
  
  // 사용자 정보를 반영한 표본 가중치 조정
  let adjustedMidtermScores = [...midtermScores];
  let adjustedFinalScores = [...finalScores];
  
  // 사용자의 직전 시험 정보가 있으면 이를 반영하여 표본 조정
  if (userPreviousScore !== null || userPreviousRank !== null) {
    // 사용자의 예상 성적 수준 추정
    let userLevel: number;
    
    if (userPreviousRank !== null && totalStudents > 0) {
      // 등수 기반으로 성적 수준 추정 (상위권일수록 높은 값)
      const percentile = ((totalStudents - userPreviousRank + 1) / totalStudents) * 100;
      userLevel = percentile;
    } else if (userPreviousScore !== null) {
      // 원점수 기반으로 성적 수준 추정 (표본의 평균과 비교)
      const midtermMean = calculateRefinedMean(midtermScores);
      const midtermStdDev = calculateRefinedStdDev(midtermScores, midtermMean);
      const zScore = (userPreviousScore - midtermMean) / (midtermStdDev || 1);
      userLevel = 50 + zScore * 20; // z-score를 percentile로 변환 (대략적)
    } else {
      userLevel = 50; // 기본값
    }
    
    // 사용자 수준에 맞는 가중치 적용
    // 상위권 사용자의 경우 상위권 표본에 더 높은 가중치
    // 하위권 사용자의 경우 하위권 표본에 더 높은 가중치
    const sortedMidterm = [...midtermScores].sort((a, b) => b - a);
    const sortedFinal = [...finalScores].sort((a, b) => b - a);
    
    // 사용자 수준에 맞는 표본을 더 많이 반영
    const topPercent = userLevel / 100;
    const topCount = Math.floor(midtermScores.length * topPercent);
    
    // 상위권 표본과 하위권 표본의 가중치 조정
    if (userLevel > 50) {
      // 상위권 사용자: 상위권 표본에 더 높은 가중치
      adjustedMidtermScores = [
        ...sortedMidterm.slice(0, topCount).map(s => s * 1.2), // 상위권 가중치 증가
        ...sortedMidterm.slice(topCount)
      ];
      adjustedFinalScores = [
        ...sortedFinal.slice(0, topCount).map(s => s * 1.2),
        ...sortedFinal.slice(topCount)
      ];
    } else {
      // 하위권 사용자: 하위권 표본에 더 높은 가중치
      adjustedMidtermScores = [
        ...sortedMidterm.slice(0, topCount),
        ...sortedMidterm.slice(topCount).map(s => s * 1.2) // 하위권 가중치 증가
      ];
      adjustedFinalScores = [
        ...sortedFinal.slice(0, topCount),
        ...sortedFinal.slice(topCount).map(s => s * 1.2)
      ];
    }
  }
  
  // 정교화된 통계 계산
  const midtermMean = calculateRefinedMean(adjustedMidtermScores);
  const midtermStdDev = calculateRefinedStdDev(adjustedMidtermScores, midtermMean);
  const finalMean = calculateRefinedMean(adjustedFinalScores);
  const finalStdDev = calculateRefinedStdDev(adjustedFinalScores, finalMean);
  
  // 통합 점수 계산 (중간 50%, 기말 50%)
  const integratedScores = adjustedMidtermScores.map((mid, idx) => {
    const final = adjustedFinalScores[idx] || 0;
    return mid * 0.5 + final * 0.5;
  });
  
  const integratedCutoffs = calculateCutoffs(integratedScores, tiers);
  const midtermCutoffs = calculateCutoffs(adjustedMidtermScores, tiers);
  const finalCutoffs = calculateCutoffs(adjustedFinalScores, tiers);
  
  // 각 등급을 받기 위해 필요한 기말고사 점수 계산
  const requiredFinalScores: Record<number, number | 'IMPOSSIBLE'> = {};
  tiers.forEach(tier => {
    const integratedCutoff = integratedCutoffs.find(c => c.grade === tier.grade);
    if (integratedCutoff) {
      // integrated = mid * 0.5 + final * 0.5
      // final = 2 * integrated - mid
      const avgMidterm = midtermMean;
      const requiredFinal = 2 * integratedCutoff.minScore - avgMidterm;
      
      if (requiredFinal < 0) {
        requiredFinalScores[tier.grade] = 'IMPOSSIBLE';
      } else if (requiredFinal > finalTotalPoints) {
        requiredFinalScores[tier.grade] = 'IMPOSSIBLE';
      } else {
        requiredFinalScores[tier.grade] = Math.max(0, Math.min(finalTotalPoints, requiredFinal));
      }
    }
  });
  
  return {
    midtermExamId: '',
    finalExamId: '',
    midtermCutoffs,
    finalCutoffs,
    integratedCutoffs,
    requiredFinalScores
  };
};
