const fs = require('fs');
const rels = fs.readFileSync('vulnix_temp/word/_rels/document.xml.rels', 'utf8');
const doc = fs.readFileSync('vulnix_temp/word/document.xml', 'utf8');

const relMatches = [...rels.matchAll(/Id="([^"]+)"[^>]*Target="([^"]+)"/g)];
for (let r of relMatches) {
  const id = r[1];
  const target = r[2];
  const count = (doc.match(new RegExp(id, 'g')) || []).length;
  console.log(`Rel ${id} -> ${target} (${count} in doc)`);
}
