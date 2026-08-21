import { chromium } from 'playwright';
import fs from 'fs';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  const intercepted: string[] = [];
  page.on('response', async (res) => {
    const url = res.url();
    if (url.includes('/search') || url.includes('/batchexecute') || url.includes('/maps/preview/entity')) {
      try {
        const text = await res.text();
        intercepted.push(text);
      } catch (e) {}
    }
  });

  await page.goto('https://www.google.com/maps', { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('input[name="q"]');
  await page.fill('input[name="q"]', 'Cafe in Surat');
  await page.keyboard.press('Enter');
  
  await page.waitForSelector('a[href*="/maps/place/"]', { timeout: 15000 });
  
  // Scroll down a bit to trigger network requests
  const feed = page.locator('div[role="feed"]').first();
  await feed.hover();
  for (let i = 0; i < 3; i++) {
    await page.mouse.wheel(0, 3000);
    await page.waitForTimeout(2000);
  }
  
  const allText = intercepted.join('\n');
  fs.writeFileSync('surat_cafes_response.txt', allText);
  
  // Also save initial html
  const html = await page.content();
  fs.writeFileSync('surat_cafes_html.txt', html);
  
  console.log(`Saved ${allText.length} characters of network responses.`);
  console.log(`Saved ${html.length} characters of HTML.`);
  
  await browser.close();
})();
