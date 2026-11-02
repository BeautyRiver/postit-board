import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { BoardForm } from '../components/BoardForm';
import { Clouds } from '../components/Clouds';
import { FocusView } from '../components/FocusView';
import { Modal } from '../components/Modal';
import { IconEdit, IconGrid, IconLogout, IconMaximize, IconMinimize, IconSliders } from '../components/Icons';
import { Postit } from '../components/Postit';
import { QRCard } from '../components/QRCard';
import { WallOptions } from '../components/WallOptions';
import { useAuth } from '../lib/auth';
import { BoardStore, useBoard, usePostits } from '../lib/boardStore';
import { CATEGORIES, HEARTBEAT_MS, SESSION_TTL_MS, errorMessage } from '../lib/constants';
import { generateLayout } from '../lib/layout';
import { useWallSettings, wallMetrics } from '../lib/wallSettings';
import type { Postit as PostitData } from '../lib/types';

const SWAY_ENABLED = true; // 흔들림 항상 켬 (결정 사항)

// 전체화면(발표) 모드 배치. cell = 포스트잇 크기 + 간격 (옵션)
const PRESENT_TOP = 80;          // 상단 바 높이
const PRESENT_PAGER = 70;        // 페이지 넘기기 바 높이
const PRESENT_PAD = { x: 30, top: 40, bottom: 20 };
const PRESENT_MAX_SCALE = 1.8;

// 한 화면에 모두: 스크롤 없이 모두 들어가도록 열 수와 배율을 고른다 (적으면 최대 1.8배)
function fitPresentation(n: number, w: number, h: number, cell: number) {
  const availW = w, availH = h - PRESENT_TOP;
  let best = { cols: 1, scale: 0, contentW: 0, contentH: 0 };
  for (let cols = 1; cols <= Math.max(1, n); cols++) {
    const rows = Math.ceil(Math.max(1, n) / cols);
    const contentW = PRESENT_PAD.x * 2 + cols * cell;
    const contentH = PRESENT_PAD.top + rows * cell + PRESENT_PAD.bottom;
    const scale = Math.min(availW / contentW, availH / contentH, PRESENT_MAX_SCALE);
    if (scale > best.scale) best = { cols, scale, contentW, contentH };
  }
  return {
    ...best,
    perPage: Math.max(1, n),
    left: (availW - best.contentW * best.scale) / 2,
    top: PRESENT_TOP + Math.max(0, (availH - best.contentH * best.scale) / 2),
  };
}

