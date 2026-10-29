const fs = require('fs');
const path = require('path');

const xml = fs.readFileSync(path.join(__dirname, 'vulnix_original', 'word', 'document.xml'), 'utf8');
const start = xml.indexOf('<w:body>') + 8;
const end = xml.lastIndexOf('</w:body>');
const body = xml.substring(start, end);
const elementRegex = /<(w:p|w:tbl|w:sectPr)(?:\s[^>]*)?>.*?<\/\1>|<w:sectPr(?:\s[^>]*)?\/>/gs;
let match, elements = [];
while ((match = elementRegex.exec(body)) !== null) elements.push(match[0]);

console.log('Appendix B elements (403 - 463):');
for (let i = 403; i <= 463; i++) {
  const el = elements[i];
  const blipMatch = el.match(/r:embed="([^"]+)"/);
  const blip = blipMatch ? blipMatch[1] : '';
  const hasPb = el.includes('w:type="page"') || el.includes('<w:pageBreakBefore');
  const text = (el.match(/<w:t[^>]*>(.*?)<\/w:t>/g) || []).map(t => t.replace(/<[^>]+>/g, '')).join(' ').trim();
  console.log(`[${i}] pb=${hasPb} blip=${blip || 'none'} | text: "${text.substring(0, 60)}"`);
}
