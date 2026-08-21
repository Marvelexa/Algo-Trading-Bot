import fs from 'fs';

const html = fs.readFileSync('surat_cafes_html.txt', 'utf8');

const target = '365 The Travel Cafe';
const index = html.indexOf(target);
if (index !== -1) {
  console.log(`Found ${target} at index ${index}`);
  // Let's grab 3000 characters after the name
  console.log(html.substring(index - 100, index + 3000));
} else {
  console.log(`${target} not found in HTML`);
}
