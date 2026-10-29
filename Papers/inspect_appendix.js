const fs = require("fs");
const path = require("path");
const xml = fs.readFileSync(path.join(__dirname, "vulnix_original", "word", "document.xml"), "utf8");
const start = xml.indexOf("<w:body>") + 8;
const end = xml.lastIndexOf("</w:body>");
const body = xml.substring(start, end);
const elementRegex = /<(w:p|w:tbl|w:sectPr)(?:\s[^>]*)?>.*?<\/\1>|<w:sectPr(?:\s[^>]*)?\/>/gs;
let match, elements = [];
while ((match = elementRegex.exec(body)) !== null) elements.push(match[0]);

for (let i = 320; i <= 465; i++) {
  const el = elements[i];
  if (!el) continue;
  const isTable = el.startsWith("<w:tbl");
  const isSect = el.startsWith("<w:sectPr");
  const text = (el.match(/<w:t[^>]*>(.*?)<\/w:t>/g) || []).map(t => t.replace(/<[^>]+>/g, "")).join(" ");
  const blip = (el.match(/r:embed="([^"]+)"/g) || []).join(", ");
  console.log(`[${i}] ${isTable ? "TABLE" : isSect ? "SECT" : "P"} | blip: ${blip} | text: ${text.substring(0, 80)}`);
}
