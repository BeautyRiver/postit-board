import { useEffect, useState } from 'react';
import { categoryAccent, categoryLabel, colorValue, errorMessage, timeAgo } from '../lib/constants';
import { useExitTransition } from '../lib/motion';
import type { Postit } from '../lib/types';
import { IconTrash } from './Icons';

// 포스트잇 클릭 시 프로젝터용 확대 보기
// 사진이 있으면 우상단 썸네일 ↔ 메인 전환 (transform만 애니메이트하는 shared-element 방식, CSS .swap-slot)
// onDelete가 있으면(강사 벽) 하단에 작은 유리 버튼 "포스트잇 삭제" → 확인 → 삭제 후 닫힘
export function FocusView({ selected, onClose, onDelete }: {
  selected: Postit;
  onClose: () => void;
  onDelete?: () => Promise<void>;
}) {
  // mode: 'postit' = 글이 메인 / 'photo' = 사진이 메인
  const [mode, setMode] = useState<'postit' | 'photo'>('postit');
  const hasPhoto = !!selected.photoUrl;
  const { closing, close } = useExitTransition(onClose);   // X·배경·ESC 모두 퇴장 애니메이션 후 닫힘
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  function cancelDelete() {
    if (deleting) return;
    setConfirming(false);
    setDeleteError(null);
  }
  async function confirmDelete() {
    if (!onDelete || deleting) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      await onDelete();
      close();   // 닫힌 뒤 벽의 포스트잇이 떼어지는 애니메이션 (WallPage)
    } catch (err) {
      setDeleteError(errorMessage(err, '삭제하지 못했어요. 다시 시도해 주세요.'));
      setDeleting(false);
    }
  }

  // ESC: 삭제 확인 중이면 확인만 취소, 아니면 닫기
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (confirming) cancelDelete();
      else close();
    };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  });

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

      {onDelete && (
        <div className="focus-actions">
          {confirming ? (
            <div className="focus-confirm" role="alertdialog" aria-labelledby="focus-confirm-title" onClick={e => e.stopPropagation()}>
              <div className="focus-confirm-text">
                <strong id="focus-confirm-title">이 포스트잇을 삭제할까요?</strong>
                <span>벽에서 바로 떼어지고 되돌릴 수 없어요</span>
              </div>
              <div className="focus-confirm-buttons">
                <button className="glass-btn" onClick={cancelDelete} disabled={deleting} autoFocus>취소</button>
                <button className="glass-btn danger" onClick={confirmDelete} disabled={deleting}>
                  {deleting ? '삭제 중…' : '삭제'}
                </button>
              </div>
              {deleteError && <div className="focus-confirm-error" role="alert">{deleteError}</div>}
            </div>
          ) : (
            <button className="focus-delete" onClick={e => { e.stopPropagation(); setConfirming(true); }}>
              <IconTrash />
              포스트잇 삭제
            </button>
          )}
        </div>
      )}
    </div>
  );
}
