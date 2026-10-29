const fs = require('fs');
const paras = JSON.parse(fs.readFileSync('./vulnix_paragraphs.json', 'utf8'));

console.log(`Total paragraphs in original Vulnix: ${paras.length}`);
for (let i = 300; i < paras.length; i++) {
  const p = paras[i];
  if (p.text || p.hasDrawing) {
    console.log(`[${i}] style="${p.style}" draw=${p.hasDrawing} text="${p.text.substring(0, 80)}"`);
  }
}
