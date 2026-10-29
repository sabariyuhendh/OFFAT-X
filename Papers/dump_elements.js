const fs = require('fs');
const path = require('path');

const xml = fs.readFileSync(path.join(__dirname, 'vulnix_original', 'word', 'document.xml'), 'utf8');

const elementRegex = /<(w:p|w:tbl|w:sectPr)(?:\s[^>]*)?>.*?<\/\1>|<w:sectPr(?:\s[^>]*)?\/>/gs;
let match;
let lines = [];
let index = 0;

while ((match = elementRegex.exec(xml)) !== null) {
  const type = match[1] || 'w:sectPr';
  const raw = match[0];
  const text = [...raw.matchAll(/<w:t(?:\s[^>]*)?>(.*?)<\/w:t>/g)].map(m => m[1]).join(' ').trim();
  const styleMatch = raw.match(/<w:pStyle\s+w:val="([^"]+)"/);
  const style = styleMatch ? styleMatch[1] : '';
  const hasDrawing = raw.includes('<w:drawing');
  const blipMatch = raw.match(/r:embed="([^"]+)"/);
  const blip = blipMatch ? blipMatch[1] : '';

  lines.push(`[${index}] [${type}] [style:${style}] [drawing:${hasDrawing ? blip : 'no'}]\n${text}\n`);
  index++;
}

fs.writeFileSync('vulnix_elements_full.txt', lines.join('\n'));
console.log(`Dumped ${index} elements to vulnix_elements_full.txt`);
