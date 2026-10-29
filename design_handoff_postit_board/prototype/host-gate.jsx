// 강사 인증 게이트
function HostGate({ onSuccess, onCancel }) {
  const CORRECT_PIN = '1212'; // 12기
  const [pin, setPin] = React.useState('');
  const [error, setError] = React.useState(false);
  const [shake, setShake] = React.useState(false);
  const inputs = React.useRef([]);

  React.useEffect(() => {
    if (inputs.current[0]) inputs.current[0].focus();
  }, []);

  function handleChange(i, v) {
    const digit = v.replace(/\D/g, '').slice(-1);
    if (!digit && v !== '') return;
    const next = pin.split('');
    next[i] = digit;
    const newPin = next.join('').slice(0, 4);
    setPin(newPin);
    setError(false);
    if (digit && i < 3 && inputs.current[i + 1]) {
      inputs.current[i + 1].focus();
    }
    // 자동 제출
    if (newPin.length === 4) {
      setTimeout(() => verify(newPin), 200);
    }
  }

  function handleKeyDown(i, e) {
    if (e.key === 'Backspace' && !pin[i] && i > 0) {
      inputs.current[i - 1].focus();
    }
  }

  function verify(p) {
    if (p === CORRECT_PIN) {
      onSuccess();
    } else {
      setError(true);
      setShake(true);
      setTimeout(() => setShake(false), 500);
      setTimeout(() => {
        setPin('');
        if (inputs.current[0]) inputs.current[0].focus();
      }, 600);
    }
  }

  return (
    <div className="gate-stage">
      <div className="gate-clouds">
        <div className="cloud cloud-1"></div>
        <div className="cloud cloud-2"></div>
        <div className="cloud cloud-3"></div>
      </div>

      <div className={`gate-card ${shake ? 'shake' : ''}`}>
        <div className="gate-icon">
          <span className="gate-icon-plane">✈</span>
          <div className="gate-icon-lock">🔒</div>
        </div>
        <h1 className="gate-title">강사 인증</h1>
        <p className="gate-sub">
          연수교육원에서 안내받으신 <strong>4자리 코드</strong>를 입력하세요.<br/>
          강사 뷰는 큰 화면용으로 제공되며, 인증 없이 접근할 수 없습니다.
        </p>

        <div className="pin-row">
          {[0, 1, 2, 3].map(i => (
            <input
              key={i}
              ref={el => inputs.current[i] = el}
              className={`pin-input ${error ? 'error' : ''} ${pin[i] ? 'filled' : ''}`}
              type="tel"
              inputMode="numeric"
              maxLength={1}
              value={pin[i] || ''}
              onChange={e => handleChange(i, e.target.value)}
              onKeyDown={e => handleKeyDown(i, e)}
              autoComplete="off"
            />
          ))}
        </div>

        {error && (
          <div className="gate-error">
            ⚠ 코드가 일치하지 않습니다. 다시 시도해주세요.
          </div>
        )}

        <div className="gate-hint">
          <span style={{ fontSize: 11, color: 'rgba(0,0,0,0.4)' }}>
            힌트: 이번 기수 번호 두 번 (예: 12기 → 1212)
          </span>
        </div>

        <button className="gate-cancel" onClick={onCancel}>
          ← 게스트 뷰로 돌아가기
        </button>
      </div>

      <div className="gate-footer">
        대한항공 연수교육원 · Crew Training Center
      </div>
    </div>
  );
}

Object.assign(window, { HostGate });
