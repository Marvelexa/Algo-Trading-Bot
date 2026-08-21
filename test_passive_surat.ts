import fs from 'fs';

class PageStateHarvester {
  public static extractFromText(text: string, businessName: string): { phone?: string | null; website?: string | null } {
    // Unescape slashes first to make regex matching trivial
    const cleanText = text.replace(/\\\/#/g, '/').replace(/\\\//g, '/');
    
    const escapedName = businessName.replace(/"/g, '\\"');
    let nameIndex = cleanText.indexOf(`"${escapedName}"`);
    if (nameIndex === -1) {
      nameIndex = cleanText.toLowerCase().indexOf(businessName.toLowerCase());
    }

    if (nameIndex === -1) return {};

    const chunk = cleanText.substring(nameIndex - 1000, nameIndex + 5000); // look slightly before and after

    let phone: string | null = null;
    let website: string | null = null;

    // 1. Check for tel: link in the chunk
    const telMatches = [...chunk.matchAll(/"tel:([^"]+)"/g)];
    if (telMatches.length > 0) {
      phone = telMatches[0][1].trim();
    }

    // 2. Schema telephone match
    if (!phone) {
      const phoneMeta = chunk.match(/itemprop="telephone"\s+content="([^"]+)"/) || chunk.match(/"telephone"\s*:\s*"([^"]+)"/);
      if (phoneMeta && phoneMeta[1]) phone = phoneMeta[1].trim();
    }

    // 3. Search for any quoted numbers in the chunk
    if (!phone) {
      const phoneMatches = [...chunk.matchAll(/"(\+?[0-9][0-9\s\-\(\)]{8,20})"/g)];
      for (const m of phoneMatches) {
        const num = m[1].trim();
        const digitCount = (num.match(/\d/g) || []).length;
        if (digitCount >= 8 && digitCount <= 15 && !num.startsWith('0000') && !num.includes('1970') && !num.includes('2026')) {
          phone = num;
          break;
        }
      }
    }

    // 4. Look for websites
    const webMatches = [...chunk.matchAll(/(?:itemprop="url"|href)="(https?:\/\/[^"]+)"/g)].concat(
        [...chunk.matchAll(/"(https?:\/\/[^"]+)"/g)]
    );
    
    for (const m of webMatches) {
       const url = m[1];
       if (url.startsWith('http') && 
           !url.includes('google.com') && 
           !url.includes('gstatic.com') && 
           !url.includes('schema.org') && 
           !url.includes('w3.org') &&
           !url.includes('googleusercontent.com') &&
           !url.includes('ggpht.com') &&
           !url.includes('youtube.com')) {
           
           if (!url.includes('facebook.com') && !url.includes('instagram.com') && !url.includes('linkedin.com') && !url.includes('twitter.com') && !url.includes('x.com')) {
              website = url;
              break; 
           }
       }
    }

    // Fallback: if no website yet, look for any http link excluding google
    if (!website) {
       for (const m of webMatches) {
         const url = m[1];
         if (url.startsWith('http') && 
             !url.includes('google.com') && 
             !url.includes('gstatic.com') && 
             !url.includes('schema.org') && 
             !url.includes('w3.org') &&
             !url.includes('googleusercontent.com') &&
             !url.includes('ggpht.com')) {
             website = url;
             break;
         }
       }
    }

    return { phone, website };
  }
}

const net = fs.readFileSync('surat_cafes_response.txt', 'utf8');
const html = fs.readFileSync('surat_cafes_html.txt', 'utf8');
const combined = [html, net].join('\n');

const testBusinesses = [
  'Unvind Cafe',
  'Cave Coffee',
  'Fenster Cafe',
  'Nothing Before Coffee - VIP Road, Surat',
  'Mr Cafe (The Sky Lounge) Multicuisine Restaurant'
];

console.log('--- TESTING PASSIVE EXTRACT ON LOCAL CACHES WITH FILTERS ---');
for (const biz of testBusinesses) {
  const result = PageStateHarvester.extractFromText(combined, biz);
  console.log(`Business: ${biz}`);
  console.log(`Result:`, JSON.stringify(result, null, 2));
  console.log('-----------------------------\n');
}
