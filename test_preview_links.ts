import fs from 'fs';

const html = fs.readFileSync('surat_cafes_html.txt', 'utf8');

const regex = /href="\/maps\/preview\/place\?([^"]+)"/g;
const matches = [];
let match;
while ((match = regex.exec(html)) !== null) {
  matches.push(match[0]);
}

console.log(`Found ${matches.length} preview place links in HTML dump:`);
console.log(matches.slice(0, 5));
