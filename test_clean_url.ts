import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  // Optimize: Block images, fonts, and media
  await page.route('**/*', (route) => {
    const type = route.request().resourceType();
    if (['image', 'font', 'media'].includes(type)) {
      route.abort();
    } else {
      route.continue();
    }
  });

  // Clean URL: stripped the /data= tracking params
  const url = 'https://www.google.com/maps/place/Sicily+Osteria';
  
  console.log(`Navigating to CLEAN place URL: ${url}`);
  const start = Date.now();
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  
  // Wait for h1 to be attached
  await page.waitForSelector('h1', { state: 'attached', timeout: 15000 });
  console.log(`h1 attached in ${Date.now() - start}ms`);
  
  // Wait a bit
  await page.waitForTimeout(4000);
  
  await page.screenshot({ path: 'sicily_clean_page.png' });
  console.log('Saved screenshot to sicily_clean_page.png');
  
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
