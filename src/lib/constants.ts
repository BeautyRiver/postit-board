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

// 보드 코드 문자셋 (혼동 문자 0/O, 1/I 제외)
export const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

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
