import { QRCodeSVG } from 'qrcode.react';

// 벽 우하단 QR 카드 — 참여자 입력 URL = 현재 도메인 + /b/{code}
export function QRCard({ code }: { code: string }) {
  const url = `${window.location.origin}/b/${code}`;
  return (
    <div className="qr-card">
      <div className="qr-card-title">스마트폰으로 의견 남기기</div>
      <QRCodeSVG value={url} className="qr-card-img" bgColor="#ffffff" fgColor="#0e1a2b" marginSize={0} level="M" />
      <div className="qr-card-url">{window.location.host}/b/<strong>{code}</strong></div>
    </div>
  );
}
