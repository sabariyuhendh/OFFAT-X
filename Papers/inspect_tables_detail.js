const fs = require('fs');
const path = require('path');

const xml = fs.readFileSync(path.join(__dirname, 'vulnix_original', 'word', 'document.xml'), 'utf8');

const tblRegex = /<w:tbl(?:\s[^>]*)?>.*?<\/w:tbl>/gs;
let match;
let tblIndex = 0;

while ((match = tblRegex.exec(xml)) !== null) {
  const tblXml = match[0];
  const trMatches = tblXml.match(/<w:tr(?:\s[^>]*)?>.*?<\/w:tr>/gs) || [];
  const text = [...tblXml.matchAll(/<w:t(?:\s[^>]*)?>(.*?)<\/w:t>/g)].map(m => m[1]).join(' | ').trim();
  console.log(`\n=== TABLE ${tblIndex} (Rows: ${trMatches.length}) ===`);
  console.log(text.substring(0, 150));
  tblIndex++;
}
