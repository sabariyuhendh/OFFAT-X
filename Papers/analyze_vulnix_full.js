const fs = require('fs');
const path = require('path');

const xml = fs.readFileSync(path.join(__dirname, 'vulnix_original', 'word', 'document.xml'), 'utf8');

// Match all elements inside w:body
const bodyMatch = xml.match(/<w:body>(.*?)<\/w:body>/s);
if (!bodyMatch) {
  console.error('No w:body found!');
  process.exit(1);
}

const bodyContent = bodyMatch[1];

// Find top-level children of w:body: w:p, w:tbl, w:sectPr
const elementRegex = /<(w:p|w:tbl|w:sectPr)(?:\s[^>]*)?>.*?<\/\1>|<w:sectPr(?:\s[^>]*)?\/>/gs;
let match;
let elements = [];
while ((match = elementRegex.exec(bodyContent)) !== null) {
  const type = match[1] || 'w:sectPr';
  const raw = match[0];
  const text = [...raw.matchAll(/<w:t(?:\s[^>]*)?>(.*?)<\/w:t>/g)].map(m => m[1]).join('').trim();
  const hasDrawing = raw.includes('<w:drawing');
  const blips = [...raw.matchAll(/r:embed="([^"]+)"/g)].map(m => m[1]);
  elements.push({ index: elements.length, type, text: text.substring(0, 100), fullLength: raw.length, hasDrawing, blips });
}

console.log(`Total top-level elements in original Vulnix document: ${elements.length}`);
fs.writeFileSync('vulnix_elements.json', JSON.stringify(elements, null, 2));

// Print summary of elements
elements.forEach(e => {
  if (e.type === 'w:tbl') {
    console.log(`[E${e.index}] TABLE: ${e.text.substring(0, 70)}...`);
  } else if (e.hasDrawing) {
    console.log(`[E${e.index}] DRAWING (${e.blips.join(', ')}): ${e.text.substring(0, 70)}`);
  } else if (/^(CHAPTER|[0-9]\.[0-9]|TABLE OF CONTENTS|LIST OF|ABSTRACT|BONAFIDE|DECLARATION|ACKNOWLEDGEMENT|REFERENCES|APPENDIX)/i.test(e.text)) {
    console.log(`[E${e.index}] ${e.text.substring(0, 80)}`);
  }
});
