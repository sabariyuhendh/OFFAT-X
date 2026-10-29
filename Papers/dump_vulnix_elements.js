const fs = require('fs');
const els = JSON.parse(fs.readFileSync('./vulnix_elements.json', 'utf8'));

console.log(`Total top-level elements: ${els.length}`);
for (let i = 310; i < els.length; i++) {
  const el = els[i];
  console.log(`[${i}] type=${el.type} style="${el.style || ''}" draw=${el.hasDrawing} text="${(el.text || '').substring(0, 80)}"`);
}
