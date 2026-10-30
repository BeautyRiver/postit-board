import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Clouds } from '../components/Clouds';
import { IconGoogle } from '../components/Icons';
import { NotAdminError, useAuth } from '../lib/auth';

// 로그인 실패 원인별 안내 (설정 누락을 바로 알 수 있도록 오류 코드도 함께 표시)
function loginErrorMessage(code: string | undefined): string {
  const hint = ({
    'auth/popup-blocked': '브라우저가 로그인 팝업을 막았어요. 주소창 오른쪽에서 팝업을 허용한 뒤 다시 시도해주세요.',
    'auth/operation-not-allowed': 'Firebase 콘솔에서 Google 로그인이 꺼져 있어요. Authentication → 로그인 방법 → Google을 사용 설정해주세요.',
    'auth/configuration-not-found': 'Firebase 콘솔에서 Authentication이 시작되지 않았어요. Authentication → 시작하기 → Google을 사용 설정해주세요.',
    'auth/unauthorized-domain': '이 사이트 주소가 승인된 도메인에 없어요. Authentication → 설정 → 승인된 도메인에 추가해주세요.',
    'auth/api-key-not-valid': 'Firebase 설정값(API 키)이 잘못됐어요. .env.local 또는 GitHub Secret ENV_LOCAL을 확인해주세요.',
    'auth/invalid-api-key': 'Firebase 설정값(API 키)이 잘못됐어요. .env.local 또는 GitHub Secret ENV_LOCAL을 확인해주세요.',
    'auth/auth-domain-config-required': 'Firebase 설정값에 authDomain이 없어요. VITE_FIREBASE_AUTH_DOMAIN을 확인해주세요.',
    'auth/network-request-failed': '인터넷 연결을 확인하고 다시 시도해주세요.',
    'permission-denied': 'Firestore 보안 규칙이 게시되지 않았어요. firestore.rules 내용을 콘솔 Firestore → 규칙 탭에 붙여넣고 게시해주세요.',
    'not-found': 'Firestore 데이터베이스가 없어요. 콘솔에서 Firestore Database를 (default) ID로 만들어주세요.',
    'failed-precondition': 'Firestore 데이터베이스가 아직 준비되지 않았어요. 콘솔에서 Firestore Database를 만들었는지 확인해주세요.',
    'unavailable': 'Firestore에 연결하지 못했어요. 잠시 후 다시 시도해주세요.',
  } as Record<string, string>)[code || ''];
  return (hint || '로그인하지 못했어요. 다시 시도해주세요.') + (code ? ` (${code})` : '');
}

// 강사 로그인 — 프로토타입 PIN 게이트의 카드·배경·구름 비주얼 유지, 내용만 Google 로그인으로 교체
export function HostGate() {
  const { signInWithGoogle } = useAuth();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notAdminUid, setNotAdminUid] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function login() {
    setBusy(true);
    setError(null);
    setNotAdminUid(null);
    setCopied(false);
    try {
      await signInWithGoogle();
    } catch (err) {
      const code = (err as { code?: string }).code;
      if (err instanceof NotAdminError) {
        setError(err.message);
        setNotAdminUid(err.uid);
      } else if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
        // 사용자가 로그인 창을 닫음 — 안내 없이 원래대로
      } else {
        console.error('Google 로그인 실패', err);
        setError(loginErrorMessage(code));
      }
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
        {notAdminUid && (
          <div className="gate-uid">
            <div>강사로 등록하려면 아래 UID를 Firestore <code>admins</code> 컬렉션의 문서 ID로 추가하세요.</div>
            <code className="gate-uid-value">{notAdminUid}</code>
            <button type="button" className="btn-ghost" onClick={() => {
              navigator.clipboard?.writeText(notAdminUid).then(() => setCopied(true)).catch(() => {});
            }}>{copied ? '복사됨 ✓' : 'UID 복사'}</button>
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
