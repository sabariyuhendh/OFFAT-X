const fs = require('fs');
const els = JSON.parse(fs.readFileSync('./pristine_elements.json', 'utf8'));

for (let i = 310; i < els.length; i++) {
  const e = els[i];
  console.log(`[${e.idx}] ${e.type} | blips: [${e.blips.join(',')}] | text: "${e.text.substring(0, 70)}"`);
}
