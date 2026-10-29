const fs = require('fs');
const path = require('path');

const drawings = JSON.parse(fs.readFileSync(path.join(__dirname, 'drawings.json'), 'utf8'));

// Helper to escape XML special characters
function esc(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

// Paragraph builder
function p(text, options = {}) {
  const {
    style = '',
    bold = false,
    italic = false,
    size = 24, // 12pt (half-points)
    align = 'both',
    spaceBefore = 0,
    spaceAfter = 120, // 6pt
    line = 360, // 1.5 lines
    firstLine = 720, // 0.5 inch indent
    left = 0,
    right = 0,
    color = '000000',
    font = 'Times New Roman'
  } = options;

  let pPr = '<w:pPr>';
  if (style) pPr += `<w:pStyle w:val="${style}"/>`;
  pPr += `<w:spacing w:before="${spaceBefore}" w:after="${spaceAfter}" w:line="${line}" w:lineRule="auto"/>`;
  if (firstLine > 0 || left > 0 || right > 0) {
    pPr += `<w:ind w:left="${left}" w:right="${right}" w:firstLine="${firstLine}"/>`;
  }
  if (align) pPr += `<w:jc w:val="${align}"/>`;
  pPr += '</w:pPr>';

  let rPr = '<w:rPr>';
  rPr += `<w:rFonts w:ascii="${font}" w:hAnsi="${font}" w:cs="${font}"/>`;
  if (bold) rPr += '<w:b/><w:bCs/>';
  if (italic) rPr += '<w:i/><w:iCs/>';
  if (size) rPr += `<w:sz w:val="${size}"/><w:szCs w:val="${size}"/>`;
  if (color && color !== '000000') rPr += `<w:color w:val="${color}"/>`;
  rPr += '</w:rPr>';

  return `<w:p>${pPr}<w:r>${rPr}<w:t xml:space="preserve">${esc(text)}</w:t></w:r></w:p>`;
}

// Chapter Heading
function chapterTitle(num, title) {
  let xml = '';
  xml += p(`CHAPTER ${num}`, {
    bold: true,
    size: 32, // 16pt
    align: 'center',
    spaceBefore: 360,
    spaceAfter: 120,
    firstLine: 0
  });
  xml += p(title, {
    bold: true,
    size: 28, // 14pt
    align: 'center',
    spaceBefore: 0,
    spaceAfter: 280,
    firstLine: 0
  });
  return xml;
}

// Section Headings
function secHeading(title) {
  return p(title, {
    bold: true,
    size: 26, // 13pt
    align: 'left',
    spaceBefore: 240,
    spaceAfter: 100,
    firstLine: 0
  });
}

function subSecHeading(title) {
  return p(title, {
    bold: true,
    size: 24, // 12pt
    align: 'left',
    spaceBefore: 180,
    spaceAfter: 80,
    firstLine: 0
  });
}

// Figure Caption
function figureCaption(figNo, title) {
  return p(`Fig no: ${figNo}  ${title}`, {
    bold: true,
    size: 22, // 11pt
    align: 'center',
    spaceBefore: 100,
    spaceAfter: 200,
    firstLine: 0
  });
}

// Table Caption
function tableCaption(tabNo, title) {
  return p(`Table ${tabNo}  ${title}`, {
    bold: true,
    size: 22, // 11pt
    align: 'left',
    spaceBefore: 180,
    spaceAfter: 80,
    firstLine: 0
  });
}

// Table Builder
function buildTable(headers, rows, colWidths = []) {
  let totalWidth = colWidths.reduce((a, b) => a + b, 0) || 9360;
  let xml = `<w:tbl><w:tblPr><w:tblStyle w:val="TableGrid"/><w:tblW w:w="${totalWidth}" w:type="dxa"/><w:tblInd w:w="0" w:type="dxa"/><w:tblLook w:val="04A0" w:firstRow="1" w:lastRow="0" w:firstColumn="1" w:lastColumn="0" w:noHBand="0" w:noVBand="1"/></w:tblPr>`;

  if (colWidths.length > 0) {
    xml += '<w:tblGrid>';
    for (let w of colWidths) xml += `<w:gridCol w:w="${w}"/>`;
    xml += '</w:tblGrid>';
  }

  // Header Row
  xml += '<w:tr><w:trPr><w:tblHeader/></w:trPr>';
  for (let i = 0; i < headers.length; i++) {
    const w = colWidths[i] || Math.floor(totalWidth / headers.length);
    xml += `<w:tc><w:tcPr><w:tcW w:w="${w}" w:type="dxa"/><w:shd w:val="clear" w:color="auto" w:fill="F0F2F5"/><w:tcMar><w:top w:w="120" w:type="dxa"/><w:bottom w:w="120" w:type="dxa"/><w:left w:w="140" w:type="dxa"/><w:right w:w="140" w:type="dxa"/></w:tcMar></w:tcPr>`;
    xml += p(headers[i], { bold: true, size: 21, align: 'center', spaceBefore: 40, spaceAfter: 40, line: 240, firstLine: 0 });
    xml += '</w:tc>';
  }
  xml += '</w:tr>';

  // Data Rows
  for (let r = 0; r < rows.length; r++) {
    const row = rows[r];
    const bg = (r % 2 === 1) ? 'F9FAFB' : 'FFFFFF';
    xml += '<w:tr>';
    for (let c = 0; c < row.length; c++) {
      const w = colWidths[c] || Math.floor(totalWidth / row.length);
      const isFirst = (c === 0);
      xml += `<w:tc><w:tcPr><w:tcW w:w="${w}" w:type="dxa"/><w:shd w:val="clear" w:color="auto" w:fill="${bg}"/><w:tcMar><w:top w:w="100" w:type="dxa"/><w:bottom w:w="100" w:type="dxa"/><w:left w:w="140" w:type="dxa"/><w:right w:w="140" w:type="dxa"/></w:tcMar></w:tcPr>`;
      xml += p(row[c], { size: 20, align: isFirst ? 'left' : 'center', spaceBefore: 30, spaceAfter: 30, line: 240, firstLine: 0 });
      xml += '</w:tc>';
    }
    xml += '</w:tr>';
  }

  xml += '</w:tbl>';
  return xml;
}

// Code Block Builder
function codeBlock(codeLines) {
  let xml = '';
  for (let line of codeLines) {
    xml += p(line, {
      font: 'Courier New',
      size: 19, // 9.5pt
      align: 'left',
      firstLine: 0,
      left: 360,
      spaceBefore: 0,
      spaceAfter: 40,
      line: 220
    });
  }
  return xml;
}

module.exports = {
  esc,
  p,
  chapterTitle,
  secHeading,
  subSecHeading,
  figureCaption,
  tableCaption,
  buildTable,
  codeBlock,
  drawings
};
