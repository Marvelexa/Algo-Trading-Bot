import { chromium } from 'playwright';

(async () => {
  console.log('Launching browser...');
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  try {
    await page.goto('https://www.google.com/maps', { waitUntil: 'domcontentloaded', timeout: 60000 });
    console.log('Loaded Google Maps');
    
    await page.fill('input[name="q"], input#searchboxinput', 'clothing store in Kuwait');
    await page.click('button#searchbox-searchbutton');
    console.log('Clicked search button, waiting 5 seconds...');
    
    await page.waitForTimeout(5000);
    
    await page.screenshot({ path: 'test_maps_click.png' });
    console.log('Saved screenshot to test_maps_click.png');
    
  } catch (e) {
    console.error('Error:', e);
  } finally {
    await browser.close();
  }
})();
