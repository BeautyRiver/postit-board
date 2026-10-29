import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router';
import { ensureGuestUser, useGuestAuth } from '../lib/auth';
import { BoardStore, RoomClosedError, useRoom } from '../lib/boardStore';
import { CATEGORIES, CODE_LENGTH, LIMITS, POSTIT_COLORS, colorValue } from '../lib/constants';
import { photoToDataUrl } from '../lib/image';
import type { CategoryId, PostitColor, RoomInfo } from '../lib/types';

const NAME_KEY = 'postit.guestName';
const DRAFT_KEY = 'postit.guestDraft';

type JoinNotice = 'inactive' | 'closed' | null;
const NOTICE_TEXT: Record<Exclude<JoinNotice, null>, string> = {
  inactive: '활성화된 방이 아니에요. 강사님 화면의 4자리 코드를 확인해 주세요.',
  closed: '강사님이 방을 닫았어요. 새 코드가 나오면 다시 입력해 주세요.',
};

// 작성 중인 글 임시 보관 — 방이 닫혀 코드 입력 화면으로 돌아가도 다시 들어오면 이어 쓸 수 있게
interface Draft { body: string; color: PostitColor; category: CategoryId; anonymous: boolean }
function readDraft(): Partial<Draft> {
  try { return JSON.parse(sessionStorage.getItem(DRAFT_KEY) || '{}'); } catch { return {}; }
}
function saveDraft(d: Draft | null) {
  try {
    if (d) sessionStorage.setItem(DRAFT_KEY, JSON.stringify(d));
    else sessionStorage.removeItem(DRAFT_KEY);
  } catch { /* 무시 */ }
}

function readSavedName() {
  try { return localStorage.getItem(NAME_KEY) || ''; } catch { return ''; }
}
function saveName(name: string) {
  try { localStorage.setItem(NAME_KEY, name); } catch { /* 무시 */ }
}

// 참여자 — 코드 입력 (4자리 숫자, 강사 벽이 열려 있는 방만 입장 가능)
function GuestJoin({ code, notice, onJoin }: {
  code?: string;
  notice: JoinNotice;
  onJoin: (code: string) => Promise<boolean>;
}) {
  const [value, setValue] = useState(code || '');
  const [error, setError] = useState<JoinNotice>(notice);
  const [busy, setBusy] = useState(false);
  const complete = value.length === CODE_LENGTH;

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!complete || busy) return;
    setBusy(true);
    const ok = await onJoin(value);
    setBusy(false);
    if (!ok) setError('inactive');
  }

  return (
    <form className="guest-form" onSubmit={submit}>
      <div className="guest-header">
        <h1>입장 코드를 입력하세요</h1>
        <p>강사님 화면에 보이는 4자리 숫자예요</p>
      </div>
      <div className="guest-card">
        <input
          className="name-input join-code-input"
          value={value}
          onChange={e => { setValue(e.target.value.replace(/\D/g, '').slice(0, CODE_LENGTH)); setError(null); }}
          placeholder="0000"
          maxLength={CODE_LENGTH}
          inputMode="numeric"
          pattern="[0-9]*"
          autoFocus
          autoComplete="off"
        />
        {error && <div className="join-error">{NOTICE_TEXT[error]}</div>}
      </div>
      <button type="submit" className="submit-btn" disabled={!complete || busy} style={{ opacity: complete ? 1 : 0.5 }}>
        입장하기
      </button>
    </form>
  );
}

