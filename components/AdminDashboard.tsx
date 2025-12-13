
import React, { useState, useEffect } from 'react';
import { ExamConfig, McqConfig, SubjectiveConfig, RegisteredUser } from '../types';
import { getExams, saveExam, deleteExam, resetExamScores, getScoresByExamId, completeExam, getRegisteredUsers, updateUser, deleteUser, getSpecialMembers, addSpecialMember, removeSpecialMember, isSpecialMember, getUserLoginIps, downloadBackup, importAllData, BackupData, downloadExamData, downloadExamConfig, downloadUsersData, syncToSupabase } from '../services/storageService';
import { isSupabaseConfigured } from '../services/supabaseClient';
import { Trash2, Plus, Save, AlertTriangle, ArrowLeft, Edit, FileText, CheckSquare, PenTool, BarChart2, Settings, Globe, ChevronDown, ChevronUp, Download, Upload, Cloud, Loader2 } from 'lucide-react';
import ResultStats from './ResultStats';

const AdminDashboard: React.FC = () => {
  const [mode, setMode] = useState<'LIST' | 'EDIT' | 'STATS' | 'USERS'>('LIST');
  const [exams, setExams] = useState<ExamConfig[]>([]);
  const [users, setUsers] = useState<RegisteredUser[]>([]);
  const [editingUser, setEditingUser] = useState<RegisteredUser | null>(null);
  const [expandedUserIps, setExpandedUserIps] = useState<string | null>(null); // IP 목록 확장 상태
  
  // Edit State
  const [currentExamId, setCurrentExamId] = useState<string | null>(null);
  const [examTitle, setExamTitle] = useState('');
  const [gradingSystem, setGradingSystem] = useState<'CSAT' | 'RELATIVE_5' | 'ABSOLUTE'>('CSAT');
  const [examGrade, setExamGrade] = useState<1 | 2 | 3 | undefined>(undefined);
  const [subject, setSubject] = useState('');
  const [semester, setSemester] = useState<1 | 2 | undefined>(undefined);
  const [year, setYear] = useState<number>(new Date().getFullYear());
  const [examType, setExamType] = useState<'MIDTERM' | 'FINAL' | 'FINAL_ONLY'>('MIDTERM');
  const [parentExamId, setParentExamId] = useState<string | undefined>(undefined);
  const [mcqs, setMcqs] = useState<McqConfig[]>([]);
  const [subjectives, setSubjectives] = useState<SubjectiveConfig[]>([]);
  const [existingScoresCount, setExistingScoresCount] = useState(0);
  
  // 중간고사 없이 통합 등급컷 계산을 위한 관리자 입력 데이터
  const [useMidtermStats, setUseMidtermStats] = useState(false);
  const [midtermMean, setMidtermMean] = useState<number>(70);
  const [midtermStdDev, setMidtermStdDev] = useState<number>(15);
  const [midtermTotalPoints, setMidtermTotalPoints] = useState<number>(100);
  
  // Supabase 동기화 상태
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    loadExams();
  }, []);

  const loadExams = () => {
    setExams(getExams());
  };

  const handleCreateNew = () => {
    setMode('EDIT');
    setCurrentExamId(null);
    setExamTitle('');
    setGradingSystem('CSAT');
    setExamGrade(undefined);
    setSubject('');
    setSemester(undefined);
    setYear(new Date().getFullYear());
    setExamType('MIDTERM');
    setParentExamId(undefined);
    setUseMidtermStats(false);
    setMidtermMean(70);
    setMidtermStdDev(15);
    setMidtermTotalPoints(100);
    setMcqs([{ id: Date.now(), points: 5, correctOption: 1 }]);
    setSubjectives([]);
    setExistingScoresCount(0);
  };

  const handleEdit = (exam: ExamConfig) => {
    setMode('EDIT');
    setCurrentExamId(exam.id);
    setExamTitle(exam.title);
    setGradingSystem(exam.gradingSystem || 'CSAT');
    setExamGrade(exam.grade);
    setSubject(exam.subject || '');
    setSemester(exam.semester);
    setYear(exam.year || new Date().getFullYear());
    setExamType(exam.examType || 'MIDTERM');
    setParentExamId(exam.parentExamId);
    setMcqs(exam.mcqs);
    setSubjectives(exam.subjectives);
    
    // 중간고사 통계 로드
    if (exam.midtermStats) {
      setUseMidtermStats(true);
      setMidtermMean(exam.midtermStats.mean);
      setMidtermStdDev(exam.midtermStats.stdDev);
      setMidtermTotalPoints(exam.midtermStats.totalPoints);
    } else {
      setUseMidtermStats(false);
      setMidtermMean(70);
      setMidtermStdDev(15);
      setMidtermTotalPoints(100);
    }
    
    const scores = getScoresByExamId(exam.id);
    setExistingScoresCount(scores.length);
  };
  
  const handleCreateFinalForMidterm = (midtermExam: ExamConfig) => {
    setMode('EDIT');
    setCurrentExamId(null);
    setExamTitle(midtermExam.title.replace('중간고사', '기말고사'));
    setGradingSystem(midtermExam.gradingSystem || 'CSAT');
    setExamGrade(midtermExam.grade);
    setSubject(midtermExam.subject || '');
    setSemester(midtermExam.semester);
    setYear(midtermExam.year || new Date().getFullYear());
    setExamType('FINAL');
    setParentExamId(midtermExam.id);
    setMcqs([...midtermExam.mcqs]); // 기본값으로 중간고사 문항 복사
    setSubjectives([...midtermExam.subjectives]);
    setExistingScoresCount(0);
  };

  const handleViewStats = (examId: string) => {
    setCurrentExamId(examId);
    setMode('STATS');
  };

  const handleDeleteExam = (id: string) => {
    if (confirm('정말로 이 시험을 삭제하시겠습니까? 관련된 모든 성적 데이터도 함께 삭제됩니다.')) {
      deleteExam(id);
      loadExams();
    }
  };

  const handleCompleteExam = (id: string) => {
    if (confirm('이 시험을 종료하시겠습니까? 종료된 시험은 기출 정보로 이동합니다.')) {
      completeExam(id);
      loadExams();
      alert('시험이 종료되었습니다. 기출 정보에서 확인할 수 있습니다.');
    }
  };

  const addMcq = () => {
    setMcqs([...mcqs, { id: Date.now(), points: 5, correctOption: 1 }]);
  };

  const removeMcq = (index: number) => {
    const newMcqs = [...mcqs];
    newMcqs.splice(index, 1);
    setMcqs(newMcqs);
  };

  const updateMcq = (index: number, field: keyof McqConfig, value: number) => {
    const newMcqs = [...mcqs];
    newMcqs[index] = { ...newMcqs[index], [field]: value };
    setMcqs(newMcqs);
  };

  const addSubjective = () => {
    setSubjectives([...subjectives, { id: Date.now(), points: 10, type: 'SELF' }]);
  };

  const removeSubjective = (index: number) => {
    const newSubs = [...subjectives];
    newSubs.splice(index, 1);
    setSubjectives(newSubs);
  };

  const updateSubjective = (index: number, field: keyof SubjectiveConfig, value: any) => {
    const newSubs = [...subjectives];
    newSubs[index] = { ...newSubs[index], [field]: value };
    setSubjectives(newSubs);
  };

  const handleSave = async () => {
    if (existingScoresCount > 0) {
      if (!confirm("시험 설정을 변경하면 기존 통계 데이터의 신뢰성이 떨어질 수 있습니다. 계속하시겠습니까?")) {
        return;
      }
    }
    
    if (!examGrade) {
      alert('학년을 선택해주세요.');
      return;
    }
    
    const newId = currentExamId || `exam-${Date.now()}`;
    
    // 시험 제목 자동 생성 (비어있는 경우)
    const examTypeLabel = examType === 'MIDTERM' ? '중간고사' : examType === 'FINAL' ? '기말고사' : '기말고사';
    const autoGeneratedTitle = `${year}학년도 ${examGrade}학년 ${semester}학기 ${subject || '과목미지정'} ${examTypeLabel}`;
    const finalTitle = examTitle.trim() || autoGeneratedTitle;
    
    const config: ExamConfig = {
      id: newId,
      title: finalTitle,
      gradingSystem,
      grade: examGrade,
      subject: subject || undefined,
      semester: semester,
      year: year,
      examType: examType,
      parentExamId: parentExamId,
      mcqs,
      subjectives,
      createdAt: currentExamId ? (exams.find(e => e.id === currentExamId)?.createdAt || Date.now()) : Date.now(),
      // 중간고사 없이 통합 등급컷 계산을 위한 관리자 입력 데이터
      midtermStats: useMidtermStats && !parentExamId ? {
        mean: midtermMean,
        stdDev: midtermStdDev,
        totalPoints: midtermTotalPoints
      } : undefined
    };

    try {
      const success = await saveExam(config);
      if (success) {
        alert('시험 설정이 저장되었습니다.');
        setMode('LIST');
        loadExams();
      } else {
        alert('시험 설정 저장에 실패했습니다.');
      }
    } catch (error: any) {
      console.error('Error saving exam:', error);
      alert(`시험 설정 저장 중 오류가 발생했습니다: ${error.message || '알 수 없는 오류'}`);
    }
  };

  const handleResetData = () => {
    if (currentExamId && confirm("이 시험의 모든 학생 성적 데이터를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.")) {
      resetExamScores(currentExamId);
      setExistingScoresCount(0);
      alert('성적 데이터가 초기화되었습니다.');
    }
  };

  const totalPoints = Math.round((mcqs.reduce((s, q) => s + q.points, 0) + subjectives.reduce((s, q) => s + q.points, 0)) * 100) / 100;

  const inputClass = "w-full p-2 bg-slate-800 text-white border border-slate-600 rounded-md focus:ring-2 focus:ring-indigo-500 outline-none placeholder-slate-400";
  const pointsInputClass = "w-full p-1 bg-slate-800 text-white border border-slate-600 rounded text-center focus:ring-2 focus:ring-indigo-500 outline-none";

  // Stats View
  if (mode === 'STATS' && currentExamId) {
    return (
      <ResultStats 
        examId={currentExamId} 
        isAdminView={true}
        onClose={() => setMode('LIST')} 
      />
    );
  }

  // Users Management View
  if (mode === 'USERS') {
    const loadedUsers = getRegisteredUsers();
    
    const handleSaveUser = () => {
      if (editingUser) {
        updateUser(editingUser.username, editingUser);
        setEditingUser(null);
        setUsers(getRegisteredUsers());
        alert('회원 정보가 수정되었습니다.');
      }
    };
    
    const handleDeleteUser = (username: string) => {
      if (confirm(`${username} 회원을 삭제하시겠습니까?`)) {
        deleteUser(username);
        setUsers(getRegisteredUsers());
        alert('회원이 삭제되었습니다.');
      }
    };
    
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="flex justify-between items-center mb-8 border-b pb-4">
          <div className="flex items-center gap-4">
            <button onClick={() => setMode('LIST')} className="p-2 hover:bg-slate-100 rounded-full">
              <ArrowLeft size={24} />
            </button>
            <h2 className="text-3xl font-bold text-slate-800">회원 관리</h2>
          </div>
          <button
            onClick={() => {
              downloadUsersData();
              alert('회원 목록이 다운로드되었습니다.');
            }}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm"
          >
            <Download size={16} /> 회원 목록 다운로드
          </button>
        </div>
        
        {editingUser ? (
          <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200 space-y-4">
            <h3 className="text-xl font-bold text-slate-800 mb-4">회원 정보 수정</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">아이디</label>
                <input
                  type="text"
                  value={editingUser.username}
                  disabled
                  className="w-full p-2 bg-slate-100 border border-slate-300 rounded-md text-slate-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">이름</label>
                <input
                  type="text"
                  value={editingUser.name}
                  onChange={(e) => setEditingUser({ ...editingUser, name: e.target.value })}
                  className="w-full p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">학번</label>
                <input
                  type="text"
                  value={editingUser.studentNumber}
                  onChange={(e) => setEditingUser({ ...editingUser, studentNumber: e.target.value })}
                  className="w-full p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">이메일</label>
                <input
                  type="email"
                  value={editingUser.email}
                  onChange={(e) => setEditingUser({ ...editingUser, email: e.target.value })}
                  className="w-full p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">학년</label>
                <select
                  value={editingUser.grade || ''}
                  onChange={(e) => setEditingUser({ ...editingUser, grade: parseInt(e.target.value) as 1 | 2 | 3 || undefined })}
                  className="w-full p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-indigo-500 outline-none"
                >
                  <option value="">미지정</option>
                  <option value="1">1학년</option>
                  <option value="2">2학년</option>
                  <option value="3">3학년</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">비밀번호 (변경 시에만)</label>
                <input
                  type="password"
                  placeholder="새 비밀번호 입력"
                  onChange={(e) => e.target.value && setEditingUser({ ...editingUser, password: e.target.value })}
                  className="w-full p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>
            </div>
            <div className="flex gap-3 pt-4">
              <button
                onClick={handleSaveUser}
                className="px-6 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700"
              >
                저장
              </button>
              <button
                onClick={() => setEditingUser(null)}
                className="px-6 py-2 bg-slate-200 text-slate-700 rounded-lg font-medium hover:bg-slate-300"
              >
                취소
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden overflow-x-auto">
            <table className="w-full text-sm min-w-[800px]">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-3 py-3 text-left font-semibold text-slate-700">아이디</th>
                  <th className="px-3 py-3 text-left font-semibold text-slate-700">이름</th>
                  <th className="px-3 py-3 text-left font-semibold text-slate-700 hidden md:table-cell">학번</th>
                  <th className="px-3 py-3 text-left font-semibold text-slate-700 hidden lg:table-cell">이메일</th>
                  <th className="px-3 py-3 text-center font-semibold text-slate-700">학년</th>
                  <th className="px-3 py-3 text-center font-semibold text-slate-700">IP 기록</th>
                  <th className="px-3 py-3 text-center font-semibold text-slate-700">특별회원</th>
                  <th className="px-3 py-3 text-center font-semibold text-slate-700">작업</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loadedUsers.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-slate-500">
                      등록된 회원이 없습니다.
                    </td>
                  </tr>
                ) : (
                  loadedUsers.map((user) => {
                    const isSpecial = isSpecialMember(user.email);
                    const userIps = getUserLoginIps(user.username);
                    const isExpanded = expandedUserIps === user.username;
                    
                    return (
                    <React.Fragment key={user.username}>
                      <tr className={`hover:bg-slate-50 ${isSpecial ? 'bg-amber-50' : ''}`}>
                        <td className="px-3 py-3 font-medium text-slate-900">{user.username}</td>
                        <td className="px-3 py-3 text-slate-700">{user.name}</td>
                        <td className="px-3 py-3 text-slate-600 hidden md:table-cell">{user.studentNumber}</td>
                        <td className="px-3 py-3 text-slate-600 text-xs hidden lg:table-cell">{user.email}</td>
                        <td className="px-3 py-3 text-center">{user.grade ? `${user.grade}` : '-'}</td>
                        <td className="px-3 py-3 text-center">
                          {userIps.length > 0 ? (
                            <button
                              onClick={() => setExpandedUserIps(isExpanded ? null : user.username)}
                              className="flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs font-medium hover:bg-blue-100 mx-auto"
                            >
                              <Globe size={12} />
                              {userIps.length}개
                              {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                            </button>
                          ) : (
                            <span className="text-xs text-slate-400">-</span>
                          )}
                        </td>
                        <td className="px-3 py-3 text-center">
                          {isSpecial ? (
                            <button
                              onClick={() => {
                                if (user.email === 'h2410431@joongdong.hs.kr') {
                                  alert('기본 특별회원은 해제할 수 없습니다.');
                                  return;
                                }
                                removeSpecialMember(user.email);
                                setUsers([...getRegisteredUsers()]);
                              }}
                              className="px-2 py-1 bg-amber-400 text-white rounded text-xs font-medium hover:bg-amber-500"
                            >
                              ★ 특별
                            </button>
                          ) : (
                            <button
                              onClick={() => {
                                addSpecialMember(user.email);
                                setUsers([...getRegisteredUsers()]);
                              }}
                              className="px-2 py-1 bg-slate-200 text-slate-600 rounded text-xs font-medium hover:bg-slate-300"
                            >
                              일반
                            </button>
                          )}
                        </td>
                        <td className="px-3 py-3 text-center">
                          <div className="flex gap-1 justify-center flex-wrap">
                            <button
                              onClick={() => setEditingUser(user)}
                              className="px-3 py-1 bg-indigo-50 text-indigo-700 rounded text-xs font-medium hover:bg-indigo-100"
                            >
                              수정
                            </button>
                            <button
                              onClick={() => handleDeleteUser(user.username)}
                              className="px-3 py-1 bg-red-50 text-red-700 rounded text-xs font-medium hover:bg-red-100"
                            >
                              삭제
                            </button>
                          </div>
                        </td>
                      </tr>
                      {/* IP 목록 확장 행 */}
                      {isExpanded && userIps.length > 0 && (
                        <tr className="bg-blue-50/50">
                          <td colSpan={8} className="px-4 py-3">
                            <div className="text-xs">
                              <div className="font-semibold text-blue-800 mb-2 flex items-center gap-1">
                                <Globe size={14} /> {user.name}님의 접속 IP 기록 ({userIps.length}개)
                              </div>
                              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                                {userIps
                                  .sort((a, b) => b.timestamp - a.timestamp)
                                  .map((entry, idx) => (
                                    <div key={idx} className="bg-white p-2 rounded border border-blue-100 flex justify-between items-center">
                                      <span className="font-mono text-blue-700">{entry.ip}</span>
                                      <span className="text-slate-400 text-[10px]">
                                        {new Date(entry.timestamp).toLocaleString('ko-KR', {
                                          month: 'short',
                                          day: 'numeric',
                                          hour: '2-digit',
                                          minute: '2-digit'
                                        })}
                                      </span>
                                    </div>
                                  ))}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  }

  // List View
  if (mode === 'LIST') {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="flex justify-between items-center mb-8 border-b pb-4">
          <h2 className="text-3xl font-bold text-slate-800">시험 관리 (Admin)</h2>
          <div className="flex gap-3 flex-wrap">
            <button
              onClick={() => {
                setUsers(getRegisteredUsers());
                setMode('USERS');
              }}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium"
            >
              <Settings size={20} /> 회원 관리
            </button>
          <button
            onClick={handleCreateNew}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium"
          >
            <Plus size={20} /> 새 시험 생성
          </button>
          </div>
        </div>
        
        {/* 데이터 백업/복원 */}
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
          <h3 className="font-semibold text-amber-800 mb-2 flex items-center gap-2">
            <AlertTriangle size={18} /> 데이터 백업 및 복원
          </h3>
          <p className="text-sm text-amber-700 mb-3">
            브라우저 데이터가 삭제될 수 있습니다. 정기적으로 백업을 저장해주세요.
          </p>
          <div className="flex gap-3 flex-wrap">
            <button
              onClick={() => {
                downloadBackup();
                alert('백업 파일이 다운로드되었습니다.');
              }}
              className="flex items-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 font-medium text-sm"
            >
              <Download size={16} /> 데이터 백업
            </button>
            <label className="flex items-center gap-2 px-4 py-2 bg-white border border-amber-300 text-amber-700 rounded-lg hover:bg-amber-100 font-medium text-sm cursor-pointer">
              <Upload size={16} /> 데이터 복원
              <input
                type="file"
                accept=".json"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  
                  const reader = new FileReader();
                  reader.onload = (event) => {
                    try {
                      const backup = JSON.parse(event.target?.result as string) as BackupData;
                      if (confirm(`${new Date(backup.timestamp).toLocaleString()}에 저장된 백업을 복원하시겠습니까?\n\n시험: ${backup.exams?.length || 0}개\n회원: ${backup.users?.length || 0}명\n성적: ${backup.scores?.length || 0}건\n\n⚠️ 현재 데이터가 덮어씌워집니다.`)) {
                        if (importAllData(backup)) {
                          alert('데이터가 복원되었습니다. 페이지를 새로고침합니다.');
                          window.location.reload();
                        } else {
                          alert('데이터 복원에 실패했습니다.');
                        }
                      }
                    } catch (error) {
                      alert('유효하지 않은 백업 파일입니다.');
                    }
                  };
                  reader.readAsText(file);
                  e.target.value = '';
                }}
              />
            </label>
            {isSupabaseConfigured() && (
              <button
                onClick={async () => {
                  if (!confirm('로컬 데이터를 Supabase 클라우드에 동기화하시겠습니까?')) return;
                  setIsSyncing(true);
                  try {
                    const result = await syncToSupabase();
                    alert(result.message);
                  } catch (error) {
                    alert('동기화 중 오류가 발생했습니다.');
                  } finally {
                    setIsSyncing(false);
                  }
                }}
                disabled={isSyncing}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSyncing ? <Loader2 size={16} className="animate-spin" /> : <Cloud size={16} />}
                {isSyncing ? '동기화 중...' : '클라우드 동기화'}
              </button>
            )}
          </div>
        </div>

        <div className="grid gap-4">
          {exams.length === 0 ? (
            <div className="text-center py-12 bg-slate-50 rounded-lg border border-dashed border-slate-300">
              <p className="text-slate-500">등록된 시험이 없습니다. 새 시험을 생성해주세요.</p>
            </div>
          ) : (
            exams.map(exam => {
              const scores = getScoresByExamId(exam.id);
              return (
                <div key={exam.id} className="bg-white p-6 rounded-lg shadow-sm border border-slate-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:shadow-md transition-shadow">
                  <div>
                    <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                      <FileText size={20} className="text-slate-400" />
                      {exam.title}
                    </h3>
                    <div className="text-sm text-slate-500 mt-1 flex gap-4 flex-wrap">
                      <span>{exam.grade ? `${exam.grade}학년` : '학년 미지정'}</span>
                      <span>문항: {exam.mcqs.length + exam.subjectives.length}</span>
                      <span>총점: {Math.round((exam.mcqs.reduce((a,b)=>a+b.points,0) + exam.subjectives.reduce((a,b)=>a+b.points,0)) * 100) / 100}점</span>
                      <span>채점인원: {scores.length}명</span>
                      {exam.isCompleted && (
                        <span className="text-red-600 font-semibold">종료됨</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 self-end md:self-auto flex-wrap">
                    <button 
                      onClick={() => handleViewStats(exam.id)}
                      className="flex items-center gap-1 px-3 py-1.5 bg-green-50 text-green-700 rounded-md hover:bg-green-100 transition-colors border border-green-200 text-sm font-medium"
                    >
                      <BarChart2 size={16} /> 통계 보기
                    </button>
                    {scores.length > 0 && (
                      <button 
                        onClick={() => downloadExamData(exam.id, exam.title)}
                        className="flex items-center gap-1 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-md hover:bg-blue-100 transition-colors border border-blue-200 text-sm font-medium"
                        title="채점 결과 다운로드 (CSV)"
                      >
                        <Download size={16} /> CSV
                      </button>
                    )}
                    {!exam.isCompleted && (
                      <button 
                        onClick={() => handleCompleteExam(exam.id)}
                        className="flex items-center gap-1 px-3 py-1.5 bg-orange-50 text-orange-700 rounded-md hover:bg-orange-100 transition-colors border border-orange-200 text-sm font-medium"
                        title="시험 종료"
                      >
                        시험 종료
                      </button>
                    )}
                    <button 
                      onClick={() => handleEdit(exam)}
                      className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-full transition-colors"
                      title="수정"
                    >
                      <Edit size={20} />
                    </button>
                    <button 
                      onClick={() => handleDeleteExam(exam.id)}
                      className="p-2 text-red-400 hover:bg-red-50 rounded-full transition-colors"
                      title="삭제"
                    >
                      <Trash2 size={20} />
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

  // Edit View
  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="flex justify-between items-center mb-8 border-b pb-4">
        <div className="flex items-center gap-4">
          <button onClick={() => setMode('LIST')} className="p-2 hover:bg-slate-100 rounded-full">
            <ArrowLeft size={24} />
          </button>
          <h2 className="text-3xl font-bold text-slate-800">
            {currentExamId ? '시험 수정' : '새 시험 생성'}
          </h2>
        </div>
        <div className="text-right">
          <p className="text-sm text-slate-500">총 배점</p>
          <p className="text-2xl font-bold text-indigo-600">{totalPoints}점</p>
        </div>
      </div>

      <div className="space-y-6">
        {/* Basic Settings */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200 space-y-4">
           <div className="flex items-center gap-2 mb-2 text-lg font-semibold text-slate-800">
             <Settings size={20} className="text-slate-500" /> 기본 설정
           </div>
           
           {/* 학년 선택 (과목보다 먼저) */}
           <div>
             <label className="block text-sm font-medium text-slate-700 mb-2">학년</label>
             <div className="flex gap-4">
                <button
                  type="button"
                  onClick={() => { setExamGrade(1); setSubject(''); }}
                  className={`flex-1 py-3 px-4 rounded-lg border text-center transition-all ${
                    examGrade === 1 
                    ? 'bg-indigo-50 border-indigo-200 ring-1 ring-indigo-500 text-indigo-800' 
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <div className="font-bold">1학년</div>
                </button>
                <button
                  type="button"
                  onClick={() => { setExamGrade(2); setSubject(''); }}
                  className={`flex-1 py-3 px-4 rounded-lg border text-center transition-all ${
                    examGrade === 2 
                    ? 'bg-indigo-50 border-indigo-200 ring-1 ring-indigo-500 text-indigo-800' 
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <div className="font-bold">2학년</div>
                </button>
                <button
                  type="button"
                  onClick={() => { setExamGrade(3); setSubject(''); }}
                  className={`flex-1 py-3 px-4 rounded-lg border text-center transition-all ${
                    examGrade === 3 
                    ? 'bg-indigo-50 border-indigo-200 ring-1 ring-indigo-500 text-indigo-800' 
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <div className="font-bold">3학년</div>
                </button>
             </div>
           </div>

           {/* 과목 및 연도 */}
           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">과목명</label>
              <select
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-indigo-500 outline-none"
              >
                <option value="">과목 선택 {examGrade ? `(${examGrade}학년)` : ''}</option>
                {examGrade === 1 && (
                  <>
                    <option value="한국사">한국사</option>
                    <option value="통합과학1">통합과학1</option>
                    <option value="통합과학2">통합과학2</option>
                    <option value="공통국어1">공통국어1</option>
                    <option value="공통국어2">공통국어2</option>
                    <option value="공통수학1">공통수학1</option>
                    <option value="공통수학2">공통수학2</option>
                    <option value="체육">체육</option>
                    <option value="음악">음악</option>
                    <option value="과학탐구실험">과학탐구실험</option>
                    <option value="공통영어1">공통영어1</option>
                    <option value="공통영어2">공통영어2</option>
                    <option value="미술">미술</option>
                  </>
                )}
                {examGrade === 2 && (
                  <>
                    <option value="수학I">수학I</option>
                    <option value="수학II">수학II</option>
                    <option value="문학">문학</option>
                    <option value="화법과 작문">화법과 작문</option>
                    <option value="영어I">영어I</option>
                    <option value="영어II">영어II</option>
                    <option value="물리학I">물리학I</option>
                    <option value="화학I">화학I</option>
                    <option value="생명과학I">생명과학I</option>
                    <option value="지구과학I">지구과학I</option>
                    <option value="세계사">세계사</option>
                    <option value="생활과 윤리">생활과 윤리</option>
                    <option value="경제">경제</option>
                    <option value="세계지리">세계지리</option>
                    <option value="확률과 통계">확률과 통계</option>
                    <option value="사회문제탐구">사회문제탐구</option>
                  </>
                )}
                {examGrade === 3 && (
                  <>
                    <option value="수학">수학</option>
                    <option value="미적분">미적분</option>
                    <option value="확률과통계">확률과통계</option>
                    <option value="기하">기하</option>
                    <option value="고급수학I">고급수학I</option>
                    <option value="고급수학II">고급수학II</option>
                    <option value="경제수학">경제수학</option>
                  </>
                )}
                {!examGrade && (
                  <option value="" disabled>먼저 학년을 선택해주세요</option>
                )}
              </select>
             </div>
             <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">연도</label>
              <input
                type="number"
                value={year}
                onChange={(e) => setYear(parseInt(e.target.value) || new Date().getFullYear())}
                className={inputClass}
                placeholder="예: 2024"
              />
             </div>
           </div>
           
           <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              시험 제목 <span className="text-xs text-slate-400">(비워두면 자동 생성)</span>
            </label>
            <input
              type="text"
              value={examTitle}
              onChange={(e) => setExamTitle(e.target.value)}
              className={inputClass}
              placeholder={`예: ${year}학년도 ${examGrade || '?'}학년 ${semester || '?'}학기 ${subject || '과목'} ${examType === 'MIDTERM' ? '중간고사' : '기말고사'}`}
            />
            <p className="text-xs text-slate-400 mt-1">
              비워두면 "{year}학년도 {examGrade || '?'}학년 {semester || '?'}학기 {subject || '과목미지정'} {examType === 'MIDTERM' ? '중간고사' : '기말고사'}" 형식으로 자동 생성됩니다.
            </p>
           </div>
           
           <div>
             <label className="block text-sm font-medium text-slate-700 mb-2">학기</label>
             <div className="flex gap-4">
                <button
                  type="button"
                  onClick={() => setSemester(1)}
                  className={`flex-1 py-3 px-4 rounded-lg border text-center transition-all ${
                    semester === 1 
                    ? 'bg-indigo-50 border-indigo-200 ring-1 ring-indigo-500 text-indigo-800' 
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <div className="font-bold">1학기</div>
                </button>
                <button
                  type="button"
                  onClick={() => setSemester(2)}
                  className={`flex-1 py-3 px-4 rounded-lg border text-center transition-all ${
                    semester === 2 
                    ? 'bg-indigo-50 border-indigo-200 ring-1 ring-indigo-500 text-indigo-800' 
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <div className="font-bold">2학기</div>
                </button>
             </div>
           </div>
           
           <div>
             <label className="block text-sm font-medium text-slate-700 mb-2">시험 유형</label>
             <div className="flex gap-4">
                <button
                  type="button"
                  onClick={() => setExamType('MIDTERM')}
                  className={`flex-1 py-3 px-4 rounded-lg border text-center transition-all ${
                    examType === 'MIDTERM' 
                    ? 'bg-indigo-50 border-indigo-200 ring-1 ring-indigo-500 text-indigo-800' 
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <div className="font-bold">중간고사</div>
                </button>
                <button
                  type="button"
                  onClick={() => setExamType('FINAL')}
                  className={`flex-1 py-3 px-4 rounded-lg border text-center transition-all ${
                    examType === 'FINAL' 
                    ? 'bg-indigo-50 border-indigo-200 ring-1 ring-indigo-500 text-indigo-800' 
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <div className="font-bold">기말고사</div>
                </button>
                <button
                  type="button"
                  onClick={() => setExamType('FINAL_ONLY')}
                  className={`flex-1 py-3 px-4 rounded-lg border text-center transition-all ${
                    examType === 'FINAL_ONLY' 
                    ? 'bg-indigo-50 border-indigo-200 ring-1 ring-indigo-500 text-indigo-800' 
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <div className="font-bold">기말고사 단독</div>
                </button>
             </div>
           </div>
           
           {examType === 'FINAL' && (
             <div>
               <label className="block text-sm font-medium text-slate-700 mb-2">중간고사 선택 (해당하는 경우)</label>
               <select
                 value={parentExamId || ''}
                 onChange={(e) => {
                   setParentExamId(e.target.value || undefined);
                   if (e.target.value) setUseMidtermStats(false);
                 }}
                 className={inputClass}
               >
                 <option value="">중간고사 없음 (직접 입력)</option>
                 {exams
                   .filter(e => e.examType === 'MIDTERM' && e.grade === examGrade && e.semester === semester && e.year === year)
                   .map(e => (
                     <option key={e.id} value={e.id}>{e.title}</option>
                   ))}
               </select>
             </div>
           )}
           
           {/* 중간고사 없이 통합 등급컷 계산을 위한 관리자 입력 */}
           {(examType === 'FINAL' || examType === 'FINAL_ONLY') && !parentExamId && (
             <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
               <div className="flex items-center gap-2 mb-3">
                 <input
                   type="checkbox"
                   id="useMidtermStats"
                   checked={useMidtermStats}
                   onChange={(e) => setUseMidtermStats(e.target.checked)}
                   className="w-4 h-4 text-amber-600"
                 />
                 <label htmlFor="useMidtermStats" className="text-sm font-medium text-amber-800">
                   중간고사 대략 데이터 입력 (통합 등급컷 예측용)
                 </label>
               </div>
               
               {useMidtermStats && (
                 <div className="grid grid-cols-3 gap-4">
                   <div>
                     <label className="block text-xs font-medium text-amber-700 mb-1">평균 점수</label>
                     <input
                       type="number"
                       value={midtermMean}
                       onChange={(e) => setMidtermMean(parseFloat(e.target.value) || 0)}
                       className="w-full p-2 border border-amber-300 rounded-md focus:ring-2 focus:ring-amber-500 outline-none text-sm"
                       placeholder="예: 70"
                     />
                   </div>
                   <div>
                     <label className="block text-xs font-medium text-amber-700 mb-1">표준편차</label>
                     <input
                       type="number"
                       value={midtermStdDev}
                       onChange={(e) => setMidtermStdDev(parseFloat(e.target.value) || 0)}
                       className="w-full p-2 border border-amber-300 rounded-md focus:ring-2 focus:ring-amber-500 outline-none text-sm"
                       placeholder="예: 15"
                     />
                   </div>
                   <div>
                     <label className="block text-xs font-medium text-amber-700 mb-1">총점</label>
                     <input
                       type="number"
                       value={midtermTotalPoints}
                       onChange={(e) => setMidtermTotalPoints(parseInt(e.target.value) || 100)}
                       className="w-full p-2 border border-amber-300 rounded-md focus:ring-2 focus:ring-amber-500 outline-none text-sm"
                       placeholder="예: 100"
                     />
                   </div>
                 </div>
               )}
               <p className="text-xs text-amber-600 mt-2">
                 * 중간고사 데이터가 없어도 대략적인 평균, 표준편차를 입력하면 통합 등급컷 예측이 가능합니다.
               </p>
             </div>
           )}
           
           <div>
             <label className="block text-sm font-medium text-slate-700 mb-2">등급 산출 방식</label>
             <div className="flex gap-4">
                <button
                  type="button"
                  onClick={() => setGradingSystem('CSAT')}
                  className={`flex-1 py-3 px-4 rounded-lg border text-left transition-all ${
                    gradingSystem === 'CSAT' 
                    ? 'bg-indigo-50 border-indigo-200 ring-1 ring-indigo-500 text-indigo-800' 
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <div className="font-bold mb-1">9등급제 (2학년용)</div>
                  <div className="text-xs opacity-75">상위 4%, 11%, 23%... 기준</div>
                </button>

                <button
                  type="button"
                  onClick={() => setGradingSystem('RELATIVE_5')}
                  className={`flex-1 py-3 px-4 rounded-lg border text-left transition-all ${
                    gradingSystem === 'RELATIVE_5' 
                    ? 'bg-indigo-50 border-indigo-200 ring-1 ring-indigo-500 text-indigo-800' 
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <div className="font-bold mb-1">5등급제 (1학년용)</div>
                  <div className="text-xs opacity-75">상위 10%, 34%, 66%... 기준</div>
                </button>
                
                <button
                  type="button"
                  onClick={() => setGradingSystem('ABSOLUTE')}
                  className={`flex-1 py-3 px-4 rounded-lg border text-left transition-all ${
                    gradingSystem === 'ABSOLUTE' 
                    ? 'bg-indigo-50 border-indigo-200 ring-1 ring-indigo-500 text-indigo-800' 
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <div className="font-bold mb-1">절대평가</div>
                  <div className="text-xs opacity-75">A: 80점 이상, B: 60-80, C: 60 미만</div>
                </button>
             </div>
           </div>
        </div>

        {/* MCQ Section */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-slate-800">객관식 문항 (MCQ)</h3>
            <button
              onClick={addMcq}
              className="flex items-center gap-2 px-3 py-1 bg-indigo-50 text-indigo-600 rounded-md hover:bg-indigo-100 text-sm font-medium"
            >
              <Plus size={16} /> 문항 추가
            </button>
          </div>
          
          <div className="space-y-3">
            {mcqs.map((q, idx) => (
              <div key={q.id} className="flex items-center gap-4 p-3 bg-slate-50 rounded-md border border-slate-100">
                <span className="font-mono text-slate-500 w-10 text-center font-bold">{idx + 1}번</span>
                
                <div className="flex-1">
                  <label className="block text-xs text-slate-500 mb-1">정답</label>
                  <div className="flex gap-2">
                    {[1, 2, 3, 4, 5].map((opt) => (
                      <button
                        key={opt}
                        onClick={() => updateMcq(idx, 'correctOption', opt)}
                        className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${
                          q.correctOption === opt
                            ? 'bg-indigo-600 text-white shadow-md'
                            : 'bg-white text-slate-400 border border-slate-200 hover:border-indigo-300'
                        }`}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="w-24">
                  <label className="block text-xs text-slate-500 mb-1">배점</label>
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    value={q.points}
                    onChange={(e) => updateMcq(idx, 'points', parseFloat(e.target.value) || 0)}
                    className={pointsInputClass}
                  />
                </div>

                <button 
                  onClick={() => removeMcq(idx)}
                  className="p-2 text-slate-400 hover:text-red-500 transition-colors"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Subjective Section */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-slate-800">주관식/서술형 문항</h3>
             <button
              onClick={addSubjective}
              className="flex items-center gap-2 px-3 py-1 bg-indigo-50 text-indigo-600 rounded-md hover:bg-indigo-100 text-sm font-medium"
            >
              <Plus size={16} /> 문항 추가
            </button>
          </div>

          <div className="space-y-3">
            {subjectives.map((q, idx) => (
              <div key={q.id} className="flex flex-col gap-3 p-4 bg-slate-50 rounded-md border border-slate-100">
                <div className="flex items-center gap-4">
                  <span className="font-mono text-slate-500 w-10 text-center font-bold">{idx + 1 + mcqs.length}번</span>
                  
                  <div className="flex-1 flex gap-4">
                    <button 
                      onClick={() => updateSubjective(idx, 'type', 'SELF')}
                      className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-sm border transition-colors ${
                        (q.type || 'SELF') === 'SELF' 
                        ? 'bg-indigo-100 border-indigo-200 text-indigo-700 font-medium' 
                        : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                      }`}
                    >
                      <CheckSquare size={14} /> 자가채점
                    </button>
                    <button 
                       onClick={() => updateSubjective(idx, 'type', 'AUTO')}
                       className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-sm border transition-colors ${
                        q.type === 'AUTO' 
                        ? 'bg-indigo-100 border-indigo-200 text-indigo-700 font-medium' 
                        : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                      }`}
                    >
                      <PenTool size={14} /> 정답입력
                    </button>
                  </div>

                  <div className="w-24">
                    <label className="block text-xs text-slate-500 mb-1">배점</label>
                    <input
                      type="number"
                      min="0"
                      step="0.1"
                      value={q.points}
                      onChange={(e) => updateSubjective(idx, 'points', parseFloat(e.target.value) || 0)}
                      className={pointsInputClass}
                    />
                  </div>

                  <button 
                    onClick={() => removeSubjective(idx)}
                    className="p-2 text-slate-400 hover:text-red-500 transition-colors"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
                
                {q.type === 'AUTO' && (
                  <div className="ml-14 mr-10">
                    <label className="block text-xs text-slate-500 mb-1">정답 (정확히 일치해야 정답 처리됨)</label>
                    <input
                      type="text"
                      value={q.correctAnswer || ''}
                      onChange={(e) => updateSubjective(idx, 'correctAnswer', e.target.value)}
                      className={inputClass}
                      placeholder="정답 텍스트 입력"
                    />
                  </div>
                )}
                
                {(q.type || 'SELF') === 'SELF' && (
                   <p className="ml-14 text-xs text-slate-400 italic">
                     학생이 시험 후 본인의 점수를 직접 입력합니다.
                   </p>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-6 pb-12">
          <div className="flex items-center gap-4">
             {existingScoresCount > 0 && (
               <div className="flex items-center gap-2 text-amber-600 bg-amber-50 px-3 py-2 rounded-md border border-amber-100">
                  <AlertTriangle size={16} />
                  <span className="text-sm">현재 {existingScoresCount}건의 성적 데이터가 있습니다.</span>
                  <button onClick={handleResetData} className="text-xs underline font-semibold hover:text-amber-800">데이터 초기화</button>
               </div>
             )}
          </div>
          <button
            onClick={handleSave}
            className="flex items-center gap-2 px-8 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 shadow-lg shadow-indigo-200 font-semibold transition-all active:scale-95"
          >
            <Save size={20} /> 설정 저장
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
