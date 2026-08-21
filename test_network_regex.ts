import fs from 'fs';

const net = fs.readFileSync('surat_cafes_response.txt', 'utf8');

// Match escaped URLs: http:\/\/ or https:\/\/
const escapedUrlRegex = /https?:\\\/\\\/[a-zA-Z0-9\-\.]+\.[a-zA-Z]{2,6}(?:\\\/[^\s"'\\]*)?/g;

const matches = net.match(escapedUrlRegex) || [];
const uniqueWebsites = Array.from(new Set(matches.map(m => m.replace(/\\/g, ''))));

console.log(`Found ${uniqueWebsites.length} unique ESCAPED websites in network responses:`);
console.log(uniqueWebsites.slice(0, 50));
