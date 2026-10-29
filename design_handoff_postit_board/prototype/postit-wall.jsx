// 강사 뷰 — 포스트잇 벽
function Postit({ p, onClick, onLike, layout, swayEnabled }) {
  const [liked, setLiked] = React.useState(false);
  const [bursts, setBursts] = React.useState([]);
  const color = (POSTIT_COLORS.find(c => c.id === p.color) || POSTIT_COLORS[0]).value;

  function handleLike(e) {
    e.stopPropagation();
    if (!liked) {
      setLiked(true);
      onLike(p.id);
      const id = Math.random();
      setBursts(b => [...b, { id, x: 0, y: 0 }]);
      setTimeout(() => setBursts(b => b.filter(x => x.id !== id)), 800);
    }
  }

  return (
    <div
      className={`postit entering ${swayEnabled ? 'swaying' : ''}`}
      style={{
        background: color,
        translate: `${layout.x}px ${layout.y}px`,
        rotate: `${layout.rot}deg`,
        '--sway-rot': `${layout.swayRotOffset.toFixed(2)}deg`,
        animationDelay: `0s, ${layout.swayDelay}s`,
        zIndex: 1,
      }}
      onClick={() => onClick(p)}
    >
      {p.photo && (
        <div className="polaroid" style={{ rotate: `${6 + (layout.swayRotOffset * 3)}deg` }}>
          <img src={p.photo} alt="" />
        </div>
      )}
      <span className="cat-tag" style={{
        background: categoryAccent(p.category) + '20',
        color: categoryAccent(p.category),
      }}>
        {categoryLabel(p.category)}
      </span>
      <div className="postit-body">{p.body}</div>
      <div className="postit-meta">
        <span className="postit-author">{p.anonymous ? '익명' : p.author}</span>
        <button
          className={`like-btn ${liked ? 'liked' : ''}`}
          onClick={handleLike}
          style={{ position: 'relative' }}
        >
          <span>{liked ? '♥' : '♡'}</span>
          <span>{p.likes}</span>
          {bursts.map(b => (
            <span key={b.id} className="like-burst" style={{ left: '50%', top: 0 }}>♥</span>
          ))}
        </button>
      </div>
    </div>
  );
}

function QRCode({ url }) {
  // 간단한 QR-like SVG (실제 QR 모듈을 그리진 않고 시각적 placeholder)
  // 결정적 패턴 생성
  const size = 21;
  const cells = React.useMemo(() => {
    const arr = [];
    function hash(x, y) {
      const v = Math.sin((x * 928371) + (y * 12731) + url.length) * 43758.5453;
      return (v - Math.floor(v));
    }
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        // 코너 finder pattern (3 corners)
        const isFinder = (x < 7 && y < 7) || (x >= size - 7 && y < 7) || (x < 7 && y >= size - 7);
        if (isFinder) {
          const lx = x < 7 ? x : (x - (size - 7));
          const ly = y < 7 ? y : (y - (size - 7));
          const inOuter = lx === 0 || lx === 6 || ly === 0 || ly === 6;
          const inInner = lx >= 2 && lx <= 4 && ly >= 2 && ly <= 4;
          arr.push({ x, y, on: inOuter || inInner });
        } else {
          arr.push({ x, y, on: hash(x, y) > 0.55 });
        }
      }
    }
    return arr;
  }, [url]);
  return (
    <svg viewBox={`0 0 ${size} ${size}`} className="qr-card-img" shapeRendering="crispEdges">
      <rect width={size} height={size} fill="white" />
      {cells.filter(c => c.on).map((c, i) => (
        <rect key={i} x={c.x} y={c.y} width={1} height={1} fill="#0e1a2b" />
      ))}
    </svg>
  );
}

