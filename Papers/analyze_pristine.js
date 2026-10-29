const fs = require('fs');
const path = require('path');

const xml = fs.readFileSync(path.join(__dirname, 'vulnix_pristine', 'word', 'document.xml'), 'utf8');

const start = xml.indexOf('<w:body>') + '<w:body>'.length;
const end = xml.lastIndexOf('</w:body>');
const body = xml.substring(start, end);

const elementRegex = /<(w:p|w:tbl|w:sectPr)(?:\s[^>]*)?>.*?<\/\1>|<w:sectPr(?:\s[^>]*)?\/>/gs;
let match, elements = [];
while ((match = elementRegex.exec(body)) !== null) elements.push(match[0]);

console.log(`Total elements in pristine: ${elements.length}`);

fs.writeFileSync(path.join(__dirname, 'pristine_elements.json'), JSON.stringify(elements.map((el, idx) => {
  const isTbl = el.startsWith('<w:tbl');
  const isSect = el.startsWith('<w:sectPr');
  const type = isTbl ? 'tbl' : isSect ? 'sectPr' : 'p';
  const blipMatch = el.match(/r:embed="([^"]+)"/g);
  const blips = blipMatch ? blipMatch.map(b => b.replace(/r:embed="|"/g, '')) : [];
  const text = (el.match(/<w:t[^>]*>(.*?)<\/w:t>/g) || []).map(t => t.replace(/<[^>]+>/g, '')).join(' ');
  return { idx, type, blips, text: text.trim() };
}), null, 2), 'utf8');

console.log('Saved pristine_elements.json');
