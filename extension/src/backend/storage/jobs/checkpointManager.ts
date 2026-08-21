import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
  private storageDir: string;

  constructor() {
    this.storageDir = path.resolve(__dirname, 'data');
    if (!fs.existsSync(this.storageDir)) {
      fs.mkdirSync(this.storageDir, { recursive: true });
    }
  }

  private getFilePath(id: string): string {
    return path.join(this.storageDir, `${id}.json`);
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
