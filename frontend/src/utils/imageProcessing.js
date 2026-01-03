const TARGETS = {
  closer: {
    w: 600,
    h: 600,
    mime: 'image/jpeg'
  },
  family: {
    w: 1200,
    h: 900,
    mime: 'image/jpeg'
  },
  personal: {
    w: 900,
    h: 1200,
    mime: 'image/jpeg'
  },
  other: {
    w: 1200,
    h: 1200,
    mime: 'image/jpeg'
  }
};
function loadImageFromFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = reader.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
function computeCoverCrop(srcW, srcH, targetW, targetH) {
  const srcRatio = srcW / srcH;
  const dstRatio = targetW / targetH;
  let drawW, drawH, sx, sy;
  if (srcRatio > dstRatio) {
    drawH = srcH;
    drawW = Math.round(srcH * dstRatio);
    sx = Math.round((srcW - drawW) / 2);
    sy = 0;
  } else {
    drawW = srcW;
    drawH = Math.round(srcW / dstRatio);
    sx = 0;
    sy = Math.round((srcH - drawH) / 2);
  }
  return {
    sx,
    sy,
    sw: drawW,
    sh: drawH
  };
}
async function canvasToFile(canvas, mime = 'image/jpeg', baseName = 'image', maxBytes = 2 * 1024 * 1024) {
  let quality = 0.9;
  let blob = await new Promise(resolve => canvas.toBlob(resolve, mime, quality));
  while (blob && blob.size > maxBytes && quality > 0.5) {
    quality -= 0.1;
    blob = await new Promise(resolve => canvas.toBlob(resolve, mime, quality));
  }
  const ext = mime === 'image/png' ? 'png' : 'jpg';
  const filename = `${baseName}.${ext}`;
  return new File([blob], filename, {
    type: mime,
    lastModified: Date.now()
  });
}
export async function processAndAdjustImage(file, category = 'other') {
  try {
    const target = TARGETS[category] || TARGETS.other;
    const img = await loadImageFromFile(file);
    const canvas = document.createElement('canvas');
    canvas.width = target.w;
    canvas.height = target.h;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, target.w, target.h);
    const {
      sx,
      sy,
      sw,
      sh
    } = computeCoverCrop(img.naturalWidth || img.width, img.naturalHeight || img.height, target.w, target.h);
    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, target.w, target.h);
    const base = (file.name || 'photo').replace(/\.[^.]+$/, '');
    const out = await canvasToFile(canvas, target.mime, `${base}_${category}`);
    return out;
  } catch (e) {
    console.warn('Image processing failed, using original file', e);
    return file;
  }
}
export default {
  processAndAdjustImage
};