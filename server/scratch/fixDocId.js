const fs = require('fs');
const path = require('path');

const basePath = path.join(__dirname, '../../views');
const files = fs.readdirSync(basePath).filter(f => f.startsWith('View') && f.endsWith('.tsx'));

files.forEach(file => {
  const filePath = path.join(basePath, file);
  let content = fs.readFileSync(filePath, 'utf8');

  if (content.includes('EmailComposerModal')) {
    // Replace document.getElementById with pdfRef.current inside onSend
    const regex = /const element = document\.getElementById\('[^']+'\);/g;
    if (regex.test(content)) {
      content = content.replace(regex, `const element = pdfRef.current;`);
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`Fixed document reference in ${file}`);
    }
  }
});
