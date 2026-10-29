const fs = require('fs');
const doc = fs.readFileSync('vulnix_temp/word/document.xml', 'utf8');

// Print first 5 paragraphs
const pList = doc.match(/<w:p(?:\s[^>]*)?>.*?<\/w:p>/gs) || [];
console.log('--- FIRST 5 PARAGRAPHS ---');
pList.slice(0, 5).forEach((p, i) => console.log(`[p${i}]: ${p.substring(0, 200)}\n`));

// Print Table 4.1 sample XML
const tList = doc.match(/<w:tbl(?:\s[^>]*)?>.*?<\/w:tbl>/gs) || [];
console.log(`Total tables: ${tList.length}`);
if (tList.length > 0) {
  console.log('Table 0 snippet:');
  console.log(tList[0].substring(0, 400));
}
