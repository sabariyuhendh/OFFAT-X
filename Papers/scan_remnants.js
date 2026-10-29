const fs = require('fs');
const path = require('path');

const xml = fs.readFileSync(path.join(__dirname, 'vulnix_original', 'word', 'document.xml'), 'utf8');

const start = xml.indexOf('<w:body>') + '<w:body>'.length;
const end = xml.lastIndexOf('</w:body>');
const body = xml.substring(start, end);

const elementRegex = /<(w:p|w:tbl|w:sectPr)(?:\s[^>]*)?>.*?<\/\1>|<w:sectPr(?:\s[^>]*)?\/>/gs;
let match, elements = [];
while ((match = elementRegex.exec(body)) !== null) elements.push(match[0]);

console.log(`Checking ${elements.length} elements in current vulnix_original...`);

const badWords = [
  'vulnix', 'groq', 'dinesh', 'divyadharshini', 'sanjay',
  'stude', 'ai.service', 'groq.service', 'remediation.service',
  'twilio', 'whatsapp', 'lakshana', 'sillobite', 'nexacademy',
  'pinmypic', 'learnlogicify', 'code-guardian', 'code_guardian',
  '711523bcb015', '711523bcb016', '711523bcb051'
];

let hits = [];
for (let i = 0; i < elements.length; i++) {
  const el = elements[i];
  const text = (el.match(/<w:t[^>]*>(.*?)<\/w:t>/g) || []).map(t => t.replace(/<[^>]+>/g, '')).join(' ');
  for (const bw of badWords) {
    if (text.toLowerCase().includes(bw)) {
      hits.push({ idx: i, word: bw, text: text.substring(0, 100) });
      break;
    }
  }
}

console.log(`Found ${hits.length} elements containing remnants:`);
hits.forEach(h => console.log(`[${h.idx}] matched "${h.word}": ${h.text}`));
