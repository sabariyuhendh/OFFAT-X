const fs = require('fs');
const doc = fs.readFileSync('vulnix_temp/word/document.xml', 'utf8');

const pList = doc.match(/<w:p(?:\s[^>]*)?>.*?<\/w:p>/gs) || [];
const drawings = {};

for (let p of pList) {
  if (p.includes('<w:drawing')) {
    const rId = (p.match(/r:embed="([^"]+)"/) || [])[1];
    if (rId) {
      drawings[rId] = p;
    }
  }
}

fs.writeFileSync('drawings.json', JSON.stringify(drawings, null, 2));
console.log('Saved drawings count:', Object.keys(drawings).length);
console.log('Saved rIds:', Object.keys(drawings));
