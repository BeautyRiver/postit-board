import { useState } from 'react';
import { usePostitCount } from '../lib/boardStore';
import type { Board } from '../lib/types';
import { Modal } from './Modal';

// 보드 삭제 확인 — 보드 코드를 정확히 입력해야 삭제 가능
export function DeleteBoardConfirm({ board, onConfirm, onClose }: {
  board: Board;
  onConfirm: () => Promise<void> | void;
  onClose: () => void;
}) {
  const [typed, setTyped] = useState('');
  const [busy, setBusy] = useState(false);
  const count = usePostitCount(board.id);
  const ok = typed.trim().toUpperCase() === board.code && !busy;

  async function confirm() {
    if (!ok) return;
    setBusy(true);
    try {
      await onConfirm();
    } catch (err) {
      alert(err instanceof Error ? err.message : '삭제하지 못했어요');
      setBusy(false);
    }
  }

  return (
    <Modal onClose={onClose}>
      <div className="modal-form">
        <div className="danger-icon">!</div>
        <h2 className="modal-title">보드를 삭제할까요?</h2>
        <p className="danger-text">
          <strong>{board.title}</strong> 보드와 포스트잇 <strong>{count ?? '…'}개</strong>가
          DB에서 <strong>영구적으로 삭제</strong>됩니다. 이 작업은 되돌릴 수 없습니다.
        </p>
        <label className="field">
          <span>확인을 위해 보드 코드 <code className="board-code">{board.code}</code>를 입력하세요</span>
          <input autoFocus value={typed} onChange={e => setTyped(e.target.value)} placeholder={board.code} maxLength={6}
            onKeyDown={e => { if (e.key === 'Enter') confirm(); }} />
        </label>
        <div className="modal-actions">
          <button className="btn-ghost" onClick={onClose}>취소</button>
          <button className="btn-danger" disabled={!ok} onClick={confirm}>영구 삭제</button>
        </div>
      </div>
    </Modal>
  );
}
