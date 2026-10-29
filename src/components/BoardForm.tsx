import { useState, type FormEvent } from 'react';
import { LIMITS } from '../lib/constants';
import type { Board, BoardInput } from '../lib/types';
import { Modal } from './Modal';

// 새 보드 / 보드 정보 수정 모달
export function BoardForm({ initial, onSave, onClose }: {
  initial?: Board;
  onSave: (v: BoardInput) => Promise<void> | void;
  onClose: () => void;
}) {
  const [title, setTitle] = useState(initial ? initial.title : '');
  const [subtitle, setSubtitle] = useState(initial ? initial.subtitle : '');
  const [instructor, setInstructor] = useState(initial ? initial.instructor : '');
  const [saving, setSaving] = useState(false);
  const valid = !!(title.trim() && instructor.trim());

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!valid || saving) return;
    setSaving(true);
    try {
      await onSave({ title: title.trim(), subtitle: subtitle.trim(), instructor: instructor.trim() });
    } catch (err) {
      alert(err instanceof Error ? err.message : '저장하지 못했어요');
      setSaving(false);
    }
  }

  return (
    <Modal onClose={onClose}>
      <form onSubmit={submit} className="modal-form">
        <h2 className="modal-title">{initial ? '보드 정보 수정' : '새 보드 만들기'}</h2>
        <label className="field">
          <span>교육명</span>
          <input autoFocus value={title} onChange={e => setTitle(e.target.value)} placeholder="예: 신입사원 온보딩 교육" maxLength={LIMITS.title} />
        </label>
        <label className="field">
          <span>기수 · 부제 <em>선택</em></span>
          <input value={subtitle} onChange={e => setSubtitle(e.target.value)} placeholder="예: 연수원 · 12기" maxLength={LIMITS.subtitle} />
        </label>
        <label className="field">
          <span>강사 이름</span>
          <input value={instructor} onChange={e => setInstructor(e.target.value)} placeholder="예: 홍길동" maxLength={LIMITS.instructor} />
        </label>
        <div className="modal-actions">
          <button type="button" className="btn-ghost" onClick={onClose}>취소</button>
          <button type="submit" className="btn-primary" disabled={!valid || saving}>{initial ? '저장' : '만들기'}</button>
        </div>
      </form>
    </Modal>
  );
}
