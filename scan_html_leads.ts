import fs from 'fs';

const html = fs.readFileSync('surat_cafes_html.txt', 'utf8');

// Match <div role="article" or similar?
// Google Maps sidebar cards: a[href*="/maps/place/"]
// Let's find all href="/maps/place/..." and their surrounding context
const placeRegex = /href="https:\/\/www\.google\.com\/maps\/place\/([^"]+)"/g;
let match;
let count = 0;

console.log('--- EXTRACTED PLACES AND WEBSITES IN HTML ---');

const seen = new Set();

while ((match = placeRegex.exec(html)) !== null && count < 20) {
  const fullUrl = match[0];
  const placeName = decodeURIComponent(match[1].split('/')[0].replace(/\+/g, ' '));
  if (seen.has(placeName)) continue;
  seen.add(placeName);
  count++;
  
  // Grab a 2000 character chunk around this match
  const matchIndex = match.index;
  const chunk = html.substring(matchIndex - 500, matchIndex + 2500);
  
  // Look for any other http link that is NOT google.com or gstatic.com
  const urlRegex = /href="(https?:\/\/(?!www\.google\.com|gstatic\.com|www\.gstatic\.com)[^"]+)"/g;
  let urlMatch;
  const websites = [];
  while ((urlMatch = urlRegex.exec(chunk)) !== null) {
    websites.push(urlMatch[1]);
  }
  
  console.log(`Place Name: ${placeName}`);
  console.log(`Websites found nearby:`, websites);
  console.log('-----------------------------------\n');
}
