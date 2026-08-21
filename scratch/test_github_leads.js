async function testSearch() {
  const query = '("need a website" OR "looking for a website developer" OR "website developer needed" OR "looking for a web developer")';
  const url = `https://api.github.com/search/issues?q=${encodeURIComponent(query)}&sort=created&order=desc&per_page=10`;
  
  console.log('Fetching from GitHub API:', url);
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Freelance-Goldmine-Lead-Finder'
      }
    });
    if (!res.ok) {
      throw new Error(`HTTP Error: ${res.status} ${res.statusText}`);
    }
    const data = await res.json();
    console.log(`Found ${data.total_count} total issues/discussions.`);
    console.log('First 5 results:');
    (data.items || []).slice(0, 5).forEach((item, index) => {
      console.log(`\n--- Result #${index + 1} ---`);
      console.log(`Title: ${item.title}`);
      console.log(`State: ${item.state}`);
      console.log(`User: ${item.user.login} (${item.user.html_url})`);
      console.log(`URL: ${item.html_url}`);
      console.log(`Created At: ${item.created_at}`);
      console.log(`Body Snippet: ${item.body ? item.body.substring(0, 200) + '...' : 'No body'}`);
    });
  } catch (err) {
    console.error('Error during GitHub search:', err);
  }
}

testSearch();
