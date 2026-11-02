import { useEffect, type ReactNode } from 'react';
import { useExitTransition } from '../lib/motion';

// 모달 — 열릴 때·닫힐 때 모두 애니메이션 (배경과 카드는 같은 길이·곡선으로 함께 움직임)
// children에 함수를 넘기면 close(애니메이션 후 닫기)를 받아 취소·완료 버튼에 쓸 수 있다
export function Modal({ children, onClose, wide = false }: {
  children: ReactNode | ((close: () => void) => ReactNode);
  onClose: () => void;
  wide?: boolean;
}) {
  const { closing, close } = useExitTransition(onClose);
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [close]);
  const state = closing ? 'is-closing' : '';
  return (
    <div className={`modal-backdrop ${state}`} onClick={close}>
      <div className={`modal-card ${wide ? 'wide' : ''} ${state}`} onClick={e => e.stopPropagation()}>
        {typeof children === 'function' ? children(close) : children}
      </div>
    </div>
  );
}
