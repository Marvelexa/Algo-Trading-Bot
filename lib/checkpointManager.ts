import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Using __dirname substitute since it's CommonJS or ES module
// If using ES modules in Node, you can use:
// const __filename = fileURLToPath(import.meta.url);
// const __dirname = path.dirname(__filename);
// However, since Goldmine is using TSX with likely Node resolution, 
// process.cwd() is safer or path.resolve(__dirname). 
// Assuming CommonJS or Vite node wrapper based on other files.
const storageDir = path.join(process.cwd(), 'lib', 'scraper_jobs');

export interface Checkpoint {
  id: string;
  country: string;
  category: string;
  maxLeads: number;
  currentCityIndex: number;
  cities: string[];
  leadsCollected: number;
  duplicateCount: number;
  failedCities: string[];
  status: 'running' | 'paused' | 'completed' | 'error' | 'stopped';
  lastUpdated: string;
}

export class CheckpointManager {
  constructor() {
    if (!fs.existsSync(storageDir)) {
      fs.mkdirSync(storageDir, { recursive: true });
    }
  }

  private getFilePath(id: string): string {
    return path.join(storageDir, `${id}.json`);
  }

  public saveCheckpoint(checkpoint: Checkpoint): void {
    checkpoint.lastUpdated = new Date().toISOString();
    fs.writeFileSync(this.getFilePath(checkpoint.id), JSON.stringify(checkpoint, null, 2), 'utf-8');
  }

  public getCheckpoint(id: string): Checkpoint | null {
    const filePath = this.getFilePath(id);
    if (!fs.existsSync(filePath)) {
      return null;
    }
    const data = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(data) as Checkpoint;
  }

  public updateProgress(id: string, updates: Partial<Checkpoint>): void {
    const checkpoint = this.getCheckpoint(id);
    if (checkpoint) {
      Object.assign(checkpoint, updates);
      this.saveCheckpoint(checkpoint);
    }
  }
}

export const checkpointManager = new CheckpointManager();
