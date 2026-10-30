import type { CategoryId, PostitColor } from './types';

export const CATEGORIES: { id: 'all' | CategoryId; label: string; icon: string }[] = [
  { id: 'all',       label: '전체',     icon: '✦' },
  { id: 'question',  label: '질문',     icon: '?' },
  { id: 'praise',    label: '칭찬',     icon: '♡' },
  { id: 'improve',   label: '개선점',   icon: '↑' },
  { id: 'etc',       label: '기타',     icon: '∗' },
];

export const POSTIT_COLORS: { id: PostitColor; value: string; label: string }[] = [
  { id: 'yellow', value: '#fef08a', label: '노랑' },
  { id: 'pink',   value: '#fbcfe8', label: '핑크' },
  { id: 'green',  value: '#bbf7d0', label: '연두' },
  { id: 'blue',   value: '#bae6fd', label: '하늘' },
  { id: 'orange', value: '#fed7aa', label: '주황' },
  { id: 'purple', value: '#e9d5ff', label: '보라' },
  { id: 'mint',   value: '#a7f3d0', label: '민트' },
  { id: 'white',  value: '#fefefe', label: '흰색' },
];

// 입장 코드: 4자리 숫자. 강사 벽이 열려 있는 동안만 유효
export const CODE_LENGTH = 4;
export const HEARTBEAT_MS = 30_000;     // 벽 화면이 살아 있음을 알리는 주기
export const SESSION_TTL_MS = 90_000;   // 이 시간 동안 하트비트가 없으면 방이 닫힌 것으로 처리 (탭 닫기·절전 대비)

// 저장하지 않은 채 남겨진 보드(탭을 그냥 닫은 경우 등)를 보드 목록에서 자동 삭제하기까지의 시간
export const UNSAVED_BOARD_TTL_MS = 24 * 60 * 60 * 1000;

export function isSessionActive(session: { lastSeen: number } | null | undefined, now = Date.now()): boolean {
  return !!session && now - session.lastSeen < SESSION_TTL_MS;
}

export const LIMITS = { title: 40, subtitle: 40, instructor: 20, body: 200 } as const;

export function colorValue(id: string): string {
  return (POSTIT_COLORS.find(c => c.id === id) || POSTIT_COLORS[0]).value;
}

// 카테고리별 색상
export function categoryAccent(cat: string): string {
  return ({
    question: '#3b82f6',
    praise:   '#ec4899',
    improve:  '#16a34a',
    etc:      '#6b7280',
  } as Record<string, string>)[cat] || '#6b7280';
}

export function categoryLabel(cat: string): string {
  return ({
    question: '질문',
    praise:   '칭찬',
    improve:  '개선점',
    etc:      '기타',
  } as Record<string, string>)[cat] || '기타';
}

// 짧은 시간 표시
export function timeAgo(ts: number): string {
  const d = Date.now() - ts;
  const m = Math.floor(d / 60000);
  if (m < 1) return '방금';
  if (m < 60) return `${m}분 전`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}시간 전`;
  return `${Math.floor(h / 24)}일 전`;
}

export function fmtDate(ts: number): string {
  const d = new Date(ts);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
}
