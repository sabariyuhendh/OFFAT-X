const fs = require('fs');
const path = require('path');

const xml = fs.readFileSync(path.join(__dirname, 'vulnix_original', 'word', 'document.xml'), 'utf8');
const start = xml.indexOf('<w:body>') + 8;
const end = xml.lastIndexOf('</w:body>');
const body = xml.substring(start, end);
const elementRegex = /<(w:p|w:tbl|w:sectPr)(?:\s[^>]*)?>.*?<\/\1>|<w:sectPr(?:\s[^>]*)?\/>/gs;
let match, elements = [];
while ((match = elementRegex.exec(body)) !== null) elements.push(match[0]);

console.log('Sample Element 77 (Chapter 1 Para 1):');
console.log(elements[77].substring(0, 300));

console.log('\nSample Element 62 (Abstract Para 1):');
console.log(elements[62].substring(0, 300));

console.log('\nSample Element 171 (Chapter 4 Para):');
console.log(elements[171].substring(0, 300));
