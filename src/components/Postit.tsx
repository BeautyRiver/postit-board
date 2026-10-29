import type { CSSProperties } from 'react';
import { categoryAccent, categoryLabel, colorValue } from '../lib/constants';
import type { Layout } from '../lib/layout';
import type { Postit as PostitData } from '../lib/types';

// 벽에 붙는 포스트잇 한 장
export function Postit({ p, layout, enterDelay, onClick, swayEnabled }: {
  p: PostitData;
  layout: Layout;
  enterDelay: number;   // 부착 애니메이션 지연(초) — 동시에 여러 장이 붙을 때 순차 연출
  onClick: (p: PostitData) => void;
  swayEnabled: boolean;
}) {
  return (
    <div
      className={`postit entering ${swayEnabled ? 'swaying' : ''}`}
      style={{
        background: colorValue(p.color),
        translate: `${layout.x}px ${layout.y}px`,
        rotate: `${layout.rot}deg`,
        '--sway-rot': `${layout.swayRotOffset.toFixed(2)}deg`,
        '--sway-delay': `${layout.swayDelay}s`,
        '--enter-delay': `${enterDelay}s`,
        zIndex: 1,
      } as CSSProperties}
      onClick={() => onClick(p)}
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
