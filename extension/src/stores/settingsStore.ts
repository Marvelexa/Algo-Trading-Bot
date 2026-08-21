import { create } from 'zustand';
import { Settings } from '../types/settings';

interface SettingsState {
  settings: Settings;
  updateSettings: (newSettings: Partial<Settings>) => void;
  resetSettings: () => void;
}

const defaultSettings: Settings = {
  autoScroll: true,
  scrollDelay: 1500,
  onlyNoWebsite: false,
  deepExtractionEnabled: false,
  debugClickVisualizer: false,
  minRating: 0,
  minReviews: 0,
  outreachValuationBase: 5000, // ₹5,000 per lead outreach estimation base value
  autoExport: false,
  exportFormat: 'csv',
  themeMode: 'glass',
  maxLeadsLimit: 5000,
  defaultCountryCode: '+91', // Default phone prefix selector mapping
};

export const useSettingsStore = create<SettingsState>((set) => ({
  settings: { ...defaultSettings },
  updateSettings: (newSettings) =>
    set((state) => ({ settings: { ...state.settings, ...newSettings } })),
  resetSettings: () => set({ settings: { ...defaultSettings } }),
}));
