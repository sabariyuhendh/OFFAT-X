const fs = require('fs');
const path = require('path');

const xml = fs.readFileSync(path.join(__dirname, 'vulnix_original', 'word', 'document.xml'), 'utf8');

const elementRegex = /<(w:p|w:tbl|w:sectPr)(?:\s[^>]*)?>.*?<\/\1>|<w:sectPr(?:\s[^>]*)?\/>/gs;
let elements = [];
let match;
while ((match = elementRegex.exec(xml)) !== null) {
  elements.push(match[0]);
}

console.log('Total elements in vulnix_original:', elements.length);

function replaceParaText(pXml, newText) {
  const pPrMatch = pXml.match(/<w:pPr(?:\s[^>]*)?>.*?<\/w:pPr>/s);
  const pPr = pPrMatch ? pPrMatch[0] : '';
  const rPrMatch = pXml.match(/<w:rPr(?:\s[^>]*)?>.*?<\/w:rPr>/s);
  const rPr = rPrMatch ? rPrMatch[0] : '';
  const pTagMatch = pXml.match(/^<w:p(?:\s[^>]*)?>/);
  const pTag = pTagMatch ? pTagMatch[0] : '<w:p>';
  return `${pTag}${pPr}<w:r>${rPr}<w:t xml:space="preserve">${newText}</w:t></w:r></w:p>`;
}

const testP = replaceParaText(elements[1], 'OFFAT-X: A SANDBOXED, DEPENDENCY-AWARE AND ROLE-DIFFERENTIAL FRAMEWORK');
console.log('Replaced paragraph:');
console.log(testP);
