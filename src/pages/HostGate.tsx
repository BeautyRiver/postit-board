import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Clouds } from '../components/Clouds';
import { IconGoogle } from '../components/Icons';
import { useAuth } from '../lib/auth';

// 강사 로그인 — 프로토타입 PIN 게이트의 카드·배경·구름 비주얼 유지, 내용만 Google 로그인으로 교체
export function HostGate() {
  const { signInWithGoogle } = useAuth();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function login() {
    setBusy(true);
    setError(null);
    try {
      await signInWithGoogle();
    } catch (err) {
      setError(err instanceof Error ? err.message : '로그인하지 못했어요. 다시 시도해주세요.');
      setBusy(false);
    }
  }

  return (
    <div className="gate-stage">
      <div className="gate-clouds">
        <Clouds />
      </div>

      <div className="gate-card">
        <div className="gate-icon">
          <span className="gate-icon-plane">✈</span>
          <div className="gate-icon-lock">🔒</div>
        </div>
        <h1 className="gate-title">강사 인증</h1>
        <p className="gate-sub">
          등록된 <strong>강사 Google 계정</strong>으로 로그인하세요.<br/>
          강사 뷰는 큰 화면용으로 제공되며, 인증 없이 접근할 수 없습니다.
        </p>

        <button className="google-btn" onClick={login} disabled={busy}>
          <IconGoogle />
          Google로 로그인
        </button>

        {error && (
          <div className="gate-error">
            ⚠ {error}
          </div>
        )}

        <button className="gate-cancel" onClick={() => navigate('/')}>
          ← 게스트 뷰로 돌아가기
        </button>
      </div>

      <div className="gate-footer">
        의견을 나누는 포스트잇 · Live Feedback Board
      </div>
    </div>
  );
}
