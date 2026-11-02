// 모션 공통 — 닫을 때 바로 없애지 않고 퇴장 애니메이션이 끝난 뒤 onClose를 부른다.
// 기준(web-animation-design): 퇴장은 입장보다 약 20% 짧게, ease-out, transform·opacity만. 동작 줄이기 설정이면 즉시 닫힘
import { useCallback, useEffect, useRef, useState } from 'react';

export const EXIT_MS = 170;   // global.css의 퇴장 애니메이션 길이와 맞출 것

export function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
}

// const { closing, close } = useExitTransition(onClose)
// closing 동안 .is-closing 클래스로 퇴장 애니메이션을 재생하고, ms 뒤 onClose
export function useExitTransition(onClose: () => void, ms = EXIT_MS) {
  const [closing, setClosing] = useState(false);
  const closingRef = useRef(false);
  const onCloseRef = useRef(onClose);
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => { onCloseRef.current = onClose; });
  useEffect(() => () => window.clearTimeout(timer.current), []);

  const close = useCallback(() => {
    if (closingRef.current) return;
    closingRef.current = true;
    if (prefersReducedMotion()) { onCloseRef.current(); return; }
    setClosing(true);
    timer.current = window.setTimeout(() => onCloseRef.current(), ms);
  }, [ms]);

  return { closing, close };
}
