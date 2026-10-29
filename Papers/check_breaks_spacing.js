const fs = require('fs');
const path = require('path');

const xml = fs.readFileSync(path.join(__dirname, 'vulnix_original', 'word', 'document.xml'), 'utf8');
const start = xml.indexOf('<w:body>') + 8;
const end = xml.lastIndexOf('</w:body>');
const body = xml.substring(start, end);
const elementRegex = /<(w:p|w:tbl|w:sectPr)(?:\s[^>]*)?>.*?<\/\1>|<w:sectPr(?:\s[^>]*)?\/>/gs;
let match, elements = [];
while ((match = elementRegex.exec(body)) !== null) elements.push(match[0]);

console.log(`Checking ${elements.length} elements for page breaks, alignment, and blank sequences...`);

let pageBreaks = [];
for (let i = 0; i < elements.length; i++) {
  const el = elements[i];
  const hasPb = el.includes('w:type="page"') || el.includes('<w:pageBreakBefore');
  const hasSect = el.startsWith('<w:sectPr');
  const text = (el.match(/<w:t[^>]*>(.*?)<\/w:t>/g) || []).map(t => t.replace(/<[^>]+>/g, '')).join(' ').trim();
  const alignMatch = el.match(/<w:jc\s+w:val="([^"]+)"/);
  const align = alignMatch ? alignMatch[1] : 'default';

  if (hasPb || hasSect) {
    pageBreaks.push({ idx: i, type: hasPb ? 'PAGE_BREAK' : 'SECTION_BREAK', text: text.substring(0, 50) });
  }
}

console.log(`\nFound ${pageBreaks.length} page breaks/section breaks:`);
pageBreaks.forEach(pb => console.log(`[${pb.idx}] ${pb.type} | text: "${pb.text}"`));

console.log('\nChecking runs of consecutive empty paragraphs:');
let emptyRun = 0;
let emptyStart = -1;
for (let i = 0; i < elements.length; i++) {
  const el = elements[i];
  const hasDrawing = el.includes('<w:drawing');
  const text = (el.match(/<w:t[^>]*>(.*?)<\/w:t>/g) || []).map(t => t.replace(/<[^>]+>/g, '')).join(' ').trim();
  const isEmpty = !hasDrawing && text.length === 0;

  if (isEmpty) {
    if (emptyRun === 0) emptyStart = i;
    emptyRun++;
  } else {
    if (emptyRun > 1) {
      console.log(`Elements [${emptyStart} to ${i - 1}]: ${emptyRun} consecutive empty paragraphs!`);
    }
    emptyRun = 0;
  }
}
if (emptyRun > 1) {
  console.log(`Elements [${emptyStart} to ${elements.length - 1}]: ${emptyRun} consecutive empty paragraphs!`);
}
