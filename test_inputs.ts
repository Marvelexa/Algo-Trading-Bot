import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto('https://www.google.com/maps', { waitUntil: 'domcontentloaded' });
  
  // Wait a bit
  await page.waitForTimeout(5000);
  
  // Log all input elements
  const inputs = await page.locator('input').evaluateAll(els => 
    els.map(e => ({
      id: e.id,
      name: e.getAttribute('name'),
      class: e.className,
      type: e.getAttribute('type'),
      placeholder: e.getAttribute('placeholder'),
      ariaLabel: e.getAttribute('aria-label')
    }))
  );
  
  console.log(JSON.stringify(inputs, null, 2));
  await browser.close();
})();
