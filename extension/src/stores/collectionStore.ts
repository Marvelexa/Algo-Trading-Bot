import { create } from 'zustand';

export type CollectionStatus = 'idle' | 'collecting' | 'paused' | 'completed' | 'stopped';

export interface Diagnostics {
  resultsPanelExists: boolean;
  scrollContainerExists: boolean;
  cardsCount: number;
  parsingWorkingCount: number;
}

interface CollectionState {
  status: CollectionStatus;
  businessesLoaded: number;
  duplicatesRemoved: number;
  scrollProgress: number; // 0 to 100
  elapsedTime: number; // in seconds
  estimatedTimeRemaining: number; // in seconds
  leadsPerMinute: number;
  logs: string[];
  // Debug & Diagnostics State
  debugMode: boolean;
  selectorError: string | null;
  diagnostics: Diagnostics;
  cardsFound: number;
  cardsParsed: number;
  cardsFailed: number;
  duplicateLeads: number;
  
  // Phone Extraction Statistics
  validPhones: number;
  invalidPhones: number;
  missingPhones: number;

  // Performance & Telemetry State
  performanceMode: boolean;
  safeMode: boolean;
  cpuRisk: 'LOW' | 'MEDIUM' | 'HIGH';
  memoryRisk: 'LOW' | 'MEDIUM' | 'HIGH';
  currentScrollSpeed: string;
  isMapsLoading: boolean;
  // Enrichment tracking
  isEnriching: boolean;
  enrichedCount: number;
  enrichTotal: number;
  enrichCurrentName: string;
  
  setStatus: (status: CollectionStatus) => void;
  setBusinessesLoaded: (count: number | ((prev: number) => number)) => void;
  setDuplicatesRemoved: (count: number | ((prev: number) => number)) => void;
  setScrollProgress: (progress: number) => void;
  setLeadsPerMinute: (lpm: number) => void;
  incrementElapsedTime: () => void;
  setEstimatedTimeRemaining: (sec: number) => void;
  addLog: (log: string) => void;
  
  // Debug Reducers
  setDebugMode: (val: boolean) => void;
  setSelectorError: (err: string | null) => void;
  setDiagnostics: (diag: Partial<Diagnostics>) => void;
  incrementCardsFound: (count: number) => void;
  incrementCardsParsed: () => void;
  incrementCardsFailed: () => void;
  incrementDuplicateLeads: () => void;
  
  // Phone Stats Reducers
  incrementValidPhones: () => void;
  incrementInvalidPhones: () => void;
  incrementMissingPhones: () => void;

  // Performance Reducers
  setPerformanceMode: (val: boolean) => void;
  setSafeMode: (val: boolean) => void;
  setCpuRisk: (risk: 'LOW' | 'MEDIUM' | 'HIGH') => void;
  setMemoryRisk: (risk: 'LOW' | 'MEDIUM' | 'HIGH') => void;
  setCurrentScrollSpeed: (speed: string) => void;
  setIsMapsLoading: (val: boolean) => void;
  setIsEnriching: (val: boolean) => void;
  setEnrichmentProgress: (enrichedCount: number, enrichTotal: number, currentName: string) => void;
  
  resetCollectionSession: () => void;
}

