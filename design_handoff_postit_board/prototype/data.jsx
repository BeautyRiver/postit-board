// 샘플 데이터 — 항공 연수교육 관련
const CATEGORIES = [
  { id: 'all',       label: '전체',     icon: '✦' },
  { id: 'question',  label: '질문',     icon: '?' },
  { id: 'praise',    label: '칭찬',     icon: '♡' },
  { id: 'improve',   label: '개선점',   icon: '↑' },
  { id: 'etc',       label: '기타',     icon: '∗' },
];

const POSTIT_COLORS = [
  { id: 'yellow', value: '#fef08a', label: '노랑' },
  { id: 'pink',   value: '#fbcfe8', label: '핑크' },
  { id: 'green',  value: '#bbf7d0', label: '연두' },
  { id: 'blue',   value: '#bae6fd', label: '하늘' },
  { id: 'orange', value: '#fed7aa', label: '주황' },
  { id: 'purple', value: '#e9d5ff', label: '보라' },
  { id: 'mint',   value: '#a7f3d0', label: '민트' },
  { id: 'white',  value: '#fefefe', label: '흰색' },
];

// 사용자 사진 placeholder — 폴라로이드 스타일 SVG (외부 의존성 없이 안정적)
function makePhotoSVG(label, c1, c2) {
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 300'>
    <defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'>
      <stop offset='0%' stop-color='${c1}'/><stop offset='100%' stop-color='${c2}'/>
    </linearGradient></defs>
    <rect width='400' height='300' fill='url(%23g)'/>
    <circle cx='80' cy='70' r='30' fill='rgba(255,255,255,0.6)'/>
    <path d='M 0 230 Q 100 180 200 210 T 400 200 L 400 300 L 0 300 Z' fill='rgba(255,255,255,0.25)'/>
    <path d='M 0 250 Q 100 220 200 240 T 400 230 L 400 300 L 0 300 Z' fill='rgba(255,255,255,0.35)'/>
    <text x='200' y='160' text-anchor='middle' font-family='Pretendard,sans-serif' font-size='22' fill='rgba(255,255,255,0.85)' font-weight='600'>${label}</text>
  </svg>`;
  return "data:image/svg+xml;utf8," + svg.replace(/\s+/g, ' ').replace(/#/g, '%23');
}

const SAMPLE_PHOTOS = [
  makePhotoSVG('비행기 창 너머', '#7eb6e0', '#f5c89c'),
  makePhotoSVG('활주로 ✈', '#3a5a82', '#88a7c4'),
  makePhotoSVG('실습장', '#c8956d', '#e3b896'),
];

const SEED_POSTITS = [
  {
    id: 'p1',
    body: '비상상황 시 승객 안내 멘트, 영어 표현 다시 한 번 정리해주실 수 있나요?',
    author: '김서연',
    anonymous: false,
    color: 'yellow',
    category: 'question',
    likes: 7,
    photo: null,
    created: Date.now() - 1000 * 60 * 32,
  },
  {
    id: 'p2',
    body: '서비스 매뉴얼 시연이 정말 실전 같아서 도움이 많이 됐어요. 사무장님 감사합니다 ✈',
    author: '익명',
    anonymous: true,
    color: 'pink',
    category: 'praise',
    likes: 14,
    photo: null,
    created: Date.now() - 1000 * 60 * 28,
  },
  {
    id: 'p3',
    body: '갤리 정리 순서가 헷갈려요. 짧은 체크리스트 같은 게 있을까요?',
    author: '이민호',
    anonymous: false,
    color: 'blue',
    category: 'question',
    likes: 5,
    photo: null,
    created: Date.now() - 1000 * 60 * 25,
  },
  {
    id: 'p4',
    body: '객실 안전 점검 동선을 그림으로 정리해주시면 좋을 것 같아요. 머릿속에 그려지면 훨씬 빠르게 외워질 듯!',
    author: '박지영',
    anonymous: false,
    color: 'green',
    category: 'improve',
    likes: 9,
    photo: null,
    created: Date.now() - 1000 * 60 * 22,
  },
  {
    id: 'p5',
    body: '기내 응급처치 실습 시간을 조금만 더 길게 가져가면 어떨까요. 손이 익숙해질 때쯤 끝났어요.',
    author: '익명',
    anonymous: true,
    color: 'orange',
    category: 'improve',
    likes: 11,
    photo: null,
    created: Date.now() - 1000 * 60 * 18,
  },
  {
    id: 'p6',
    body: '사무장님 목소리가 너무 좋으세요. 기내 방송 톤 잡는 데 큰 도움이 됐습니다 :)',
    author: '익명',
    anonymous: true,
    color: 'pink',
    category: 'praise',
    likes: 22,
    photo: null,
    created: Date.now() - 1000 * 60 * 15,
  },
  {
    id: 'p7',
    body: '비빔밥 서비스 동선에서 카트 회전이 어렵게 느껴졌어요. 좁은 통로에서의 팁이 있나요?',
    author: '최유진',
    anonymous: false,
    color: 'yellow',
    category: 'question',
    likes: 4,
    photo: SAMPLE_PHOTOS[2],
    photoCaption: '실습장에서!',
    created: Date.now() - 1000 * 60 * 12,
  },
  {
    id: 'p8',
    body: '교육 마지막 날 다 같이 활주로 사진 찍었어요. 추억이 됩니다 ✈️',
    author: '12기 일동',
    anonymous: false,
    color: 'blue',
    category: 'etc',
    likes: 18,
    photo: SAMPLE_PHOTOS[1],
    photoCaption: 'KE 12기 ✈',
    created: Date.now() - 1000 * 60 * 10,
  },
  {
    id: 'p9',
    body: 'CRM 사례 토론이 인상 깊었습니다. 실제 항공기 사례를 들으니 책에서만 보던 내용이 살아있는 느낌이었어요. 특히 기내에서 갑작스러운 상황이 발생했을 때 동료 간 커뮤니케이션이 얼마나 중요한지, 그리고 작은 신호도 놓치지 않고 공유하는 문화가 안전을 만든다는 점을 다시 한번 깨달았습니다. 다음 비행에서도 오늘 배운 내용을 잊지 않고 적용하도록 노력할게요. 감사합니다 사무장님 ✈',
    author: '정하늘',
    anonymous: false,
    color: 'mint',
    category: 'praise',
    likes: 8,
    photo: null,
    created: Date.now() - 1000 * 60 * 8,
  },
  {
    id: 'p10',
    body: '면세품 판매 절차에서 실수 가능 포인트만 모아서 한번 짚어주실 수 있을까요?',
    author: '한지수',
    anonymous: false,
    color: 'purple',
    category: 'question',
    likes: 6,
    photo: null,
    created: Date.now() - 1000 * 60 * 6,
  },
  {
    id: 'p11',
    body: '교재 PDF 파일 형태로도 공유 부탁드려요! 태블릿으로 보고 싶어요.',
    author: '익명',
    anonymous: true,
    color: 'orange',
    category: 'etc',
    likes: 13,
    photo: null,
    created: Date.now() - 1000 * 60 * 4,
  },
  {
    id: 'p12',
    body: '함께해서 정말 즐거운 2주였습니다. 동기들 모두 첫 비행 화이팅!',
    author: '윤도현',
    anonymous: false,
    color: 'white',
    category: 'praise',
    likes: 16,
    photo: SAMPLE_PHOTOS[0],
    photoCaption: '구름 위에서',
    created: Date.now() - 1000 * 60 * 2,
  },
];

// 자연스러운 회전/위치 분포 계산 (격자 + 랜덤 흔들림)
function generateLayout(items, opts = {}) {
  const cols = opts.cols || 4;
  const cellW = opts.cellW || 240;
  const cellH = opts.cellH || 240;
  const startX = opts.startX || 80;
  const startY = opts.startY || 110;
  const jitter = opts.jitter ?? 30;
  const rotJitter = opts.rotJitter ?? 6;

  // 시드된 의사 랜덤 (id 기반) — 매 렌더마다 위치가 안정적
  function hash(s) {
    let h = 0;
    for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
    return Math.abs(h);
  }

  return items.map((item, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const h1 = hash(item.id + 'x') / 1000;
    const h2 = hash(item.id + 'y') / 1000;
    const h3 = hash(item.id + 'r') / 1000;
    const h4 = hash(item.id + 's') / 1000;
    const x = startX + col * cellW + ((h1 % 1) - 0.5) * 2 * jitter;
    const y = startY + row * cellH + ((h2 % 1) - 0.5) * 2 * jitter;
    const rot = ((h3 % 1) - 0.5) * 2 * rotJitter;
    const swayDelay = (h4 % 1) * 4;
    const swayRotOffset = ((hash(item.id + 'q') % 100) / 100 - 0.5) * 2;
    return { ...item, x, y, rot, swayDelay, swayRotOffset };
  });
}

// 짧은 시간 표시
function timeAgo(ts) {
  const d = Date.now() - ts;
  const m = Math.floor(d / 60000);
  if (m < 1) return '방금';
  if (m < 60) return `${m}분 전`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}시간 전`;
  return `${Math.floor(h/24)}일 전`;
}

// 카테고리별 색상
function categoryAccent(cat) {
  return ({
    question: '#3b82f6',
    praise:   '#ec4899',
    improve:  '#16a34a',
    etc:      '#6b7280',
  })[cat] || '#6b7280';
}

function categoryLabel(cat) {
  return ({
    question: '질문',
    praise:   '칭찬',
    improve:  '개선점',
    etc:      '기타',
  })[cat] || '기타';
}

Object.assign(window, {
  CATEGORIES,
  POSTIT_COLORS,
  SAMPLE_PHOTOS,
  SEED_POSTITS,
  generateLayout,
  timeAgo,
  categoryAccent,
  categoryLabel,
});
