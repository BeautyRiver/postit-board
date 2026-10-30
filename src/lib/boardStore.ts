// 보드 저장소 — Firestore 구현 (1단계 localStorage 구현과 같은 API)
//
// 데이터 구조 (읽기 횟수 절약이 핵심):
//   boards/{boardId}                 보드 정보 + session{code, openedAt, lastSeen}. 하트비트(30초)는 여기에만 기록 → 강사 화면만 구독
//   boards/{boardId}/postits/{id}    포스트잇. 강사 벽만 구독
//   rooms/{code}                     열린 방 (4자리 코드 → 보드). 열 때 만들고 닫을 때 지움. 하트비트로 바뀌지 않음 → 참여자는 이 문서만 구독
//   admins/{uid}                     강사 계정 목록 (콘솔에서 직접 등록)
//
// 참여자 1명이 쓰는 읽기: 입장 확인 2회 + 방 구독 1회 + 닫힘 알림 1회 + 제출 시 규칙 확인 1회 정도
import {
  addDoc, collection, deleteDoc, doc, getCountFromServer, getDoc, getDocs, onSnapshot, orderBy, query,
  runTransaction, serverTimestamp, updateDoc, where, writeBatch,
  type DocumentData, type DocumentSnapshot, type Timestamp,
} from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { useAuth } from './auth';
import { CODE_LENGTH, isSessionActive } from './constants';
import { auth, db } from './firebase';
import type { Board, BoardInput, BoardSession, Postit, PostitInput, RoomInfo } from './types';

const boardsCol = collection(db, 'boards');
const boardRef = (id: string) => doc(db, 'boards', id);
const roomRef = (code: string) => doc(db, 'rooms', code);
const postitsCol = (boardId: string) => collection(db, 'boards', boardId, 'postits');

// 열린 방이 닫혔거나 코드가 바뀌어 포스트잇을 붙일 수 없을 때
export class RoomClosedError extends Error {
  constructor() { super('강사님이 방을 닫았어요. 새 코드를 확인해 주세요.'); }
}

// --- Firestore 문서 → 앱 타입 변환 (serverTimestamp 대기 중이면 추정값 사용) ---
function ms(t: unknown): number {
  return t && typeof (t as Timestamp).toMillis === 'function' ? (t as Timestamp).toMillis() : Date.now();
}
function toSession(s: DocumentData | null | undefined): BoardSession | null {
  if (!s || typeof s.code !== 'string') return null;
  return { code: s.code, openedAt: ms(s.openedAt), lastSeen: ms(s.lastSeen) };
}
function toBoard(snap: DocumentSnapshot): Board {
  const d = snap.data({ serverTimestamps: 'estimate' })!;
  return {
    id: snap.id,
    ownerUid: d.ownerUid,
    session: toSession(d.session),
    saved: d.saved !== false,   // 저장 기능 이전에 만든 보드(필드 없음)는 저장된 것으로 본다
    title: d.title,
    subtitle: d.subtitle || '',
    instructor: d.instructor,
    createdAt: ms(d.createdAt),
  };
}
function toPostit(snap: DocumentSnapshot): Postit {
  const d = snap.data({ serverTimestamps: 'estimate' })!;
  return {
    id: snap.id,
    body: d.body,
    author: d.author,
    anonymous: !!d.anonymous,
    color: d.color,
    category: d.category,
    photoUrl: d.photoUrl ?? null,
    photoCaption: d.photoCaption ?? null,
    createdAt: ms(d.createdAt),
  };
}

function randomCode() {
  return String(Math.floor(Math.random() * 10 ** CODE_LENGTH)).padStart(CODE_LENGTH, '0');
}

function currentUid(): string {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error('로그인이 필요해요');
  return uid;
}

// 코드로 열린 방 찾기: 방 문서가 있고, 그 보드의 세션이 같은 코드로 살아 있어야 함
async function lookupRoom(code: string): Promise<RoomInfo | null> {
  const room = await getDoc(roomRef(code));
  if (!room.exists()) return null;
  const r = room.data();
  const board = await getDoc(boardRef(r.boardId));
  if (!board.exists()) return null;
  const s = toSession(board.data().session);
  if (!s || s.code !== code || !isSessionActive(s)) return null;
  return { code, boardId: r.boardId, title: r.title, subtitle: r.subtitle || '' };
}

