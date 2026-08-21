import { chromium } from 'playwright';
import fs from 'fs';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  const intercepted: string[] = [];
  page.on('response', async (res) => {
    const url = res.url();
    if (url.includes('/search') || url.includes('/batchexecute')) {
      try {
        const text = await res.text();
        intercepted.push(text);
      } catch (e) {}
    }
  });

  await page.goto('https://www.google.com/maps', { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('input[name="q"]');
  await page.fill('input[name="q"]', 'Sicily Osteria Surat');
  await page.keyboard.press('Enter');
  
  await page.waitForTimeout(10000);
  
  const allText = intercepted.join('\n');
  fs.writeFileSync('sicily_response.txt', allText);
  console.log(`Saved ${allText.length} characters of network responses.`);
  
  await browser.close();
})();
