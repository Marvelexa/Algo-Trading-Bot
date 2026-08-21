// Native fetch is available in Node 24

async function testPipeline() {
  console.log("Sending test request to /api/leads/generate-outreach...");
  const response = await fetch('http://localhost:3000/api/leads/generate-outreach', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      leadId: "test-brand-123",
      name: "Urban Threads",
      category: "Clothing Brand",
      rating: 4.9,
      reviewsCount: 156
    })
  });

  const data = await response.json();
  console.log("Response:", JSON.stringify(data, null, 2));
}

testPipeline().catch(console.error);
