import { useEffect } from 'react';
import {
  FONT_OPTIONS, GAP_OPTIONS, PRESENT_OPTIONS, SIZE_OPTIONS,
  type WallSettings,
} from '../lib/wallSettings';
import { useExitTransition } from '../lib/motion';
import { IconEdit } from './Icons';

// 벽 화면 오른쪽 위 '옵션' 패널 — 바꾸는 즉시 벽에 반영, 이 PC 브라우저에 저장
export function WallOptions({ settings, onChange, onReset, onEditBoard, onClose }: {
  settings: WallSettings;
  onChange: (patch: Partial<WallSettings>) => void;
  onReset: () => void;
  onEditBoard: () => void;
  onClose: () => void;
}) {
  const { closing, close } = useExitTransition(onClose);
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [close]);

  function row<K extends keyof WallSettings>(label: string, field: K, options: readonly { id: WallSettings[K]; label: string }[]) {
    return (
      <div className="wall-options-row">
        <label>{label}</label>
        <div className="seg">
          {options.map(o => (
            <button key={o.id} className={settings[field] === o.id ? 'active' : ''} onClick={() => onChange({ [field]: o.id } as Partial<WallSettings>)}>
              {o.label}
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="wall-options-backdrop" onClick={close} />
      <div className={`wall-options ${closing ? 'is-closing' : ''}`} role="dialog" aria-label="화면 옵션">
        <div className="wall-options-head">
          <div className="wall-options-title">화면 옵션</div>
          <button className="wall-options-close" onClick={close} aria-label="닫기">×</button>
        </div>
        {row('포스트잇 크기', 'size', SIZE_OPTIONS)}
        {row('글씨 크기', 'font', FONT_OPTIONS)}
        {row('포스트잇 간격', 'gap', GAP_OPTIONS)}
        {row('전체화면 보기', 'present', PRESENT_OPTIONS)}
        <div className="wall-options-hint">
          {settings.present === 'pages'
            ? '읽기 좋은 크기로 나눠 보여줘요. ← → 키나 아래 버튼으로 넘겨요.'
            : '모든 포스트잇을 한 화면에 맞춰요. 많아지면 작아져요.'}
          <br />옵션은 이 PC에 저장돼요.
        </div>
        <div className="wall-options-actions">
          <button className="btn-ghost" onClick={onEditBoard}><IconEdit size={14} /> 보드 정보·참여자 문구 수정</button>
          <button className="btn-ghost" onClick={onReset}>기본값으로</button>
        </div>
      </div>
    </>
  );
}
