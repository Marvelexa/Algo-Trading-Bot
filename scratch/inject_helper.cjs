const fs = require('fs');
const path = require('path');

const serverFile = path.join(__dirname, '..', 'server.ts');
let content = fs.readFileSync(serverFile, 'utf8');

const helper = `
function generateUnsplashUrl(keyword, width, height, colorHex) {
  return \`https://images.unsplash.com/featured/\${width}x\${height}?\${encodeURIComponent(keyword)}\`;
}
`;

// Insert the helper right after the import statements
const lines = content.split('\n');
const insertIdx = lines.findIndex(l => l.includes('import')) + 5;
lines.splice(insertIdx, 0, helper);

fs.writeFileSync(serverFile, lines.join('\n'), 'utf8');
console.log("Helper injected.");
