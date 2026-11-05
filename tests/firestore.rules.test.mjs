// Firestore 보안 규칙 테스트 — 에뮬레이터에서 실행
//   npm run test:rules   (Firebase CLI 필요: npm i -g firebase-tools, Java 11+)
import { after, before, beforeEach, describe, test } from 'node:test';
import { readFileSync } from 'node:fs';
import { assertFails, assertSucceeds, initializeTestEnvironment } from '@firebase/rules-unit-testing';
import {
  addDoc, collection, deleteDoc, doc, getCountFromServer, getDoc, getDocs, serverTimestamp, setDoc, Timestamp, updateDoc,
} from 'firebase/firestore';

let env;
const HOST = 'host-uid';
const OTHER_HOST = 'other-host-uid';
const NOT_ADMIN = 'not-admin-uid';

const hostDb = (uid = HOST) => env.authenticatedContext(uid, { firebase: { sign_in_provider: 'google.com' } }).firestore();
// 참여자는 로그인하지 않는다
const guestDb = () => env.unauthenticatedContext().firestore();

const secondsAgo = s => Timestamp.fromMillis(Date.now() - s * 1000);

async function seed({ session = { code: '1234', openedAt: secondsAgo(60), lastSeen: secondsAgo(10) } } = {}) {
  await env.withSecurityRulesDisabled(async ctx => {
    const db = ctx.firestore();
    await setDoc(doc(db, 'admins', HOST), { name: '강사' });
    await setDoc(doc(db, 'admins', OTHER_HOST), { name: '다른 강사' });
    await setDoc(doc(db, 'boards', 'b1'), {
      ownerUid: HOST, title: '수업', subtitle: '', instructor: '누나', session, createdAt: secondsAgo(3600),
    });
    if (session) await setDoc(doc(db, 'rooms', session.code), { boardId: 'b1', ownerUid: HOST, title: '수업', subtitle: '', openedAt: session.openedAt });
  });
}

const postit = (extra = {}) => ({
  body: '좋았어요', author: '익명', anonymous: true, color: 'yellow', category: 'praise',
  photoUrl: null, photoCaption: null, code: '1234', createdAt: serverTimestamp(), ...extra,
});

before(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-postit-rules',
    firestore: { rules: readFileSync(new URL('../firestore.rules', import.meta.url), 'utf8'), host: '127.0.0.1', port: 8080 },
  });
});
after(() => env.cleanup());
beforeEach(() => env.clearFirestore());

describe('참여자 (로그인 없음)', () => {
  test('열린 방 코드로 방·보드 단건 조회 가능', async () => {
    await seed();
    await assertSucceeds(getDoc(doc(guestDb(), 'rooms', '1234')));
    await assertSucceeds(getDoc(doc(guestDb(), 'boards', 'b1')));
  });
  test('방 목록·보드 목록·포스트잇 읽기 불가', async () => {
    await seed();
    await assertFails(getDocs(collection(guestDb(), 'rooms')));
    await assertFails(getDocs(collection(guestDb(), 'boards')));
    await assertFails(getDocs(collection(guestDb(), 'boards', 'b1', 'postits')));
  });
  test('강사 목록(admins)은 읽을 수 없음', async () => {
    await seed();
    await assertFails(getDoc(doc(guestDb(), 'admins', HOST)));
  });
  test('열린 방에 포스트잇 붙이기 가능', async () => {
    await seed();
    await assertSucceeds(addDoc(collection(guestDb(), 'boards', 'b1', 'postits'), postit()));
  });
  test('사진은 받지 않음 (사진 첨부 기능 제거)', async () => {
    await seed();
    await assertFails(addDoc(collection(guestDb(), 'boards', 'b1', 'postits'), postit({ photoUrl: 'data:image/jpeg;base64,AAAA' })));
  });
  test('틀린 코드·닫힌 방·하트비트 끊긴 방(5분 초과)에는 못 붙임', async () => {
    await seed();
    await assertFails(addDoc(collection(guestDb(), 'boards', 'b1', 'postits'), postit({ code: '9999' })));
    await env.clearFirestore();
    await seed({ session: null });
    await assertFails(addDoc(collection(guestDb(), 'boards', 'b1', 'postits'), postit()));
    await env.clearFirestore();
    await seed({ session: { code: '1234', openedAt: secondsAgo(900), lastSeen: secondsAgo(420) } });
    await assertFails(addDoc(collection(guestDb(), 'boards', 'b1', 'postits'), postit()));
  });
  test('형식 위반 포스트잇 불가 (201자, 빈 글, 이상한 색, 추가 필드, 시간 위조)', async () => {
    await seed();
    const col = collection(guestDb(), 'boards', 'b1', 'postits');
    await assertFails(addDoc(col, postit({ body: 'a'.repeat(201) })));
    await assertFails(addDoc(col, postit({ body: '' })));
    await assertFails(addDoc(col, postit({ authorUid: 'someone' })));
    await assertFails(addDoc(col, postit({ color: 'black' })));
    await assertFails(addDoc(col, postit({ likes: 99 })));
    await assertFails(addDoc(col, postit({ createdAt: secondsAgo(1000) })));
  });
  test('보드·방 수정·삭제 불가', async () => {
    await seed();
    await assertFails(updateDoc(doc(guestDb(), 'boards', 'b1'), { title: '해킹' }));
    await assertFails(deleteDoc(doc(guestDb(), 'rooms', '1234')));
    await assertFails(setDoc(doc(guestDb(), 'rooms', '5555'), { boardId: 'b1', ownerUid: 'someone', title: 'x', subtitle: '', openedAt: serverTimestamp() }));
  });
});