// 페이지 넘기기: 줄이지 않은 크기로 한 페이지에 들어가는 만큼씩 (모든 페이지 같은 배율)
function pagedPresentation(w: number, h: number, cell: number) {
  const availW = w, availH = h - PRESENT_TOP - PRESENT_PAGER;
  const cols = Math.max(1, Math.floor((availW - PRESENT_PAD.x * 2) / cell));
  const rows = Math.max(1, Math.floor((availH - PRESENT_PAD.top - PRESENT_PAD.bottom) / cell));
  const contentW = PRESENT_PAD.x * 2 + cols * cell;
  const contentH = PRESENT_PAD.top + rows * cell + PRESENT_PAD.bottom;
  const scale = Math.min(availW / contentW, availH / contentH, PRESENT_MAX_SCALE);
  return {
    cols, scale, contentW, contentH, perPage: cols * rows,
    left: (availW - contentW * scale) / 2,
    top: PRESENT_TOP + Math.max(0, (availH - contentH * scale) / 2),
  };
}

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
  const [presenting, setPresenting] = useState(false);
  const [page, setPage] = useState(0);
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [settings, updateSettings, resetSettings] = useWallSettings();
  const metrics = wallMetrics(settings);

  // 전체화면 모드: 브라우저 전체화면 + 한 화면 맞춤 배치. ESC 등으로 브라우저 전체화면이 풀리면 같이 종료
  useEffect(() => {
    if (!presenting) return;
    const onChange = () => { if (!document.fullscreenElement) setPresenting(false); };
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, [presenting]);
  function startPresenting() {
    setPresenting(true);
    setPage(0);
    document.documentElement.requestFullscreen?.().catch(() => {});   // 지원 안 하는 브라우저는 창 안에서만 맞춤 배치
  }
  function stopPresenting() {
    setPresenting(false);
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
  }

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
  // 이후 30초마다 하트비트(쓰기 1회). 세션이 없어졌거나 오래 멈췄으면 다시 연다(가능하면 같은 코드).
  // 강사 PC 시계로 판단하지 않는다 — 시계가 틀려도 코드가 바뀌지 않도록
  const latestBoard = useRef(board);
  useEffect(() => { latestBoard.current = board; }, [board]);
  const boardExists = !!board;
  useEffect(() => {
    if (!boardId || !boardExists) return;
    let lastBeat = Date.now();
    BoardStore.openSession(boardId, { fresh: false }).catch(() => {});
    const beat = () => {
      const gap = Date.now() - lastBeat;
      lastBeat = Date.now();
      // 오래 멈춰 있었으면(절전·숨은 탭) 방이 만료됐을 수 있으니 같은 코드로 다시 열기 시도
      const p = latestBoard.current?.session && gap < SESSION_TTL_MS
        ? BoardStore.heartbeat(boardId)
        : BoardStore.openSession(boardId, { fresh: false });
      p.catch(() => {});
    };
    const t = setInterval(beat, HEARTBEAT_MS);
    // PPT 등에서 브라우저로 돌아오면 바로 하트비트 (숨은 탭은 타이머가 늦어짐)
    const onVisible = () => { if (document.visibilityState === 'visible') beat(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => { clearInterval(t); document.removeEventListener('visibilitychange', onVisible); };
  }, [boardId, boardExists]);

  const all = useMemo(() => postits || [], [postits]);
  const filtered = useMemo(() => filter === 'all' ? all : all.filter(p => p.category === filter), [all, filter]);
  const counts = CATEGORIES.reduce<Record<string, number>>((acc, c) => {
    acc[c.id] = c.id === 'all' ? all.length : all.filter(p => p.category === c.id).length;
    return acc;
  }, {});

  const { cell, jitter, scale: postitScale } = metrics;
  const paged = presenting && settings.present === 'pages';
  const fit = !presenting ? null
    : paged ? pagedPresentation(winW, winH, cell)
    : fitPresentation(filtered.length, winW, winH, cell);
  const perPage = fit ? fit.perPage : filtered.length;
  const pageCount = Math.max(1, Math.ceil(filtered.length / Math.max(1, perPage)));
  const pageIdx = Math.min(page, pageCount - 1);
  const shown = useMemo(
    () => (paged ? filtered.slice(pageIdx * perPage, (pageIdx + 1) * perPage) : filtered),
    [paged, perPage, pageIdx, filtered],
  );
  const cols = fit ? fit.cols : Math.max(1, Math.floor((winW - 80) / cell));
  const startX = fit ? PRESENT_PAD.x : 80;
  const startY = fit ? PRESENT_PAD.top : 130;
  const layouted = useMemo(() => generateLayout(shown, {
    cols,
    cellW: cell,
    cellH: cell,
    startX,
    startY,
    jitter,
    rotJitter: 5,
  }), [shown, cols, cell, jitter, startX, startY]);

  const wallHeight = Math.max(winH, 130 + Math.ceil(filtered.length / cols) * cell + 80);

  // 페이지 넘기기: ← → / PageUp PageDown / 스페이스 (확대 보기·옵션·창이 열려 있을 땐 무시)
  const modalOpen = !!selected || optionsOpen || editing || !!leaveTarget;
  useEffect(() => {
    if (!paged || modalOpen) return;
    const k = (e: KeyboardEvent) => {
      if (['ArrowRight', 'PageDown', ' '].includes(e.key)) { e.preventDefault(); setPage(p => Math.min(Math.min(p, pageCount - 1) + 1, pageCount - 1)); }
      if (['ArrowLeft', 'PageUp'].includes(e.key)) { e.preventDefault(); setPage(p => Math.max(Math.min(p, pageCount - 1) - 1, 0)); }
    };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [paged, modalOpen, pageCount]);

  if (!board) return null;

  async function save() {
    setSaving(true);
    try {
      await BoardStore.save(board!.id);
    } catch (err) {
      alert(errorMessage(err, '저장하지 못했어요'));
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
    } catch (err) {
      alert(errorMessage(err, '처리하지 못했어요'));
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

  // 벽 자신이 하트비트를 보내는 중이므로 세션이 있으면 그대로 표시 (PC 시계 오차와 무관)
  const code = board.session?.code ?? null;

  return (
    <div className={`sky-bg wall-font-${settings.font}`} style={{ position: 'absolute', inset: 0 }}>
      <Clouds />
      <div className="contrail"></div>

      <div className="top-bar">
        <button className="brand brand-editable" onClick={() => !presenting && setEditing(true)} title={presenting ? undefined : '보드 정보 수정'}>
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
          <button className="stat-chip logout-btn" onClick={() => setOptionsOpen(o => !o)} title="포스트잇 크기·글씨·간격, 전체화면 보기 방식, 보드 정보">
            <IconSliders />
            <span className="chip-label">옵션</span>
          </button>
          {presenting ? (
            <button className="stat-chip logout-btn" onClick={stopPresenting} title="전체화면 종료 (ESC)">
              <IconMinimize />
              <span className="chip-label">전체화면 종료</span>
            </button>
          ) : (<>
          <button className="stat-chip logout-btn" onClick={startPresenting} title="모든 포스트잇을 한 화면에 크게 보기">
            <IconMaximize />
            <span className="chip-label">전체화면</span>
          </button>
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
            <span className="chip-label">보드 목록</span>
          </button>
          <button className="stat-chip logout-btn" onClick={() => requestExit('logout')} title="강사 로그아웃">
            <IconLogout />
            <span className="chip-label">로그아웃</span>
          </button>
          </>)}
        </div>
      </div>

      <div style={{ position: 'absolute', inset: 0, overflow: fit ? 'hidden' : 'auto' }}>
        <div style={fit ? {
          position: 'absolute', left: fit.left, top: fit.top, width: fit.contentW, height: fit.contentH,
          transform: `scale(${fit.scale})`, transformOrigin: '0 0',
        } : { position: 'relative', width: '100%', height: wallHeight, paddingBottom: 100 }}>
          {layouted.map(p => (
            <Postit
              key={p.id}
              p={p}
              layout={p}
              scale={postitScale}
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

      {!presenting && <div className="filter-bar">
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
      </div>}

      {paged && (
        <div className="filter-bar pager">
          <button onClick={() => setPage(Math.max(pageIdx - 1, 0))} disabled={pageIdx === 0}>‹ 이전</button>
          <span className="page-indicator">{pageIdx + 1} / {pageCount}</span>
          <button onClick={() => setPage(Math.min(pageIdx + 1, pageCount - 1))} disabled={pageIdx >= pageCount - 1}>다음 ›</button>
        </div>
      )}

      {!presenting && <QRCard code={code} />}

      {optionsOpen && (
        <WallOptions
          settings={settings}
          onChange={updateSettings}
          onReset={resetSettings}
          onEditBoard={() => { setOptionsOpen(false); setEditing(true); }}
          onClose={() => setOptionsOpen(false)}
        />
      )}

      {selected && (
        <FocusView selected={selected} onClose={() => setSelected(null)} />
      )}
      {leaveTarget && (
        <Modal onClose={() => setLeaveTarget(null)}>{close => (
          <div className="modal-form">
            <div className="danger-icon">!</div>
            <h2 className="modal-title">보드를 저장하지 않았어요</h2>
            <p className="danger-text">
              저장하지 않고 나가면 <strong>{board.title}</strong> 보드와 포스트잇 <strong>{all.length}개</strong>가
              <strong> 삭제</strong>됩니다. 나가시겠습니까?
            </p>
            <div className="modal-actions stack">
              <button className="btn-ghost" onClick={close} disabled={leaving}>취소</button>
              <button className="btn-danger" onClick={() => exit(leaveTarget, 'discard')} disabled={leaving}>저장 안 하고 나가기</button>
              <button className="btn-primary" autoFocus onClick={() => exit(leaveTarget, 'save')} disabled={leaving}>저장하고 나가기</button>
            </div>
          </div>
        )}</Modal>
      )}
      {editing && (
        <BoardForm initial={board} onClose={() => setEditing(false)}
          onSave={async v => { await BoardStore.update(board.id, v); }} />
      )}
    </div>
  );
}
