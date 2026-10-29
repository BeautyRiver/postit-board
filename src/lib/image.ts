// 사진 첨부 — Storage 없이 Firestore 포스트잇 문서에 data URL로 함께 저장한다.
// Firestore 문서 최대 크기가 1MiB이므로 긴 변 1000px JPEG로 줄이고, 그래도 크면 품질·크기를 더 낮춘다.
export const PHOTO_MAX_SIDE = 1000;
export const PHOTO_MAX_CHARS = 700_000;   // data URL 길이 상한 (보안 규칙과 같은 값)

async function loadBitmap(file: File): Promise<ImageBitmap> {
  return createImageBitmap(file, { imageOrientation: 'from-image' });
}

function encode(bitmap: ImageBitmap, maxSide: number, quality: number): string {
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('이미지를 처리할 수 없어요');
  ctx.fillStyle = '#fff';               // 투명 PNG가 검게 나오지 않도록
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/jpeg', quality);
}

export async function photoToDataUrl(file: File): Promise<string> {
  const bitmap = await loadBitmap(file);
  try {
    for (const [side, q] of [[PHOTO_MAX_SIDE, 0.8], [PHOTO_MAX_SIDE, 0.65], [800, 0.6], [640, 0.5]] as const) {
      const url = encode(bitmap, side, q);
      if (url.length <= PHOTO_MAX_CHARS) return url;
    }
    throw new Error('사진 용량이 너무 커요');
  } finally {
    bitmap.close();
  }
}