describe('강사', () => {
  test('admins에 없는 Google 계정은 보드 생성 불가, 자기 admins 문서 조회는 가능', async () => {
    await seed();
    await assertSucceeds(getDoc(doc(hostDb(NOT_ADMIN), 'admins', NOT_ADMIN)));
    await assertFails(addDoc(collection(hostDb(NOT_ADMIN), 'boards'), {
      ownerUid: NOT_ADMIN, title: 't', subtitle: '', instructor: 'i', session: null, createdAt: serverTimestamp(),
    }));
  });
  test('Google이 아닌 로그인(익명 등)은 admins에 있어도 강사 아님', async () => {
    await seed();
    const anonAsHost = env.authenticatedContext(HOST, { firebase: { sign_in_provider: 'anonymous' } }).firestore();
    await assertFails(getDocs(collection(anonAsHost, 'boards')));
  });
  test('보드 생성·수정·세션 열기·하트비트·닫기', async () => {
    await seed({ session: null });
    const db = hostDb();
    await assertSucceeds(addDoc(collection(db, 'boards'), {
      ownerUid: HOST, title: '새 보드', subtitle: '', instructor: '누나', session: null, createdAt: serverTimestamp(),
    }));
    await assertSucceeds(addDoc(collection(db, 'boards'), {
      ownerUid: HOST, title: '임시 보드', subtitle: '', instructor: '누나', session: null, saved: false, createdAt: serverTimestamp(),
    }));
    await assertSucceeds(updateDoc(doc(db, 'boards', 'b1'), { saved: true }));
    await assertFails(updateDoc(doc(db, 'boards', 'b1'), { saved: 'yes' }));
    await assertSucceeds(updateDoc(doc(db, 'boards', 'b1'), { title: '바뀐 제목' }));
    await assertSucceeds(updateDoc(doc(db, 'boards', 'b1'), { prompt: '오늘 가장 기억에 남는 내용은?', placeholder: '한 줄도 좋아요' }));
    await assertFails(updateDoc(doc(db, 'boards', 'b1'), { prompt: 'x'.repeat(41) }));
    await assertSucceeds(setDoc(doc(db, 'rooms', '4321'), { boardId: 'b1', ownerUid: HOST, title: '바뀐 제목', subtitle: '', prompt: '질문', placeholder: '', openedAt: serverTimestamp() }));
    await assertSucceeds(setDoc(doc(db, 'rooms', '4321'), { boardId: 'b1', ownerUid: HOST, title: '바뀐 제목', subtitle: '', openedAt: serverTimestamp() }));
    await assertSucceeds(updateDoc(doc(db, 'boards', 'b1'), { session: { code: '4321', openedAt: serverTimestamp(), lastSeen: serverTimestamp() } }));
    await assertSucceeds(updateDoc(doc(db, 'boards', 'b1'), { 'session.lastSeen': serverTimestamp() }));
    await assertSucceeds(deleteDoc(doc(db, 'rooms', '4321')));
    await assertSucceeds(updateDoc(doc(db, 'boards', 'b1'), { session: null }));
  });
  test('잘못된 세션 코드·제목 길이 불가', async () => {
    await seed({ session: null });
    const db = hostDb();
    await assertFails(updateDoc(doc(db, 'boards', 'b1'), { session: { code: 'ABCD', openedAt: serverTimestamp(), lastSeen: serverTimestamp() } }));
    await assertFails(updateDoc(doc(db, 'boards', 'b1'), { title: 'x'.repeat(41) }));
    await assertFails(setDoc(doc(db, 'rooms', '12345'), { boardId: 'b1', ownerUid: HOST, title: 't', subtitle: '', openedAt: serverTimestamp() }));
  });
  test('포스트잇 읽기·개수·삭제 가능 (삭제는 보드 주인만)', async () => {
    await seed();
    await addDoc(collection(guestDb(), 'boards', 'b1', 'postits'), postit());
    const db = hostDb();
    const snap = await assertSucceeds(getDocs(collection(db, 'boards', 'b1', 'postits')));
    await assertSucceeds(getCountFromServer(collection(db, 'boards', 'b1', 'postits')));
    const id = snap.docs[0].id;
    await assertFails(deleteDoc(doc(guestDb(), 'boards', 'b1', 'postits', id)));
    await assertFails(deleteDoc(doc(hostDb(OTHER_HOST), 'boards', 'b1', 'postits', id)));
    await assertSucceeds(deleteDoc(snap.docs[0].ref));
  });
  test('다른 강사의 보드는 수정·삭제 불가', async () => {
    await seed();
    await assertFails(updateDoc(doc(hostDb(OTHER_HOST), 'boards', 'b1'), { title: '남의 보드' }));
    await assertFails(deleteDoc(doc(hostDb(OTHER_HOST), 'boards', 'b1')));
  });
});
