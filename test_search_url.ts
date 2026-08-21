import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  // Navigate to Maps Search URL directly
  const name = 'Sicily Osteria';
  const city = 'Surat';
  const url = `https://www.google.com/maps/search/${encodeURIComponent(name + ' ' + city)}`;
  
  console.log(`Navigating to search URL: ${url}`);
  const start = Date.now();
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  
  // Wait for h1 to be attached
  await page.waitForSelector('h1', { state: 'attached', timeout: 15000 });
  console.log(`Loaded in ${Date.now() - start}ms`);
  
  // Wait 3 seconds for client JS to render details
  await page.waitForTimeout(3000);
  
  await page.screenshot({ path: 'sicily_search_result.png' });
  console.log('Saved screenshot to sicily_search_result.png');
  
  const text = await page.content();
  const phone = await page.locator('button[data-item-id*="phone:tel:"]').innerText().catch(() => null);
  const rawWebsite = await page.locator('a[data-item-id="authority"]').getAttribute('href').catch(() => null);
  
  console.log('--- RESULTS ---');
  console.log('Name from h1:', await page.locator('h1').first().textContent().catch(() => null));
  console.log('Phone:', phone);
  console.log('Raw Website:', rawWebsite);
  console.log('Contains sicilyosteria.com:', text.includes('sicilyosteria.com'));
  
  await browser.close();
})();
