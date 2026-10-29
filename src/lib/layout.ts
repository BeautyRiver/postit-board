// 자연스러운 회전/위치 분포 계산 (격자 + 랜덤 흔들림) — 프로토타입 data.jsx generateLayout 그대로
export interface LayoutOptions {
  cols?: number; cellW?: number; cellH?: number;
  startX?: number; startY?: number; jitter?: number; rotJitter?: number;
}
export interface Layout { x: number; y: number; rot: number; swayDelay: number; swayRotOffset: number }

export function generateLayout<T extends { id: string }>(items: T[], opts: LayoutOptions = {}): (T & Layout)[] {
  const cols = opts.cols || 4;
  const cellW = opts.cellW || 240;
  const cellH = opts.cellH || 240;
  const startX = opts.startX || 80;
  const startY = opts.startY || 110;
  const jitter = opts.jitter ?? 30;
  const rotJitter = opts.rotJitter ?? 6;

  // 시드된 의사 랜덤 (id 기반) — 매 렌더마다 위치가 안정적
  function hash(s: string) {
    let h = 0;
    for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
    return Math.abs(h);
  }

  return items.map((item, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const h1 = hash(item.id + 'x') / 1000;
    const h2 = hash(item.id + 'y') / 1000;
    const h3 = hash(item.id + 'r') / 1000;
    const h4 = hash(item.id + 's') / 1000;
    const x = startX + col * cellW + ((h1 % 1) - 0.5) * 2 * jitter;
    const y = startY + row * cellH + ((h2 % 1) - 0.5) * 2 * jitter;
    const rot = ((h3 % 1) - 0.5) * 2 * rotJitter;
    const swayDelay = (h4 % 1) * 4;
    const swayRotOffset = ((hash(item.id + 'q') % 100) / 100 - 0.5) * 2;
    return { ...item, x, y, rot, swayDelay, swayRotOffset };
  });
}
