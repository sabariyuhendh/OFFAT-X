const fs = require('fs');
const path = require('path');

const xml = fs.readFileSync(path.join(__dirname, 'vulnix_temp', 'word', 'document.xml'), 'utf8');

const mediaDir = path.join(__dirname, 'vulnix_temp', 'word', 'media');
if (fs.existsSync(mediaDir)) {
  console.log('Media files in Vulnix:', fs.readdirSync(mediaDir));
}

// Find all paragraphs
const pRegex = /<w:p(?:\s[^>]*)?>(.*?)<\/w:p>/gs;
let pMatch;
let paragraphs = [];
while ((pMatch = pRegex.exec(xml)) !== null) {
  const pContent = pMatch[1];
  const tMatches = [...pContent.matchAll(/<w:t(?:\s[^>]*)?>(.*?)<\/w:t>/g)].map(m => m[1]).join('');
  const styleMatch = pContent.match(/<w:pStyle\s+w:val="([^"]+)"/);
  const style = styleMatch ? styleMatch[1] : '';
  const hasDrawing = pContent.includes('<w:drawing');
  paragraphs.push({ style, text: tMatches.trim(), hasDrawing });
}

console.log('Total paragraphs:', paragraphs.length);
fs.writeFileSync(path.join(__dirname, 'vulnix_paragraphs.json'), JSON.stringify(paragraphs, null, 2));

// Print Table of Contents or outline
console.log('\n--- DOCUMENT OUTLINE ---');
for (let i = 0; i < paragraphs.length; i++) {
  const p = paragraphs[i];
  if (p.style.toLowerCase().includes('heading') || 
      /^(CHAPTER|1\.|2\.|3\.|4\.|5\.|6\.|7\.|8\.|9\.|TABLE OF CONTENTS|LIST OF TABLES|LIST OF FIGURES|ABSTRACT|BONAFIDE|DECLARATION|ACKNOWLEDGEMENT|REFERENCES|APPENDICES)/i.test(p.text)) {
    console.log(`[p${i}] [${p.style}] ${p.text.substring(0, 80)}`);
  }
}
