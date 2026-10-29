import { QRCodeSVG } from 'qrcode.react';

// 벽 우하단 QR 카드 — QR은 사이트 첫 화면(코드 입력)으로 연결, 입장 코드는 크게 따로 표시
export function QRCard({ code }: { code: string | null }) {
  const url = `${window.location.origin}/`;
  return (
    <div className="qr-card">
      <div className="qr-card-title">스마트폰으로 의견 남기기</div>
      <QRCodeSVG value={url} className="qr-card-img" bgColor="#ffffff" fgColor="#0e1a2b" marginSize={0} level="M" />
      <div className="qr-card-code-label">입장 코드</div>
      <div className="qr-card-code">{code ?? '····'}</div>
    </div>
  );
}
