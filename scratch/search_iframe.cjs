const fs = require('fs');
const path = require('path');

const pagesPath = 'c:\\Users\\Prince\\OneDrive\\Desktop\\New folder\\untitled\\src\\pages';
const files = fs.readdirSync(pagesPath);

files.forEach(file => {
  if (file.endsWith('.tsx')) {
    const filePath = path.join(pagesPath, file);
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    lines.forEach((line, idx) => {
      if (line.includes('iframe') || line.includes('window.open')) {
        console.log(`${file}:${idx + 1}: ${line.trim()}`);
      }
    });
  }
});
process.exit(0);
