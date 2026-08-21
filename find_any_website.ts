import fs from 'fs';

const net = fs.readFileSync('surat_cafes_response.txt', 'utf8');

// Match any http/https URL that is not google or gstatic
const urlRegex = /https?:\/\/(?!www\.google\.com|gstatic\.com|www\.gstatic\.com|googleusercontent\.com|lh3\.googleusercontent\.com|lh5\.googleusercontent\.com|schema\.org|w3\.org)[a-zA-Z0-9\-\.]+\.[a-zA-Z]{2,6}(?:\/[^\s"'\\]*)?/g;

const matches = net.match(urlRegex) || [];
const uniqueWebsites = Array.from(new Set(matches));

console.log(`Found ${uniqueWebsites.length} unique websites in network responses:`);
console.log(uniqueWebsites.slice(0, 50));
