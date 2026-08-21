const fs = require('fs');

async function run() {
  const query = 'site:linkedin.com/jobs "website"';
  const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
  
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });
    const html = await res.text();
    
    // Save to the correct scratch folder
    fs.mkdirSync('scratch', { recursive: true });
    fs.writeFileSync('scratch/ddg_output.html', html);
    
    console.log('Saved to scratch/ddg_output.html. Parsing results...');
    
    // Find all results elements
    // Let's count divs with different classes
    const adMatches = html.match(/class="[^"]*ad[^"]*"/gi);
    console.log('Ad class matches:', adMatches ? adMatches.length : 0);
    
    // Find all links containing duckduckgo.com/y.js or similar (which are sponsored links)
    // Sponsored links in DuckDuckGo HTML usually point to duckduckgo.com/y.js or similar redirector
    // Organic links point to the actual site (e.g. linkedin.com) or external pages.
    const results = [];
    
    // Let's print out the first few <a> hrefs and class attributes
    const hrefRegex = /<a\s+[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
    let match;
    let index = 0;
    while ((match = hrefRegex.exec(html)) !== null && index < 30) {
      const href = match[1];
      const text = match[2].replace(/<[^>]*>/g, '').trim();
      if (href.includes('linkedin.com') || href.includes('duckduckgo.com/y.js') || href.includes('uddg=')) {
        console.log(`Link ${index++}: href="${href}" | text="${text}"`);
      }
    }
  } catch (e) {
    console.error(e);
  }
}
run();
