import dotenv from 'dotenv';
dotenv.config();

async function testSend() {
  const apiUrl = process.env.CRM_BASE_URL || "https://crm-2-blue.vercel.app/api/v1";
  const apiKey = process.env.CRM_API_KEY;

  const { sendWhatsAppViaCRM } = await import('../lib/crm.ts');
  
  // Fake number
  const phone = "15555555555";
  
  console.log("Testing send to", phone);
  const result = await sendWhatsAppViaCRM(phone, "Test", "Test", "https://sflxtawnonqumtumwkda.supabase.co/storage/v1/object/public/chat-media/outreach-legacy-1782835914882.mp4", apiKey, apiUrl);
  
  console.log("Final Result returned to LeadPipeline:", result);
}

testSend().catch(console.error);
