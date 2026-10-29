// 보드 저장소 — 1단계는 localStorage 구현. 2단계에서 Firestore로 교체 (같은 API 유지)
// 비동기 API로 만들어 두어 Firestore로 바꿔도 호출부가 그대로 동작하게 한다.
import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { CODE_LENGTH, isSessionActive } from './constants';
import type { Board, BoardInput, Postit, PostitInput } from './types';

const STORE_KEY = 'postit.store.v1';
const CHANGE_EVENT = 'postit-store-change';

interface Db {
  boards: Board[];
  postits: Record<string, Postit[]>;
}

function readRaw(): string {
  try { return localStorage.getItem(STORE_KEY) || ''; } catch { return ''; }
}
function parse(raw: string): Db {
  try {
    const db = JSON.parse(raw);
    if (db && Array.isArray(db.boards)) {
      // 이전 형식(고정 6자리 code, session 없음) 데이터도 읽을 수 있게 보정
      const boards = db.boards.map((b: Board) => ({ ...b, session: b.session ?? null }));
      return { boards, postits: db.postits || {} };
    }
  } catch { /* 빈 저장소 */ }
  return { boards: [], postits: {} };
}
function read(): Db {
  return parse(readRaw());
}
function write(db: Db) {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(db));
  } catch {
    throw new Error('브라우저 저장 공간이 부족해요. 사진 크기를 줄이거나 보드를 정리해 주세요.');
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

function makeId(prefix: string) {
  return prefix + Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
}

// 여러 탭이 동시에 쓰면 읽기→수정→쓰기 사이에 서로 덮어쓸 수 있으므로 탭 간 잠금으로 순서대로 처리.
// (Firestore 구현에서는 포스트잇이 각각 별도 문서라 이 문제가 없음)
// navigator.locks는 https/localhost에서만 제공 — 없으면 그냥 실행 (localStorage 자체는 동기라 같은 탭 안에서는 안전)
function withLock<T>(fn: () => T): Promise<T> {
  const locks = typeof navigator !== 'undefined' ? navigator.locks : undefined;
  if (!locks) return Promise.resolve().then(fn);
  return locks.request(STORE_KEY, () => fn());
}
// 지금 열려 있는 다른 방의 코드·이 보드의 직전 코드와 겹치지 않는 4자리 숫자
function makeSessionCode(boards: Board[], previous: string | undefined) {
  const now = Date.now();
  const taken = new Set(boards.filter(b => isSessionActive(b.session, now)).map(b => b.session!.code));
  if (previous) taken.add(previous);
  let c: string;
  do { c = String(Math.floor(Math.random() * 10 ** CODE_LENGTH)).padStart(CODE_LENGTH, '0'); }
  while (taken.has(c));
  return c;
}

function updateBoard(db: Db, id: string, fn: (b: Board) => Board): Db {
  return { ...db, boards: db.boards.map(b => b.id === id ? fn(b) : b) };
}

export const BoardStore = {
  async list(): Promise<Board[]> {
    return read().boards;
  },
  create({ title, subtitle = '', instructor }: BoardInput): Promise<Board> {
    return withLock(() => {
      const db = read();
      const board: Board = { id: makeId('b'), session: null, title, subtitle, instructor, createdAt: Date.now() };
      write({ boards: [board, ...db.boards], postits: { ...db.postits, [board.id]: [] } });
      return board;
    });
  },
  update(id: string, patch: Partial<BoardInput>): Promise<void> {
    return withLock(() => {
      const db = read();
      write({ ...db, boards: db.boards.map(b => b.id === id ? { ...b, ...patch } : b) });
    });
  },
  // 보드와 그 보드의 포스트잇(사진 포함)을 모두 삭제
  remove(id: string): Promise<void> {
    return withLock(() => {
      const db = read();
      const postits = { ...db.postits };
      delete postits[id];
      write({ boards: db.boards.filter(b => b.id !== id), postits });
    });
  },
  // 입장 코드가 지금 열려 있는 방의 코드와 일치할 때만 붙일 수 있다 (Firestore에서는 보안 규칙으로 강제)
  addPostit(boardId: string, code: string, item: PostitInput): Promise<void> {
    return withLock(() => {
      const db = read();
      const board = db.boards.find(b => b.id === boardId);
      if (!board || !isSessionActive(board.session) || board.session!.code !== code) {
        throw new Error('강사님이 방을 닫았어요. 새 코드를 확인해 주세요.');
      }
      const postit: Postit = { ...item, id: makeId('p'), createdAt: Date.now() };
      write({ ...db, postits: { ...db.postits, [boardId]: [...(db.postits[boardId] || []), postit] } });
    });
  },
  // 열려 있는 방 중에서 코드로 찾기. 없거나 닫혔으면 null
  async findByCode(code: string): Promise<Board | null> {
    const c = code.trim();
    return read().boards.find(b => isSessionActive(b.session) && b.session!.code === c) || null;
  },

  // --- 입장 세션 (강사 벽이 열려 있는 동안만 코드 유효) ---
  // fresh=true(보드 목록에서 열기): 항상 새 코드
  // fresh=false(벽 새로고침·하트비트): 아직 살아 있으면 기존 코드 유지하고 lastSeen만 갱신, 끊겼으면 새 코드
  openSession(boardId: string, { fresh }: { fresh: boolean }): Promise<string> {
    return withLock(() => {
      const db = read();
      const board = db.boards.find(b => b.id === boardId);
      if (!board) throw new Error('보드를 찾을 수 없어요');
      const now = Date.now();
      if (!fresh && isSessionActive(board.session, now)) {
        write(updateBoard(db, boardId, b => ({ ...b, session: { ...b.session!, lastSeen: now } })));
        return board.session!.code;
      }
      const code = makeSessionCode(db.boards, board.session?.code);
      write(updateBoard(db, boardId, b => ({ ...b, session: { code, openedAt: now, lastSeen: now } })));
      return code;
    });
  },
  closeSession(boardId: string): Promise<void> {
    return withLock(() => {
      const db = read();
      if (!db.boards.find(b => b.id === boardId)?.session) return;
      write(updateBoard(db, boardId, b => ({ ...b, session: null })));
    });
  },
  async countPostits(boardId: string): Promise<number> {
    return (read().postits[boardId] || []).length;
  },
};

// --- 실시간 구독 훅 (localStorage 변경 이벤트 + 다른 탭의 storage 이벤트) ---
function subscribe(cb: () => void) {
  window.addEventListener(CHANGE_EVENT, cb);
  window.addEventListener('storage', cb);
  return () => {
    window.removeEventListener(CHANGE_EVENT, cb);
    window.removeEventListener('storage', cb);
  };
}
function useDb(): Db {
  const raw = useSyncExternalStore(subscribe, readRaw);
  return useMemo(() => parse(raw), [raw]);
}

// 반환값: undefined = 불러오는 중, null = 없음 (Firestore 구현과 같은 규칙)
export function useBoards(): Board[] | undefined {
  return useDb().boards;
}
export function useBoard(id: string | undefined): Board | null | undefined {
  const db = useDb();
  return (id && db.boards.find(b => b.id === id)) || null;
}
// 열려 있는 방만 반환 — 강사가 나가거나 하트비트가 끊기면 null로 바뀐다
export function useBoardByCode(code: string | undefined): Board | null | undefined {
  const db = useDb();
  const now = useNow(10_000);
  return (code && db.boards.find(b => isSessionActive(b.session, now) && b.session!.code === code)) || null;
}

// 세션 만료(하트비트 끊김)를 반영하기 위해 주기적으로 다시 그리는 현재 시각
export function useNow(intervalMs: number): number {
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(t);
  }, [intervalMs]);
  return now;
}
export function usePostits(boardId: string | undefined): Postit[] | undefined {
  const db = useDb();
  return useMemo(() => (boardId && db.postits[boardId]) || [], [db, boardId]);
}
// 보드 목록·삭제 확인용 개수 (Firestore에서는 count 집계 쿼리로 1회 조회)
export function usePostitCount(boardId: string): number | null {
  const db = useDb();
  return (db.postits[boardId] || []).length;
}
