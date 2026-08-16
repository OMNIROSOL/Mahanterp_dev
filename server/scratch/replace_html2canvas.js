const fs = require('fs');
const path = require('path');

const viewsDir = path.join(__dirname, '..', '..', 'views');

const files = fs.readdirSync(viewsDir).filter(f => f.endsWith('.tsx') || f.endsWith('.ts'));

for (const file of files) {
    const fullPath = path.join(viewsDir, file);
    let content = fs.readFileSync(fullPath, 'utf8');
    
    let changed = false;
    
    if (content.includes("import('html2canvas')")) {
        content = content.replace(/import\('html2canvas'\)/g, "import('html2canvas-pro')");
        changed = true;
    }
    
    if (content.includes("from 'html2canvas'")) {
        content = content.replace(/from 'html2canvas'/g, "from 'html2canvas-pro'");
        changed = true;
    }

    if (changed) {
        fs.writeFileSync(fullPath, content);
        console.log(`Updated ${file}`);
    }
}