export const BoardStore = {
  // 내 보드 목록 (1회 조회)
  async list(): Promise<Board[]> {
    const snap = await getDocs(query(boardsCol, where('ownerUid', '==', currentUid())));
    return snap.docs.map(toBoard);
  },

  async create({ title, subtitle = '', instructor }: BoardInput): Promise<Board> {
    const ownerUid = currentUid();
    const ref = await addDoc(boardsCol, { ownerUid, title, subtitle, instructor, session: null, saved: false, createdAt: serverTimestamp() });
    return { id: ref.id, ownerUid, title, subtitle, instructor, session: null, saved: false, createdAt: Date.now() };
  },

  // 보드 저장 — 저장한 보드만 보드 목록에 계속 남는다
  async save(id: string): Promise<void> {
    await updateDoc(boardRef(id), { saved: true });
  },

  // 보드 정보 수정. 방이 열려 있으면 참여자 화면 제목도 함께 바꾼다
  update(id: string, patch: Partial<BoardInput>): Promise<void> {
    return runTransaction(db, async tx => {
      const b = await tx.get(boardRef(id));
      if (!b.exists()) throw new Error('보드를 찾을 수 없어요');
      const code = toSession(b.data().session)?.code;
      const room = code ? await tx.get(roomRef(code)) : null;
      tx.update(boardRef(id), patch);
      if (room?.exists() && room.data().boardId === id) {
        const roomPatch: Record<string, string> = {};
        if (patch.title !== undefined) roomPatch.title = patch.title;
        if (patch.subtitle !== undefined) roomPatch.subtitle = patch.subtitle;
        if (Object.keys(roomPatch).length) tx.update(room.ref, roomPatch);
      }
    });
  },

  // 보드와 그 보드의 포스트잇(사진 포함)·열린 방을 모두 삭제
  async remove(id: string): Promise<void> {
    await BoardStore.closeSession(id);
    const postits = await getDocs(postitsCol(id));
    for (let i = 0; i < postits.docs.length; i += 450) {
      const batch = writeBatch(db);
      postits.docs.slice(i, i + 450).forEach(d => batch.delete(d.ref));
      await batch.commit();
    }
    await deleteDoc(boardRef(id));
  },

  // 열린 방의 현재 코드로만 붙일 수 있다 (보안 규칙이 강제 — 닫혔으면 permission-denied)
  async addPostit(boardId: string, code: string, item: PostitInput): Promise<void> {
    try {
      await addDoc(postitsCol(boardId), { ...item, code, authorUid: currentUid(), createdAt: serverTimestamp() });
    } catch (err) {
      if ((err as { code?: string }).code === 'permission-denied') throw new RoomClosedError();
      throw err;
    }
  },

  findByCode(code: string): Promise<RoomInfo | null> {
    return lookupRoom(code.trim());
  },

  async countPostits(boardId: string): Promise<number> {
    return (await getCountFromServer(postitsCol(boardId))).data().count;
  },

  // --- 입장 세션 ---
  // fresh=true(보드 목록에서 열기): 항상 새 코드
  // fresh=false(벽 새로고침 등): 아직 살아 있으면 기존 코드 유지, 끊겼으면 새 코드
  openSession(boardId: string, { fresh }: { fresh: boolean }): Promise<string> {
    const ownerUid = currentUid();
    return runTransaction(db, async tx => {
      // 트랜잭션은 읽기를 모두 끝낸 뒤 쓰기
      const b = await tx.get(boardRef(boardId));
      if (!b.exists()) throw new Error('보드를 찾을 수 없어요');
      const board = b.data();
      const prev = toSession(board.session);
      if (!fresh && prev && isSessionActive(prev)) {
        tx.update(boardRef(boardId), { 'session.lastSeen': serverTimestamp() });
        return prev.code;
      }

      // 새 코드: 직전 코드가 아니고, 다른 방이 쓰고 있지 않은(또는 그 방이 이미 끊긴) 코드
      let code: string | null = null;
      for (let i = 0; i < 12 && !code; i++) {
        const c = randomCode();
        if (c === prev?.code) continue;
        const r = await tx.get(roomRef(c));
        if (!r.exists()) { code = c; break; }
        const otherId = r.data().boardId;
        if (otherId === boardId) { code = c; break; }
        const other = await tx.get(boardRef(otherId));
        const os = other.exists() ? toSession(other.data().session) : null;
        if (!os || os.code !== c || !isSessionActive(os)) code = c;
      }
      if (!code) throw new Error('입장 코드를 만들지 못했어요. 다시 시도해 주세요.');
      const prevRoom = prev ? await tx.get(roomRef(prev.code)) : null;

      if (prevRoom?.exists() && prevRoom.data().boardId === boardId) tx.delete(prevRoom.ref);
      tx.set(roomRef(code), { boardId, ownerUid, title: board.title, subtitle: board.subtitle || '', openedAt: serverTimestamp() });
      tx.update(boardRef(boardId), { session: { code, openedAt: serverTimestamp(), lastSeen: serverTimestamp() } });
      return code;
    });
  },

  // 벽이 살아 있음을 알림 (쓰기 1회). 참여자는 boards 문서를 구독하지 않으므로 읽기가 늘지 않는다
  async heartbeat(boardId: string): Promise<void> {
    await updateDoc(boardRef(boardId), { 'session.lastSeen': serverTimestamp() });
  },

  // 방 닫기: rooms 문서 삭제 → 구독 중인 참여자에게 즉시 '닫힘' 전달
  closeSession(boardId: string): Promise<void> {
    return runTransaction(db, async tx => {
      const b = await tx.get(boardRef(boardId));
      if (!b.exists()) return;
      const code = toSession(b.data().session)?.code;
      const room = code ? await tx.get(roomRef(code)) : null;
      if (room?.exists() && room.data().boardId === boardId) tx.delete(room.ref);
      tx.update(boardRef(boardId), { session: null });
    });
  },
};

