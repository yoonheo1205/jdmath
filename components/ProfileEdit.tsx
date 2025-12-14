import React, { useState } from 'react';
import { UserSession } from '../types';
import { supabase, isSupabaseConfigured } from '../services/supabaseClient';
import { getRegisteredUsers, registerUser, checkUsernameExists, checkEmailExists, updateUserInSupabase } from '../services/storageService';
import { Save, X } from 'lucide-react';

interface ProfileEditProps {
  session: UserSession;
  onUpdate: (updatedSession: UserSession) => void;
  onCancel: () => void;
}

const ProfileEdit: React.FC<ProfileEditProps> = ({ session, onUpdate, onCancel }) => {
  const [username, setUsername] = useState(session.username || '');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSave = async () => {
    if (!username.trim()) {
      alert('아이디를 입력해주세요.');
      return;
    }

    if (password && password !== confirmPassword) {
      alert('비밀번호가 일치하지 않습니다.');
      return;
    }

    // 아이디 중복 체크 (현재 아이디가 아닌 경우)
    if (username !== session.username && checkUsernameExists(username.trim())) {
      alert('이미 사용 중인 아이디입니다.');
      return;
    }

    setIsLoading(true);

    try {
      // Supabase 사용자 업데이트
      if (session.userId && isSupabaseConfigured()) {
        const updateData: any = {
          username: username.trim()
        };

        // 비밀번호 변경
        if (password) {
          // Update Supabase Auth password
          const { error: passwordError } = await supabase.auth.updateUser({
            password: password
          });

          if (passwordError) {
            console.error('Password update error:', passwordError);
            alert('비밀번호 변경 중 오류가 발생했습니다: ' + passwordError.message);
            setIsLoading(false);
            return;
          }

          // Also update password in profiles table
          updateData.password = password;
        }

        // Update profiles table
        const { error: updateError } = await supabase
          .from('profiles')
          .update(updateData)
          .eq('id', session.userId);

        if (updateError) {
          console.error('Profile update error:', updateError);
          // Continue with localStorage update even if Supabase update fails
        }

        // Use updateUserInSupabase for proper sync
        await updateUserInSupabase(session.userId, {
          username: username.trim(),
          password: password || undefined,
        });
      }

      // localStorage 업데이트
      const users = getRegisteredUsers();
      const userIndex = users.findIndex(u => 
        u.username === session.username || u.email === session.email || (session.userId && u.supabaseUserId === session.userId)
      );
      
      if (userIndex >= 0) {
        users[userIndex].username = username.trim();
        if (password) {
          users[userIndex].password = password;
        }
        localStorage.setItem('app_users', JSON.stringify(users));
      }

      // 세션 업데이트
      const updatedSession: UserSession = {
        ...session,
        username: username.trim()
      };

      onUpdate(updatedSession);
      alert('회원정보가 수정되었습니다.');
    } catch (error: any) {
      console.error('Update error:', error);
      alert('회원정보 수정 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const inputClass = "w-full p-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none";

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-800 mb-4">회원정보 수정</h2>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">이름</label>
        <input
          type="text"
          value={session.name || ''}
          disabled
          className={`${inputClass} bg-slate-100 text-slate-500`}
        />
        <p className="text-xs text-slate-400 mt-1">이름은 변경할 수 없습니다.</p>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">이메일</label>
        <input
          type="email"
          value={session.email || ''}
          disabled
          className={`${inputClass} bg-slate-100 text-slate-500`}
        />
        <p className="text-xs text-slate-400 mt-1">이메일은 변경할 수 없습니다.</p>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">아이디</label>
        <input
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className={inputClass}
          placeholder="아이디 입력"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">새 비밀번호 (변경하지 않으려면 비워두세요)</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className={inputClass}
          placeholder="새 비밀번호"
        />
      </div>

      {password && (
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">새 비밀번호 확인</label>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className={inputClass}
            placeholder="새 비밀번호 확인"
          />
        </div>
      )}

      <div className="flex gap-3 pt-4">
        <button
          onClick={onCancel}
          className="flex-1 px-6 py-3 bg-slate-200 text-slate-700 rounded-lg font-medium hover:bg-slate-300 transition-colors flex items-center justify-center gap-2"
        >
          <X size={18} /> 취소
        </button>
        <button
          onClick={handleSave}
          disabled={isLoading}
          className="flex-1 px-6 py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Save size={18} /> {isLoading ? '저장 중...' : '저장'}
        </button>
      </div>
    </div>
  );
};

export default ProfileEdit;



