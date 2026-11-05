import type { CSSProperties } from 'react';
import { categoryAccent, categoryLabel, colorValue } from '../lib/constants';
import type { Layout } from '../lib/layout';
import type { Postit as PostitData } from '../lib/types';

// 벽에 붙는 포스트잇 한 장
export function Postit({ p, layout, scale = 1, enterDelay, onClick, swayEnabled, departing, onDeparted }: {
  p: PostitData;
  layout: Layout;
  scale?: number;       // 포스트잇 크기 배율 (옵션). 중심 기준으로 커지므로 위치를 보정해 칸의 왼쪽 위에 맞춘다
  enterDelay: number;   // 부착 애니메이션 지연(초) — 동시에 여러 장이 붙을 때 순차 연출
  onClick: (p: PostitData) => void;
  swayEnabled: boolean;
  departing?: 'wait' | 'leave';        // 삭제된 포스트잇: 확대 보기가 닫히길 기다리는 중 / 벽에서 떼어지는 중
  onDeparted?: (id: string) => void;   // 떼어지는 애니메이션이 끝났을 때
}) {
  return (
    <div
      className={departing === 'leave' ? 'postit leaving' : `postit entering ${swayEnabled ? 'swaying' : ''}`}
      style={{
        background: colorValue(p.color),
        translate: `${layout.x + 100 * (scale - 1)}px ${layout.y + 100 * (scale - 1)}px`,
        scale: String(scale),
        rotate: `${layout.rot}deg`,
        '--sway-rot': `${layout.swayRotOffset.toFixed(2)}deg`,
        '--sway-delay': `${layout.swayDelay}s`,
        '--enter-delay': `${enterDelay}s`,
        zIndex: 1,
      } as CSSProperties}
      onClick={() => { if (!departing) onClick(p); }}
      onAnimationEnd={e => { if (departing === 'leave' && e.animationName === 'peel-off') onDeparted?.(p.id); }}
    >
      {p.photoUrl && (
        <div className="polaroid" style={{ rotate: `${6 + (layout.swayRotOffset * 3)}deg` }}>
          <img src={p.photoUrl} alt="" />
        </div>
      )}
      <span className="cat-tag" style={{
        background: categoryAccent(p.category) + '20',
        color: categoryAccent(p.category),
      }}>
        {categoryLabel(p.category)}
      </span>
      <div className="postit-body">{p.body}</div>
      <div className="postit-meta">
        <span className="postit-author">{p.anonymous ? '익명' : p.author}</span>
      </div>
    </div>
  );
}
