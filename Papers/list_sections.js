const fs = require('fs');
const els = JSON.parse(fs.readFileSync('./pristine_elements.json', 'utf8'));

console.log(`Total elements: ${els.length}`);
for (let i = 0; i < els.length; i++) {
  const e = els[i];
  if (e.text.startsWith('CHAPTER') || e.text.startsWith('APPENDIX') || e.text.startsWith('REFERENCES') || e.text.startsWith('LIST OF') || e.text.startsWith('TABLE OF') || e.text.startsWith('LIST OF') || e.text.startsWith('ABSTRACT') || e.text.startsWith('BONAFIDE') || e.text.startsWith('DECLARATION') || e.text.startsWith('ACKNOWLEDGEMENT') || e.text.startsWith('VULNIXAI') || e.text.startsWith('PROJECT PHASE')) {
    console.log(`[${i}] SECTION/HEADING: "${e.text}"`);
  }
}
