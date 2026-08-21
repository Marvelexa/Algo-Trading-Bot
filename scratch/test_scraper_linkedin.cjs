const { ScraperEngine } = require('./lib/ScraperEngine.js');
const fs = require('fs');

async function test() {
  const engine = new ScraperEngine();
  await engine.init();
  const query = 'site:linkedin.com/jobs "need a website"';
  
  // We can access page and see what's happening
  const page = await engine.browser.newPage();
  console.log('Navigating to Google Search for query:', query);
  await page.goto(`https://www.google.com/search?q=${encodeURIComponent(query)}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(1500);

  const hasCaptcha = await page.evaluate(() => {
    return document.body.innerHTML.includes('captcha') || document.body.innerHTML.includes('recaptcha') || document.body.innerHTML.includes('detecting unusual traffic');
  });

  if (hasCaptcha) {
    console.log('Google CAPTCHA detected. Falling back to DuckDuckGo HTML...');
    await page.goto(`https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(1000);
    
    const html = await page.content();
    fs.mkdirSync('scratch', { recursive: true });
    fs.writeFileSync('scratch/linkedin_ddg.html', html);
    console.log('Saved page content to scratch/linkedin_ddg.html');
    
    const ddgResults = await page.evaluate(() => {
      const items = [];
      document.querySelectorAll('.result').forEach(el => {
        const titleEl = el.querySelector('.result__title a');
        const snippetEl = el.querySelector('.result__snippet');
        if (titleEl && snippetEl) {
          items.push({
            title: titleEl.textContent?.trim() || "",
            url: titleEl.getAttribute('href') || "",
            snippet: snippetEl.textContent?.trim() || ""
          });
        }
      });
      return items;
    });
    console.log('Raw DuckDuckGo Results:', ddgResults);
  } else {
    console.log('Google search loaded without CAPTCHA!');
  }
  await page.close();
  await engine.close();
}

test();
