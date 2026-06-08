const fs = require('fs');
const path = require('path');

const adsDir = __dirname;
const assetsDir = path.join(adsDir, 'assets');

// Utility to convert file to base64
function getBase64Image(fileName) {
    const ext = path.extname(fileName).toLowerCase();
    const mimeType = ext === '.png' ? 'image/png' : ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg' : 'image/webp';
    const filePath = path.join(assetsDir, fileName);
    if (fs.existsSync(filePath)) {
        const data = fs.readFileSync(filePath);
        return `data:${mimeType};base64,${data.toString('base64')}`;
    }
    console.warn(`Warning: File not found ${filePath}`);
    return `../assets/${fileName}`; // fallback
}

function buildHtml(htmlFile) {
    const filePath = path.join(adsDir, htmlFile);
    if (!fs.existsSync(filePath)) return;
    
    let content = fs.readFileSync(filePath, 'utf8');
    
    // 1. Replace image paths with base64
    content = content.replace(/\.\.\/assets\/([^'"]+\.(webp|png|jpg|jpeg))/g, (match, fileName) => {
        console.log(`Inlining image: ${fileName}`);
        return getBase64Image(fileName);
    });

    // 2. Prepare JSON animation data
    const jsonFiles = fs.readdirSync(assetsDir).filter(f => f.endsWith('.json'));
    const animationsData = {};
    for (const jsonFile of jsonFiles) {
        const name = path.basename(jsonFile, '.json');
        const jsonPath = path.join(assetsDir, jsonFile);
        animationsData[name] = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
    }

    const scriptTag = `\n<script>\nwindow.animationsData = ${JSON.stringify(animationsData)};\n</script>\n`;
    
    // Insert script tag right after <head> or <title>
    if (!content.includes('window.animationsData =')) {
        content = content.replace('</title>', `</title>${scriptTag}`);
    }

    // 3. Replace Lottie path usages
    // index.html replacements
    content = content.replace(/path:\s*`\.\.\/assets\/\$\{animName\}\.json`/g, "animationData: window.animationsData[animName]");
    content = content.replace(/path:\s*'\.\.\/assets\/celebration_confetti\.json'/g, "animationData: window.animationsData['celebration_confetti']");
    
    // playable_ads_SP.html replacements
    content = content.replace(/swipeFile = '\.\.\/assets\/swipe_left\.json';/g, "swipeFile = 'swipe_left';");
    content = content.replace(/path:\s*swipeFile/g, "animationData: window.animationsData[swipeFile]");

    // Write back
    const outPath = path.join(adsDir, htmlFile.replace('.html', '_inline.html'));
    fs.writeFileSync(outPath, content);
    console.log(`Generated: ${outPath}`);
}

buildHtml('index.html');
buildHtml('playable_ads_SP.html');
console.log('Done!');
