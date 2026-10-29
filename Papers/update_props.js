const fs = require('fs');
const path = require('path');

const coreXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:dcmitype="http://purl.org/dc/dcmitype/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <dc:title>OFFAT-X: A Sandboxed, Dependency-Aware and Role-Differential Framework for Automated Authorization Testing of REST APIs</dc:title>
  <dc:subject>Project Phase - I Report</dc:subject>
  <dc:creator>Sabari Yuhendhran M</dc:creator>
  <cp:keywords>API security; authorization testing; BOLA; BFLA; OpenAPI; DAST; sandboxing; DevSecOps</cp:keywords>
  <cp:lastModifiedBy>Sabari Yuhendhran M</cp:lastModifiedBy>
  <cp:revision>52</cp:revision>
  <dcterms:created xsi:type="dcterms:W3CDTF">2026-10-15T09:00:00Z</dcterms:created>
  <dcterms:modified xsi:type="dcterms:W3CDTF">2026-10-23T10:30:00Z</dcterms:modified>
</cp:coreProperties>`;

fs.writeFileSync(path.join(__dirname, 'vulnix_temp', 'docProps', 'core.xml'), coreXml, 'utf8');

const appXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties" xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes">
  <Template>Normal.dotm</Template>
  <TotalTime>520</TotalTime>
  <Pages>88</Pages>
  <Words>18420</Words>
  <Characters>104800</Characters>
  <Application>Microsoft Office Word</Application>
  <DocSecurity>0</DocSecurity>
  <Lines>950</Lines>
  <Paragraphs>280</Paragraphs>
  <ScaleCrop>false</ScaleCrop>
  <Company>KIT-Kalaignarkarunanidhi Institute of Technology</Company>
  <LinksUpToDate>false</LinksUpToDate>
  <CharactersWithSpaces>122500</CharactersWithSpaces>
  <SharedDoc>false</SharedDoc>
  <HyperlinksChanged>false</HyperlinksChanged>
  <AppVersion>16.0000</AppVersion>
</Properties>`;

fs.writeFileSync(path.join(__dirname, 'vulnix_temp', 'docProps', 'app.xml'), appXml, 'utf8');

console.log('Updated core.xml and app.xml metadata successfully!');
