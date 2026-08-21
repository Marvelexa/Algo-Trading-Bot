async function testQueries() {
  const queries = [
    '("need a website" OR "looking for a developer to build" OR "looking for a web developer" OR "looking for a website developer") is:issue state:open',
    '"need a website" is:issue state:open',
    '"hire a developer" is:issue state:open',
    '"looking for a web designer" is:issue state:open'
  ];

  for (const q of queries) {
    const url = `https://api.github.com/search/issues?q=${encodeURIComponent(q)}&sort=created&order=desc&per_page=5`;
    console.log(`\n==========================================\nQuery: ${q}`);
    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': 'Freelance-Goldmine-Lead-Finder' }
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      console.log(`Found: ${data.total_count} total`);
      (data.items || []).forEach((item, index) => {
        console.log(`  [${index + 1}] Title: ${item.title}`);
        console.log(`      Url: ${item.html_url}`);
        console.log(`      User: ${item.user.login}`);
        console.log(`      Body: ${item.body ? item.body.substring(0, 120).replace(/\n/g, ' ') + '...' : ''}`);
      });
    } catch (err) {
      console.error(err);
    }
  }
}

testQueries();
