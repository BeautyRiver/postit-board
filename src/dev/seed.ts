// 개발용 샘플 데이터 — `npm run dev`에서 보드 목록의 "샘플 보드 추가" 버튼으로만 사용 (프로덕션 빌드에서는 버튼이 숨겨짐)
import { BoardStore } from '../lib/boardStore';
import type { PostitInput } from '../lib/types';

// 사용자 사진 placeholder — 폴라로이드 스타일 SVG (외부 의존성 없이 안정적)
function makePhotoSVG(label: string, c1: string, c2: string) {
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
  return 'data:image/svg+xml;utf8,' + svg.replace(/\s+/g, ' ').replace(/#/g, '%23');
}

const PHOTOS = [
  makePhotoSVG('비행기 창 너머', '#7eb6e0', '#f5c89c'),
  makePhotoSVG('활주로 ✈', '#3a5a82', '#88a7c4'),
  makePhotoSVG('실습장', '#c8956d', '#e3b896'),
];

// 프로토타입 data.jsx SEED_POSTITS 12개 (좋아요·답변 필드 제외)
const SEED_POSTITS: PostitInput[] = [
  { body: "비상상황 시 승객 안내 멘트, 영어 표현 다시 한 번 정리해주실 수 있나요?", author: "김서연", anonymous: false, color: "yellow", category: "question", photoUrl: null, photoCaption: null },
  { body: "서비스 매뉴얼 시연이 정말 실전 같아서 도움이 많이 됐어요. 사무장님 감사합니다 ✈", author: "익명", anonymous: true, color: "pink", category: "praise", photoUrl: null, photoCaption: null },
  { body: "갤리 정리 순서가 헷갈려요. 짧은 체크리스트 같은 게 있을까요?", author: "이민호", anonymous: false, color: "blue", category: "question", photoUrl: null, photoCaption: null },
  { body: "객실 안전 점검 동선을 그림으로 정리해주시면 좋을 것 같아요. 머릿속에 그려지면 훨씬 빠르게 외워질 듯!", author: "박지영", anonymous: false, color: "green", category: "improve", photoUrl: null, photoCaption: null },
  { body: "기내 응급처치 실습 시간을 조금만 더 길게 가져가면 어떨까요. 손이 익숙해질 때쯤 끝났어요.", author: "익명", anonymous: true, color: "orange", category: "improve", photoUrl: null, photoCaption: null },
  { body: "사무장님 목소리가 너무 좋으세요. 기내 방송 톤 잡는 데 큰 도움이 됐습니다 :)", author: "익명", anonymous: true, color: "pink", category: "praise", photoUrl: null, photoCaption: null },
  { body: "비빔밥 서비스 동선에서 카트 회전이 어렵게 느껴졌어요. 좁은 통로에서의 팁이 있나요?", author: "최유진", anonymous: false, color: "yellow", category: "question", photoUrl: PHOTOS[2], photoCaption: "실습장에서!" },
  { body: "교육 마지막 날 다 같이 활주로 사진 찍었어요. 추억이 됩니다 ✈️", author: "12기 일동", anonymous: false, color: "blue", category: "etc", photoUrl: PHOTOS[1], photoCaption: "KE 12기 ✈" },
  { body: "CRM 사례 토론이 인상 깊었습니다. 실제 항공기 사례를 들으니 책에서만 보던 내용이 살아있는 느낌이었어요. 특히 기내에서 갑작스러운 상황이 발생했을 때 동료 간 커뮤니케이션이 얼마나 중요한지, 그리고 작은 신호도 놓치지 않고 공유하는 문화가 안전을 만든다는 점을 다시 한번 깨달았습니다. 다음 비행에서도 오늘 배운 내용을 잊지 않고 적용하도록 노력할게요. 감사합니다 사무장님 ✈", author: "정하늘", anonymous: false, color: "mint", category: "praise", photoUrl: null, photoCaption: null },
  { body: "면세품 판매 절차에서 실수 가능 포인트만 모아서 한번 짚어주실 수 있을까요?", author: "한지수", anonymous: false, color: "purple", category: "question", photoUrl: null, photoCaption: null },
  { body: "교재 PDF 파일 형태로도 공유 부탁드려요! 태블릿으로 보고 싶어요.", author: "익명", anonymous: true, color: "orange", category: "etc", photoUrl: null, photoCaption: null },
  { body: "함께해서 정말 즐거운 2주였습니다. 동기들 모두 첫 비행 화이팅!", author: "윤도현", anonymous: false, color: "white", category: "praise", photoUrl: PHOTOS[0], photoCaption: "구름 위에서" },
];

export async function seedDemoBoard() {
  const board = await BoardStore.create({
    title: '객실승무원 안전·서비스 연수',
    subtitle: '연수교육원 · 12기 수료식',
    instructor: '박지훈 사무장',
  });
  // 포스트잇은 열린 방에만 붙으므로 잠깐 열었다가 닫는다
  const code = await BoardStore.openSession(board.id, { fresh: true });
  for (const item of SEED_POSTITS) await BoardStore.addPostit(board.id, code, item);
  await BoardStore.closeSession(board.id);
  return board;
}
