import type { ReactNode } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router';
import { TakeoffProvider } from './components/TakeoffProvider';
import { AuthProvider, useAuth } from './lib/auth';
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
