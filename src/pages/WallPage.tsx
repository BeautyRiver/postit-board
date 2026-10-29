import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { BoardForm } from '../components/BoardForm';
import { Clouds } from '../components/Clouds';
import { FocusView } from '../components/FocusView';
import { IconEdit, IconGrid, IconLogout } from '../components/Icons';
import { Postit } from '../components/Postit';
import { QRCard } from '../components/QRCard';
import { useAuth } from '../lib/auth';
import { BoardStore, useBoard, usePostits } from '../lib/boardStore';
import { CATEGORIES } from '../lib/constants';
import { generateLayout } from '../lib/layout';
import type { Postit as PostitData } from '../lib/types';

const SWAY_ENABLED = true; // 흔들림 항상 켬 (결정 사항)
const CELL = 240;

function useWindowSize() {
  const [size, setSize] = useState({ w: window.innerWidth, h: window.innerHeight });
  useEffect(() => {
    const onResize = () => setSize({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  return size;
}

// 강사 — 포스트잇 벽 (/host/:boardId)
export function WallPage() {
  const { boardId } = useParams();
  const board = useBoard(boardId);
  const postits = usePostits(boardId);
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const { w: winW, h: winH } = useWindowSize();
  const [filter, setFilter] = useState('all');
  const [selected, setSelected] = useState<PostitData | null>(null);
  const [editing, setEditing] = useState(false);

  // 삭제됐거나 없는 보드 → 보드 선택으로
  useEffect(() => {
    if (board === null) navigate('/host', { replace: true });
  }, [board, navigate]);

  const all = useMemo(() => postits || [], [postits]);
  const filtered = useMemo(() => filter === 'all' ? all : all.filter(p => p.category === filter), [all, filter]);
  const counts = CATEGORIES.reduce<Record<string, number>>((acc, c) => {
    acc[c.id] = c.id === 'all' ? all.length : all.filter(p => p.category === c.id).length;
    return acc;
  }, {});

  const cols = Math.max(3, Math.floor((winW - 80) / CELL));
  const layouted = useMemo(() => generateLayout(filtered, {
    cols,
    cellW: CELL,
    cellH: CELL,
    startX: 80,
    startY: 130,
    jitter: 22,
    rotJitter: 5,
  }), [filtered, cols]);

  const wallHeight = Math.max(winH, 130 + Math.ceil(filtered.length / cols) * CELL + 80);

  if (!board) return null;

  async function logout() {
    await signOut();
    navigate('/');
  }

  return (
    <div className="sky-bg" style={{ position: 'absolute', inset: 0 }}>
      <Clouds />
      <div className="contrail"></div>

      <div className="top-bar">
        <button className="brand brand-editable" onClick={() => setEditing(true)} title="보드 정보 수정">
          <div className="brand-mark">✈</div>
          <div className="brand-text">
            <div className="brand-title">{board.title}</div>
            <div className="brand-sub">{board.subtitle ? board.subtitle + ' · ' : ''}강사 {board.instructor}</div>
          </div>
          <span className="brand-edit"><IconEdit size={13} /></span>
        </button>
        <div className="top-stats">
          <div className="stat-chip">
            <span className="stat-dot"></span>
            참여 코드 <strong style={{ marginLeft: 4, letterSpacing: '0.08em' }}>{board.code}</strong>
          </div>
          <div className="stat-chip">
            ✎ <strong>{all.length}개</strong>의 의견
          </div>
          <button className="stat-chip logout-btn" onClick={() => navigate('/host')} title="보드 목록으로">
            <IconGrid />
            보드 목록
          </button>
          <button className="stat-chip logout-btn" onClick={logout} title="강사 로그아웃">
            <IconLogout />
            로그아웃
          </button>
        </div>
      </div>

      <div style={{ position: 'absolute', inset: 0, overflow: 'auto' }}>
        <div style={{ position: 'relative', width: '100%', height: wallHeight, paddingBottom: 100 }}>
          {layouted.map(p => (
            <Postit
              key={p.id}
              p={p}
              layout={p}
              onClick={setSelected}
              swayEnabled={SWAY_ENABLED}
            />
          ))}
        </div>
      </div>

      {postits && all.length === 0 && (
        <div className="wall-empty">
          <div className="wall-empty-note">
            <div className="wall-empty-title">아직 붙은 의견이 없어요</div>
            <div className="wall-empty-sub">오른쪽 QR을 스캔해 첫 포스트잇을 남겨주세요</div>
          </div>
        </div>
      )}
      {all.length > 0 && filtered.length === 0 && (
        <div className="wall-empty">
          <div className="wall-empty-sub">이 카테고리에는 아직 의견이 없어요</div>
        </div>
      )}

      <div className="filter-bar">
        {CATEGORIES.map(c => (
          <button
            key={c.id}
            className={filter === c.id ? 'active' : ''}
            onClick={() => setFilter(c.id)}
          >
            <span style={{ opacity: 0.7 }}>{c.icon}</span>
            {c.label}
            <span className="count">{counts[c.id] || 0}</span>
          </button>
        ))}
      </div>

      <QRCard code={board.code} />

      {selected && (
        <FocusView selected={selected} onClose={() => setSelected(null)} />
      )}
      {editing && (
        <BoardForm initial={board} onClose={() => setEditing(false)}
          onSave={async v => { await BoardStore.update(board.id, v); setEditing(false); }} />
      )}
    </div>
  );
}
