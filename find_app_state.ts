import fs from 'fs';
import path from 'path';

const searchDir = 'C:\\Users\\Prince\\OneDrive\\Desktop\\website demos\\Googlemap_scraper\\src';

function searchFiles(dir: string, pattern: string) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      searchFiles(fullPath, pattern);
    } else if (file.endsWith('.ts') || file.endsWith('.tsx') || file.endsWith('.js')) {
      const content = fs.readFileSync(fullPath, 'utf8');
      if (content.includes(pattern)) {
        console.log(`Found pattern "${pattern}" in: ${fullPath}`);
        
        // Print lines containing the pattern
        const lines = content.split('\n');
        lines.forEach((line, i) => {
          if (line.includes(pattern)) {
            console.log(`  L${i + 1}: ${line.trim()}`);
          }
        });
      }
    }
  }
}

console.log('--- SEARCHING FOR APP_INITIALIZATION_STATE ---');
searchFiles(searchDir, 'APP_INITIALIZATION_STATE');
console.log('\n--- SEARCHING FOR parsePayload ---');
searchFiles(searchDir, 'parsePayload');
