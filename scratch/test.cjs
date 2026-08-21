const http = require('http');

const data = JSON.stringify({
  leadId: 'test-varraja-456',
  name: 'VARRAJA GALLERY',
  category: 'Clothing store',
  rating: 5,
  reviewsCount: 50
});

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/leads/generate-outreach',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
};

console.log('Sending test request to /api/leads/generate-outreach on port 3000...');

const req = http.request(options, (res) => {
  let responseData = '';
  res.on('data', (chunk) => responseData += chunk);
  res.on('end', () => {
    console.log('Response:', responseData);
  });
});

req.on('error', (error) => {
  console.error('Error:', error);
});

req.write(data);
req.end();
