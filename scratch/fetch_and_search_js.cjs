const fs = require('fs');
const https = require('https');

https.get('https://nexvora-ud88.onrender.com/assets/index-WFmLAobl.js', (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    // Search for loading components
    console.log('JS Size:', data.length);
    const idx = data.indexOf('Loading');
    if (idx !== -1) {
      console.log('Found "Loading" at index:', idx);
      console.log('Snippet:', data.substring(idx - 100, idx + 300));
    }
    
    // Find framer-motion components or keyframes
    const animateIdx = data.indexOf('animate:');
    if (animateIdx !== -1) {
      console.log('Found "animate:" snippet:', data.substring(animateIdx - 100, animateIdx + 200));
    }
    
    // Search for letters split or transition
    const splitIdx = data.indexOf('.split(');
    if (splitIdx !== -1) {
      console.log('Found ".split(" snippet:', data.substring(splitIdx - 100, splitIdx + 200));
    }

    process.exit(0);
  });
}).on('error', (err) => {
  console.error(err);
  process.exit(1);
});
