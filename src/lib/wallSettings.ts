// 벽 화면 표시 옵션 — 강사 PC 브라우저에 저장 (프로젝터 PC에서 한 번 맞춰 두면 다음 수업에도 유지)
import { useCallback, useState } from 'react';

export interface WallSettings {
  size: 'sm' | 'md' | 'lg' | 'xl';      // 포스트잇 크기 (상자+글씨 함께)
  font: 'sm' | 'md' | 'lg' | 'xl';      // 글씨 크기 (상자는 그대로)
  gap: 'tight' | 'normal' | 'wide';     // 포스트잇 간격
  present: 'fit' | 'pages';             // 전체화면: 한 화면에 모두 / 페이지 넘기기
}

// 기본값 = 프로토타입 수치 (포스트잇 200px, 글씨 14px, 칸 240px)
export const DEFAULT_WALL_SETTINGS: WallSettings = { size: 'md', font: 'md', gap: 'normal', present: 'fit' };

export const SIZE_OPTIONS = [
  { id: 'sm', label: '작게', scale: 0.85 },
  { id: 'md', label: '보통', scale: 1 },
  { id: 'lg', label: '크게', scale: 1.25 },
  { id: 'xl', label: '아주 크게', scale: 1.5 },
] as const;
export const FONT_OPTIONS = [
  { id: 'sm', label: '작게' },
  { id: 'md', label: '보통' },
  { id: 'lg', label: '크게' },
  { id: 'xl', label: '아주 크게' },
] as const;
export const GAP_OPTIONS = [
  { id: 'tight', label: '좁게', px: 24 },
  { id: 'normal', label: '보통', px: 40 },
  { id: 'wide', label: '넓게', px: 80 },
] as const;
export const PRESENT_OPTIONS = [
  { id: 'fit', label: '한 화면에 모두' },
  { id: 'pages', label: '페이지 넘기기' },
] as const;

export const POSTIT_BASE = 200;   // .postit 너비·높이 (CSS)

// 설정 → 배치 수치
export function wallMetrics(s: WallSettings) {
  const scale = SIZE_OPTIONS.find(o => o.id === s.size)?.scale ?? 1;
  const gap = GAP_OPTIONS.find(o => o.id === s.gap)?.px ?? 40;
  const cell = Math.round(POSTIT_BASE * scale + gap);
  const jitter = Math.round(Math.min(22 * scale, gap * 0.55));   // 기본(보통·보통)은 프로토타입 값 22
  return { scale, cell, jitter };
}

const KEY = 'postit.wallSettings.v1';

function load(): WallSettings {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) || '{}');
    return {
      size: SIZE_OPTIONS.some(o => o.id === v.size) ? v.size : DEFAULT_WALL_SETTINGS.size,
      font: FONT_OPTIONS.some(o => o.id === v.font) ? v.font : DEFAULT_WALL_SETTINGS.font,
      gap: GAP_OPTIONS.some(o => o.id === v.gap) ? v.gap : DEFAULT_WALL_SETTINGS.gap,
      present: PRESENT_OPTIONS.some(o => o.id === v.present) ? v.present : DEFAULT_WALL_SETTINGS.present,
    };
  } catch {
    return DEFAULT_WALL_SETTINGS;
  }
}

export function useWallSettings(): [WallSettings, (patch: Partial<WallSettings>) => void, () => void] {
  const [settings, setSettings] = useState<WallSettings>(load);
  const update = useCallback((patch: Partial<WallSettings>) => {
    setSettings(prev => {
      const next = { ...prev, ...patch };
      try { localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* 저장 못 해도 화면에는 적용 */ }
      return next;
    });
  }, []);
  const reset = useCallback(() => {
    try { localStorage.removeItem(KEY); } catch { /* 무시 */ }
    setSettings(DEFAULT_WALL_SETTINGS);
  }, []);
  return [settings, update, reset];
}
