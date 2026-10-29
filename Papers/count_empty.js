const fs = require('fs');
const path = require('path');

const xml = fs.readFileSync(path.join(__dirname, 'vulnix_original', 'word', 'document.xml'), 'utf8');
const start = xml.indexOf('<w:body>') + 8;
const end = xml.lastIndexOf('</w:body>');
const body = xml.substring(start, end);
const elementRegex = /<(w:p|w:tbl|w:sectPr)(?:\s[^>]*)?>.*?<\/\1>|<w:sectPr(?:\s[^>]*)?\/>/gs;
let match, elements = [];
while ((match = elementRegex.exec(body)) !== null) elements.push(match[0]);

let emptyCount = 0;
let nonEmptyCount = 0;
let emptyIndices = [];

for (let i = 0; i < elements.length; i++) {
  const el = elements[i];
  if (el.startsWith('<w:tbl') || el.startsWith('<w:sectPr')) {
    nonEmptyCount++;
    continue;
  }
  const hasDrawing = el.includes('<w:drawing');
  const text = (el.match(/<w:t[^>]*>(.*?)<\/w:t>/g) || []).map(t => t.replace(/<[^>]+>/g, '')).join('').trim();
  const hasPb = el.includes('w:type="page"') || el.includes('<w:pageBreakBefore');

  if (!hasDrawing && text.length === 0 && !hasPb) {
    emptyCount++;
    emptyIndices.push(i);
  } else {
    nonEmptyCount++;
  }
}

console.log(`Total elements: ${elements.length}`);
console.log(`Non-empty / meaningful elements: ${nonEmptyCount}`);
console.log(`Pure empty blank-causing paragraphs without text/drawing/pagebreak: ${emptyCount}`);
console.log(`Empty indices sample: ${emptyIndices.slice(0, 30).join(', ')} ...`);
