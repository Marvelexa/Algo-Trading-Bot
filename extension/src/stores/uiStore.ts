import { create } from 'zustand';

interface Position {
  x: number;
  y: number;
}

interface UiState {
  isMinimized: boolean;
  activeTab: 'dashboard' | 'leads' | 'settings' | 'analytics';
  position: Position;
  isSettingsOpen: boolean;
  setMinimized: (min: boolean) => void;
  setActiveTab: (tab: 'dashboard' | 'leads' | 'settings' | 'analytics') => void;
  setPosition: (pos: Position) => void;
  setSettingsOpen: (open: boolean) => void;
  resetLayout: () => void;
}

const defaultPosition: Position = { x: 0, y: 0 }; // relative starting offsets (translated in content script)

export const useUiStore = create<UiState>((set) => ({
  isMinimized: false,
  activeTab: 'dashboard',
  position: defaultPosition,
  isSettingsOpen: false,
  setMinimized: (min) => set({ isMinimized: min }),
  setActiveTab: (tab) => set({ activeTab: tab }),
  setPosition: (pos) => set({ position: pos }),
  setSettingsOpen: (open) => set({ isSettingsOpen: open }),
  resetLayout: () => set({ isMinimized: false, activeTab: 'dashboard', position: defaultPosition, isSettingsOpen: false }),
}));
