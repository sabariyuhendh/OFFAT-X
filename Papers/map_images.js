const fs = require('fs');
const path = require('path');

const xml = fs.readFileSync(path.join(__dirname, 'vulnix_temp', 'word', 'document.xml'), 'utf8');

// Find all drawings and their surrounding text / captions
const pRegex = /<w:p(?:\s[^>]*)?>(.*?)<\/w:p>/gs;
let pMatch;
let figures = [];
let prevText = '';

while ((pMatch = pRegex.exec(xml)) !== null) {
  const pContent = pMatch[1];
  const tMatches = [...pContent.matchAll(/<w:t(?:\s[^>]*)?>(.*?)<\/w:t>/g)].map(m => m[1]).join('').trim();
  
  if (pContent.includes('<w:drawing')) {
    // extract r:embed or blip
    const blipMatches = [...pContent.matchAll(/r:embed="([^"]+)"/g)].map(m => m[1]);
    figures.push({ prevText, tMatches, blips: blipMatches });
  }
  if (tMatches) {
    prevText = tMatches;
  }
}

// Read relationships to map blip ID to media filename
const relsXml = fs.readFileSync(path.join(__dirname, 'vulnix_temp', 'word', '_rels', 'document.xml.rels'), 'utf8');
const rels = {};
const relRegex = /Id="([^"]+)"\s+Type="[^"]*image"\s+Target="([^"]+)"/g;
let rm;
while ((rm = relRegex.exec(relsXml)) !== null) {
  rels[rm[1]] = rm[2];
}

console.log('Mapped drawings:');
figures.forEach((f, idx) => {
  const files = f.blips.map(b => rels[b] || b).join(', ');
  console.log(`\n--- Figure ${idx + 1} ---`);
  console.log(`File: ${files}`);
  console.log(`Surrounding/Caption: ${f.tMatches || f.prevText}`);
});
