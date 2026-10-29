import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router';
import type { Board } from '../lib/types';
import { Takeoff } from './Takeoff';

// 이륙 오버레이는 라우트 전환(/host → /host/:boardId)을 가로질러 유지돼야 하므로 앱 최상단에 둔다
const TakeoffContext = createContext<(board: Board) => void>(() => {});

export function TakeoffProvider({ children }: { children: ReactNode }) {
  const [board, setBoard] = useState<Board | null>(null);
  const navigate = useNavigate();
  const start = useCallback((b: Board) => setBoard(b), []);

  return (
    <TakeoffContext.Provider value={start}>
      {children}
      {board && (
        <Takeoff
          key={board.id}
          board={board}
          onArrive={() => navigate(`/host/${board.id}`)}
          onDone={() => setBoard(null)}
        />
      )}
    </TakeoffContext.Provider>
  );
}

// oxlint-disable-next-line react/only-export-components
export function useTakeoff() {
  return useContext(TakeoffContext);
}