export const useCollectionStore = create<CollectionState>((set) => ({
  status: 'idle',
  businessesLoaded: 0,
  duplicatesRemoved: 0,
  scrollProgress: 0,
  elapsedTime: 0,
  estimatedTimeRemaining: 0,
  leadsPerMinute: 0,
  logs: [],
  debugMode: false,
  selectorError: null,
  diagnostics: {
    resultsPanelExists: false,
    scrollContainerExists: false,
    cardsCount: 0,
    parsingWorkingCount: 0,
  },
  cardsFound: 0,
  cardsParsed: 0,
  cardsFailed: 0,
  duplicateLeads: 0,
  // Phone stats initial states
  validPhones: 0,
  invalidPhones: 0,
  missingPhones: 0,

  // Performance Telemetry States
  performanceMode: false,
  safeMode: false,
  cpuRisk: 'LOW',
  memoryRisk: 'LOW',
  currentScrollSpeed: 'Normal',
  isMapsLoading: false,
  isEnriching: false,
  enrichedCount: 0,
  enrichTotal: 0,
  enrichCurrentName: '',

  setStatus: (status) => set({ status }),
  setBusinessesLoaded: (count) =>
    set((state) => ({
      businessesLoaded: typeof count === 'function' ? count(state.businessesLoaded) : count,
    })),
  setDuplicatesRemoved: (count) =>
    set((state) => ({
      duplicatesRemoved: typeof count === 'function' ? count(state.duplicatesRemoved) : count,
    })),
  setScrollProgress: (scrollProgress) => set({ scrollProgress }),
  setLeadsPerMinute: (leadsPerMinute) => set({ leadsPerMinute }),
  incrementElapsedTime: () => set((state) => ({ elapsedTime: state.elapsedTime + 1 })),
  setEstimatedTimeRemaining: (estimatedTimeRemaining) => set({ estimatedTimeRemaining }),
  addLog: (log) =>
    set((state) => {
      // Limit logging when performanceMode is active
      if (state.performanceMode && !state.debugMode && log.startsWith('Scraped:')) {
        // Skip spammy console logging in performance mode
        return {};
      }
      const timestampedLog = `[${new Date().toLocaleTimeString()}] ${log}`;
      if (state.debugMode) {
        console.log(`[Nexvora Debug] ${log}`);
      }
      return {
        logs: [timestampedLog, ...state.logs].slice(0, 40), // slightly smaller log slice to save memory
      };
    }),

  setDebugMode: (debugMode) => set({ debugMode }),
  setSelectorError: (selectorError) => set({ selectorError }),
  setDiagnostics: (diag) =>
    set((state) => ({ diagnostics: { ...state.diagnostics, ...diag } })),
  incrementCardsFound: (count) => set((state) => ({ cardsFound: state.cardsFound + count })),
  incrementCardsParsed: () => set((state) => ({ cardsParsed: state.cardsParsed + 1 })),
  incrementCardsFailed: () => set((state) => ({ cardsFailed: state.cardsFailed + 1 })),
  incrementDuplicateLeads: () => set((state) => ({ duplicateLeads: state.duplicateLeads + 1 })),

  // Phone Reducers
  incrementValidPhones: () => set((state) => ({ validPhones: state.validPhones + 1 })),
  incrementInvalidPhones: () => set((state) => ({ invalidPhones: state.invalidPhones + 1 })),
  incrementMissingPhones: () => set((state) => ({ missingPhones: state.missingPhones + 1 })),

  // Performance Reducers
  setPerformanceMode: (performanceMode) => set({ performanceMode }),
  setSafeMode: (safeMode) => set((state) => {
    // Turning on Safe Mode overrides speed & risks to LOW immediately
    const speed = safeMode ? 'Safe' : (state.performanceMode ? 'Performance' : 'Normal');
    return {
      safeMode,
      currentScrollSpeed: speed,
      cpuRisk: safeMode ? 'LOW' : 'MEDIUM',
      memoryRisk: safeMode ? 'LOW' : 'MEDIUM',
    };
  }),
  setCpuRisk: (cpuRisk) => set({ cpuRisk }),
  setMemoryRisk: (memoryRisk) => set({ memoryRisk }),
  setCurrentScrollSpeed: (currentScrollSpeed) => set({ currentScrollSpeed }),
  setIsMapsLoading: (isMapsLoading) => set({ isMapsLoading }),
  setIsEnriching: (isEnriching) => set({ isEnriching }),
  setEnrichmentProgress: (enrichedCount, enrichTotal, enrichCurrentName) => set({ enrichedCount, enrichTotal, enrichCurrentName }),

  resetCollectionSession: () =>
    set((state) => ({
      status: 'idle',
      businessesLoaded: 0,
      duplicatesRemoved: 0,
      scrollProgress: 0,
      elapsedTime: 0,
      estimatedTimeRemaining: 0,
      leadsPerMinute: 0,
      logs: [],
      selectorError: null,
      cardsFound: 0,
      cardsParsed: 0,
      cardsFailed: 0,
      duplicateLeads: 0,
      validPhones: 0,
      invalidPhones: 0,
      missingPhones: 0,
      isMapsLoading: false,
      isEnriching: false,
      enrichedCount: 0,
      enrichTotal: 0,
      enrichCurrentName: '',
      cpuRisk: state.safeMode ? 'LOW' : 'LOW',
      memoryRisk: state.safeMode ? 'LOW' : 'LOW',
      diagnostics: {
        resultsPanelExists: false,
        scrollContainerExists: false,
        cardsCount: 0,
        parsingWorkingCount: 0,
      },
    })),
}));
