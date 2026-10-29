// 게스트 모바일 입력 뷰
function GuestJoin({ code, onJoin }) {
  const [value, setValue] = React.useState(code || '');
  const [error, setError] = React.useState(!!code);
  function submit(e) {
    e.preventDefault();
    if (!onJoin(value)) setError(true);
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
        />
        {error && <div className="join-error">코드에 해당하는 보드를 찾을 수 없어요</div>}
      </div>
      <button type="submit" className="submit-btn" disabled={value.length !== 6} style={{ opacity: value.length === 6 ? 1 : 0.5 }}>
        입장하기
      </button>
    </form>
  );
}

function GuestForm({ board, onSubmit }) {
  const [body, setBody] = React.useState('');
  const [color, setColor] = React.useState('yellow');
  const [category, setCategory] = React.useState('question');
  const [anonymous, setAnonymous] = React.useState(false);
  const [name, setName] = React.useState('김민수');
  const [photo, setPhoto] = React.useState(null);
  const [sent, setSent] = React.useState(false);

  function handlePhoto() {
    // 토이 사진 첨부 — 샘플 사진 중 하나 선택
    setPhoto(SAMPLE_PHOTOS[Math.floor(Math.random() * SAMPLE_PHOTOS.length)]);
  }

  function handleSubmit() {
    if (!body.trim()) return;
    setSent(true);
    onSubmit({
      id: 'p' + Date.now(),
      body: body.trim(),
      author: anonymous ? '익명' : name,
      anonymous,
      color,
      category,
      likes: 0,
      answered: false,
      answer: null,
      photo,
      photoCaption: photo ? '연수원 ✈' : null,
      created: Date.now(),
    });
    setTimeout(() => {
      setSent(false);
      setBody('');
      setPhoto(null);
    }, 1800);
  }

  return (
    <div className="guest-form">
      <div className="guest-header">
        <h1 ref={el => { if (el) el.style.fontFamily = "'Pretendard', sans-serif"; }}>오늘 수업, 어떠셨나요?</h1>
        <p>{board.subtitle ? board.subtitle + ' · ' : ''}{board.title}</p>
      </div>

      <div className="guest-card">
        <label>카테고리</label>
        <div className="seg">
          {CATEGORIES.filter(c => c.id !== 'all').map(c => (
            <button
              key={c.id}
              className={category === c.id ? 'active' : ''}
              onClick={() => setCategory(c.id)}
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
            />
          ))}
        </div>
      </div>

      <div className="guest-card" style={{ background: (POSTIT_COLORS.find(c => c.id === color) || POSTIT_COLORS[0]).value }}>
        <label style={{ color: 'rgba(0,0,0,0.55)' }}>의견을 남겨주세요</label>
        <textarea
          className="guest-textarea"
          placeholder="자유롭게 적어주세요. 강사님이 직접 보고 답변드려요 ✈"
          value={body}
          onChange={e => setBody(e.target.value)}
          maxLength={200}
        />
        <div style={{ textAlign: 'right', fontSize: 11, color: 'rgba(0,0,0,0.45)', marginTop: 4 }}>
          {body.length}/200
        </div>
      </div>

      <div className="guest-card">
        <label>사진 첨부 (선택)</label>
        {photo ? (
          <div className="photo-preview">
            <img src={photo} alt="" />
            <button className="photo-remove" onClick={() => setPhoto(null)}>×</button>
          </div>
        ) : (
          <div className="photo-add" onClick={handlePhoto}>
            <div style={{ fontSize: 22, marginBottom: 4 }}>📷</div>
            사진을 첨부하면 폴라로이드처럼 보여요
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
          <div className={`switch ${anonymous ? 'on' : ''}`} onClick={() => setAnonymous(!anonymous)}></div>
        </div>
        {!anonymous && (
          <div style={{ marginTop: 12 }}>
            <input
              className="name-input"
              placeholder="이름 또는 닉네임"
              value={name}
              onChange={e => setName(e.target.value)}
            />
          </div>
        )}
      </div>

      <button className="submit-btn" onClick={handleSubmit} disabled={!body.trim()}
        style={{ opacity: body.trim() ? 1 : 0.5 }}>
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

function GuestView({ board, code, onJoin, onSubmit }) {
  const F = window.IOSFrame || window.IosFrame || (window.default);
  const content = board ? <GuestForm board={board} onSubmit={onSubmit} /> : <GuestJoin key={code || ''} code={code} onJoin={onJoin} />;
  return (
    <div className="mobile-stage">
      <div className="phone-wrapper-shell">
        {F ? (
          <F width={390} height={780} statusBarStyle="dark" homeIndicatorStyle="dark">
            {content}
          </F>
        ) : (
          <div style={{ width: 390, height: 780, background: '#fff', borderRadius: 40, overflow: 'hidden', position: 'relative', boxShadow: '0 30px 60px rgba(0,0,0,0.4)' }}>
            {content}
          </div>
        )}
      </div>
    </div>
  );
}

Object.assign(window, { GuestView, GuestForm });
