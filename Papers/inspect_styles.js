const fs = require('fs');
const path = require('path');

// Read styles.xml
const stylesXml = fs.readFileSync(path.join(__dirname, 'vulnix_temp', 'word', 'styles.xml'), 'utf8');

// Check what fonts are used
const fontMatches = [...stylesXml.matchAll(/<w:rFonts[^>]+>/g)].map(m => m[0]);
console.log('Sample fonts in styles.xml:', [...new Set(fontMatches)].slice(0, 10));

// Read document.xml section properties (margins, page size)
const docXml = fs.readFileSync(path.join(__dirname, 'vulnix_temp', 'word', 'document.xml'), 'utf8');
const sectPr = docXml.match(/<w:sectPr(?:\s[^>]*)?>.*?<\/w:sectPr>/gs);
if (sectPr) {
  console.log('Section properties count:', sectPr.length);
  console.log('Section pr sample:', sectPr[sectPr.length - 1].substring(0, 300));
}

// Check headers and footers
const files = fs.readdirSync(path.join(__dirname, 'vulnix_temp', 'word'));
console.log('Word directory files:', files.filter(f => f.startsWith('header') || f.startsWith('footer')));
