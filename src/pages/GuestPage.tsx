import { useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router';
import { BoardStore, useBoardByCode } from '../lib/boardStore';
import { CATEGORIES, LIMITS, POSTIT_COLORS, colorValue } from '../lib/constants';
import { blobToDataUrl, resizeImage } from '../lib/image';
import type { Board, CategoryId, PostitColor } from '../lib/types';

const NAME_KEY = 'postit.guestName';

function readSavedName() {
  try { return localStorage.getItem(NAME_KEY) || ''; } catch { return ''; }
}
function saveName(name: string) {
  try { localStorage.setItem(NAME_KEY, name); } catch { /* 무시 */ }
}

// 참여자 — 코드 입력
function GuestJoin({ code, onJoin }: { code?: string; onJoin: (code: string) => Promise<boolean> }) {
  const [value, setValue] = useState(code || '');
  const [error, setError] = useState(!!code);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (value.length !== 6 || busy) return;
    setBusy(true);
    const ok = await onJoin(value);
    setBusy(false);
    if (!ok) setError(true);
  }

  return (
    <form className="guest-form" onSubmit={submit}>
      <div className="guest-header">
        <h1>보드 코드를 입력하세요</h1>
        <p>강사님 화면에 보이는 6자리 코드예요</p>
      </div>
      <div className="guest-card">
        <input
          className="name-input join-code-input"
          value={value}
          onChange={e => { setValue(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '')); setError(false); }}
          placeholder="ABC123"
          maxLength={6}
          autoFocus
          autoCapitalize="characters"
          autoComplete="off"
        />
        {error && <div className="join-error">코드에 해당하는 보드를 찾을 수 없어요</div>}
      </div>
      <button type="submit" className="submit-btn" disabled={value.length !== 6 || busy} style={{ opacity: value.length === 6 ? 1 : 0.5 }}>
        입장하기
      </button>
    </form>
  );
}

// 참여자 — 의견 작성
function GuestForm({ board }: { board: Board }) {
  const [body, setBody] = useState('');
  const [color, setColor] = useState<PostitColor>('yellow');
  const [category, setCategory] = useState<CategoryId>('question');
  const [anonymous, setAnonymous] = useState(false);
  const [name, setName] = useState(readSavedName);
  const [photo, setPhoto] = useState<string | null>(null);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const sendingRef = useRef(false);  // 연타 시 같은 의견이 두 번 붙지 않도록 (state는 다음 렌더까지 반영이 늦음)

  async function handlePhoto(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setPhotoBusy(true);
    setError(null);
    try {
      // 1단계: 리사이즈 후 data URL로 보관. 3단계에서 Storage 업로드로 교체
      setPhoto(await blobToDataUrl(await resizeImage(file)));
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
      await BoardStore.addPostit(board.id, {
        body: body.trim().slice(0, LIMITS.body),
        author: isAnon ? '익명' : author,
        anonymous: isAnon,
        color,
        category,
        photoUrl: photo,
        photoCaption: null,
      });
      if (author) saveName(author);
      setSent(true);
      setTimeout(() => {
        setSent(false);
        setBody('');
        setPhoto(null);
      }, 1800);
    } catch (err) {
      setError(err instanceof Error ? err.message : '보내지 못했어요. 다시 시도해 주세요.');
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
        <p>{board.subtitle ? board.subtitle + ' · ' : ''}{board.title}</p>
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
// 보드가 없거나(삭제 포함) 코드가 틀리면 코드 입력 화면을 보여준다
export function GuestPage() {
  const { code } = useParams();
  const board = useBoardByCode(code);
  const navigate = useNavigate();

  async function onJoin(input: string) {
    const c = input.trim().toUpperCase();
    const found = await BoardStore.findByCode(c);
    if (!found) return false;
    navigate(`/b/${c}`);
    return true;
  }

  let content = null;
  if (board) content = <GuestForm key={board.id} board={board} />;
  else if (board === null) content = <GuestJoin key={code || ''} code={code?.toUpperCase()} onJoin={onJoin} />;

  return (
    <div className="guest-shell">
      <div className="guest-column">{content}</div>
    </div>
  );
}
