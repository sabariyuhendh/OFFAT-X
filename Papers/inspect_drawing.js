const fs = require('fs');
const doc = fs.readFileSync('vulnix_temp/word/document.xml', 'utf8');

const pList = doc.match(/<w:p(?:\s[^>]*)?>.*?<\/w:p>/gs) || [];
for (let p of pList) {
  if (p.includes('rId23') || p.includes('rId24')) {
    console.log('Paragraph with rId23/24:');
    console.log(p.substring(0, 500));
    console.log('...\n');
  }
}
