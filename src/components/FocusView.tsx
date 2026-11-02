import { useEffect, useState } from 'react';
import { categoryAccent, categoryLabel, colorValue, timeAgo } from '../lib/constants';
import { useExitTransition } from '../lib/motion';
import type { Postit } from '../lib/types';

// 포스트잇 클릭 시 프로젝터용 확대 보기
// 사진이 있으면 우상단 썸네일 ↔ 메인 전환 (transform만 애니메이트하는 shared-element 방식, CSS .swap-slot)
export function FocusView({ selected, onClose }: { selected: Postit; onClose: () => void }) {
  // mode: 'postit' = 글이 메인 / 'photo' = 사진이 메인
  const [mode, setMode] = useState<'postit' | 'photo'>('postit');
  const hasPhoto = !!selected.photoUrl;
  const { closing, close } = useExitTransition(onClose);   // X·배경·ESC 모두 퇴장 애니메이션 후 닫힘

  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [close]);

  const state = closing ? 'is-closing' : '';
  return (
    <div className={`focus-backdrop ${state}`} onClick={close}>
      <button className="focus-close" onClick={close} aria-label="닫기">×</button>
      <div className="focus-hint">
        {hasPhoto
          ? '우측 상단을 클릭해서 사진과 글을 전환해보세요 · 배경 클릭으로 닫기'
          : '배경 클릭으로 닫기'}
      </div>

      <div className={`focus-stage ${state}`} onClick={e => e.stopPropagation()}>
        {/* 포스트잇 슬롯 */}
        <div
          className={`swap-slot ${mode === 'postit' ? 'slot-main' : 'slot-thumb'}`}
          onClick={() => mode !== 'postit' ? setMode('postit') : null}
        >
          <div className="focus-postit" style={{ background: colorValue(selected.color) }}>
            <div className="focus-header">
              <span className="cat-tag" style={{
                background: categoryAccent(selected.category) + '25',
                color: categoryAccent(selected.category),
              }}>
                {categoryLabel(selected.category)}
              </span>
            </div>
            <div className={`focus-body ${selected.body.length > 200 ? 'xlong' : (selected.body.length > 100 ? 'long' : '')}`}>{selected.body}</div>
            <div className="focus-footer">
              <div className="focus-meta">
                <span className="focus-author">{selected.anonymous ? '익명' : selected.author}</span>
                <span className="focus-time">· {timeAgo(selected.createdAt)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* 사진 슬롯 (있는 경우에만) */}
        {hasPhoto && (
          <div
            className={`swap-slot ${mode === 'photo' ? 'slot-main' : 'slot-thumb'}`}
            onClick={() => mode !== 'photo' ? setMode('photo') : null}
            role="button"
            aria-label={mode === 'photo' ? '포스트잇 보기' : '사진 크게 보기'}
          >
            <div className="focus-photo">
              <img src={selected.photoUrl!} alt="" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
