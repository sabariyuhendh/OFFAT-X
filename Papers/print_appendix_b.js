const fs = require('fs');
const doc = fs.readFileSync('vulnix_temp/word/document.xml', 'utf8');

const pList = doc.match(/<w:p(?:\s[^>]*)?>.*?<\/w:p>/gs) || [];
let inAppendixB = false;

for (let p of pList) {
  const text = [...p.matchAll(/<w:t(?:\s[^>]*)?>(.*?)<\/w:t>/g)].map(m => m[1]).join('').trim();
  if (text.includes('APPENDIX B')) {
    inAppendixB = true;
  }
  if (text.includes('REFERENCES') && inAppendixB) {
    inAppendixB = false;
  }
  if (inAppendixB) {
    const hasDrawing = p.includes('<w:drawing');
    const blips = [...p.matchAll(/r:embed="([^"]+)"/g)].map(m => m[1]);
    console.log(`[p] text: "${text}" | drawing: ${hasDrawing} | blips: ${blips.join(',')}`);
  }
}
