const fs = require('fs');
const path = require('path');

const xml = fs.readFileSync(path.join(__dirname, 'vulnix_original', 'word', 'document.xml'), 'utf8');
const start = xml.indexOf('<w:body>') + 8;
const end = xml.lastIndexOf('</w:body>');
const body = xml.substring(start, end);
const elementRegex = /<(w:p|w:tbl|w:sectPr)(?:\s[^>]*)?>.*?<\/\1>|<w:sectPr(?:\s[^>]*)?\/>/gs;
let match, elements = [];
while ((match = elementRegex.exec(body)) !== null) elements.push(match[0]);

console.log('Inspecting paragraph alignments and spacing:');
for (let i = 0; i < elements.length; i++) {
  const el = elements[i];
  if (el.startsWith('<w:tbl')) {
    const tblJcMatch = el.match(/<w:jc\s+w:val="([^"]+)"/);
    console.log(`[${i}] TABLE alignment: ${tblJcMatch ? tblJcMatch[1] : 'none'}`);
    continue;
  }
  if (el.startsWith('<w:sectPr')) continue;

  const text = (el.match(/<w:t[^>]*>(.*?)<\/w:t>/g) || []).map(t => t.replace(/<[^>]+>/g, '')).join(' ').trim();
  if (text.length === 0) continue;

  const jcMatch = el.match(/<w:jc\s+w:val="([^"]+)"/);
  const jc = jcMatch ? jcMatch[1] : 'left (no w:jc)';

  const spacingMatch = el.match(/<w:spacing([^>]*)\/>/);
  const spacing = spacingMatch ? spacingMatch[1] : 'none';

  // Highlight headings, captions, and body
  const isHeading = text.startsWith('CHAPTER') || text.startsWith('APPENDIX') || text.startsWith('REFERENCES') || text.startsWith('LIST OF') || text.startsWith('TABLE OF') || text.startsWith('ABSTRACT') || text.match(/^[0-9]\.[0-9]/) || text.match(/^A\.[0-9]/) || text.match(/^B\.[0-9]/);
  const isCaption = text.startsWith('Fig no:') || text.startsWith('Figure ') || text.startsWith('Table ');

  if (isHeading) {
    console.log(`[${i}] HEADING: jc="${jc}" | text="${text.substring(0, 50)}"`);
  } else if (isCaption) {
    console.log(`[${i}] CAPTION: jc="${jc}" | text="${text.substring(0, 50)}"`);
  } else if (text.length > 100) {
    // Body paragraph
    if (jc !== 'both') {
      console.log(`[${i}] BODY (NOT JUSTIFIED!): jc="${jc}" | text="${text.substring(0, 50)}"`);
    }
  }
}
