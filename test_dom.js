import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  try {
    const searchUrl = `https://www.google.com/maps/search/clothing+store+in+Kuwait?hl=en&gl=us`;
    await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
    
    await page.waitForSelector('a[href*="/maps/place/"]', { timeout: 15000 });
    const cards = page.locator('a[href*="/maps/place/"]');
    
    const firstCard = cards.nth(0);
    const cardData = await firstCard.evaluate((el) => {
      const getContainer = (node) => node.closest('div.Nv2y1d, div.Uaht4b, div.lI9IFe, div.bfdHYd, div.THOPZb, div.rllt__details, div[jscontroller], div[data-result-index], li') || node.parentElement;
      const container = getContainer(el);
      if (!container) return null;
      
      const titleEl = container.querySelector('.qBF1Pd, div.fontHeadlineSmall');
      const name = titleEl?.textContent?.trim() || el.getAttribute('aria-label')?.trim() || '';
      
      const textContent = container.textContent || '';
      const texts = textContent.split('·').map(s => s.trim());
      
      let address = '';
      let phone = '';
      let category = '';
      
      for (let j = 0; j < texts.length; j++) {
        const t = texts[j];
        if (t.match(/(\d{3,}[\s-]?\d{3,})/)) {
          if (!phone) phone = t;
        } else if (t.length > 10 && !t.includes('stars') && !t.includes('Open') && !t.includes('Closed')) {
          if (!address && j > 0) address = t;
        }
        if (j === 0 && t.length < 30 && !t.includes('stars')) {
          category = t;
        }
      }
      
      return { name, address, phone, category, textContent, texts };
    });
    
    console.log(cardData);
    
  } catch (e) {
    console.error(e);
  } finally {
    await browser.close();
  }
})();
