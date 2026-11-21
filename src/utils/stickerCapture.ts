const MAX_DIMENSION = 1280;
const JPEG_QUALITY = 0.85;

export function resizeCanvasToDataUrl(
  source: HTMLImageElement | HTMLVideoElement,
  sourceWidth: number,
  sourceHeight: number
): string {
  const scale = Math.min(1, MAX_DIMENSION / Math.max(sourceWidth, sourceHeight));
  const width = Math.max(1, Math.round(sourceWidth * scale));
  const height = Math.max(1, Math.round(sourceHeight * scale));

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('ไม่สามารถประมวลผลภาพบนเบราว์เซอร์ได้');
  }
  ctx.drawImage(source, 0, 0, width, height);
  return canvas.toDataURL('image/jpeg', JPEG_QUALITY);
}

export function fileToResizedDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('ไม่สามารถอ่านไฟล์ภาพได้'));
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        try {
          resolve(
            resizeCanvasToDataUrl(
              img,
              img.naturalWidth || img.width,
              img.naturalHeight || img.height
            )
          );
        } catch (err) {
          reject(err);
        }
      };
      img.onerror = () => reject(new Error('ไฟล์ที่เลือกไม่ใช่รูปภาพที่รองรับ'));
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}
