import type { ReactNode } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router';
import { TakeoffProvider } from './components/TakeoffProvider';
import { AuthProvider, useAuth } from './lib/auth';
import { CONFIG_MISSING } from './lib/firebase';
import { BoardLobby } from './pages/BoardLobby';
import { GuestPage } from './pages/GuestPage';
import { HostGate } from './pages/HostGate';
import { WallPage } from './pages/WallPage';

// 강사 전용 화면: 미인증이면 로그인 화면
function HostOnly({ children }: { children: ReactNode }) {
  const { host, loading } = useAuth();
  if (loading) return <div className="gate-stage" />;
  if (!host) return <HostGate />;
  return <>{children}</>;
}

export default function App() {
  if (CONFIG_MISSING) {
    return (
      <div className="config-error">
        <div>
          <strong>Firebase 설정값이 없어요</strong>
          <code>.env.local</code> 파일을 만들고 값을 넣은 뒤 개발 서버를 다시 시작하세요.<br />
          (docs/firebase-setup.md 5번 참고)
        </div>
      </div>
    );
  }
  return (
    <AuthProvider>
      <BrowserRouter>
        <TakeoffProvider>
          <Routes>
            <Route path="/" element={<GuestPage />} />
            <Route path="/b/:code" element={<GuestPage />} />
            <Route path="/host" element={<HostOnly><BoardLobby /></HostOnly>} />
            <Route path="/host/:boardId" element={<HostOnly><WallPage /></HostOnly>} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </TakeoffProvider>
      </BrowserRouter>
    </AuthProvider>
  );
}
