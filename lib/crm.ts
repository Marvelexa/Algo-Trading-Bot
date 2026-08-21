import dotenv from "dotenv";
dotenv.config();

export interface CRMMessageResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

/**
 * Sends a WhatsApp message via the WACRM REST API.
 * Supports both text messages and media (video) messages.
 */
export async function sendWhatsAppViaCRM(
  phone: string,
  name: string | undefined | null,
  message: string,
  mediaUrl?: string,
  customApiKey?: string,
  customApiUrl?: string
): Promise<CRMMessageResult> {
  const apiUrl = customApiUrl || process.env.CRM_API_URL || "http://localhost:3000/api/v1";
  const apiKey = customApiKey || process.env.CRM_API_KEY;

  if (!apiKey) {
    console.error("[CRM API Client] Error: CRM API Key is not configured.");
    return { success: false, error: "CRM API Key is not configured" };
  }

  // Format the phone number (E.164 format)
  let cleanPhone = String(phone).replace(/[^0-9]/g, "");
  
  // Strip international dialing double zero prefix if it starts with 0091
  if (cleanPhone.startsWith("0091")) {
    cleanPhone = cleanPhone.substring(2);
  }
  
  // Strip leading local trunk zero after country code (e.g. +91 09876543210 -> 9109876543210 -> 919876543210)
  if (cleanPhone.startsWith("910") && cleanPhone.length === 13) {
    cleanPhone = "91" + cleanPhone.substring(3);
  }

  // Strip leading local trunk zero if followed by 10 digits (e.g. 09876543210 -> 9876543210)
  if (cleanPhone.startsWith("0") && cleanPhone.length === 11) {
    cleanPhone = cleanPhone.substring(1);
  }

  if (cleanPhone.length === 10) {
    cleanPhone = "91" + cleanPhone; // Fallback to Indian prefix if 10-digit
  }

  try {
    const isVideo = mediaUrl && (mediaUrl.endsWith(".mp4") || mediaUrl.endsWith(".webm") || mediaUrl.includes("/videos/"));
    
    // Prepare endpoint and payload
    const endpoint = `${apiUrl}/messages`;
    
    // If mediaUrl is relative (e.g. /videos/abc.mp4), upload it to Supabase so it has a public URL for Meta
    let absoluteMediaUrl = mediaUrl;
    if (mediaUrl && (mediaUrl.startsWith("/") || !mediaUrl.startsWith("http"))) {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
      const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;
      
      if (supabaseUrl && supabaseKey) {
        try {
          const fs = await import("fs");
          const path = await import("path");
          const filePath = path.join(process.cwd(), "public", mediaUrl.replace(/^\//, ""));
          if (fs.existsSync(filePath)) {
            const fileBuffer = fs.readFileSync(filePath);
            const fileName = `outreach-legacy-${Date.now()}.mp4`;
            const uploadUrl = `${supabaseUrl}/storage/v1/object/chat-media/${fileName}`;
            
            console.log(`[CRM API] Uploading legacy local video to Supabase Storage at ${uploadUrl}...`);
            const uploadRes = await fetch(uploadUrl, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${supabaseKey}`,
                'Content-Type': 'video/mp4'
              },
              body: fileBuffer
            });
            
            if (uploadRes.ok) {
              absoluteMediaUrl = `${supabaseUrl}/storage/v1/object/public/chat-media/${fileName}`;
              console.log(`[CRM API] Successfully uploaded. New public URL: ${absoluteMediaUrl}`);
            } else {
              console.error(`[CRM API] Failed to upload legacy video to Supabase:`, uploadRes.status);
            }
          }
        } catch (e) {
          console.error(`[CRM API] Error uploading legacy video:`, e);
        }
      }
      
      // Fallback if Supabase upload failed or wasn't configured
      if (!absoluteMediaUrl || absoluteMediaUrl.startsWith("/")) {
        const appUrl = process.env.APP_URL || "http://localhost:3000";
        absoluteMediaUrl = `${appUrl.replace(/\/$/, "")}/${mediaUrl.replace(/^\//, "")}`;
      }
    }

    // Send the absolute media URL directly instead of proxying it. Meta's crawler supports Supabase public URLs perfectly fine.
    const proxiedMediaUrl = absoluteMediaUrl;

    const payload = isVideo ? {
      phone: cleanPhone,
      contact_name: name || undefined,
      message_type: "template",
      template_name: "nexvora_template",
      template_language: "en",
      template_message_params: {
        body: [name || "there"], // Pass the customer's name dynamically to the template
        headerMediaUrl: proxiedMediaUrl
      },
      content_text: `Hi, Prince from Nexvora here.\n\nI came across ${name || "there"} and noticed your products have strong potential, but your online presence could do more to turn visitors into customers.\n\nI created a quick demo showing how a premium website experience could help your brand look more professional and make buying easier.\n\nI’ve attached it — can I share a few ideas?`, // Override old AI text with exact template text so CRM UI shows the right message
      media_url: proxiedMediaUrl // Add media_url to the root so CRM UI displays the video
    } : {
      phone: cleanPhone,
      contact_name: name || undefined,
      message_type: "text",
      content_text: message
    };

    console.log(`[CRM API Client] Sending message to ${cleanPhone} via CRM API at ${endpoint}...`);
    
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    const resJson = await response.json() as any;

    if (!response.ok) {
      const errorMsg = resJson.error?.message || `HTTP ${response.status} Error`;
      console.error(`[CRM API Client] Failed to send message:`, errorMsg);
      return { success: false, error: errorMsg };
    }

    console.log(`[CRM API Client] Message sent successfully! Msg ID: ${resJson.data?.messageId || resJson.data?.id}`);
    
    // Poll for asynchronous Meta webhook failures (like number not on WhatsApp, or spam blocks)
    const msgId = resJson.data?.id;
    const convId = resJson.data?.conversation_id;
    
    if (msgId && convId) {
      console.log(`[CRM API Client] Polling for up to 12 seconds to check Meta delivery status...`);
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
      const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;
      
      if (supabaseUrl && supabaseKey) {
        let isFailed = false;
        
        for (let i = 0; i < 4; i++) {
          await new Promise(resolve => setTimeout(resolve, 3000));
          try {
            const checkRes = await fetch(`${supabaseUrl}/rest/v1/messages?id=eq.${msgId}&select=status`, {
              headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}` }
            });
            if (checkRes.ok) {
              const checkData = await checkRes.json();
              const currentStatus = checkData[0]?.status;
              if (currentStatus === 'failed') {
                isFailed = true;
                break;
              } else if (currentStatus === 'delivered' || currentStatus === 'read') {
                break; // success confirmed
              }
            }
          } catch (e) {
            // ignore network errors during polling
          }
        }
        
        if (isFailed) {
          // The webhook updates 'messages' to 'failed' first, then updates 'conversations.last_message_text'.
          // Wait briefly to avoid a race condition before fetching the friendly error.
          await new Promise(resolve => setTimeout(resolve, 1500));
          
          try {
            for (let j = 0; j < 2; j++) {
              const convRes = await fetch(`${supabaseUrl}/rest/v1/conversations?id=eq.${convId}&select=last_message_text`, {
                headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}` }
              });
              if (convRes.ok) {
                const convData = await convRes.json();
                const lastText = convData[0]?.last_message_text || "Delivery failed.";
                if (lastText.includes("❌")) {
                  console.error(`[CRM API Client] Meta delivery failed asynchronously:`, lastText);
                  return { success: false, error: lastText };
                }
              }
              await new Promise(resolve => setTimeout(resolve, 1000));
            }
          } catch (e) {}
          return { success: false, error: "Delivery failed according to Meta." };
        }
      }
    }

    return {
      success: true,
      messageId: resJson.data?.messageId || resJson.data?.id
    };

  } catch (err: any) {
    console.error(`[CRM API Client] Network or Server error:`, err.message || err);
    return { success: false, error: err.message || String(err) };
  }
}
