// 보드 저장소 — 지금은 localStorage, 이후 Firestore로 교체 (같은 API 유지)
const BOARD_STORE_KEY = 'postit.boards.v1';
const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function readBoards() {
  try { return JSON.parse(localStorage.getItem(BOARD_STORE_KEY)) || []; } catch (e) { return []; }
}
function writeBoards(list) {
  try { localStorage.setItem(BOARD_STORE_KEY, JSON.stringify(list)); } catch (e) {}
  window.dispatchEvent(new Event('boards-change'));
}
function makeCode(existing) {
  let c;
  do { c = Array.from({ length: 6 }, () => CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]).join(''); }
  while (existing.some(b => b.code === c));
  return c;
}

const BoardStore = {
  list: readBoards,
  create({ title, subtitle = '', instructor, postits = [] }) {
    const all = readBoards();
    const board = { id: 'b' + Date.now().toString(36), code: makeCode(all), title, subtitle, instructor, createdAt: Date.now(), postits };
    writeBoards([board, ...all]);
    return board;
  },
  update(id, patch) {
    writeBoards(readBoards().map(b => b.id === id ? { ...b, ...patch } : b));
  },
  remove(id) {
    writeBoards(readBoards().filter(b => b.id !== id));
  },
  addPostit(id, item) {
    writeBoards(readBoards().map(b => b.id === id ? { ...b, postits: [...b.postits, item] } : b));
  },
  like(id, postitId) {
    writeBoards(readBoards().map(b => b.id === id
      ? { ...b, postits: b.postits.map(p => p.id === postitId ? { ...p, likes: p.likes + 1 } : p) }
      : b));
  },
};

function useBoards() {
  const [boards, setBoards] = React.useState(readBoards);
  React.useEffect(() => {
    const sync = () => setBoards(readBoards());
    window.addEventListener('boards-change', sync);
    window.addEventListener('storage', sync);
    return () => { window.removeEventListener('boards-change', sync); window.removeEventListener('storage', sync); };
  }, []);
  return boards;
}

Object.assign(window, { BoardStore, useBoards });
