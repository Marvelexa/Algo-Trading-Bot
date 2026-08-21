import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import crypto from 'crypto';
import { discoveryEngine } from './discovery/discoveryEngine';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// Start a new scraping job
app.post('/api/scrape/start', async (req, res) => {
  try {
    const { country, category, maxLeads, resumeId } = req.body;
    
    if (!country || !category) {
      return res.status(400).json({ error: 'Country and category are required' });
    }

    const id = resumeId || crypto.randomUUID();
    const job = await discoveryEngine.startJob(id, country, category, maxLeads || 1000);
    
    res.json({ success: true, jobId: job.id, status: job.status });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get real-time status of a job
app.get('/api/scrape/status/:id', (req, res) => {
  const job = discoveryEngine.getStatus(req.params.id);
  if (!job) {
    return res.status(404).json({ error: 'Job not found' });
  }
  res.json(job);
});

// Stop a job
app.post('/api/scrape/stop/:id', (req, res) => {
  discoveryEngine.stopJob(req.params.id);
  res.json({ success: true, status: 'stopped' });
});

app.listen(PORT, () => {
  console.log(`Freelance Goldmine Backend running on http://localhost:${PORT}`);
});
