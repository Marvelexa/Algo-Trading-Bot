import { Page, HTTPResponse } from 'puppeteer';
import { RawLead } from '../processing/leadProcessor';

export class NetworkInterceptor {
  private interceptedLeads: RawLead[] = [];

  public attach(page: Page) {
    page.on('response', async (response: HTTPResponse) => {
      const url = response.url();
      // Listen for batchexecute or search PB responses
      if (url.includes('/search') || url.includes('/batchexecute')) {
        try {
          const text = await response.text();
          this.parsePbPayload(text);
        } catch (e) {
          // Ignore parsing errors for individual packets
        }
      }
    });
  }

  public getExtractedLeads(): RawLead[] {
    const leads = [...this.interceptedLeads];
    this.interceptedLeads = []; // clear after fetching
    return leads;
  }

  private parsePbPayload(text: string) {
    // This is a simplified "Nexvora-style" extraction. 
    // In reality, PB (Protocol Buffer) JSON arrays from Google are deeply nested.
    // We regex match common patterns for Name, Phone, and URLs.
    
    // As a placeholder for complex PB parsing, we try to extract URLs and names
    // To ensure we get accurate data, if we can't parse safely, we rely on domExtractor.
    
    // Example regex to find URLs in batchexecute
    const urlMatches = text.match(/https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/g);
    
    // Example: parsing array structure looking for business patterns
    // ...
    // Since Google Maps payload structures change frequently, this block would hold
    // robust recursive array traversal logic.
  }
}

export const networkInterceptor = new NetworkInterceptor();
