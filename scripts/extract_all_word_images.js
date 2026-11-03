import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const slidesDir = 'C:/Users/Mdsai/.gemini/antigravity/brain/1939eea4-fba8-420b-aa3f-5a49b8d4b0d8/scratch/slides';
const outDir = 'public/images/quran_words';
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

console.log('Cropping 600 authentic Arabic word images from PDF slides...');
const sw = Date.now();

let wordId = 1;

// 1. Single-word slides: Slides 6 to 29 (Words 1 to 24)
for (let s = 6; s <= 29; s++) {
  const p = path.join(slidesDir, `slide_${String(s).padStart(3, '0')}.jpg`);
  const outPath = path.join(outDir, `word_${String(wordId).padStart(3, '0')}.webp`);
  await sharp(p)
    .extract({ left: 100, top: 230, width: 420, height: 260 })
    .webp({ quality: 85 })
    .toFile(outPath);
  wordId++;
}

// 2. Two-word slides: Slides 30 to 317 (Words 25 to 600)
for (let s = 30; s <= 317; s++) {
  const p = path.join(slidesDir, `slide_${String(s).padStart(3, '0')}.jpg`);

  // Word A (Top half)
  const outPathA = path.join(outDir, `word_${String(wordId).padStart(3, '0')}.webp`);
  await sharp(p)
    .extract({ left: 100, top: 130, width: 440, height: 230 })
    .webp({ quality: 85 })
    .toFile(outPathA);
  wordId++;

  // Word B (Bottom half)
  const outPathB = path.join(outDir, `word_${String(wordId).padStart(3, '0')}.webp`);
  await sharp(p)
    .extract({ left: 100, top: 1360, width: 440, height: 230 })
    .webp({ quality: 85 })
    .toFile(outPathB);
  wordId++;
}

console.log(`Successfully cropped all ${wordId - 1} word images in ${((Date.now() - sw) / 1000).toFixed(1)}s!`);
