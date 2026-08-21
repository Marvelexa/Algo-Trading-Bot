export class DetailPayloadHarvester {
  public static parsePayload(rawPayload: any): any {
    let jsonArray: any = null;
    let phone: string | null = null;
    let website: string | null = null;
    let socials: Record<string, string> = {};

    if (typeof rawPayload === 'string') {
        // 0. Detect Blockers
        if (rawPayload.includes('consent.google.com') || rawPayload.includes('I agree to the use of cookies')) {
            console.warn('[DetailHarvester] BLOCKED by Google Consent page!');
            return { phone, website, socials };
        }
        if (rawPayload.includes('Our systems have detected unusual traffic') || rawPayload.includes('g-recaptcha')) {
            console.warn('[DetailHarvester] BLOCKED by Google CAPTCHA / Rate Limit!');
            return { phone, website, socials };
        }

        // 1. Meta Tag / Schema Extraction (Highest Accuracy)
        const phoneMeta = rawPayload.match(/itemprop="telephone"\s+content="([^"]+)"/) || rawPayload.match(/"telephone"\s*:\s*"([^"]+)"/);
        if (phoneMeta && phoneMeta[1]) phone = phoneMeta[1].trim();

        // 2. Global Phone Number Regex Search across the entire raw string
        if (!phone) {
            // Looks for "tel:+919876543210" or just "+91 987 654 3210" inside quotes
            const phoneMatches = [...rawPayload.matchAll(/"(\+?[0-9][0-9\s\-\(\)]{8,20})"/g)];
            for (const m of phoneMatches) {
                const num = m[1].trim();
                const digitCount = (num.match(/\d/g) || []).length;
                // Avoid matching purely numeric IDs or short strings
                if (digitCount >= 8 && digitCount <= 15 && !num.startsWith('0000')) {
                    phone = num;
                    break;
                }
            }
        }
        
        // 3. Fallback Phone Search specifically near the "tel:" prefix in obfuscated JS
        if (!phone) {
             const telMatches = [...rawPayload.matchAll(/"tel:([^"]+)"/g)];
             if (telMatches.length > 0) {
                 phone = telMatches[0][1].trim();
             }
        }

        // 4. Global Website Regex Search across the entire raw string
        // Exclude google maps, gstatic, schema.org domains
        const webMatches = [...rawPayload.matchAll(/(?:itemprop="url"|href)="(https?:\/\/[^"]+)"/g)].concat(
            [...rawPayload.matchAll(/"(https?:\/\/[^"]+)"/g)]
        );
        
        for (const m of webMatches) {
           const url = m[1];
           if (url.startsWith('http') && 
               !url.includes('google.com') && 
               !url.includes('gstatic.com') && 
               !url.includes('schema.org') && 
               !url.includes('w3.org') &&
               !url.includes('youtube.com')) {
               
               if (url.includes('facebook.com/')) socials.facebook = url;
               else if (url.includes('instagram.com/')) socials.instagram = url;
               else if (url.includes('linkedin.com/')) socials.linkedin = url;
               else if (url.includes('twitter.com/') || url.includes('x.com/')) socials.twitter = url;
               else if (!website) website = url;
           }
        }
    }

    return {
       phone,
       website,
       socials
    };
  }

  public static extract(rawJson: any): any {
    // For interceptor pipeline compatibility
    return this.parsePayload(rawJson);
  }
}
