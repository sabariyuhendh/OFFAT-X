const fs = require('fs');
const doc = fs.readFileSync('vulnix_temp/word/document.xml', 'utf8');

const sectPrMatches = [...doc.matchAll(/<w:sectPr(?:\s[^>]*)?>.*?<\/w:sectPr>/gs)];
console.log('Total sectPr:', sectPrMatches.length);

sectPrMatches.forEach((m, idx) => {
  console.log(`\n--- sectPr ${idx + 1} ---`);
  console.log(m[0]);
});
