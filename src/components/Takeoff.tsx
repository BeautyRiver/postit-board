import { useEffect, useEffectEvent } from 'react';
import type { Board } from '../lib/types';
import { IconPlane } from './Icons';

// 보드 진입 연출 — 활주로 가속 → 이륙 → 구름 통과 → 하늘(벽)
// 총 2.0s, 1.3s 시점에 라우트 전환(onArrive), 2.0s에 오버레이 제거(onDone)
export function Takeoff({ board, code, onArrive, onDone }: {
  board: Board;
  code: string;          // 이번에 발급된 입장 코드
  onArrive: () => void;
  onDone: () => void;
}) {
  // 콜백이 바뀌어도 타이머는 처음 한 번만 건다
  const arrive = useEffectEvent(onArrive);
  const done = useEffectEvent(onDone);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      arrive();
      done();
      return;
    }
    const t1 = setTimeout(arrive, 1300);
    const t2 = setTimeout(done, 2000);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  return (
    <div className="takeoff" aria-hidden="true">
      <div className="takeoff-sky"></div>
      <div className="takeoff-runway"></div>
      <div className="takeoff-cloud c1"></div>
      <div className="takeoff-cloud c2"></div>
      <div className="takeoff-cloud c3"></div>
      <div className="takeoff-label">
        <div className="takeoff-kicker">TAKE OFF · {code}</div>
        <div className="takeoff-title">{board.title}</div>
      </div>
      <div className="takeoff-plane">
        <i className="takeoff-trail"></i>
        <IconPlane />
      </div>
    </div>
  );
}
