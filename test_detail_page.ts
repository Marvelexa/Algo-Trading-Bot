import { chromium } from 'playwright';

(async () => {
  // Launch in HEADFUL mode exactly like ScraperEngine does
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  const url = 'https://www.google.com/maps/place/Sicily+Osteria';
  
  console.log(`Navigating headfully to: ${url}`);
  const start = Date.now();
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  
  // Wait for h1 to be attached
  try {
    await page.waitForSelector('h1', { state: 'attached', timeout: 15000 });
    console.log(`h1 attached in ${Date.now() - start}ms`);
    
    // Wait for JS rendering
    await page.waitForTimeout(5000);
    
    await page.screenshot({ path: 'sicily_headful_page.png' });
    
    const phone = await page.locator('button[data-item-id*="phone:tel:"]').innerText().catch(() => null);
    const rawWebsite = await page.locator('a[data-item-id="authority"]').getAttribute('href').catch(() => null);
    
    console.log('--- RESULTS ---');
    console.log('Name from h1:', await page.locator('h1').first().textContent().catch(() => null));
    console.log('Phone:', phone);
    console.log('Raw Website:', rawWebsite);
  } catch (e: any) {
    console.error('Error loading place page:', e.message);
    await page.screenshot({ path: 'sicily_headful_error.png' });
  } finally {
    await browser.close();
  }
})();
