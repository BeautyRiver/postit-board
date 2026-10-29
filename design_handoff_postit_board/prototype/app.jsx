// 메인 앱 — 해시 라우팅
// #host            → 강사 인증 → 보드 선택
// #host/<boardId>  → 포스트잇 벽
// #b/<code>        → 참여자 입력
// (없음)           → 참여자 코드 입력
const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "bgStyle": "sky",
  "swayEnabled": true
}/*EDITMODE-END*/;

function parseRoute() {
  const [a, b] = (window.location.hash || '').replace(/^#\/?/, '').split('/');
  if (a === 'host') return { name: 'host', boardId: b || null };
  if (a === 'b' && b) return { name: 'guest', code: b.toUpperCase() };
  return { name: 'guest', code: null };
}

function isHostAuthed() {
  try { return sessionStorage.getItem('hostAuthed') === '1'; } catch (e) { return false; }
}
function setHostAuthed(v) {
  try { v ? sessionStorage.setItem('hostAuthed', '1') : sessionStorage.removeItem('hostAuthed'); } catch (e) {}
}

function URLBar({ route, board, onNavigate, isHostMode }) {
  let path = '', btn;
  if (route.name === 'host') {
    path = board ? `/host/${board.code}` : '/host';
    btn = board ? ['참여자 화면 →', `b/${board.code}`] : ['참여자 URL로', ''];
  } else {
    path = route.code ? `/b/${route.code}` : '';
    btn = ['/host 진입 →', board ? `host/${board.id}` : 'host'];
  }
  return (
    <div className={`url-bar ${isHostMode ? 'host-mode' : ''}`}>
      <div className="url-bar-lock">{isHostMode ? '🔒' : '🌐'}</div>
      <span>learn.kal.co.kr</span>
      {path && <span className="url-route">{path}</span>}
      <button onClick={() => onNavigate(btn[1])}>{btn[0]}</button>
    </div>
  );
}

function App() {
  const boards = useBoards();
  const [route, setRoute] = React.useState(parseRoute());
  const [authed, setAuthed] = React.useState(isHostAuthed());
  const [editingBoard, setEditingBoard] = React.useState(false);
  const [takeoff, setTakeoff] = React.useState(null);
  const [tweaks, setTweak] = (window.useTweaks || ((d) => [d, () => {}]))(TWEAK_DEFAULTS);

  React.useEffect(() => {
    const onHash = () => setRoute(parseRoute());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  function navigate(h) { window.location.hash = h; }
  function logout() { setHostAuthed(false); setAuthed(false); navigate(''); }

  const hostBoard = route.name === 'host' && route.boardId ? boards.find(b => b.id === route.boardId) : null;
  const guestBoard = route.name === 'guest' && route.code ? boards.find(b => b.code === route.code) : null;

  // 삭제됐거나 없는 보드 → 보드 선택으로
  React.useEffect(() => {
    if (route.name === 'host' && route.boardId && !hostBoard) navigate('host');
  }, [route, hostBoard]);

  let screen;
  if (route.name === 'host' && !authed) {
    screen = <HostGate onSuccess={() => { setHostAuthed(true); setAuthed(true); }} onCancel={() => navigate('')} />;
  } else if (route.name === 'host' && !hostBoard) {
    screen = <BoardLobby boards={boards} onOpen={b => setTakeoff(b)} onLogout={logout} />;
  } else if (route.name === 'host') {
    screen = (
      <PostitWall
        board={hostBoard}
        swayEnabled={tweaks.swayEnabled}
        bgStyle={tweaks.bgStyle === 'sky' ? '' : tweaks.bgStyle}
        onLike={id => BoardStore.like(hostBoard.id, id)}
        onEdit={() => setEditingBoard(true)}
        onLeave={() => navigate('host')}
        onLogout={logout}
      />
    );
  } else {
    screen = (
      <GuestView
        board={guestBoard}
        code={route.code}
        onJoin={code => {
          const c = code.trim().toUpperCase();
          if (!boards.some(b => b.code === c)) return false;
          navigate(`b/${c}`);
          return true;
        }}
        onSubmit={item => guestBoard && BoardStore.addPostit(guestBoard.id, item)}
      />
    );
  }

  const TP = window.TweaksPanel, TS = window.TweakSection, TR = window.TweakRadio, TT = window.TweakToggle, TB = window.TweakButton;

  return (
    <React.Fragment>
      {screen}
      {takeoff && (
        <Takeoff board={takeoff} onArrive={() => navigate(`host/${takeoff.id}`)} onDone={() => setTakeoff(null)} />
      )}
      {editingBoard && hostBoard && (
        <BoardForm initial={hostBoard} onClose={() => setEditingBoard(false)}
          onSave={v => { BoardStore.update(hostBoard.id, v); setEditingBoard(false); }} />
      )}
      <URLBar route={route} board={hostBoard || guestBoard} onNavigate={navigate} isHostMode={route.name === 'host' && authed} />
      {TP && (
        <TP title="Tweaks">
          <TS title="배경 스타일">
            <TR value={tweaks.bgStyle} onChange={v => setTweak('bgStyle', v)}
              options={[
                { value: 'sky', label: '하늘' },
                { value: 'dusk', label: '노을' },
                { value: 'cork', label: '코르크' },
                { value: 'minimal', label: '미니멀' },
              ]} />
          </TS>
          <TS title="애니메이션">
            <TT label="포스트잇 살랑살랑 흔들림" value={tweaks.swayEnabled} onChange={v => setTweak('swayEnabled', v)} />
          </TS>
          {TB && (
            <TS title="데모">
              <TB onClick={() => BoardStore.create({
                title: '객실승무원 안전·서비스 연수',
                subtitle: '연수교육원 · 12기 수료식',
                instructor: '박지훈 사무장',
                postits: SEED_POSTITS,
              })}>샘플 보드 추가</TB>
            </TS>
          )}
        </TP>
      )}
    </React.Fragment>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
