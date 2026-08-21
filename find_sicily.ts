import fs from 'fs';

const text = fs.readFileSync('sicily_response.txt', 'utf8');

// Search for sicilyosteria.com
let index = -1;
while ((index = text.indexOf('sicilyosteria', index + 1)) !== -1) {
  console.log(`--- MATCH 'sicilyosteria' AT INDEX ${index} ---`);
  console.log(text.substring(index - 500, index + 500));
}
