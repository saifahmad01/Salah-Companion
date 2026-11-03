const fs = require('fs');
const path = require('path');

const pdfPath = 'Top 600 Words of the Quran.pdf';
const outDir = 'C:/Users/Mdsai/.gemini/antigravity/brain/1939eea4-fba8-420b-aa3f-5a49b8d4b0d8/scratch/slides';
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

console.log('Reading PDF buffer...');
const buf = fs.readFileSync(pdfPath);
console.log('PDF buffer loaded, searching for 1600x2500 slides...');

let pos = 0;
const slides = [];

while ((pos = buf.indexOf('/Subtype /Image', pos)) !== -1) {
  const objStart = buf.lastIndexOf('obj', pos);
  let streamStart = buf.indexOf('stream', pos) + 6;
  if (buf[streamStart] === 13 && buf[streamStart + 1] === 10) streamStart += 2;
  else if (buf[streamStart] === 10) streamStart += 1;
  const streamEnd = buf.indexOf('endstream', streamStart);
  const header = buf.subarray(objStart - 20, streamStart).toString('latin1');
  const wMatch = header.match(/\/Width\s+(\d+)/);
  const hMatch = header.match(/\/Height\s+(\d+)/);
  const w = wMatch ? parseInt(wMatch[1]) : 0;
  const h = hMatch ? parseInt(hMatch[1]) : 0;

  if (w === 1600 && h === 2500) {
    slides.push({ streamStart, streamEnd, len: streamEnd - streamStart });
  }
  pos += 15;
}

console.log(`Found ${slides.length} master slides. Exporting JPEGs...`);

for (let i = 0; i < slides.length; i++) {
  const s = slides[i];
  const outPath = path.join(outDir, `slide_${String(i).padStart(3, '0')}.jpg`);
  if (!fs.existsSync(outPath)) {
    fs.writeFileSync(outPath, buf.subarray(s.streamStart, s.streamEnd));
  }
}

console.log('All slides exported to:', outDir);
