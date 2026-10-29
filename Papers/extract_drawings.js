const fs = require('fs');
const doc = fs.readFileSync('vulnix_temp/word/document.xml', 'utf8');

const pList = doc.match(/<w:p(?:\s[^>]*)?>.*?<\/w:p>/gs) || [];

for (let i = 0; i < pList.length; i++) {
  const p = pList[i];
  if (p.includes('<w:drawing')) {
    const rId = (p.match(/r:embed="([^"]+)"/) || [])[1];
    const prevText = i > 0 ? [...pList[i-1].matchAll(/<w:t(?:\s[^>]*)?>(.*?)<\/w:t>/g)].map(m => m[1]).join('') : '';
    const nextText = i < pList.length - 1 ? [...pList[i+1].matchAll(/<w:t(?:\s[^>]*)?>(.*?)<\/w:t>/g)].map(m => m[1]).join('') : '';
    console.log(`\nDrawing at index ${i}, rId: ${rId}`);
    console.log(`Prev text: "${prevText.substring(0, 100)}"`);
    console.log(`Next text: "${nextText.substring(0, 100)}"`);
    console.log(`Drawing tag snippet: ${p.substring(0, 250)}...`);
  }
}
