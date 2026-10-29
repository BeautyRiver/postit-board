// 강사 인증 — 1단계는 임시 통과(sessionStorage). 2단계에서 Firebase Auth(Google + admins/{uid})로 교체
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

const SESSION_KEY = 'hostAuthed';

export interface HostUser {
  uid: string;
  displayName: string | null;
}

interface AuthState {
  host: HostUser | null;          // 인증된 강사 (없으면 null)
  loading: boolean;               // 인증 상태 확인 중
  signInWithGoogle(): Promise<void>;  // 실패 시 Error throw (예: 등록된 강사 계정이 아님)
  signOut(): Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

const DEV_HOST: HostUser = { uid: 'dev-host', displayName: '개발용 강사' };

function readSession(): HostUser | null {
  try { return sessionStorage.getItem(SESSION_KEY) === '1' ? DEV_HOST : null; } catch { return null; }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [host, setHost] = useState<HostUser | null>(readSession);

  const signInWithGoogle = useCallback(async () => {
    try { sessionStorage.setItem(SESSION_KEY, '1'); } catch { /* 무시 */ }
    setHost(DEV_HOST);
  }, []);

  const signOut = useCallback(async () => {
    try { sessionStorage.removeItem(SESSION_KEY); } catch { /* 무시 */ }
    setHost(null);
  }, []);

  const value = useMemo(() => ({ host, loading: false, signInWithGoogle, signOut }), [host, signInWithGoogle, signOut]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// oxlint-disable-next-line react/only-export-components
export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth는 AuthProvider 안에서 사용해야 합니다');
  return ctx;
}
