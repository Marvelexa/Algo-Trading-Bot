import { Page } from 'puppeteer';
import { RawLead } from '../processing/leadProcessor';

export class DomExtractor {
  
  public async extractFromSidebar(page: Page): Promise<RawLead[]> {
    return await page.evaluate(() => {
      const leads: RawLead[] = [];
      // Google Maps sidebar cards are usually 'div[role="article"]'
      const cards = Array.from(document.querySelectorAll('div[role="article"]'));
      
      for (const card of cards) {
        const nameLink = card.querySelector('a') as HTMLAnchorElement;
        if (!nameLink) continue;
        
        const name = nameLink.getAttribute('aria-label') || '';
        const mapsUrl = nameLink.href;
        
        // Extract rating/reviews (e.g. "4.5 stars 120 Reviews")
        const ratingText = (card as HTMLElement).innerText || '';
        const ratingMatch = ratingText.match(/([\d\.]+)\s*stars/i) || ratingText.match(/([\d\.]+)\s*\(/);
        const rating = ratingMatch ? parseFloat(ratingMatch[1]) : undefined;
        
        const reviewMatch = ratingText.match(/([\d,]+)\s*reviews/i) || ratingText.match(/\(([\d,]+)\)/);
        const reviews = reviewMatch ? parseInt(reviewMatch[1].replace(/,/g, '')) : undefined;
        
        // Extract website
        const links = Array.from(card.querySelectorAll('a'));
        let website: string | undefined = undefined;
        for (const link of links) {
          if (link.href && !link.href.includes('google.com') && link.href.startsWith('http')) {
            website = link.href;
            break;
          }
        }
        
        // The address or phone is usually in text nodes following the category
        const lines = ratingText.split('\n');
        let category = 'Unknown';
        let address = '';
        let phone = '';
        
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          if (line.match(/\+\d{1,3}\s[\d\s-]{5,}/)) {
            phone = line;
          } else if (line.includes(' · ')) {
            const parts = line.split(' · ');
            category = parts[0] || category;
            if (parts[1]) address = parts[1];
          }
        }
        
        leads.push({
          name,
          category,
          rating,
          reviews,
          address,
          phone,
          website,
          mapsUrl
        });
      }
      return leads;
    });
  }
}

export const domExtractor = new DomExtractor();
