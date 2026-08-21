import { ScraperEngine } from '../lib/ScraperEngine.js';

async function test() {
  const engine = new ScraperEngine();
  await engine.init();
  const query = 'site:linkedin.com/jobs "need a website"';
  
  console.log('Running scrapeGoogleDork for query:', query);
  const results = await engine.scrapeGoogleDork(query);
  console.log('Filtered Results:', results);
  
  await engine.close();
}

test();
