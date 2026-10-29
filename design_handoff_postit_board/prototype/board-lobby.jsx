// 강사 — 보드 선택 / 생성 / 수정 / 삭제
function Modal({ children, onClose }) {
  React.useEffect(() => {
    const k = e => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [onClose]);
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card" onClick={e => e.stopPropagation()}>{children}</div>
    </div>
  );
}

function BoardForm({ initial, onSave, onClose }) {
  const [title, setTitle] = React.useState(initial ? initial.title : '');
  const [subtitle, setSubtitle] = React.useState(initial ? initial.subtitle : '');
  const [instructor, setInstructor] = React.useState(initial ? initial.instructor : '');
  const valid = title.trim() && instructor.trim();
  function submit(e) {
    e.preventDefault();
    if (!valid) return;
    onSave({ title: title.trim(), subtitle: subtitle.trim(), instructor: instructor.trim() });
  }
  return (
    <Modal onClose={onClose}>
      <form onSubmit={submit} className="modal-form">
        <h2 className="modal-title">{initial ? '보드 정보 수정' : '새 보드 만들기'}</h2>
        <label className="field">
          <span>교육명</span>
          <input autoFocus value={title} onChange={e => setTitle(e.target.value)} placeholder="예: 객실승무원 안전·서비스 연수" maxLength={40} />
        </label>
        <label className="field">
          <span>기수 · 부제 <em>선택</em></span>
          <input value={subtitle} onChange={e => setSubtitle(e.target.value)} placeholder="예: 연수교육원 · 12기" maxLength={40} />
        </label>
        <label className="field">
          <span>강사 이름</span>
          <input value={instructor} onChange={e => setInstructor(e.target.value)} placeholder="예: 박지훈 사무장" maxLength={20} />
        </label>
        <div className="modal-actions">
          <button type="button" className="btn-ghost" onClick={onClose}>취소</button>
          <button type="submit" className="btn-primary" disabled={!valid}>{initial ? '저장' : '만들기'}</button>
        </div>
      </form>
    </Modal>
  );
}

function DeleteBoardConfirm({ board, onConfirm, onClose }) {
  const [typed, setTyped] = React.useState('');
  const ok = typed.trim().toUpperCase() === board.code;
  return (
    <Modal onClose={onClose}>
      <div className="modal-form">
        <div className="danger-icon">!</div>
        <h2 className="modal-title">보드를 삭제할까요?</h2>
        <p className="danger-text">
          <strong>{board.title}</strong> 보드와 포스트잇 <strong>{board.postits.length}개</strong>가
          DB에서 <strong>영구적으로 삭제</strong>됩니다. 이 작업은 되돌릴 수 없습니다.
        </p>
        <label className="field">
          <span>확인을 위해 보드 코드 <code className="board-code">{board.code}</code>를 입력하세요</span>
          <input autoFocus value={typed} onChange={e => setTyped(e.target.value)} placeholder={board.code} maxLength={6}
            onKeyDown={e => { if (e.key === 'Enter' && ok) onConfirm(); }} />
        </label>
        <div className="modal-actions">
          <button className="btn-ghost" onClick={onClose}>취소</button>
          <button className="btn-danger" disabled={!ok} onClick={onConfirm}>영구 삭제</button>
        </div>
      </div>
    </Modal>
  );
}

// 보드 진입 연출 — 활주로 가속 → 이륙 → 구름 통과 → 하늘(벽)
function Takeoff({ board, onArrive, onDone }) {
  React.useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { onArrive(); onDone(); return; }
    const t1 = setTimeout(onArrive, 1300);
    const t2 = setTimeout(onDone, 2000);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);
  return (
    <div className="takeoff" aria-hidden="true">
      <div className="takeoff-sky"></div>
      <div className="takeoff-runway"></div>
      <div className="takeoff-cloud c1"></div>
      <div className="takeoff-cloud c2"></div>
      <div className="takeoff-cloud c3"></div>
      <div className="takeoff-label">
        <div className="takeoff-kicker">TAKE OFF · {board.code}</div>
        <div className="takeoff-title">{board.title}</div>
      </div>
      <div className="takeoff-plane">
        <i className="takeoff-trail"></i>
        <svg viewBox="0 0 24 24" fill="currentColor"><path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z"></path></svg>
      </div>
    </div>
  );
}

function fmtDate(ts) {
  const d = new Date(ts);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
}

const IconEdit = () => (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"></path><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"></path></svg>);
const IconTrash = () => (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"></path><path d="M8 6V4h8v2"></path><path d="M19 6l-1 14H6L5 6"></path></svg>);

function BoardLobby({ boards, onOpen, onLogout }) {
  const [creating, setCreating] = React.useState(false);
  const [editing, setEditing] = React.useState(null);
  const [deleting, setDeleting] = React.useState(null);
  const sorted = [...boards].sort((a, b) => b.createdAt - a.createdAt);

  return (
    <div className="gate-stage">
      <div className="gate-clouds">
        <div className="cloud cloud-1"></div>
        <div className="cloud cloud-2"></div>
        <div className="cloud cloud-3"></div>
      </div>
      <div className="lobby-card">
        <div className="lobby-head">
          <div>
            <h1 className="gate-title">보드 선택</h1>
            <p className="lobby-sub">이어서 진행할 보드를 열거나 새 보드를 만드세요.</p>
          </div>
          <button className="btn-primary" onClick={() => setCreating(true)}>+ 새 보드</button>
        </div>

        {sorted.length > 0 ? (
          <ul className="board-list">
            {sorted.map(b => (
              <li key={b.id} className="board-row" onClick={() => onOpen(b)}>
                <div className="board-row-main">
                  <div className="board-row-title">{b.title}</div>
                  <div className="board-row-meta">{b.subtitle ? b.subtitle + ' · ' : ''}강사 {b.instructor}</div>
                </div>
                <div className="board-row-stats">
                  <code className="board-code">{b.code}</code>
                  <span>의견 {b.postits.length}</span>
                  <span>{fmtDate(b.createdAt)}</span>
                </div>
                <div className="board-row-actions" onClick={e => e.stopPropagation()}>
                  <button className="icon-btn" title="정보 수정" onClick={() => setEditing(b)}><IconEdit /></button>
                  <button className="icon-btn danger" title="보드 삭제" onClick={() => setDeleting(b)}><IconTrash /></button>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <div className="lobby-empty">
            <div className="lobby-empty-title">저장된 보드가 없어요</div>
            <div className="lobby-empty-sub">교육명과 강사 이름을 입력해 첫 보드를 만들어보세요.</div>
          </div>
        )}

        <div className="lobby-foot">
          <button className="gate-cancel" onClick={onLogout}>로그아웃</button>
        </div>
      </div>

      {creating && (
        <BoardForm onClose={() => setCreating(false)}
          onSave={v => { const b = BoardStore.create(v); setCreating(false); onOpen(b); }} />
      )}
      {editing && (
        <BoardForm initial={editing} onClose={() => setEditing(null)}
          onSave={v => { BoardStore.update(editing.id, v); setEditing(null); }} />
      )}
      {deleting && (
        <DeleteBoardConfirm board={deleting} onClose={() => setDeleting(null)}
          onConfirm={() => { BoardStore.remove(deleting.id); setDeleting(null); }} />
      )}
    </div>
  );
}

Object.assign(window, { BoardLobby, BoardForm, Modal, Takeoff });
