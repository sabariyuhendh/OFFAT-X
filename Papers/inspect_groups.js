const fs = require('fs');
const path = require('path');

const xml = fs.readFileSync(path.join(__dirname, 'vulnix_original', 'word', 'document.xml'), 'utf8');

const elementRegex = /<(w:p|w:tbl|w:sectPr)(?:\s[^>]*)?>.*?<\/\1>|<w:sectPr(?:\s[^>]*)?\/>/gs;
let elements = [];
let match;
while ((match = elementRegex.exec(xml)) !== null) {
  elements.push(match[0]);
}

function getText(el) {
  return [...el.matchAll(/<w:t(?:\s[^>]*)?>(.*?)<\/w:t>/g)].map(m => m[1]).join(' ').trim();
}

console.log('--- CHAPTER 1 ELEMENTS (76 to 86) ---');
for (let i = 76; i <= 86; i++) {
  console.log(`[E${i}]: ${getText(elements[i]).substring(0, 100)}`);
}

console.log('\n--- CHAPTER 2 ELEMENTS (87 to 106) ---');
for (let i = 87; i <= 106; i++) {
  console.log(`[E${i}]: ${getText(elements[i]).substring(0, 100)}`);
}

console.log('\n--- CHAPTER 3 ELEMENTS (107 to 153) ---');
for (let i = 107; i <= 153; i++) {
  const t = getText(elements[i]);
  if (t) console.log(`[E${i}]: ${t.substring(0, 100)}`);
}
