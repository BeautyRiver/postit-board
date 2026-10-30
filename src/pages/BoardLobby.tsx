import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { BoardForm } from '../components/BoardForm';
import { Clouds } from '../components/Clouds';
import { DeleteBoardConfirm } from '../components/DeleteBoardConfirm';
import { IconEdit, IconTrash } from '../components/Icons';
import { useTakeoff } from '../components/TakeoffProvider';
import { seedDemoBoard } from '../dev/seed';
import { useAuth } from '../lib/auth';
import { BoardStore, useBoards, useNow, usePostitCount } from '../lib/boardStore';
import { UNSAVED_BOARD_TTL_MS, fmtDate, isSessionActive } from '../lib/constants';
import type { Board } from '../lib/types';

function BoardRow({ b, now, onOpen, onEdit, onDelete }: {
  b: Board;
  now: number;
  onOpen: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const count = usePostitCount(b.id);
  return (
    <li className="board-row" onClick={onOpen}>
      <div className="board-row-main">
        <div className="board-row-title">{b.title}</div>
        <div className="board-row-meta">{b.subtitle ? b.subtitle + ' · ' : ''}강사 {b.instructor}</div>
      </div>
      <div className="board-row-stats">
        {!b.saved && <span className="board-temp" title="저장하지 않은 보드 — 열어서 저장하지 않으면 24시간 뒤 자동 삭제">임시</span>}
        {isSessionActive(b.session, now) && <code className="board-code" title="진행 중 · 입장 코드">{b.session!.code}</code>}
        <span>의견 {count ?? '–'}</span>
        <span>{fmtDate(b.createdAt)}</span>
      </div>
      <div className="board-row-actions" onClick={e => e.stopPropagation()}>
        <button className="icon-btn" title="정보 수정" onClick={onEdit}><IconEdit /></button>
        <button className="icon-btn danger" title="보드 삭제" onClick={onDelete}><IconTrash /></button>
      </div>
    </li>
  );
}

// 강사 — 보드 선택 / 생성 / 수정 / 삭제
export function BoardLobby() {
  const boards = useBoards();
  const now = useNow(10_000);
  const takeoff = useTakeoff();
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Board | null>(null);
  const [deleting, setDeleting] = useState<Board | null>(null);
  const sorted = [...(boards || [])].sort((a, b) => b.createdAt - a.createdAt);

  // 저장하지 않고 남겨진 보드(벽 탭을 그냥 닫은 경우 등) 정리: 방이 닫혀 있고 만든 지 24시간 지난 것만 삭제
  // 그 전에는 '임시'로 표시해 실수로 닫았을 때 다시 열어 저장할 수 있게 둔다
  const cleaned = useRef(false);
  useEffect(() => {
    if (!boards || cleaned.current) return;
    cleaned.current = true;
    const now = Date.now();
    boards
      .filter(b => !b.saved && !isSessionActive(b.session, now) && now - b.createdAt > UNSAVED_BOARD_TTL_MS)
      .forEach(b => { BoardStore.remove(b.id).catch(() => {}); });
  }, [boards]);

  // 보드 목록에서 열 때마다 새 입장 코드 발급 → 이륙 연출 → 벽
  async function open(b: Board) {
    try {
      const code = await BoardStore.openSession(b.id, { fresh: true });
      takeoff(b, code);
    } catch (err) {
      alert(err instanceof Error ? err.message : '보드를 열지 못했어요');
    }
  }

  async function logout() {
    await signOut();
    navigate('/');
  }

  return (
    <div className="gate-stage">
      <div className="gate-clouds">
        <Clouds />
      </div>
      <div className="lobby-card">
        <div className="lobby-head">
          <div>
            <h1 className="gate-title">보드 선택</h1>
            <p className="lobby-sub">이어서 진행할 보드를 열거나 새 보드를 만드세요.</p>
          </div>
          <button className="btn-primary" onClick={() => setCreating(true)}>+ 새 보드</button>
        </div>

        {boards === undefined ? null : sorted.length > 0 ? (
          <ul className="board-list">
            {sorted.map(b => (
              <BoardRow key={b.id} b={b} now={now}
                onOpen={() => open(b)}
                onEdit={() => setEditing(b)}
                onDelete={() => setDeleting(b)} />
            ))}
          </ul>
        ) : (
          <div className="lobby-empty">
            <div className="lobby-empty-title">저장된 보드가 없어요</div>
            <div className="lobby-empty-sub">교육명과 강사 이름을 입력해 첫 보드를 만들어보세요.</div>
          </div>
        )}

        <div className="lobby-foot">
          <button className="gate-cancel" onClick={logout}>로그아웃</button>
          {import.meta.env.DEV && (
            <button className="gate-cancel dev-seed" onClick={() => seedDemoBoard()}>샘플 보드 추가 (개발용)</button>
          )}
        </div>
      </div>

      {creating && (
        <BoardForm onClose={() => setCreating(false)}
          onSave={async v => { const b = await BoardStore.create(v); setCreating(false); await open(b); }} />
      )}
      {editing && (
        <BoardForm initial={editing} onClose={() => setEditing(null)}
          onSave={async v => { await BoardStore.update(editing.id, v); setEditing(null); }} />
      )}
      {deleting && (
        <DeleteBoardConfirm board={deleting} onClose={() => setDeleting(null)}
          onConfirm={async () => { await BoardStore.remove(deleting.id); setDeleting(null); }} />
      )}
    </div>
  );
}
