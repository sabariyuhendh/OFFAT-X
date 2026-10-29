const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    const full = path.join(dir, file);
    const stat = fs.statSync(full);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(full));
    } else {
      results.push(full);
    }
  });
  return results;
}

const files = walk(path.join(__dirname, 'vulnix_original'));
const badWords = ['vulnix', 'dinesh', 'divyadharshini', 'sanjay', 'stude', 'groq'];

let found = [];
files.forEach(f => {
  if (f.endsWith('.xml') || f.endsWith('.rels')) {
    const content = fs.readFileSync(f, 'utf8');
    for (const bw of badWords) {
      if (content.toLowerCase().includes(bw)) {
        found.push({ file: path.relative(__dirname, f), word: bw });
        break;
      }
    }
  }
});

console.log(`Scanned ${files.length} files. Hits found: ${found.length}`);
found.forEach(h => console.log(`In ${h.file}: matched "${h.word}"`));
