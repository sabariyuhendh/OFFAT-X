const fs = require('fs');
const els = JSON.parse(fs.readFileSync('./pristine_elements.json', 'utf8'));

fs.writeFileSync('pristine_0_to_153.txt', 
  els.slice(0, 154).map(e => `[${e.idx}] ${e.type} | blips: [${e.blips.join(',')}] | text: "${e.text}"\n`).join(''),
  'utf8'
);
console.log('Saved pristine_0_to_153.txt');