// 참여자 — 의견 작성
function GuestForm({ room, onClosed }: { room: RoomInfo; onClosed: () => void }) {
  const [draft] = useState(readDraft);
  const [body, setBody] = useState(draft.body ?? '');
  const [color, setColor] = useState<PostitColor>(draft.color ?? 'yellow');
  const [category, setCategory] = useState<CategoryId>(draft.category ?? 'question');
  const [anonymous, setAnonymous] = useState(draft.anonymous ?? false);
  const [name, setName] = useState(readSavedName);
  const [photo, setPhoto] = useState<string | null>(null);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const sendingRef = useRef(false);  // 연타 시 같은 의견이 두 번 붙지 않도록 (state는 다음 렌더까지 반영이 늦음)

  useEffect(() => {
    saveDraft(body ? { body, color, category, anonymous } : null);
  }, [body, color, category, anonymous]);

  async function handlePhoto(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setPhotoBusy(true);
    setError(null);
    try {
      // Storage 없이 포스트잇 문서에 함께 저장 → 긴 변 1000px, 용량 상한까지 줄인 JPEG data URL
      setPhoto(await photoToDataUrl(file));
    } catch {
      setError('사진을 불러오지 못했어요. 다른 사진을 선택해 주세요.');
    } finally {
      setPhotoBusy(false);
    }
  }

  async function handleSubmit() {
    if (!body.trim() || sendingRef.current) return;
    sendingRef.current = true;
    const author = name.trim();
    const isAnon = anonymous || !author;
    setSending(true);
    setError(null);
    try {
      await BoardStore.addPostit(room.boardId, room.code, {
        body: body.trim().slice(0, LIMITS.body),
        author: isAnon ? '익명' : author,
        anonymous: isAnon,
        color,
        category,
        photoUrl: photo,
        photoCaption: null,
      });
      if (author) saveName(author);
      saveDraft(null);
      setSent(true);
      setTimeout(() => {
        setSent(false);
        setBody('');
        setPhoto(null);
      }, 1800);
    } catch (err) {
      if (err instanceof RoomClosedError) { onClosed(); return; }  // 쓰던 글은 draft로 보관됨
      setError('보내지 못했어요. 인터넷 연결을 확인하고 다시 시도해 주세요.');
    } finally {
      sendingRef.current = false;
      setSending(false);
    }
  }

  const canSubmit = !!body.trim() && !sending && !photoBusy;

  return (
    <div className="guest-form">
      <div className="guest-header">
        <h1>오늘 수업, 어떠셨나요?</h1>
        <p>{room.subtitle ? room.subtitle + ' · ' : ''}{room.title}</p>
      </div>

      <div className="guest-card">
        <label>카테고리</label>
        <div className="seg">
          {CATEGORIES.filter(c => c.id !== 'all').map(c => (
            <button
              key={c.id}
              className={category === c.id ? 'active' : ''}
              onClick={() => setCategory(c.id as CategoryId)}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      <div className="guest-card">
        <label>포스트잇 색상</label>
        <div className="color-picker">
          {POSTIT_COLORS.map(c => (
            <div
              key={c.id}
              className={`color-swatch ${color === c.id ? 'selected' : ''}`}
              style={{ background: c.value }}
              onClick={() => setColor(c.id)}
              role="button"
              aria-label={c.label}
            />
          ))}
        </div>
      </div>

      <div className="guest-card" style={{ background: colorValue(color) }}>
        <label style={{ color: 'rgba(0,0,0,0.55)' }}>의견을 남겨주세요</label>
        <textarea
          className="guest-textarea"
          placeholder="자유롭게 적어주세요. 강사님이 직접 보고 답변드려요 ✈"
          value={body}
          onChange={e => setBody(e.target.value)}
          maxLength={LIMITS.body}
        />
        <div style={{ textAlign: 'right', fontSize: 11, color: 'rgba(0,0,0,0.45)', marginTop: 4 }}>
          {body.length}/{LIMITS.body}
        </div>
      </div>

      <div className="guest-card">
        <label>사진 첨부 (선택)</label>
        <input ref={fileRef} type="file" accept="image/*" className="visually-hidden" onChange={handlePhoto} />
        {photo ? (
          <div className="photo-preview">
            <img src={photo} alt="" />
            <button className="photo-remove" onClick={() => setPhoto(null)}>×</button>
          </div>
        ) : (
          <div className="photo-add" onClick={() => !photoBusy && fileRef.current?.click()}>
            <div style={{ fontSize: 22, marginBottom: 4 }}>📷</div>
            {photoBusy ? '사진을 준비하고 있어요…' : '사진을 첨부하면 폴라로이드처럼 보여요'}
          </div>
        )}
      </div>

      <div className="guest-card">
        <div className="toggle-row">
          <div>
            <label style={{ marginBottom: 2 }}>익명으로 남기기</label>
            <div style={{ fontSize: 11, color: 'var(--ink-soft)' }}>
              {anonymous ? '이름이 표시되지 않습니다' : '이름이 함께 보입니다'}
            </div>
          </div>
          <div className={`switch ${anonymous ? 'on' : ''}`} onClick={() => setAnonymous(!anonymous)} role="switch" aria-checked={anonymous}></div>
        </div>
        {!anonymous && (
          <div style={{ marginTop: 12 }}>
            <input
              className="name-input"
              placeholder="이름 또는 닉네임"
              value={name}
              onChange={e => setName(e.target.value)}
              maxLength={20}
            />
          </div>
        )}
      </div>

      {error && <div className="join-error submit-error">{error}</div>}

      <button className="submit-btn" onClick={handleSubmit} disabled={!canSubmit}
        style={{ opacity: canSubmit ? 1 : 0.5 }}>
        벽에 붙이기 ✎
      </button>

      {sent && (
        <div className="sent-toast">
          <div style={{ textAlign: 'center' }}>
            <div className="check">✓</div>
            <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 6 }}>벽에 붙였어요!</div>
            <div style={{ fontSize: 13, color: 'var(--ink-soft)' }}>강사님 화면에 도착했습니다 ✈</div>
          </div>
        </div>
      )}
    </div>
  );
}

// 참여자 화면 (/ , /b/:code)
// QR → 첫 화면에서 4자리 코드 입력 → 열린 방이면 /b/:code 의견 작성.
// 코드가 틀렸거나 방이 닫혀 있으면(강사가 나감·탭 닫음) 입장 불가, 작성 중 방이 닫히면 코드 입력 화면으로
export function GuestPage() {
  const { code } = useParams();
  const { ready, error } = useGuestAuth();   // 익명 로그인 (보안 규칙상 로그인한 사용자만 읽기·쓰기)
  const room = useRoom(code, ready);
  const navigate = useNavigate();
  // 이 코드로 입장했던 적이 있는지 (→ 지금 null이면 '방이 닫힘' 안내)
  const [joinedCode, setJoinedCode] = useState<string | null>(null);
  // 제출하다가 방이 닫힌 것을 알게 된 코드 (탭을 그냥 닫아 rooms 문서가 남아 있는 경우)
  const [closedCode, setClosedCode] = useState<string | null>(null);
  if (room && code && joinedCode !== code) setJoinedCode(code);

  async function onJoin(input: string) {
    const c = input.trim();
    const found = await ensureGuestUser().then(() => BoardStore.findByCode(c)).catch(() => null);
    if (!found) return false;
    setClosedCode(null);
    navigate(`/b/${c}`);
    return true;
  }

  let content = null;
  if (error) {
    content = <div className="guest-form"><div className="guest-header"><h1>연결 오류</h1><p>{error}</p></div></div>;
  } else if (room && code && closedCode !== code) {
    content = <GuestForm key={room.boardId + code} room={room} onClosed={() => setClosedCode(code)} />;
  } else if (room === null || (room && closedCode === code)) {
    const notice: JoinNotice = code ? (joinedCode === code ? 'closed' : 'inactive') : null;
    content = <GuestJoin key={(code || '') + notice} code={notice === 'closed' ? '' : code} notice={notice} onJoin={onJoin} />;
  }

  return (
    <div className="guest-shell">
      <div className="guest-column">{content}</div>
    </div>
  );
}
