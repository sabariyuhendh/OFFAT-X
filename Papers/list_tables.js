const fs = require('fs');
const doc = fs.readFileSync('vulnix_temp/word/document.xml', 'utf8');

const tList = doc.match(/<w:tbl(?:\s[^>]*)?>.*?<\/w:tbl>/gs) || [];

tList.forEach((tbl, idx) => {
  const text = [...tbl.matchAll(/<w:t(?:\s[^>]*)?>(.*?)<\/w:t>/g)].map(m => m[1]).join(' | ');
  console.log(`\nTable ${idx + 1}: ${text.substring(0, 150)}`);
});
