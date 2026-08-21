const fs = require('fs');
fetch('https://www.google.com/maps/place/Starbucks/@40.758895,-73.985131,15z').then(r => r.text()).then(html => {
    fs.writeFileSync('test_node.html', html);
    console.log('Length:', html.length);
    const phones = html.match(/\+?\d[\d\s\-\(\)\.]{7,15}\d/g) || [];
    console.log('Phones:', phones.slice(0, 5));
    const urls = html.match(/(?:https?:\/\/)(?:[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6})(?:[^\s"'\\]*)/g) || [];
    console.log('URLs:', urls.slice(0, 5));
});
