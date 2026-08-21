import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  const interceptedUrls: string[] = [];
  let placeDetailCount = 0;

  page.on('response', async (res) => {
    const url = res.url();
    if (url.includes('/maps/preview/entity') || url.includes('/search') || url.includes('/batchexecute')) {
      interceptedUrls.push(url);
      try {
        const text = await res.text();
        if (text.includes('phone:tel:') || text.includes('authority')) {
          placeDetailCount++;
          console.log(`[Intercepted Place Detail] URL: ${url.substring(0, 80)}...`);
        }
      } catch (e) {}
    }
  });

  await page.goto('https://www.google.com/maps', { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('input[name="q"]');
  await page.fill('input[name="q"]', 'Cafe in Surat');
  await page.keyboard.press('Enter');
  
  await page.waitForSelector('a[href*="/maps/place/"]', { timeout: 15000 });
  await page.waitForTimeout(3000);

  // Hover over the first 5 cards
  const cards = page.locator('a[href*="/maps/place/"]');
  const count = Math.min(5, await cards.count());
  console.log(`Hovering over ${count} cards...`);

  for (let i = 0; i < count; i++) {
    const card = cards.nth(i);
    await card.hover().catch(() => {});
    await page.waitForTimeout(1000); // Give Google Maps 1s to trigger hover pre-fetch
  }

  console.log(`--- RESULTS ---`);
  console.log(`Total intercepted relevant requests: ${interceptedUrls.length}`);
  console.log(`Total intercepted Place Detail responses (containing phone/website signature): ${placeDetailCount}`);

  await browser.close();
})();
