const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { pathToFileURL } = require('url');

const papersDir = path.resolve(__dirname, '..');
const assetsDir = path.join(papersDir, 'assets_gen');
const mediaDir = path.join(papersDir, 'vulnix_temp', 'word', 'media');
const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

function capture(htmlFilename, outputFilename, width = 1200, height = 750) {
  const fullHtml = path.join(assetsDir, htmlFilename);
  const fullOut = path.join(mediaDir, outputFilename);
  const fileUrl = pathToFileURL(fullHtml).href;
  console.log(`Rendering ${outputFilename} (${width}x${height}) from ${htmlFilename}...`);
  
  execFileSync(chromePath, [
    '--headless',
    '--no-sandbox',
    '--disable-gpu',
    '--force-device-scale-factor=1.5',
    `--window-size=${width},${height}`,
    `--screenshot=${fullOut}`,
    fileUrl
  ]);
  const size = fs.statSync(fullOut).size;
  console.log(`✔ Successfully rendered ${outputFilename} (${size} bytes)`);
}

// 1. Chapter 3 Block Diagrams
capture('fig31.html', 'image2.jpg', 1150, 680);
capture('fig32.html', 'image3.jpg', 1150, 780);

// 2. Chapter 4 Methodology Flowchart
capture('fig41.html', 'image4.jpg', 1150, 700);

// 3. Chapter 6 Results & Evaluation Charts
capture('fig61.html', 'image5.jpg', 1050, 600);
capture('fig62.html', 'image6.jpg', 1050, 580);
capture('fig63.html', 'image7.jpg', 1050, 580);
capture('fig64.html', 'image8.jpg', 1050, 560);
capture('fig65.html', 'image9.jpg', 1050, 520);
capture('fig66.html', 'image10.jpg', 1050, 560);

// 4. Appendix B Live Screenshots
capture('figb1.html', 'image11.png', 1150, 750);
capture('figb2.html', 'image13.png', 1250, 800);
capture('figb3.html', 'image14.png', 1150, 750);
capture('figb4.html', 'image16.png', 1150, 750);
capture('figb5.html', 'image18.png', 1150, 750);

console.log('\nAll core diagrams, charts, and screenshots successfully rendered and replaced in vulnix_temp/word/media!');
