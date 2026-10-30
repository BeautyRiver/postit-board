import { QRCodeSVG } from 'qrcode.react';
import { useEffect, useState } from 'react';

// 벽 우하단 QR 카드 — QR은 사이트 첫 화면(코드 입력)으로 연결, 입장 코드는 크게 따로 표시
// 카드를 누르면 화면 가득 큰 QR과 코드 (뒷자리에서도 찍을 수 있게). 배경 클릭·ESC로 닫기
export function QRCard({ code }: { code: string | null }) {
  const [big, setBig] = useState(false);
  const url = `${window.location.origin}/`;

  useEffect(() => {
    if (!big) return;
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') setBig(false); };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [big]);

  return (
    <>
      <button type="button" className="qr-card" onClick={() => setBig(true)} title="크게 보기">
        <div className="qr-card-title">스마트폰으로 의견 남기기</div>
        <QRCodeSVG value={url} className="qr-card-img" bgColor="#ffffff" fgColor="#0e1a2b" marginSize={0} level="M" />
        <div className="qr-card-code-label">입장 코드</div>
        <div className="qr-card-code">{code ?? '····'}</div>
      </button>

      {big && (
        <div className="focus-backdrop qr-big-backdrop" onClick={() => setBig(false)}>
          <button className="focus-close" onClick={() => setBig(false)} aria-label="닫기">×</button>
          <div className="focus-hint">배경을 누르거나 ESC로 닫기</div>
          <div className="qr-big" onClick={e => e.stopPropagation()}>
            <div className="qr-big-title">스마트폰 카메라로 QR을 찍고, 입장 코드를 입력하세요</div>
            <div className="qr-big-body">
              <QRCodeSVG value={url} className="qr-big-img" bgColor="#ffffff" fgColor="#0e1a2b" marginSize={1} level="M" />
              <div className="qr-big-side">
                <div className="qr-big-code-label">입장 코드</div>
                <div className="qr-big-code">{code ?? '····'}</div>
                <div className="qr-big-url">{window.location.host}</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
