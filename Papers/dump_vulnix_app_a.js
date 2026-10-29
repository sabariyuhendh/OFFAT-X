const fs = require('fs');
const els = JSON.parse(fs.readFileSync('./vulnix_elements.json', 'utf8'));

for (let i = 324; i <= 403; i++) {
  const el = els[i];
  if (el.text || el.hasDrawing) {
    console.log(`[${i}] style="${el.style || ''}" text="${(el.text || '').substring(0, 80)}"`);
  } else {
    console.log(`[${i}] (EMPTY)`);
  }
}