// --- 실시간 구독 훅 ---
// 반환값: undefined = 불러오는 중, null = 없음

// 강사: 내 보드 목록 (실시간)
export function useBoards(): Board[] | undefined {
  const { host } = useAuth();
  const uid = host?.uid;
  const [boards, setBoards] = useState<{ uid: string; list: Board[] } | null>(null);
  useEffect(() => {
    if (!uid) return;
    return onSnapshot(query(boardsCol, where('ownerUid', '==', uid)), snap => {
      setBoards({ uid, list: snap.docs.map(toBoard) });
    });
  }, [uid]);
  return boards && boards.uid === uid ? boards.list : undefined;
}

// 강사: 보드 하나 (벽 화면, 실시간 — 하트비트 반영)
export function useBoard(id: string | undefined): Board | null | undefined {
  const [state, setState] = useState<{ id: string; board: Board | null } | null>(null);
  useEffect(() => {
    if (!id) return;
    return onSnapshot(boardRef(id), snap => setState({ id, board: snap.exists() ? toBoard(snap) : null }),
      () => setState({ id, board: null }));
  }, [id]);
  if (!id) return null;
  return state && state.id === id ? state.board : undefined;
}

// 참여자: 코드로 열린 방 구독. 강사가 방을 닫으면(rooms 문서 삭제) 즉시 null
// enabled=false 이면 (익명 로그인 전) 대기
export function useRoom(code: string | undefined, enabled = true): RoomInfo | null | undefined {
  const [state, setState] = useState<{ code: string; room: RoomInfo | null } | null>(null);
  useEffect(() => {
    if (!code || !enabled) return;
    let checked = false;
    return onSnapshot(roomRef(code), async snap => {
      if (!snap.exists()) { setState({ code, room: null }); return; }
      const r = snap.data();
      if (!checked) {
        // 처음 한 번만 보드의 하트비트로 살아 있는지 확인 (탭을 그냥 닫아 rooms 문서가 남은 경우 대비)
        checked = true;
        const live = await lookupRoom(code).catch(() => null);
        setState({ code, room: live });
        return;
      }
      setState(s => ({ code, room: s?.room ? { ...s.room, title: r.title, subtitle: r.subtitle || '' } : null }));
    }, () => setState({ code, room: null }));
  }, [code, enabled]);
  if (!code) return null;
  return state && state.code === code ? state.room : undefined;
}

// 강사 벽: 포스트잇 실시간 (작성 순)
export function usePostits(boardId: string | undefined): Postit[] | undefined {
  const [state, setState] = useState<{ id: string; list: Postit[] } | null>(null);
  useEffect(() => {
    if (!boardId) return;
    return onSnapshot(query(postitsCol(boardId), orderBy('createdAt')), snap => {
      setState({ id: boardId, list: snap.docs.map(toPostit) });
    });
  }, [boardId]);
  return state && state.id === boardId ? state.list : undefined;
}

// 보드 목록·삭제 확인용 개수 — count 집계 쿼리 1회 (포스트잇 1000개당 읽기 1회)
export function usePostitCount(boardId: string): number | null {
  const [state, setState] = useState<{ id: string; count: number } | null>(null);
  useEffect(() => {
    let alive = true;
    BoardStore.countPostits(boardId).then(count => { if (alive) setState({ id: boardId, count }); }).catch(() => {});
    return () => { alive = false; };
  }, [boardId]);
  return state && state.id === boardId ? state.count : null;
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
