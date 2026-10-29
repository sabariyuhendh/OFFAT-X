const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('Packaging OFFAT-X_Phase_1_Report.docx from vulnix_original...');

const docxPath = path.join(__dirname, 'OFFAT-X_Phase_1_Report.docx');
const sourceDir = path.join(__dirname, 'vulnix_original');

// Remove existing DOCX if present
if (fs.existsSync(docxPath)) {
  fs.unlinkSync(docxPath);
}

// Compress vulnix_original directory to DOCX
const cmd = `powershell -Command "Add-Type -AssemblyName System.IO.Compression.FileSystem; [System.IO.Compression.ZipFile]::CreateFromDirectory('${sourceDir.replace(/\\/g, '/')}', '${docxPath.replace(/\\/g, '/')}')"`;
execSync(cmd, { stdio: 'inherit' });

console.log('DOCX packaged successfully. Running verification...');

// Verify using verify_docx.js
const verifyOutput = execSync('node verify_docx.js', { encoding: 'utf8' });
console.log(verifyOutput);
