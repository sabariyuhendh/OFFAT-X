const fs = require('fs');
const path = require('path');

const xml = fs.readFileSync(path.join(__dirname, 'vulnix_pristine', 'word', 'document.xml'), 'utf8');
const start = xml.indexOf('<w:body>') + 8;
const end = xml.lastIndexOf('</w:body>');
const body = xml.substring(start, end);
const elementRegex = /<(w:p|w:tbl|w:sectPr)(?:\s[^>]*)?>.*?<\/\1>|<w:sectPr(?:\s[^>]*)?\/>/gs;
let match, elements = [];
while ((match = elementRegex.exec(body)) !== null) elements.push(match[0]);

console.log('Inspecting pristine elements 325 to 465 for page breaks and empty paragraphs:');
for (let i = 325; i <= 465; i++) {
  const el = elements[i];
  const hasPageBreak = el.includes('w:type="page"') || el.includes('<w:pageBreakBefore');
  const hasDrawing = el.includes('<w:drawing');
  const text = (el.match(/<w:t[^>]*>(.*?)<\/w:t>/g) || []).map(t => t.replace(/<[^>]+>/g, '')).join(' ');
  const isSelfClosing = el.endsWith('/>') || !el.includes('<w:r');
  console.log(`[${i}] pb=${hasPageBreak} draw=${hasDrawing} empty=${isSelfClosing || text.length === 0} | text: "${text.substring(0, 60)}"`);
}
