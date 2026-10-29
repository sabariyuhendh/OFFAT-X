const fs = require('fs');
const path = require('path');

const xml = fs.readFileSync(path.join(__dirname, 'vulnix_pristine', 'word', 'document.xml'), 'utf8');

const rIds = ['rId23', 'rId24', 'rId25', 'rId26', 'rId27', 'rId28', 'rId29', 'rId30', 'rId31'];

rIds.forEach(id => {
  const regex = new RegExp(`<w:p(?:\\s[^>]*)?>.*?${id}.*?<\\/w:p>`, 's');
  const match = xml.match(regex);
  if (match) {
    console.log(`Found drawing for ${id} (length ${match[0].length})`);
  } else {
    console.error(`Missing drawing for ${id}!`);
  }
});
