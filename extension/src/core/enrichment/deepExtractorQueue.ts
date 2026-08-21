import { Lead } from '../../types/lead';
import { PayloadCorrelator } from '../network/payloadCorrelator';
import { DetailPayloadHarvester } from '../network/detailPayloadHarvester';
import { useLeadStore } from '../../stores/leadStore';
import { useCollectionStore } from '../../stores/collectionStore';
import { CompletionTelemetry } from '../analytics/completionTelemetry';

export class DeepExtractorQueue {
  private static MAX_CONCURRENT = 3;
  private static queue: Lead[] = [];
  private static activeCount = 0;
  private static processedDeepCards = new Set<string>();

  public static enqueue(lead: Lead) {
    if (!lead.id || this.processedDeepCards.has(lead.id)) return;
    this.processedDeepCards.add(lead.id);
    this.queue.push(lead);
    
    // Update store state
    useCollectionStore.getState().setIsEnriching(true);
    
    this.processNext();
  }

  private static async processNext() {
    if (this.activeCount >= this.MAX_CONCURRENT || this.queue.length === 0) {
       if (this.queue.length === 0 && this.activeCount === 0) {
          useCollectionStore.getState().setIsEnriching(false);
          useCollectionStore.getState().setEnrichmentProgress(0, 0, '');
       }
       return;
    }
    
    this.activeCount++;
    const lead = this.queue.shift()!;
    
    const store = useCollectionStore.getState();
    store.setEnrichmentProgress(this.processedDeepCards.size - this.queue.length, this.processedDeepCards.size, lead.name);

    try {
      await this.processLead(lead);
    } catch (err) {
      console.error(`[DeepExtractorQueue] Error processing ${lead.name}:`, err);
    } finally {
      this.activeCount--;
      this.processNext();
    }
  }

  private static async processLead(lead: Lead) {
    // Stage 3 - First check network cache (interceptor might have caught it)
    const cached = PayloadCorrelator.findByName(lead.name);
    if (cached && (cached.phone || cached.website)) {
        console.log(`[DeepExtractorQueue] Cache HIT for ${lead.name}`);
        this.enrichLead(lead, cached);
        if (CompletionTelemetry?.incrementDeepQualified) CompletionTelemetry.incrementDeepQualified();
        return;
    }

    // Stage 4 - Hidden Iframe DOM Extraction
    return new Promise<void>((resolve) => {
        console.log(`[DeepExtractorQueue] Iframe FETCH for ${lead.name}`);
        
        const iframe = document.createElement('iframe');
        iframe.style.width = '0px';
        iframe.style.height = '0px';
        iframe.style.position = 'absolute';
        iframe.style.top = '-9999px';
        iframe.src = lead.mapsUrl;
        
        // Timeout fallback
        const timeoutId = setTimeout(() => {
            console.warn(`[DeepExtractorQueue] Iframe timeout for ${lead.name}`);
            if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
            resolve();
        }, 15000);

        iframe.onload = () => {
            // Give JS a few seconds to render the DOM
            setTimeout(() => {
                try {
                    const doc = iframe.contentWindow?.document;
                    if (doc) {
                        let extractedPhone = null;
                        let extractedWebsite = null;
                        
                        // Look for phone using standard maps selectors
                        let phoneBtn = doc.querySelector('button[data-item-id^="phone:tel:"]');
                        if (phoneBtn) {
                            extractedPhone = phoneBtn.getAttribute('data-item-id')?.replace('phone:tel:', '')?.trim();
                        }
                        if (!extractedPhone) {
                            phoneBtn = doc.querySelector('button[data-tooltip="Copy phone number"]');
                            if (phoneBtn) extractedPhone = phoneBtn.getAttribute('aria-label')?.replace(/Phone number:/i, '')?.trim() || phoneBtn.textContent?.trim();
                        }
                        
                        // Fallback check to NEVER allow "Send to phone"
                        if (extractedPhone && extractedPhone.toLowerCase().includes('send to phone')) {
                            extractedPhone = null;
                        }
                        
                        // Look for website
                        const webBtn = doc.querySelector('a[data-tooltip*="website"], a[data-item-id="authority"]');
                        if (webBtn) extractedWebsite = webBtn.getAttribute('href');

                        // Look for address
                        let extractedAddress = null;
                        const addressBtn = doc.querySelector('button[data-item-id="address"], button[data-item-id*="address"]');
                        if (addressBtn) {
                            extractedAddress = addressBtn.getAttribute('aria-label')?.replace(/^Address:\s*/i, '')?.trim();
                            if (!extractedAddress && addressBtn.textContent) extractedAddress = addressBtn.textContent.trim();
                        }

                        if (extractedPhone || extractedWebsite || extractedAddress) {
                            console.log(`[DeepExtractorQueue] Iframe SUCCESS for ${lead.name}: Phone=${extractedPhone}, Web=${extractedWebsite}, Addr=${extractedAddress}`);
                            this.enrichLead(lead, { phone: extractedPhone, website: extractedWebsite, address: extractedAddress });
                            if (CompletionTelemetry?.incrementDeepQualified) CompletionTelemetry.incrementDeepQualified();
                        } else {
                            console.log(`[DeepExtractorQueue] Iframe NO DATA for ${lead.name}`);
                        }
                    }
                } catch (e) {
                    console.error(`[DeepExtractorQueue] Iframe DOM Error for ${lead.name}`, e);
                } finally {
                    clearTimeout(timeoutId);
                    if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
                    resolve();
                }
            }, 3000); // 3 sec wait for JS render
        };

        document.body.appendChild(iframe);
    });
  }

  private static enrichLead(lead: Lead, data: any) {
     const updates: Partial<Lead> = {};
     
     if (data.phone && !lead.phone) {
         updates.phone = data.phone;
     }
     
     if (data.website && !lead.website) {
         updates.website = data.website;
         updates.hasWebsite = true;
     }

     if (data.address && (!lead.address || lead.address.length < 5)) {
         updates.address = data.address;
     }

     if (data.socials && Object.keys(data.socials).length > 0) {
         updates.socialLinks = { ...lead.socialLinks, ...data.socials };
     }

     if (Object.keys(updates).length > 0) {
         useLeadStore.getState().updateLead(lead.id, updates);
     }
  }
}
