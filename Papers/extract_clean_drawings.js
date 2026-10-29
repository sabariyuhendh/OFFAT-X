const fs = require('fs');
const path = require('path');

const xml = fs.readFileSync(path.join(__dirname, 'vulnix_pristine', 'word', 'document.xml'), 'utf8');
const pMatches = xml.match(/<w:p(?:\s[^>]*)?>.*?<\/w:p>/gs) || [];

const drawings = {};
pMatches.forEach(p => {
  const blip = p.match(/r:embed="([^"]+)"/);
  if (blip) {
    drawings[blip[1]] = p;
  }
});

console.log('Extracted drawings:');
Object.keys(drawings).forEach(k => console.log(`${k}: length ${drawings[k].length}`));

fs.writeFileSync('drawings_clean.json', JSON.stringify(drawings, null, 2), 'utf8');
console.log('Saved drawings_clean.json');
