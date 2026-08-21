import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PanelHeader } from './PanelHeader';
import { StatsGrid } from './StatsGrid';
import { CollectionControls } from './CollectionControls';
import { ProgressTracker } from './ProgressTracker';
import { ExportSection } from './ExportSection';
import { LeadQualitySection } from './LeadQualitySection';
import { AiInsights } from './AiInsights';
import { RecentLeads } from './RecentLeads';
import { CollapsedPanel } from './CollapsedPanel';
import { useUiStore } from '../stores/uiStore';
import { useDraggablePanel } from '../hooks/useDraggablePanel';
import { useSettingsStore } from '../stores/settingsStore';
import { useCollectionStore } from '../stores/collectionStore';
import { MAPS_SELECTORS } from '../core/mapsSelectors';
import { LayoutGrid, ListFilter, Sparkles, Sliders, ShieldAlert, Bug, Activity, PlaySquare } from 'lucide-react';

export const FloatingPanel: React.FC = () => {
  const isMinimized = useUiStore((state) => state.isMinimized);
  const activeTab = useUiStore((state) => state.activeTab);
  const setActiveTab = useUiStore((state) => state.setActiveTab);
  const isSettingsOpen = useUiStore((state) => state.isSettingsOpen);
  
  // Settings store
  const settings = useSettingsStore((state) => state.settings);
  const updateSettings = useSettingsStore((state) => state.updateSettings);

  // Live collection logs & debugs
  const logs = useCollectionStore((state) => state.logs);
  const debugMode = useCollectionStore((state) => state.debugMode);
  const setDebugMode = useCollectionStore((state) => state.setDebugMode);
  const selectorError = useCollectionStore((state) => state.selectorError);
  
  // Diagnostic counts
  const cardsFound = useCollectionStore((state) => state.cardsFound);
  const cardsParsed = useCollectionStore((state) => state.cardsParsed);
  const cardsFailed = useCollectionStore((state) => state.cardsFailed);
  const duplicateLeads = useCollectionStore((state) => state.duplicateLeads);
  const diagnostics = useCollectionStore((state) => state.diagnostics);
  
  // Phone stats hook selectors
  const validPhones = useCollectionStore((state) => state.validPhones);
  const invalidPhones = useCollectionStore((state) => state.invalidPhones);
  const missingPhones = useCollectionStore((state) => state.missingPhones);

  // Performance Telemetry Hooks
  const performanceMode = useCollectionStore((state) => state.performanceMode);
  const setPerformanceMode = useCollectionStore((state) => state.setPerformanceMode);
  const safeMode = useCollectionStore((state) => state.safeMode);
  const setSafeMode = useCollectionStore((state) => state.setSafeMode);
  const cpuRisk = useCollectionStore((state) => state.cpuRisk);
  const setCpuRisk = useCollectionStore((state) => state.setCpuRisk);
  const memoryRisk = useCollectionStore((state) => state.memoryRisk);
  const setMemoryRisk = useCollectionStore((state) => state.setMemoryRisk);
  const currentScrollSpeed = useCollectionStore((state) => state.currentScrollSpeed);
  const isMapsLoading = useCollectionStore((state) => state.isMapsLoading);

  const { position, onMouseDown } = useDraggablePanel();

  // Closing Popup state
  const [showClosingPopup, setShowClosingPopup] = React.useState(false);
  const [countdown, setCountdown] = React.useState(5);
  const [hasDismissedPopup, setHasDismissedPopup] = React.useState(false);
  const setMinimized = useUiStore((state) => state.setMinimized);
  const status = useCollectionStore((state) => state.status);

  // Monitor status changes to show the closing popup
  React.useEffect(() => {
    if (status === 'stopped' || status === 'completed') {
      if (!hasDismissedPopup) {
        setShowClosingPopup(true);
        setCountdown(5);
      }
    } else {
      setShowClosingPopup(false);
      setHasDismissedPopup(false);
    }
  }, [status, hasDismissedPopup]);

  // Countdown timer logic
  React.useEffect(() => {
    if (!showClosingPopup) return;
    if (countdown <= 0) {
      // Timer finished, close/minimize the extension HUD
      setMinimized(true);
      setShowClosingPopup(false);
      return;
    }

    const timer = setTimeout(() => {
      setCountdown((prev) => prev - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [showClosingPopup, countdown, setMinimized]);

  // Dynamic system resource telemetry calculations
  React.useEffect(() => {
    const { status } = useCollectionStore.getState();
    if (status !== 'collecting') {
      setCpuRisk('LOW');
      setMemoryRisk('LOW');
      return;
    }

    const timer = setInterval(() => {
      // 1. Calculate Memory Risk using genuine chrome performance API if available
      const memoryInfo = (window.performance as any).memory;
      let calculatedMemoryRisk: 'LOW' | 'MEDIUM' | 'HIGH' = 'LOW';
      
      if (memoryInfo) {
        const heapUsedRatio = memoryInfo.usedJSHeapSize / memoryInfo.jsHeapSizeLimit;
        if (heapUsedRatio > 0.35) {
          calculatedMemoryRisk = 'HIGH';
        } else if (heapUsedRatio > 0.15) {
          calculatedMemoryRisk = 'MEDIUM';
        }
      } else {
        // Fallback calculation based on cards count in G-Maps DOM
        if (diagnostics.cardsCount > 100) {
          calculatedMemoryRisk = 'HIGH';
        } else if (diagnostics.cardsCount > 40) {
          calculatedMemoryRisk = 'MEDIUM';
        }
      }

      // 2. Calculate CPU Risk based on Safe/Performance Modes and DOM query parameters
      let calculatedCpuRisk: 'LOW' | 'MEDIUM' | 'HIGH' = 'LOW';
      if (safeMode) {
        calculatedCpuRisk = 'LOW';
      } else if (performanceMode) {
        calculatedCpuRisk = 'LOW'; // requestAnimationFrame queues mutations
      } else {
        // Standard high-polling mode, risk increases with DOM card density
        if (diagnostics.cardsCount > 60) {
          calculatedCpuRisk = 'HIGH';
        } else if (diagnostics.cardsCount > 25) {
          calculatedCpuRisk = 'MEDIUM';
        } else {
          calculatedCpuRisk = 'LOW';
        }
      }

      setCpuRisk(calculatedCpuRisk);
      setMemoryRisk(calculatedMemoryRisk);
    }, 2000);

    return () => clearInterval(timer);
  }, [safeMode, performanceMode, diagnostics.cardsCount, setCpuRisk, setMemoryRisk]);

  const handleTabChange = (tab: 'dashboard' | 'leads' | 'analytics' | 'settings') => {
    setActiveTab(tab);
  };

  return (
    <>
      <div
      style={{
        position: 'fixed',
        top: '180px',
        right: '30px',
        transform: `translate3d(${position.x}px, ${position.y}px, 0)`,
        zIndex: 999999,
      }}
    >
      <AnimatePresence mode="wait">
        {isMinimized ? (
          <CollapsedPanel key="minimized-hud" />
        ) : (
          <motion.div
            key="expanded-hud"
            initial={{ scale: 0.96, opacity: 0, y: 15 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.96, opacity: 0, y: 15 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="group relative flex flex-col w-[440px] rounded-[24px] bg-white/75 text-slate-850 border border-black/10 shadow-[0_30px_70px_-15px_rgba(0,0,0,0.12),inset_0_1px_1px_rgba(255,255,255,0.7),0_0_50px_rgba(99,102,241,0.03)] overflow-hidden"
            style={{
              backdropFilter: 'blur(30px) saturate(210%)',
            }}
          >
            {/* Ambient Soft Glow in Light theme */}
            <div className="absolute -top-40 -left-40 w-96 h-96 rounded-full bg-indigo-500/5 blur-3xl -z-10 pointer-events-none" />
            <div className="absolute -bottom-40 -right-40 w-96 h-96 rounded-full bg-violet-500/5 blur-3xl -z-10 pointer-events-none" />

            {/* Top Indigo linear edge highlight */}
            <div className="absolute top-0 left-0 right-0 h-[2.5px] bg-gradient-to-r from-transparent via-indigo-600/40 to-transparent -z-10" />

            {/* Drag Handle Area */}
            <div 
              onMouseDown={onMouseDown}
              className="absolute top-0 left-0 right-0 h-9 cursor-grab active:cursor-grabbing z-20"
              title="Drag Panel"
            />

            {/* Inner Padding Container */}
            <div className="p-6 pt-7 flex flex-col flex-1 relative z-10">
              <PanelHeader />

              {/* Selector Error Alert Banner */}
              {selectorError && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-4 p-3 rounded-xl bg-red-600/10 border border-red-600/20 flex items-start gap-2.5"
                >
                  <ShieldAlert className="w-4.5 h-4.5 text-red-600 shrink-0 mt-0.5" />
                  <div className="flex flex-col">
                    <span className="text-[10px] font-black text-red-600 uppercase tracking-wider">Google Maps Selector Failed.</span>
                    <span className="text-[9px] text-red-700 font-semibold mt-0.5 leading-relaxed">{selectorError}</span>
                  </div>
                </motion.div>
              )}

              {/* Tab Navigation buttons */}
              <div className="relative flex items-center p-1 mb-4.5 rounded-xl bg-slate-100/60 border border-slate-200/60 select-none">
                <button
                  onClick={() => handleTabChange('dashboard')}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all duration-300 relative ${
                    activeTab === 'dashboard'
                      ? 'text-indigo-600 font-extrabold bg-white border border-slate-200 shadow-xs'
                      : 'text-slate-500 hover:text-slate-800 hover:bg-white/40 border border-transparent'
                  }`}
                >
                  <LayoutGrid className="w-3.5 h-3.5" /> HUD
                </button>
                
                <button
                  onClick={() => handleTabChange('leads')}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all duration-300 relative ${
                    activeTab === 'leads'
                      ? 'text-indigo-600 font-extrabold bg-white border border-slate-200 shadow-xs'
                      : 'text-slate-500 hover:text-slate-800 hover:bg-white/40 border border-transparent'
                  }`}
                >
                  <ListFilter className="w-3.5 h-3.5" /> LEADS
                </button>

                <button
                  onClick={() => handleTabChange('analytics')}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all duration-300 relative ${
                    activeTab === 'analytics'
                      ? 'text-indigo-600 font-extrabold bg-white border border-slate-200 shadow-xs'
                      : 'text-slate-500 hover:text-slate-800 hover:bg-white/40 border border-transparent'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5" /> INSIGHTS
                </button>
              </div>

              {/* Core Viewport Switcher */}
              <div className="flex-1 overflow-y-auto max-h-[460px] pr-0.5 scrollbar-thin">
                {isSettingsOpen ? (
                  // Custom Settings Menu Overlay
                  <motion.div
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex flex-col gap-4 select-none"
                  >
                    <div className="flex items-center gap-2 border-b border-slate-200 pb-2.5">
                      <Sliders className="w-4 h-4 text-indigo-600" />
                      <span className="text-xs font-bold text-slate-800 tracking-wide">Extraction Configurations</span>
                    </div>

                    <div className="flex flex-col gap-3">
                      {/* Deep Contact Extraction Mode */}
                      <div className="flex justify-between items-center bg-indigo-50/50 hover:bg-indigo-100/50 p-3.5 rounded-2xl border border-indigo-200 transition-all">
                        <div className="flex flex-col pr-4">
                          <span className="text-[11px] font-black text-indigo-700 uppercase tracking-wider">Deep Contact Extraction</span>
                          <span className="text-[9px] text-indigo-500/80 font-semibold mt-0.5">V3 Smart Mode. Opens incomplete cards for deep parsing.</span>
                        </div>
                        <input
                          type="checkbox"
                          checked={settings.deepExtractionEnabled}
                          onChange={(e) => updateSettings({ deepExtractionEnabled: e.target.checked })}
                          className="w-4 h-4 rounded-md bg-white border-indigo-300 text-indigo-600 focus:ring-0 focus:ring-offset-0 cursor-pointer transition-all shrink-0"
                        />
                      </div>

                      {/* Debug Click Visualizer Mode */}
                      <div className="flex justify-between items-center bg-rose-50/50 hover:bg-rose-100/50 p-3.5 rounded-2xl border border-rose-200 transition-all">
                        <div className="flex flex-col pr-4">
                          <span className="text-[11px] font-black text-rose-700 uppercase tracking-wider">Debug Click Visualizer</span>
                          <span className="text-[9px] text-rose-500/80 font-semibold mt-0.5">Shows physical markers where the scraper clicks in the DOM.</span>
                        </div>
                        <input
                          type="checkbox"
                          checked={settings.debugClickVisualizer}
                          onChange={(e) => updateSettings({ debugClickVisualizer: e.target.checked })}
                          className="w-4 h-4 rounded-md bg-white border-rose-300 text-rose-600 focus:ring-0 focus:ring-offset-0 cursor-pointer transition-all shrink-0"
                        />
                      </div>

                      {/* Max Leads */}
                      <div className="flex justify-between items-center bg-slate-50/50 hover:bg-slate-100/50 p-3.5 rounded-2xl border border-slate-200 transition-all">
                        <div className="flex flex-col">
                          <span className="text-[11px] font-black text-slate-700 uppercase tracking-wider">Max Lead Cap</span>
                          <span className="text-[9px] text-slate-500 font-semibold mt-0.5">Automatic extraction cutoff</span>
                        </div>
                        <input
                          type="number"
                          value={settings.maxLeadsLimit}
                          onChange={(e) => updateSettings({ maxLeadsLimit: parseInt(e.target.value, 10) || 100 })}
                          className="w-20 px-2.5 py-1.5 rounded-xl bg-white border border-slate-250 text-xs font-extrabold text-slate-800 text-right focus:outline-hidden"
                        />
                      </div>

                      {/* Scroll Speed Delay */}
                      <div className="flex justify-between items-center bg-slate-50/50 hover:bg-slate-100/50 p-3.5 rounded-2xl border border-slate-200 transition-all">
                        <div className="flex flex-col">
                          <span className="text-[11px] font-black text-slate-700 uppercase tracking-wider">Scroll Velocity</span>
                          <span className="text-[9px] text-slate-500 font-semibold mt-0.5">Simulated scroll frequency</span>
                        </div>
                        <select
                          value={settings.scrollDelay}
                          onChange={(e) => updateSettings({ scrollDelay: parseInt(e.target.value, 10) || 1500 })}
                          className="w-24 px-2 py-1.5 rounded-xl bg-white border border-slate-250 text-[10px] font-bold text-slate-700 focus:outline-hidden cursor-pointer"
                        >
                          <option value="800">Fast (800ms)</option>
                          <option value="1500">Normal (1.5s)</option>
                          <option value="2500">Safe (2.5s)</option>
                          <option value="4000">Stealth (4s)</option>
                        </select>
                      </div>

                      {/* Outreach Base Value */}
                      <div className="flex justify-between items-center bg-slate-50/50 hover:bg-slate-100/50 p-3.5 rounded-2xl border border-slate-200 transition-all">
                        <div className="flex flex-col">
                          <span className="text-[11px] font-black text-slate-700 uppercase tracking-wider">Base Lead Valuation</span>
                          <span className="text-[9px] text-slate-500 font-semibold mt-0.5">Base multiplier per lead (₹)</span>
                        </div>
                        <input
                          type="number"
                          value={settings.outreachValuationBase}
                          onChange={(e) => updateSettings({ outreachValuationBase: parseInt(e.target.value, 10) || 5000 })}
                          className="w-24 px-2.5 py-1.5 rounded-xl bg-white border border-slate-250 text-xs font-extrabold text-slate-800 text-right focus:outline-hidden"
                        />
                      </div>

                      {/* Default Country Code */}
                      <div className="flex justify-between items-center bg-slate-50/50 hover:bg-slate-100/50 p-3.5 rounded-2xl border border-slate-200 transition-all">
                        <div className="flex flex-col">
                          <span className="text-[11px] font-black text-slate-700 uppercase tracking-wider">Default Country Code</span>
                          <span className="text-[9px] text-slate-500 font-semibold mt-0.5">Standard prefix for core numbers</span>
                        </div>
                        <select
                          value={settings.defaultCountryCode}
                          onChange={(e) => updateSettings({ defaultCountryCode: e.target.value })}
                          className="w-24 px-2 py-1.5 rounded-xl bg-white border border-slate-250 text-[10px] font-bold text-slate-700 focus:outline-hidden cursor-pointer"
                        >
                          <option value="+91">+91 (India)</option>
                          <option value="+1">+1 (US/Canada)</option>
                          <option value="+44">+44 (UK)</option>
                          <option value="+61">+61 (Australia)</option>
                          <option value="+49">+49 (Germany)</option>
                          <option value="+971">+971 (UAE)</option>
                        </select>
                      </div>

                      {/* Toggle Auto Scroll */}
                      <div className="flex justify-between items-center bg-slate-50/50 hover:bg-slate-100/50 p-3.5 rounded-2xl border border-slate-200 transition-all">
                        <div className="flex flex-col">
                          <span className="text-[11px] font-black text-slate-700 uppercase tracking-wider">Automated Scrolling</span>
                          <span className="text-[9px] text-slate-500 font-semibold mt-0.5">Lazy loads listings on start</span>
                        </div>
                        <input
                          type="checkbox"
                          checked={settings.autoScroll}
                          onChange={(e) => updateSettings({ autoScroll: e.target.checked })}
                          className="w-4 h-4 rounded-md bg-white border-slate-250 text-indigo-600 focus:ring-0 focus:ring-offset-0 cursor-pointer transition-all"
                        />
                      </div>

                      {/* Performance Mode */}
                      <div className="flex justify-between items-center bg-slate-50/50 hover:bg-slate-100/50 p-3.5 rounded-2xl border border-slate-200 transition-all">
                        <div className="flex flex-col">
                          <span className="text-[11px] font-black text-slate-700 uppercase tracking-wider">Performance Mode</span>
                          <span className="text-[9px] text-slate-500 font-semibold mt-0.5">Optimizes UI, cuts diagnostic log spam</span>
                        </div>
                        <input
                          type="checkbox"
                          checked={performanceMode}
                          onChange={(e) => setPerformanceMode(e.target.checked)}
                          className="w-4 h-4 rounded-md bg-white border-slate-250 text-indigo-600 focus:ring-0 focus:ring-offset-0 cursor-pointer transition-all"
                        />
                      </div>

                      {/* Safe Mode */}
                      <div className="flex justify-between items-center bg-slate-50/50 hover:bg-slate-100/50 p-3.5 rounded-2xl border border-slate-200 transition-all">
                        <div className="flex flex-col">
                          <span className="text-[11px] font-black text-slate-700 uppercase tracking-wider">Safe Mode</span>
                          <span className="text-[9px] text-slate-500 font-semibold mt-0.5">Slower scroll, low CPU, stealth scrapes</span>
                        </div>
                        <input
                          type="checkbox"
                          checked={safeMode}
                          onChange={(e) => setSafeMode(e.target.checked)}
                          className="w-4 h-4 rounded-md bg-white border-slate-250 text-indigo-600 focus:ring-0 focus:ring-offset-0 cursor-pointer transition-all"
                        />
                      </div>
                    </div>
                  </motion.div>
                ) : (
                  <>
                    {activeTab === 'dashboard' && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="flex flex-col text-slate-800"
                      >
                        <StatsGrid />
                        <CollectionControls />
                        <ProgressTracker />

                        {/* Scrape Extraction Diagnostics Overlay */}
                        <div className="p-3.5 mb-4 rounded-2xl bg-slate-50/60 border border-slate-200 select-none text-[10px] font-semibold text-slate-500">
                          <div className="flex items-center gap-1.5 mb-2.5 text-indigo-600 font-bold uppercase tracking-wider">
                            <Activity className="w-3.5 h-3.5 animate-pulse" /> Scrape Extraction Analytics
                          </div>
                          <div className="grid grid-cols-4 gap-2 text-center pb-2.5 border-b border-slate-150">
                            <div>
                              <div className="text-slate-400 mb-0.5">Found</div>
                              <div className="text-slate-800 font-bold text-xs">{cardsFound}</div>
                            </div>
                            <div className="border-l border-slate-200">
                              <div className="text-slate-400 mb-0.5">Parsed</div>
                              <div className="text-emerald-600 font-bold text-xs">{cardsParsed}</div>
                            </div>
                            <div className="border-l border-slate-200">
                              <div className="text-slate-400 mb-0.5">Failed</div>
                              <div className="text-red-600 font-bold text-xs">{cardsFailed}</div>
                            </div>
                            <div className="border-l border-slate-200">
                              <div className="text-slate-400 mb-0.5">Duplicates</div>
                              <div className="text-amber-600 font-bold text-xs">{duplicateLeads}</div>
                            </div>
                          </div>
                          
                          {/* Phone Extraction statistics row */}
                          <div className="grid grid-cols-3 gap-2 text-center pt-2.5">
                            <div>
                              <div className="text-slate-400 mb-0.5">Valid Phones</div>
                              <div className="text-emerald-600 font-bold text-xs">{validPhones}</div>
                            </div>
                            <div className="border-l border-slate-200">
                              <div className="text-slate-400 mb-0.5">Invalid Phones</div>
                              <div className="text-red-600 font-bold text-xs">{invalidPhones}</div>
                            </div>
                            <div className="border-l border-slate-200">
                              <div className="text-slate-400 mb-0.5">Missing Phones</div>
                              <div className="text-slate-500 font-bold text-xs">{missingPhones}</div>
                            </div>
                          </div>
                        </div>

                        {/* G-Maps Compatibility Diagnostics View */}
                        <div className="p-3.5 mb-4 rounded-2xl bg-slate-50/60 border border-slate-200 select-none text-[9.5px]">
                          <div className="flex items-center justify-between mb-2.5">
                            <span className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-indigo-600">
                              <Activity className="w-3.5 h-3.5" /> G-Maps Diagnostic Telemetry
                            </span>
                            <button
                              onClick={() => setDebugMode(!debugMode)}
                              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg border font-bold uppercase tracking-widest text-[8px] transition-all duration-300 ${
                                debugMode
                                  ? 'bg-amber-600/10 border-amber-600/20 text-amber-600'
                                  : 'bg-slate-100 border-slate-200 text-slate-500 hover:text-slate-700'
                              }`}
                            >
                              <Bug className="w-2.5 h-2.5" /> {debugMode ? 'Debug ON' : 'Debug OFF'}
                            </button>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-x-4 gap-y-2 font-medium text-slate-500 leading-relaxed">
                            <div className="flex justify-between border-b border-slate-200 pb-1">
                              <span>Results Feed Panel:</span>
                              <span className={diagnostics.resultsPanelExists ? 'text-emerald-600 font-bold' : 'text-red-600 font-bold'}>
                                {diagnostics.resultsPanelExists ? 'DETECTED' : 'MISSING'}
                              </span>
                            </div>
                            <div className="flex justify-between border-b border-slate-200 pb-1">
                              <span>Scroll Controller:</span>
                              <span className={diagnostics.scrollContainerExists ? 'text-emerald-600 font-bold' : 'text-red-600 font-bold'}>
                                {diagnostics.scrollContainerExists ? 'DETECTED' : 'MISSING'}
                              </span>
                            </div>
                            <div className="flex justify-between border-b border-slate-200 pb-1">
                              <span>Active Cards in DOM:</span>
                              <span className="text-slate-800 font-bold">{diagnostics.cardsCount}</span>
                            </div>
                            <div className="flex justify-between border-b border-slate-200 pb-1">
                              <span>Selector Parsing:</span>
                              <span className={diagnostics.parsingWorkingCount > 0 ? 'text-emerald-600 font-bold' : 'text-red-600 font-bold'}>
                                {diagnostics.parsingWorkingCount > 0 ? 'FUNCTIONAL' : 'FAILING'}
                              </span>
                            </div>
                          </div>

                          {/* Live Performance Resource Metrics */}
                          <div className="mt-3.5 pt-3.5 border-t border-slate-200 font-semibold">
                            <div className="flex items-center gap-1.5 mb-2.5 font-bold uppercase tracking-wider text-slate-600 text-[8px]">
                              System Resource Telemetry
                            </div>
                            <div className="grid grid-cols-3 gap-2 text-center text-[9px] font-medium text-slate-500">
                              <div className="bg-slate-50/80 p-2.5 rounded-xl border border-slate-150 flex flex-col justify-between">
                                <span className="text-[7.5px] text-slate-400 mb-1.5 uppercase font-bold tracking-wider">CPU Risk</span>
                                <span className={`font-black tracking-wide ${
                                  cpuRisk === 'LOW' 
                                    ? 'text-emerald-600 bg-emerald-500/10 border border-emerald-500/15 py-0.5 rounded-lg' 
                                    : cpuRisk === 'MEDIUM'
                                    ? 'text-amber-600 bg-amber-500/10 border border-amber-500/15 py-0.5 rounded-lg'
                                    : 'text-red-600 bg-red-500/10 border border-red-500/15 py-0.5 rounded-lg'
                                }`}>
                                  {cpuRisk}
                                </span>
                              </div>
                              <div className="bg-slate-50/80 p-2.5 rounded-xl border border-slate-150 flex flex-col justify-between">
                                <span className="text-[7.5px] text-slate-400 mb-1.5 uppercase font-bold tracking-wider">RAM Risk</span>
                                <span className={`font-black tracking-wide ${
                                  memoryRisk === 'LOW' 
                                    ? 'text-emerald-600 bg-emerald-500/10 border border-emerald-500/15 py-0.5 rounded-lg' 
                                    : memoryRisk === 'MEDIUM'
                                    ? 'text-amber-600 bg-amber-500/10 border border-amber-500/15 py-0.5 rounded-lg'
                                    : 'text-red-600 bg-red-500/10 border border-red-500/15 py-0.5 rounded-lg'
                                }`}>
                                  {memoryRisk}
                                </span>
                              </div>
                              <div className="bg-slate-50/80 p-2.5 rounded-xl border border-slate-150 flex flex-col justify-between">
                                <span className="text-[7.5px] text-slate-400 mb-1.5 uppercase font-bold tracking-wider">Scroll Mode</span>
                                <span className="font-black text-slate-700 bg-slate-100 border border-slate-200 py-0.5 rounded-lg uppercase text-[7.5px]">
                                  {currentScrollSpeed}
                                </span>
                              </div>
                            </div>
                          </div>

                        </div>

                        <LeadQualitySection />

                        {/* Live Operations Console */}
                        <div className="mt-1 mb-4 p-3 rounded-2xl bg-slate-50 border border-slate-200 font-mono text-[8.5px] text-slate-700 select-none">
                          <div className="flex items-center justify-between mb-1.5 text-[9px] font-bold text-slate-500">
                            <span className="uppercase tracking-wider">Scraper Operations Console</span>
                            <span className="h-1.5 w-1.5 rounded-full bg-indigo-600 animate-pulse"></span>
                          </div>
                          <div className="flex flex-col gap-1.5 max-h-[85px] overflow-y-auto pr-0.5 scrollbar-thin">
                            {logs.length === 0 ? (
                              <span className="text-slate-400 italic">Console idling. Scraper awaiting start...</span>
                            ) : (
                              logs.map((log, idx) => (
                                <span key={idx} className="truncate tracking-wide">{log}</span>
                              ))
                            )}
                          </div>
                        </div>

                        <ExportSection />
                      </motion.div>
                    )}

                    {activeTab === 'leads' && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="h-full"
                      >
                        <RecentLeads />
                      </motion.div>
                    )}

                    {activeTab === 'analytics' && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="h-full"
                      >
                        <AiInsights />
                      </motion.div>
                    )}
                  </>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>

    {/* The Modal Overlay */}
    <AnimatePresence>
      {showClosingPopup && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(15, 23, 42, 0.4)', // sleek slate backdrop
            backdropFilter: 'blur(8px)',
            zIndex: 10000000,
          }}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="flex flex-col w-[380px] p-6 rounded-[24px] bg-white border border-slate-200/80 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.25)] select-none text-slate-800 relative overflow-hidden"
          >
            {/* Top accent highlight */}
            <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-violet-500 via-indigo-600 to-cyan-500" />
            
            <div className="flex items-center gap-3.5 mb-4">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
                <PlaySquare className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-xs font-black uppercase tracking-wider text-indigo-600">
                  {status === 'completed' ? 'Scraping Completed' : 'Scraping Terminated'}
                </h3>
                <p className="text-[10px] text-slate-400 font-extrabold uppercase mt-0.5 tracking-wide">
                  Closing Chrome Extension UI
                </p>
              </div>
            </div>

            <p className="text-xs font-medium text-slate-600 leading-relaxed mb-6">
              The lead collection process is fully stopped. The Chrome Extension dashboard will minimize automatically to return to Google Maps.
            </p>

            {/* Progress Countdown Indicator */}
            <div className="flex flex-col gap-2 mb-6">
              <div className="flex justify-between items-center text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">
                <span>Auto-minimizing HUD</span>
                <span className="text-indigo-600">{countdown}s</span>
              </div>
              <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: '100%' }}
                  animate={{ width: `${(countdown / 5) * 100}%` }}
                  transition={{ duration: 1, ease: 'linear' }}
                  className="h-full bg-indigo-600 rounded-full"
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  setHasDismissedPopup(true);
                  setShowClosingPopup(false);
                }}
                className="flex-1 py-2.5 px-4 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-600 font-extrabold text-[10px] uppercase tracking-wider transition-all cursor-pointer text-center"
              >
                Keep Open
              </button>
              <button
                onClick={() => {
                  setMinimized(true);
                  setShowClosingPopup(false);
                }}
                className="flex-1 py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-[10px] uppercase tracking-wider shadow-md shadow-indigo-600/15 transition-all cursor-pointer text-center"
              >
                Minimize Now
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  </>
  );
};
