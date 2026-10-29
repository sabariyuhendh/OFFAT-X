const fs = require('fs');
const path = require('path');

const xml = fs.readFileSync(path.join(__dirname, 'offat_temp', 'word', 'document.xml'), 'utf8');

const pRegex = /<w:p(?:\s[^>]*)?>(.*?)<\/w:p>/gs;
let pMatch;
let lines = [];
while ((pMatch = pRegex.exec(xml)) !== null) {
  const pContent = pMatch[1];
  const tMatches = [...pContent.matchAll(/<w:t(?:\s[^>]*)?>(.*?)<\/w:t>/g)].map(m => m[1]).join('').trim();
  if (tMatches) lines.push(tMatches);
}

fs.writeFileSync(path.join(__dirname, 'offat_full_text.txt'), lines.join('\n\n'));
console.log('Total extracted paragraphs from OFFAT-X IEEE paper:', lines.length);