function PostitWall({ board, swayEnabled, bgStyle, onLike, onEdit, onLeave, onLogout }) {
  const [filter, setFilter] = React.useState('all');
  const [selected, setSelected] = React.useState(null);
  const postitState = board.postits;

  const filtered = filter === 'all' ? postitState : postitState.filter(p => p.category === filter);
  const counts = CATEGORIES.reduce((acc, c) => {
    acc[c.id] = c.id === 'all' ? postitState.length : postitState.filter(p => p.category === c.id).length;
    return acc;
  }, {});

  const layouted = React.useMemo(() => generateLayout(filtered, {
    cols: Math.max(3, Math.floor((window.innerWidth - 80) / 240)),
    cellW: 240,
    cellH: 240,
    startX: 80,
    startY: 130,
    jitter: 22,
    rotJitter: 5,
  }), [filtered]);

  const handleLike = onLike;

  const wallHeight = Math.max(window.innerHeight, 130 + Math.ceil(filtered.length / Math.max(3, Math.floor((window.innerWidth - 80) / 240))) * 240 + 80);

  return (
    <div className={`sky-bg ${bgStyle}`} style={{ position: 'absolute', inset: 0 }}>
      <div className="cloud cloud-1"></div>
      <div className="cloud cloud-2"></div>
      <div className="cloud cloud-3"></div>
      <div className="contrail"></div>

      <div className="top-bar">
        <button className="brand brand-editable" onClick={onEdit} title="보드 정보 수정">
          <div className="brand-mark">✈</div>
          <div className="brand-text">
            <div className="brand-title">{board.title}</div>
            <div className="brand-sub">{board.subtitle ? board.subtitle + ' · ' : ''}강사 {board.instructor}</div>
          </div>
          <span className="brand-edit"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"></path><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"></path></svg></span>
        </button>
        <div className="top-stats">
          <div className="stat-chip">
            <span className="stat-dot"></span>
            참여 코드 <strong style={{ marginLeft: 4, letterSpacing: '0.08em' }}>{board.code}</strong>
          </div>
          <div className="stat-chip">
            ✎ <strong>{postitState.length}개</strong>의 의견
          </div>
          <button className="stat-chip logout-btn" onClick={onLeave} title="보드 목록으로">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"></rect><rect x="14" y="3" width="7" height="7" rx="1"></rect><rect x="3" y="14" width="7" height="7" rx="1"></rect><rect x="14" y="14" width="7" height="7" rx="1"></rect></svg>
            보드 목록
          </button>
          {onLogout && (
            <button className="stat-chip logout-btn" onClick={onLogout} title="강사 로그아웃">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><path d="M16 17l5-5-5-5"></path><path d="M21 12H9"></path></svg>
              로그아웃
            </button>
          )}
        </div>
      </div>

      <div style={{
        position: 'absolute',
        inset: 0,
        overflow: 'auto',
      }}>
        <div style={{ position: 'relative', width: '100%', height: wallHeight, paddingBottom: 100 }}>
          {layouted.map((p) => (
            <Postit
              key={p.id}
              p={p}
              layout={p}
              onClick={setSelected}
              onLike={handleLike}
              swayEnabled={swayEnabled}
            />
          ))}
        </div>
      </div>

      {postitState.length === 0 && (
        <div className="wall-empty">
          <div className="wall-empty-note">
            <div className="wall-empty-title">아직 붙은 의견이 없어요</div>
            <div className="wall-empty-sub">오른쪽 QR을 스캔해 첫 포스트잇을 남겨주세요</div>
          </div>
        </div>
      )}
      {postitState.length > 0 && filtered.length === 0 && (
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

      <div className="qr-card">
        <div className="qr-card-title">스마트폰으로 의견 남기기</div>
        <QRCode url={`https://learn.kal.co.kr/b/${board.code}`} />
        <div className="qr-card-url">learn.kal.co.kr/b/<strong>{board.code}</strong></div>
      </div>

      {selected && (
        <FocusView selected={selected} onClose={() => setSelected(null)} />
      )}
    </div>
  );
}

function FocusView({ selected, onClose }) {
  // mode: 'postit' = 글이 메인 / 'photo' = 사진이 메인
  const [mode, setMode] = React.useState('postit');
  const hasPhoto = !!selected.photo;
  const color = (POSTIT_COLORS.find(c => c.id === selected.color) || POSTIT_COLORS[0]).value;

  return (
    <div className="focus-backdrop" onClick={onClose}>
      <button className="focus-close" onClick={onClose} aria-label="닫기">×</button>
      <div className="focus-hint">
        {hasPhoto
          ? '우측 상단을 클릭해서 사진과 글을 전환해보세요 · 배경 클릭으로 닫기'
          : '배경 클릭으로 닫기'}
      </div>

      <div className="focus-stage" onClick={e => e.stopPropagation()}>
        {/* 포스트잇 슬롯 */}
        <div
          className={`swap-slot ${mode === 'postit' ? 'slot-main' : 'slot-thumb'}`}
          onClick={() => mode !== 'postit' ? setMode('postit') : null}
        >
          <div className="focus-postit" style={{ background: color }}>
            <div className="focus-header">
              <span className="cat-tag" style={{
                background: categoryAccent(selected.category) + '25',
                color: categoryAccent(selected.category),
              }}>
                {categoryLabel(selected.category)}
              </span>
            </div>
            <div className={`focus-body ${selected.body.length > 200 ? 'xlong' : (selected.body.length > 100 ? 'long' : '')}`}>{selected.body}</div>
            <div className="focus-footer">
              <div className="focus-likes">
                <span style={{ fontSize: 22 }}>♥</span>
                <span>{selected.likes}명이 공감했어요</span>
              </div>
              <div className="focus-meta">
                <span className="focus-author">{selected.anonymous ? '익명' : selected.author}</span>
                <span className="focus-time">· {timeAgo(selected.created)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* 사진 슬롯 (있는 경우에만) */}
        {hasPhoto && (
          <div
            className={`swap-slot ${mode === 'photo' ? 'slot-main' : 'slot-thumb'}`}
            onClick={() => mode !== 'photo' ? setMode('photo') : null}
            role="button"
            aria-label={mode === 'photo' ? '포스트잇 보기' : '사진 크게 보기'}
          >
            <div className="focus-photo">
              <img src={selected.photo} alt="" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

Object.assign(window, { FocusView: FocusView });
