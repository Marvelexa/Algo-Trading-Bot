const fs = require('fs');
const path = require('path');
const SUPABASE_URL = 'https://sflxtawnonqumtumwkda.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNmbHh0YXdub25xdW10dW13a2RhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MjMxNjk1NSwiZXhwIjoyMDk3ODkyOTU1fQ.zLruXiB8Z8zzQUgCmj92kbO_DR4X86BF4-VG-6urid4';

async function testUpload() {
  try {
    const filePath = path.join(process.cwd(), 'package.json'); // Just upload package.json to test
    const fileBuffer = fs.readFileSync(filePath);
    const fileName = 'test-' + Date.now() + '.json';
    
    const uploadUrl = SUPABASE_URL + '/storage/v1/object/chat-media/' + fileName;
    
    const res = await fetch(uploadUrl, {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + SUPABASE_KEY,
        'Content-Type': 'application/json'
      },
      body: fileBuffer
    });
    
    const data = await res.json();
    console.log('Upload Result:', data);
    if(res.ok) {
       const publicUrl = SUPABASE_URL + '/storage/v1/object/public/chat-media/' + fileName;
       console.log('Public URL:', publicUrl);
       const publicUrlRes = await fetch(publicUrl);
       console.log('Public URL Status:', publicUrlRes.status);
    }
  } catch (err) {
    console.error(err);
  }
}
testUpload();
