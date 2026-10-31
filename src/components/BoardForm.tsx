import { useState, type FormEvent } from 'react';
import { DEFAULT_PLACEHOLDER, DEFAULT_PROMPT, LIMITS, PROMPT_SUGGESTIONS, errorMessage } from '../lib/constants';
import type { Board, BoardInput } from '../lib/types';
import { GuestForm } from '../pages/GuestPage';
import { Modal } from './Modal';

// 새 보드 / 보드 정보 수정 모달
// 왼쪽: 보드 정보 + 참여자 화면 문구(질문·입력칸 안내) / 오른쪽: 참여자 휴대폰 화면 실시간 미리보기
export function BoardForm({ initial, onSave, onClose }: {
  initial?: Board;
  onSave: (v: BoardInput) => Promise<void> | void;
  onClose: () => void;
}) {
  const [title, setTitle] = useState(initial ? initial.title : '');
  const [subtitle, setSubtitle] = useState(initial ? initial.subtitle : '');
  const [instructor, setInstructor] = useState(initial ? initial.instructor : '');
  const [prompt, setPrompt] = useState(initial?.prompt || DEFAULT_PROMPT);
  const [placeholder, setPlaceholder] = useState(initial?.placeholder || DEFAULT_PLACEHOLDER);
  const [saving, setSaving] = useState(false);
  const valid = !!(title.trim() && instructor.trim());

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!valid || saving) return;
    setSaving(true);
    try {
      // 기본 문구 그대로면 빈 값으로 저장 (나중에 기본 문구가 바뀌어도 따라가도록)
      const p = prompt.trim(), ph = placeholder.trim();
      await onSave({
        title: title.trim(), subtitle: subtitle.trim(), instructor: instructor.trim(),
        prompt: p === DEFAULT_PROMPT ? '' : p,
        placeholder: ph === DEFAULT_PLACEHOLDER ? '' : ph,
      });
    } catch (err) {
      alert(errorMessage(err, '저장하지 못했어요'));
      setSaving(false);
    }
  }

  const previewRoom = {
    code: '0000', boardId: 'preview',
    title: title.trim() || '교육명', subtitle: subtitle.trim(),
    prompt: prompt.trim() || DEFAULT_PROMPT, placeholder: placeholder.trim() || DEFAULT_PLACEHOLDER,
  };

  return (
    <Modal onClose={onClose} wide>
      <div className="board-form-layout">
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

          <div className="form-section-title">참여자 화면 문구</div>
          <label className="field">
            <span>질문</span>
            <input value={prompt} onChange={e => setPrompt(e.target.value)} placeholder={DEFAULT_PROMPT} maxLength={LIMITS.prompt} />
          </label>
          <div className="prompt-chips">
            {PROMPT_SUGGESTIONS.map(s => (
              <button type="button" key={s} className={`prompt-chip ${prompt === s ? 'active' : ''}`} onClick={() => setPrompt(s)}>{s}</button>
            ))}
          </div>
          <label className="field">
            <span>입력칸 안내 문구</span>
            <input value={placeholder} onChange={e => setPlaceholder(e.target.value)} placeholder={DEFAULT_PLACEHOLDER} maxLength={LIMITS.placeholder} />
          </label>

          <div className="modal-actions">
            <button type="button" className="btn-ghost" onClick={onClose}>취소</button>
            <button type="submit" className="btn-primary" disabled={!valid || saving}>{initial ? '저장' : '만들기'}</button>
          </div>
        </form>

        <div className="guest-preview">
          <div className="guest-preview-label">참여자 화면 미리보기</div>
          <div className="guest-preview-phone">
            <div className="guest-preview-screen">
              <GuestForm room={previewRoom} preview />
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}
