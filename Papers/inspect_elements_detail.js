const fs = require('fs');
const path = require('path');

const xml = fs.readFileSync(path.join(__dirname, 'vulnix_original', 'word', 'document.xml'), 'utf8');

const elementRegex = /<(w:p|w:tbl|w:sectPr)(?:\s[^>]*)?>.*?<\/\1>|<w:sectPr(?:\s[^>]*)?\/>/gs;
let match;
let elements = [];
while ((match = elementRegex.exec(xml)) !== null) {
  elements.push(match[0]);
}

console.log('Sample Element 1 (Title):');
console.log(elements[1].substring(0, 300));

console.log('\nSample Element 4 (Student Dinesh):');
console.log(elements[4].substring(0, 300));

console.log('\nSample Element 76 (CHAPTER 1):');
console.log(elements[76].substring(0, 300));

console.log('\nSample Element 77 (INTRODUCTION):');
console.log(elements[77].substring(0, 300));

console.log('\nSample Element 78 (First paragraph of Chapter 1):');
console.log(elements[78].substring(0, 300));

console.log('\nSample Element in Appendix A (Code paragraph):');
console.log(elements[330].substring(0, 300));
