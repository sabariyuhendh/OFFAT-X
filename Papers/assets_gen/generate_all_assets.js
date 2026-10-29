const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const papersDir = path.resolve(__dirname, '..');
const assetsDir = path.join(papersDir, 'assets_gen');
const mediaDir = path.join(papersDir, 'vulnix_temp', 'word', 'media');
const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

if (!fs.existsSync(assetsDir)) fs.mkdirSync(assetsDir, { recursive: true });
if (!fs.existsSync(mediaDir)) fs.mkdirSync(mediaDir, { recursive: true });

function capture(htmlFile, outputFile, width = 1200, height = 750) {
  const fullHtml = path.resolve(htmlFile);
  const fullOut = path.resolve(outputFile);
  console.log(`Rendering ${path.basename(outputFile)} (${width}x${height})...`);
  
  execFileSync(chromePath, [
    '--headless',
    '--no-sandbox',
    '--disable-gpu',
    '--force-device-scale-factor=1.5',
    `--window-size=${width},${height}`,
    `--screenshot=${fullOut}`,
    `file:///${fullHtml.replace(/\\/g, '/')}`
  ]);
  console.log(`Successfully saved ${path.basename(outputFile)} (${fs.statSync(fullOut).size} bytes)`);
}

// Render all assets
capture(path.join(assetsDir, 'fig31.html'), path.join(mediaDir, 'image2.jpg'), 1150, 680);
capture(path.join(assetsDir, 'fig32.html'), path.join(mediaDir, 'image3.jpg'), 1150, 780);
capture(path.join(assetsDir, 'fig41.html'), path.join(mediaDir, 'image4.jpg'), 1150, 700);
capture(path.join(assetsDir, 'fig61.html'), path.join(mediaDir, 'image5.jpg'), 1050, 600);
capture(path.join(assetsDir, 'fig62.html'), path.join(mediaDir, 'image6.jpg'), 1050, 580);
capture(path.join(assetsDir, 'fig63.html'), path.join(mediaDir, 'image7.jpg'), 1050, 580);
capture(path.join(assetsDir, 'fig64.html'), path.join(mediaDir, 'image8.jpg'), 1050, 560);
capture(path.join(assetsDir, 'fig65.html'), path.join(mediaDir, 'image9.jpg'), 1050, 520);
capture(path.join(assetsDir, 'fig66.html'), path.join(mediaDir, 'image10.jpg'), 1050, 560);

// Appendix B screenshots
capture(path.join(assetsDir, 'figb1.html'), path.join(mediaDir, 'image11.png'), 1150, 750);
capture(path.join(assetsDir, 'figb2.html'), path.join(mediaDir, 'image13.png'), 1250, 800);
capture(path.join(assetsDir, 'figb3.html'), path.join(mediaDir, 'image14.png'), 1150, 750);
capture(path.join(assetsDir, 'figb4.html'), path.join(mediaDir, 'image16.png'), 1150, 750);
capture(path.join(assetsDir, 'figb5.html'), path.join(mediaDir, 'image18.png'), 1150, 750);

// Also render companion images
capture(path.join(assetsDir, 'figb1.html'), path.join(mediaDir, 'image12.png'), 1150, 750);
capture(path.join(assetsDir, 'figb3.html'), path.join(mediaDir, 'image15.png'), 1150, 750);
capture(path.join(assetsDir, 'figb4.html'), path.join(mediaDir, 'image17.png'), 1150, 750);
capture(path.join(assetsDir, 'figb5.html'), path.join(mediaDir, 'image19.png'), 1150, 750);

console.log('All image assets successfully rendered and saved into vulnix_temp/word/media!');
