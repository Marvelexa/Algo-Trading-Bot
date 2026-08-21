import fs from 'fs';

const html = fs.readFileSync('surat_cafes_html.txt', 'utf8');

// Match any href containing /url?q=
const regex = /href="[^"]*google\.com\/url\?q=[^"]*"/g;
const matches = html.match(regex) || [];

console.log(`Found ${matches.length} matches of /url?q= in HTML dump.`);
console.log(matches.slice(0, 10));
