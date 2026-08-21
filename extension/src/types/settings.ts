export interface Settings {
  autoScroll: boolean;
  scrollDelay: number; // in milliseconds between scrolls
  onlyNoWebsite: boolean;
  deepExtractionEnabled: boolean; // V3 Smart Extraction Mode
  debugClickVisualizer: boolean;
  minRating: number;
  minReviews: number;
  outreachValuationBase: number; // base ₹ multiplier for No-Website leads
  autoExport: boolean;
  exportFormat: 'csv' | 'xlsx' | 'json';
  themeMode: 'dark' | 'light' | 'glass';
  maxLeadsLimit: number;
  defaultCountryCode: string; // Default phone prefix selector mapping
}
