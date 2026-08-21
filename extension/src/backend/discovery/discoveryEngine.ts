import { checkpointManager } from '../storage/jobs/checkpointManager';
import { leadProcessor, ProcessedLead } from '../processing/leadProcessor';
import { puppeteerScraper } from './puppeteerScraper';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class DiscoveryEngine {
  public async startJob(id: string, country: string, category: string, maxLeads: number) {
    const citiesPath = path.resolve(__dirname, '../data/cities.json');
    const citiesData = JSON.parse(fs.readFileSync(citiesPath, 'utf-8'));
    const cities = citiesData[country] || [];

    if (cities.length === 0) {
      throw new Error(`No cities found for country: ${country}`);
    }

    const checkpoint = checkpointManager.getCheckpoint(id) || {
      id,
      country,
      category,
      maxLeads,
      currentCityIndex: 0,
      cities,
      leadsCollected: 0,
      duplicateCount: 0,
      failedCities: [],
      status: 'running',
      lastUpdated: new Date().toISOString()
    };

    checkpoint.status = 'running';
    checkpointManager.saveCheckpoint(checkpoint);

    // Launch extraction loop asynchronously
    this.runExtractionLoop(checkpoint).catch(e => console.error("Extraction Loop Error:", e));
    
    return checkpoint;
  }

  private async runExtractionLoop(checkpoint: any) {
    try {
      while (checkpoint.status === 'running' && checkpoint.currentCityIndex < checkpoint.cities.length) {
        if (checkpoint.leadsCollected >= checkpoint.maxLeads) {
          checkpoint.status = 'completed';
          checkpointManager.saveCheckpoint(checkpoint);
          break;
        }

        const city = checkpoint.cities[checkpoint.currentCityIndex];
        const query = `${checkpoint.category} in ${city}`;
        
        try {
          console.log(`[Discovery Engine] Searching: ${query}`);
          await puppeteerScraper.scrapeCity(query, checkpoint.id);
        } catch (error) {
          console.error(`[Discovery Engine] Failed extracting city ${city}. Skipping to next.`);
          checkpoint.failedCities.push(city);
        }

        checkpoint.currentCityIndex++;
        checkpointManager.saveCheckpoint(checkpoint);
      }
      
      if (checkpoint.currentCityIndex >= checkpoint.cities.length) {
        checkpoint.status = 'completed';
        checkpointManager.saveCheckpoint(checkpoint);
      }
      
    } finally {
      await puppeteerScraper.closeBrowser();
      leadProcessor.resetState();
    }
  }

  public getStatus(id: string) {
    return checkpointManager.getCheckpoint(id);
  }

  public stopJob(id: string) {
    const checkpoint = checkpointManager.getCheckpoint(id);
    if (checkpoint) {
      checkpoint.status = 'stopped';
      checkpointManager.saveCheckpoint(checkpoint);
    }
  }
}

export const discoveryEngine = new DiscoveryEngine();
