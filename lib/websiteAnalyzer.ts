import https from 'https';
import http from 'http';

export interface WebsiteAnalysis {
  exists: boolean;
  isHttps: boolean;
  isMobileFriendly: boolean;
  hasModernDesign: boolean;
  performanceScore: number; // 0 to 100
  opportunityScore: number; // 100 = best opportunity, 20 = worst opportunity
}

export class WebsiteAnalyzer {
  public async analyze(url: string | null): Promise<WebsiteAnalysis> {
    if (!url || url.trim() === '') {
      return {
        exists: false,
        isHttps: false,
        isMobileFriendly: false,
        hasModernDesign: false,
        performanceScore: 0,
        opportunityScore: 100 // No website = best opportunity
      };
    }

    try {
      const isHttps = url.startsWith('https');
      const html = await this.fetchHtml(url);
      
      const isMobileFriendly = html.includes('viewport') && html.includes('device-width');
      const hasModernDesign = html.includes('flex') || html.includes('grid') || html.includes('react') || html.includes('vue') || html.includes('angular') || html.includes('wp-content');
      
      let opportunityScore = 20; // Default (modern site)
      
      if (!isHttps || !isMobileFriendly || !hasModernDesign) {
        opportunityScore = 80; // Old or poorly designed site
      }

      return {
        exists: true,
        isHttps,
        isMobileFriendly,
        hasModernDesign,
        performanceScore: isMobileFriendly ? 80 : 40,
        opportunityScore
      };
    } catch (error) {
      // If website fails to load entirely, treat as high opportunity
      return {
        exists: false,
        isHttps: url.startsWith('https'),
        isMobileFriendly: false,
        hasModernDesign: false,
        performanceScore: 0,
        opportunityScore: 100
      };
    }
  }

  private fetchHtml(url: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const client = url.startsWith('https') ? https : http;
      const req = client.get(url, { timeout: 5000 }, (res) => {
        if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          // simple redirect follow
          return resolve(this.fetchHtml(res.headers.location));
        }
        
        let data = '';
        res.on('data', (chunk) => data += chunk);
        res.on('end', () => resolve(data.toLowerCase()));
      });

      req.on('error', reject);
      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Timeout'));
      });
    });
  }
}

export const websiteAnalyzer = new WebsiteAnalyzer();
