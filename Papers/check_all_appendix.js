const fs = require('fs');
const path = require('path');

const xml = fs.readFileSync(path.join(__dirname, 'vulnix_original', 'word', 'document.xml'), 'utf8');

const elementRegex = /<(w:p|w:tbl|w:sectPr)(?:\s[^>]*)?>.*?<\/\1>|<w:sectPr(?:\s[^>]*)?\/>/gs;
let elements = [];
let match;
while ((match = elementRegex.exec(xml)) !== null) {
  elements.push(match[0]);
}

console.log('=== APPENDIX A & B DETAILED DUMP ===');
for (let i = 324; i <= 463; i++) {
  const t = [...elements[i].matchAll(/<w:t(?:\s[^>]*)?>(.*?)<\/w:t>/g)].map(m => m[1]).join(' ').trim();
  const hasDrawing = elements[i].includes('<w:drawing');
  const blip = (elements[i].match(/r:embed="([^"]+)"/) || [])[1];
  console.log(`[E${i}] [drawing:${hasDrawing ? blip : 'no'}]: ${t.substring(0, 80)}`);
}
