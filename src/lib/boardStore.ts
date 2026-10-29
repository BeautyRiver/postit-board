// 보드 저장소 — 1단계는 localStorage 구현. 2단계에서 Firestore로 교체 (같은 API 유지)
// 비동기 API로 만들어 두어 Firestore로 바꿔도 호출부가 그대로 동작하게 한다.
import { useMemo, useSyncExternalStore } from 'react';
import { CODE_CHARS } from './constants';
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
    if (db && Array.isArray(db.boards)) return { boards: db.boards, postits: db.postits || {} };
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
function makeCode(existing: Board[]) {
  let c: string;
  do { c = Array.from({ length: 6 }, () => CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]).join(''); }
  while (existing.some(b => b.code === c));
  return c;
}

export const BoardStore = {
  async list(): Promise<Board[]> {
    return read().boards;
  },
  create({ title, subtitle = '', instructor }: BoardInput): Promise<Board> {
    return withLock(() => {
      const db = read();
      const board: Board = { id: makeId('b'), code: makeCode(db.boards), title, subtitle, instructor, createdAt: Date.now() };
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
  addPostit(boardId: string, item: PostitInput): Promise<void> {
    return withLock(() => {
      const db = read();
      if (!db.boards.some(b => b.id === boardId)) throw new Error('보드를 찾을 수 없어요');
      const postit: Postit = { ...item, id: makeId('p'), createdAt: Date.now() };
      write({ ...db, postits: { ...db.postits, [boardId]: [...(db.postits[boardId] || []), postit] } });
    });
  },
  async findByCode(code: string): Promise<Board | null> {
    return read().boards.find(b => b.code === code.trim().toUpperCase()) || null;
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
export function useBoardByCode(code: string | undefined): Board | null | undefined {
  const db = useDb();
  return (code && db.boards.find(b => b.code === code.toUpperCase())) || null;
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
