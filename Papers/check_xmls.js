const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, 'vulnix_temp', 'word');
const files = fs.readdirSync(dir);

for (let file of files) {
  if (file.endsWith('.xml')) {
    const content = fs.readFileSync(path.join(dir, file), 'utf8');
    const textMatches = [...content.matchAll(/<w:t(?:\s[^>]*)?>(.*?)<\/w:t>/g)].map(m => m[1]).join(' ').trim();
    if (textMatches) {
      console.log(`[${file}]: ${textMatches.substring(0, 150)}`);
    }
  }
}
