const fs = require('fs');
const els = JSON.parse(fs.readFileSync('./pristine_elements.json', 'utf8'));

fs.writeFileSync('pristine_154_to_310.txt', 
  els.slice(154, 311).map(e => `[${e.idx}] ${e.type} | blips: [${e.blips.join(',')}] | text: "${e.text}"\n`).join(''),
  'utf8'
);
console.log('Saved pristine_154_to_310.txt');
