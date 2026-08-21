import { useCollectionStore } from '../stores/collectionStore';
import { useLeadStore } from '../stores/leadStore';
import { useSettingsStore } from '../stores/settingsStore';
import { mapsObserver } from '../core/mapsObserver';
import { scrollEngine } from '../core/scrollEngine';
import { Lead } from '../types/lead';

export class MapsService {
  public async startCollection(country: string, category: string): Promise<void> {
    const { status, setStatus, resetCollectionSession, addLog } = useCollectionStore.getState();
    const { settings } = useSettingsStore.getState();
    
    if (status === 'collecting') return;

    if (status === 'idle' || status === 'stopped' || status === 'completed') {
      resetCollectionSession();
      useLeadStore.getState().clearLeads();
    }

    setStatus('collecting');
    addLog(`System: Starting browser DOM scraper for ${category} in ${country}...`);

    try {
      // 1. Start DOM MutationObserver and Network Intercept capture
      mapsObserver.start((newLeads) => {
        const { addLeads } = useLeadStore.getState();
        
        // Convert partial scraped leads into full Lead models
        const formattedLeads = newLeads.map((lead) => {
          const hasWebsite = !!(lead.website && lead.website !== "NO have yet" && lead.website.trim() !== "");
          const calculatedScore = 50; // base
          
          return {
            id: lead.id || `lead-${Date.now()}-${Math.floor(Math.random() * 100000)}`,
            name: lead.name || 'Unknown Business',
            category: lead.category || category || 'Local Business',
            phone: lead.phone || '',
            email: lead.email || '',
            website: lead.website || '',
            address: lead.address || (lead as any).location || '',
            rating: lead.rating || 0,
            reviews: (lead as any).reviewsCount || lead.reviews || 0,
            mapsUrl: lead.mapsUrl || '',
            hasWebsite,
            leadScore: lead.leadScore || calculatedScore,
            opportunityLevel: lead.opportunityLevel || 'COLD',
            estimatedRevenue: lead.estimatedRevenue || 5000,
            hasGmbClaimed: lead.hasGmbClaimed || false,
            createdAt: lead.createdAt || new Date().toISOString()
          } as any as Lead;
        });
        
        addLeads(formattedLeads);
      });

      // 2. Start Scroll Engine if autoscroll is enabled
      if (settings.autoScroll) {
        addLog(`System: Scroll engine mounted at ${settings.scrollDelay}ms velocity.`);
        scrollEngine.start(
          (progress) => {
            useCollectionStore.getState().setScrollProgress(progress);
          },
          () => {
            // Reached the end of the scroll list
            addLog('System: End of Google Maps list reached.');
            this.stopCollection(true);
          },
          settings.scrollDelay
        );
      }
    } catch (error: any) {
      addLog(`System Scrape Error: ${error.message}`);
      setStatus('stopped');
    }
  }

  public pauseCollection(): void {
    const { setStatus, addLog } = useCollectionStore.getState();
    setStatus('paused');
    addLog('System: Scraping paused.');
    scrollEngine.stop();
  }

  public resumeCollection(): void {
    const { status, setStatus, addLog } = useCollectionStore.getState();
    const { settings } = useSettingsStore.getState();
    if (status !== 'paused') return;
    
    setStatus('collecting');
    addLog('System: Resuming browser DOM scraper...');
    
    if (settings.autoScroll) {
      scrollEngine.start(
        (progress) => {
          useCollectionStore.getState().setScrollProgress(progress);
        },
        () => {
          this.stopCollection(true);
        },
        settings.scrollDelay
      );
    }
  }

  public async stopCollection(completed: boolean = false): Promise<void> {
    const { setStatus, addLog } = useCollectionStore.getState();
    
    // Stop Scroll and observers
    scrollEngine.stop();
    mapsObserver.stop();

    setStatus(completed ? 'completed' : 'stopped');
    addLog(completed ? 'System: Lead collection completed successfully.' : 'System: Scraping aborted by operator.');
  }
}

export const mapsService = new MapsService();
