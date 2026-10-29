const fs = require('fs');
const doc = fs.readFileSync('vulnix_temp/word/document.xml', 'utf8');

console.log('Document start (first 500 chars):');
console.log(doc.substring(0, 500));

console.log('\nDocument end (last 500 chars):');
console.log(doc.substring(doc.length - 500));
