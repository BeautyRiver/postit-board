import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { BoardForm } from '../components/BoardForm';
import { Clouds } from '../components/Clouds';
import { FocusView } from '../components/FocusView';
import { Modal } from '../components/Modal';
import { IconEdit, IconGrid, IconLogout } from '../components/Icons';
import { Postit } from '../components/Postit';
import { QRCard } from '../components/QRCard';
import { useAuth } from '../lib/auth';
import { BoardStore, useBoard, usePostits } from '../lib/boardStore';
import { CATEGORIES, HEARTBEAT_MS, isSessionActive } from '../lib/constants';
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

// 포스트잇마다 부착 애니메이션 지연을 처음 보일 때 한 번만 정한다 (보드별로 기억).
// 첫 로딩: 순서대로 0.04초 간격(최대 0.8초) / 이후 같은 순간에 도착한 묶음: 0.15초 간격으로 차례차례 붙음
const enterDelayCache = new Map<string, Map<string, number>>();
function enterDelaysFor(boardId: string, postits: PostitData[]) {
  let delays = enterDelayCache.get(boardId);
  const firstLoad = !delays;
  if (!delays) {
    delays = new Map();
    enterDelayCache.set(boardId, delays);
  }
  let n = 0;
  for (const p of postits) {
    if (delays.has(p.id)) continue;
    delays.set(p.id, firstLoad ? Math.min(n * 0.04, 0.8) : n * 0.15);
    n++;
  }
  return delays;
}

// 강사 — 포스트잇 벽 (/host/:boardId)
export function WallPage() {
  const { boardId } = useParams();
  const board = useBoard(boardId);
  const postits = usePostits(boardId);
  const enterDelays = useMemo(
    () => (boardId && postits ? enterDelaysFor(boardId, postits) : new Map<string, number>()),
    [boardId, postits],
  );
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const { w: winW, h: winH } = useWindowSize();
  const [filter, setFilter] = useState('all');
  const [selected, setSelected] = useState<PostitData | null>(null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [leaveTarget, setLeaveTarget] = useState<'lobby' | 'logout' | null>(null);  // 저장 안 한 채 나가려 할 때 확인 창
  const [leaving, setLeaving] = useState(false);

  // 저장하지 않은 보드에서 탭을 닫거나 새로고침하려 하면 브라우저 경고 (문구는 브라우저 기본)
  const unsaved = board ? !board.saved : false;
  useEffect(() => {
    if (!unsaved) return;
    const warn = (e: BeforeUnloadEvent) => { e.preventDefault(); };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [unsaved]);

  // 삭제됐거나 없는 보드 → 보드 선택으로
  useEffect(() => {
    if (board === null) navigate('/host', { replace: true });
  }, [board, navigate]);

  // 벽이 열려 있는 동안 입장 세션 유지. 처음엔 세션 확인(새로고침이면 기존 코드 그대로 이어감),
  // 이후 30초마다 하트비트(쓰기 1회). 세션이 끊겨 있으면 다시 열어 새 코드 발급
  const latestBoard = useRef(board);
  useEffect(() => { latestBoard.current = board; }, [board]);
  const boardExists = !!board;
  useEffect(() => {
    if (!boardId || !boardExists) return;
    BoardStore.openSession(boardId, { fresh: false }).catch(() => {});
    const t = setInterval(() => {
      const s = latestBoard.current?.session;
      const beat = s && isSessionActive(s)
        ? BoardStore.heartbeat(boardId)
        : BoardStore.openSession(boardId, { fresh: false });
      beat.catch(() => {});
    }, HEARTBEAT_MS);
    return () => clearInterval(t);
  }, [boardId, boardExists]);

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

  async function save() {
    setSaving(true);
    try {
      await BoardStore.save(board!.id);
    } catch {
      alert('저장하지 못했어요. 인터넷 연결을 확인하고 다시 시도해주세요.');
    } finally {
      setSaving(false);
    }
  }

  // 벽을 떠나면 방을 닫아 코드를 즉시 무효화 (탭을 그냥 닫으면 SESSION_TTL_MS 후 자동으로 닫힘)
  // mode: keep = 그대로 나감(저장된 보드) / save = 저장하고 나감 / discard = 보드·포스트잇 삭제하고 나감
  async function exit(target: 'lobby' | 'logout', mode: 'keep' | 'save' | 'discard') {
    setLeaving(true);
    try {
      if (mode === 'save') await BoardStore.save(board!.id);
      if (mode === 'discard') await BoardStore.remove(board!.id);
      else await BoardStore.closeSession(board!.id).catch(() => {});
    } catch {
      alert('처리하지 못했어요. 인터넷 연결을 확인하고 다시 시도해주세요.');
      setLeaving(false);
      return;
    }
    if (target === 'logout') {
      await signOut();
      navigate('/');
    } else {
      navigate('/host');
    }
  }

  // 저장한 보드는 바로 나가고, 저장 안 한 보드는 확인 창
  function requestExit(target: 'lobby' | 'logout') {
    if (board!.saved) exit(target, 'keep');
    else setLeaveTarget(target);
  }

  const code = isSessionActive(board.session) ? board.session!.code : null;

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
            참여 코드 <strong style={{ marginLeft: 4, letterSpacing: '0.08em' }}>{code ?? '····'}</strong>
          </div>
          <div className="stat-chip">
            ✎ <strong>{all.length}개</strong>의 의견
          </div>
          {board.saved ? (
            <button className="stat-chip save-chip saved" disabled title="이 보드는 저장되어 있어요. 새 의견도 자동으로 남아요">
              ✓ 저장됨
            </button>
          ) : (
            <button className="stat-chip save-chip" onClick={save} disabled={saving} title="저장하지 않으면 나갈 때 보드와 의견이 삭제돼요">
              {saving ? '저장 중…' : '💾 보드 저장'}
            </button>
          )}
          <button className="stat-chip logout-btn" onClick={() => requestExit('lobby')} title="보드 목록으로">
            <IconGrid />
            보드 목록
          </button>
          <button className="stat-chip logout-btn" onClick={() => requestExit('logout')} title="강사 로그아웃">
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
              enterDelay={enterDelays.get(p.id) ?? 0}
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
            <div className="wall-empty-sub">오른쪽 QR을 스캔하고 입장 코드를 입력해 첫 포스트잇을 남겨주세요</div>
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

      <QRCard code={code} />

      {selected && (
        <FocusView selected={selected} onClose={() => setSelected(null)} />
      )}
      {leaveTarget && (
        <Modal onClose={() => !leaving && setLeaveTarget(null)}>
          <div className="modal-form">
            <div className="danger-icon">!</div>
            <h2 className="modal-title">보드를 저장하지 않았어요</h2>
            <p className="danger-text">
              저장하지 않고 나가면 <strong>{board.title}</strong> 보드와 포스트잇 <strong>{all.length}개</strong>가
              <strong> 삭제</strong>됩니다. 나가시겠습니까?
            </p>
            <div className="modal-actions stack">
              <button className="btn-ghost" onClick={() => setLeaveTarget(null)} disabled={leaving}>취소</button>
              <button className="btn-danger" onClick={() => exit(leaveTarget, 'discard')} disabled={leaving}>저장 안 하고 나가기</button>
              <button className="btn-primary" autoFocus onClick={() => exit(leaveTarget, 'save')} disabled={leaving}>저장하고 나가기</button>
            </div>
          </div>
        </Modal>
      )}
      {editing && (
        <BoardForm initial={board} onClose={() => setEditing(false)}
          onSave={async v => { await BoardStore.update(board.id, v); setEditing(false); }} />
      )}
    </div>
  );
}
