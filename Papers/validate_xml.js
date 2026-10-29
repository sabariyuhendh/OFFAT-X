const fs = require('fs');
const path = require('path');

const xml = fs.readFileSync(path.join(__dirname, 'vulnix_original', 'word', 'document.xml'), 'utf8');

// Basic stack validator for XML tags
const tagRegex = /<\/?([a-zA-Z0-9_:]+)(?:\s[^>]*)?(\/?)>/g;
let match;
let stack = [];
let errorCount = 0;

while ((match = tagRegex.exec(xml)) !== null) {
  const full = match[0];
  const tagName = match[1];
  const isSelfClosing = match[2] === '/' || full.endsWith('/>');
  const isClosing = full.startsWith('</');

  if (isSelfClosing) {
    continue;
  } else if (isClosing) {
    if (stack.length === 0) {
      console.error(`Unexpected closing tag: ${tagName} at index ${match.index}`);
      errorCount++;
      break;
    }
    const top = stack.pop();
    if (top !== tagName) {
      console.error(`Mismatched tag: expected </${top}>, found </${tagName}> at index ${match.index}`);
      errorCount++;
      if (errorCount > 5) break;
    }
  } else {
    // Opening tag
    stack.push(tagName);
  }
}

if (errorCount === 0 && stack.length === 0) {
  console.log(`XML Tag Validation: SUCCESS! All tags are perfectly matched. Document size: ${xml.length} bytes.`);
} else {
  console.error(`XML Tag Validation FAILED! Errors: ${errorCount}, Unclosed tags in stack: ${stack.length} (${stack.slice(-5).join(', ')})`);
}
