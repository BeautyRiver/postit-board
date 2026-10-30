// 인증 — 강사만 로그인: Google 로그인 + Firestore admins/{uid} 등록 여부 확인
// 참여자는 로그인하지 않음 (같은 와이파이에서 익명 계정 생성 제한에 걸리지 않도록)
import { GoogleAuthProvider, onAuthStateChanged, signInWithCredential, signInWithPopup, signOut as fbSignOut, type User } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { USE_EMULATORS, auth, db } from './firebase';

export interface HostUser {
  uid: string;
  displayName: string | null;
  email: string | null;
}

// 로그인은 됐지만 admins 컬렉션에 없는 계정 — 화면에 UID를 보여줘 등록할 수 있게 한다
// oxlint-disable-next-line react/only-export-components
export class NotAdminError extends Error {
  readonly uid: string;
  constructor(uid: string) {
    super('등록된 강사 계정이 아닙니다.');
    this.uid = uid;
  }
}

interface AuthState {
  host: HostUser | null;          // 인증된 강사 (없으면 null)
  loading: boolean;               // 처음 인증 상태 확인 중
  signInWithGoogle(): Promise<void>;  // 실패 시 Error throw (NotAdminError 포함)
  signOut(): Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

async function isAdmin(uid: string): Promise<boolean> {
  return (await getDoc(doc(db, 'admins', uid))).exists();
}

function toHost(u: User): HostUser {
  return { uid: u.uid, displayName: u.displayName, email: u.email };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [host, setHost] = useState<HostUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => onAuthStateChanged(auth, async user => {
    if (user && !user.isAnonymous) {
      const ok = await isAdmin(user.uid).catch(() => false);
      setHost(ok ? toHost(user) : null);
    } else {
      setHost(null);
    }
    setLoading(false);
  }), []);

  const signInWithGoogle = useCallback(async () => {
    // 에뮬레이터 자동 테스트 전용: window.__emulatorGoogleUser = {sub, email} 이면 팝업 없이 가짜 Google 계정으로 로그인
    const fake = USE_EMULATORS ? (window as { __emulatorGoogleUser?: { sub: string; email: string } }).__emulatorGoogleUser : undefined;
    const cred = fake
      ? await signInWithCredential(auth, GoogleAuthProvider.credential(JSON.stringify({ ...fake, email_verified: true })))
      : await signInWithPopup(auth, new GoogleAuthProvider());
    if (!(await isAdmin(cred.user.uid))) {
      const uid = cred.user.uid;
      await fbSignOut(auth);
      throw new NotAdminError(uid);
    }
    setHost(toHost(cred.user));
  }, []);

  const signOut = useCallback(async () => {
    await fbSignOut(auth);
    setHost(null);
  }, []);

  const value = useMemo(() => ({ host, loading, signInWithGoogle, signOut }), [host, loading, signInWithGoogle, signOut]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// oxlint-disable-next-line react/only-export-components
export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth는 AuthProvider 안에서 사용해야 합니다');
  return ctx;
}
