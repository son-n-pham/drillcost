import React, { useState, useMemo, useEffect, useRef } from 'react';
import { GlobalParams, Bit, ScenarioConfig } from './types';
import { INITIAL_GLOBAL_PARAMS, INITIAL_BITS, INITIAL_SCENARIOS } from './constants';
import { runSimulation } from './utils/simulation';
import SettingsPanel from './components/SettingsPanel';
import BitsPanel from './components/BitsPanel';
import ScenarioManager from './components/ScenarioManager';
import SimulationCharts from './components/SimulationCharts';
import SnowEffect from './components/SnowEffect';
import { Activity, Layers, Target, Moon, Sun, Download, Upload, Trash2, FileText, ChevronDown, Snowflake, Undo, Redo, MoreVertical, PanelLeftOpen, PanelLeftClose } from 'lucide-react';
import { SAMPLE_PARAMS, SAMPLE_BITS, SAMPLE_SCENARIOS } from './sampleData';
import clsx from 'clsx';
import logoIcon from './img/logo_SonPham.png';
import { DepthUnit, convertDepth, getUnitLabel } from './utils/unitUtils';
import { useUndoRedo } from './hooks/useUndoRedo';

const STORAGE_KEY = 'drillcost-pro-state';

const useScrolled = (threshold: number = 20): boolean => {
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > threshold);
    };

    // Check initial state
    handleScroll();
    
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [threshold]);

  return isScrolled;
};

// Helper function to safely load state from localStorage
const loadSavedState = () => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (e) {
    console.warn('Failed to load saved state from localStorage', e);
  }
  return null;
};

// Helper function to sanitize scenarios by removing orphan bit IDs
const sanitizeScenarios = (scenarios: ScenarioConfig[], validBitIds: Set<string>): ScenarioConfig[] => {
  return scenarios.map(scenario => ({
    ...scenario,
    bitSequence: scenario.bitSequence.filter(entry => validBitIds.has(entry.bitId))
  }));
};

const App: React.FC = () => {
  // Initialize state from localStorage if available, otherwise use defaults
  // Using lazy initialization to only load from localStorage once on mount
  const [appData, setAppData, undo, redo, canUndo, canRedo] = useUndoRedo(() => {
    const saved = loadSavedState();
    const loadedBits = (saved?.bits ?? INITIAL_BITS) as Bit[];
    const loadedScenarios = (saved?.scenarios ?? INITIAL_SCENARIOS) as ScenarioConfig[];
    const validBitIds = new Set(loadedBits.map((b: Bit) => b.id));
    const sanitizedScenarios = sanitizeScenarios(loadedScenarios, validBitIds);

    return {
      params: (saved?.params ?? INITIAL_GLOBAL_PARAMS) as GlobalParams,
      bits: loadedBits,
      scenarios: sanitizedScenarios
    };
  }, 3);

  const { params, bits, scenarios } = appData;

  // Keyboard shortcuts for Undo/Redo
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check if input or textarea is focused to avoid conflict
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      if ((e.metaKey || e.ctrlKey) && e.key === 'z') {
        if (e.shiftKey) {
          if (canRedo) redo();
        } else {
          if (canUndo) undo();
        }
        e.preventDefault();
      } else if ((e.metaKey || e.ctrlKey) && e.key === 'y') {
        if (canRedo) redo();
        e.preventDefault();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo, canUndo, canRedo]);

  const setParams = (newParams: GlobalParams | ((prev: GlobalParams) => GlobalParams)) => {
    setAppData(prev => ({
      ...prev,
      params: typeof newParams === 'function' ? newParams(prev.params) : newParams
    }));
  };

  const setBits = (newBits: Bit[] | ((prev: Bit[]) => Bit[])) => {
    setAppData(prev => ({
      ...prev,
      bits: typeof newBits === 'function' ? newBits(prev.bits) : newBits
    }));
  };

  const setScenarios = (newScenarios: ScenarioConfig[] | ((prev: ScenarioConfig[]) => ScenarioConfig[])) => {
    setAppData(prev => ({
      ...prev,
      scenarios: typeof newScenarios === 'function' ? newScenarios(prev.scenarios) : newScenarios
    }));
  };
  const [theme, setTheme] = useState<'light' | 'dark' | 'xmas'>(() => {
    const saved = loadSavedState();
    return saved?.theme ?? 'xmas';
  });
  const [depthUnit, setDepthUnit] = useState<DepthUnit>(() => {
    const saved = loadSavedState();
    return saved?.depthUnit ?? 'm';
  });
  const [compareSelections, setCompareSelections] = useState<string[]>(() => {
    const saved = loadSavedState();
    return saved?.compareSelections ?? [];
  });
  const [isCompareMode, setIsCompareMode] = useState<boolean>(() => {
    const saved = loadSavedState();
    return saved?.isCompareMode ?? false;
  });
  
  const isScrolled = useScrolled();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const menuRef = useRef<HTMLDivElement>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);
  
  // Auto-save state to localStorage whenever it changes
  // Auto-save state to localStorage whenever it changes
  useEffect(() => {
    try {
      const stateToSave = {
        params,
        bits,
        scenarios,
        theme,
        depthUnit,
        compareSelections,
        isCompareMode,
        version: '1.0',
        lastSaved: new Date().toISOString()
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(stateToSave));
    } catch (e) {
      console.warn('Failed to save state to localStorage', e);
    }
  }, [params, bits, scenarios, theme, depthUnit, compareSelections, isCompareMode]);

  // Apply theme class to html element
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
      document.documentElement.setAttribute('data-theme', 'bakerhughes-dark');
    } else if (theme === 'xmas') {
      document.documentElement.classList.add('dark');
      document.documentElement.setAttribute('data-theme', 'christmas');
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.setAttribute('data-theme', 'light');
    }
  }, [theme]);

  // Memoize results to avoid recalculating on every render unless inputs change
  const results = useMemo(() => {
    return scenarios.map(scenario => runSimulation(params, bits, scenario));
  }, [params, bits, scenarios]);

  const toggleTheme = () => {
    setTheme(prev => {
      if (prev === 'light') return 'dark';
      if (prev === 'dark') return 'xmas';
      return 'light';
    });
  };

  const handleSaveState = () => {
    const state = {
      params,
      bits,
      scenarios,
      depthUnit,
      compareSelections,
      isCompareMode,
      version: '1.0',
      timestamp: new Date().toISOString()
    };
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `drillcost-pro-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setIsMenuOpen(false);
  };

  const handleLoadState = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const state = JSON.parse(content);
        
        if (state.params && state.bits && state.scenarios) {
           const validBitIds = new Set((state.bits as Bit[]).map((b: Bit) => b.id));
           const sanitizedScenarios = sanitizeScenarios(state.scenarios as ScenarioConfig[], validBitIds);
           
           setAppData(prev => ({
             ...prev,
             params: state.params,
             bits: state.bits as Bit[],
             scenarios: sanitizedScenarios
           }));
        } else {
             // Fallback partial updates if strictly needed, but for now assuming valid full file
             if (state.params) setParams(state.params);
             if (state.bits) setBits(state.bits as Bit[]);
             if (state.scenarios) {
                const validBitIds = new Set(((state.bits || bits) as Bit[]).map((b: Bit) => b.id));
                const sanitizedScenarios = sanitizeScenarios(state.scenarios as ScenarioConfig[], validBitIds);
                setScenarios(sanitizedScenarios);
             }
        }
        if (state.depthUnit) setDepthUnit(state.depthUnit);
        if (state.compareSelections) setCompareSelections(state.compareSelections);
        if (state.isCompareMode !== undefined) setIsCompareMode(state.isCompareMode);
        
      } catch (error) {
        console.error('Failed to parse state file', error);
        alert('Invalid file format. Please upload a valid DrillCost JSON file.');
      }
    };
    reader.readAsText(file);
    // Reset input so same file can be selected again if needed
    event.target.value = '';
    setIsMenuOpen(false);
  };

  const triggerFileUpload = () => {
    fileInputRef.current?.click();
    setIsMenuOpen(false);
  };

  const handleClearState = () => {
    setAppData({
      params: {
        operationCostPerDay: 0,
        tripSpeed: 0,
        standLength: 0,
        depthIn: 0,
        intervalToDrill: 0,
        circulatingHours: 0,
      },
      bits: [],
      scenarios: []
    });
    try {
      localStorage.clear();
    } catch (e) {
      console.warn('Failed to clear localStorage', e);
    }
    setIsMenuOpen(false);
  };

  const handleLoadSampleData = () => {
    setAppData({
      params: SAMPLE_PARAMS,
      bits: SAMPLE_BITS,
      scenarios: SAMPLE_SCENARIOS
    });
    setIsMenuOpen(false);
  };

  const toggleUnit = () => {
    setDepthUnit(prev => prev === 'm' ? 'ft' : 'm');
  };

  const handleRemoveBit = (bitId: string) => {
    setAppData(prev => ({
       ...prev,
       bits: prev.bits.filter(b => b.id !== bitId),
       scenarios: prev.scenarios.map(scen => ({
         ...scen,
         bitSequence: scen.bitSequence.filter(id => id !== bitId)
       }))
    }));
  };

  return (
    <div 
      className="min-h-screen flex flex-col bg-slate-50/50 dark:bg-[var(--bh-bg)] text-slate-900 dark:text-[var(--bh-text)] font-sans selection:bg-blue-100 selection:text-blue-900 dark:selection:bg-blue-900 dark:selection:text-blue-100 transition-colors duration-300"
      style={{
        minHeight: '100dvh',
        paddingLeft: 'var(--safe-area-inset-left)',
        paddingRight: 'var(--safe-area-inset-right)'
      }}
    >
      {theme === 'xmas' && <SnowEffect />}
      {/* Hidden File Input */}
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleLoadState} 
        accept=".json" 
        className="hidden" 
      />

      {/* Header */}
      <header className="bg-white/80 dark:bg-[var(--bh-surface-1)] backdrop-blur-md border-b border-slate-200 dark:border-[var(--bh-border)] sticky top-0 z-50 shadow-sm transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          
          {/* Left Side: Identity + Action Toolbar */}
          <div className="flex items-center gap-3 sm:gap-6 flex-1 min-w-0 pr-2">
            
            {/* Identity */}
            <div className="flex items-center gap-3 flex-shrink-0">
              <img 
                src={logoIcon}
                alt="DrillCost Logo" 
                className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl shadow-lg shadow-blue-500/20 dark:shadow-none transition-all hover:scale-105"
              />
              <div className="flex flex-col">
                <h1 className="text-xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 dark:from-white dark:to-slate-300 bg-clip-text text-transparent tracking-tight leading-none">
                  DrillCost
                </h1>
                <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 tracking-widest uppercase mt-0.5 hidden sm:inline-block">
                  What-If?!
                </span>
              </div>
            </div>

            <div className="h-8 w-px bg-slate-200 dark:bg-[var(--bh-border)] flex-shrink-0"></div>

            {/* Actions Toolbar */}
            <div className="flex items-center gap-1 flex-shrink-0">
               {/* History Group - Always Visible */}
               <div className="flex items-center gap-0.5 bg-slate-50 dark:bg-[var(--bh-surface-2)] p-1 rounded-lg border border-slate-100 dark:border-[var(--bh-border)]">
                 <button 
                   onClick={undo}
                   disabled={!canUndo}
                   className="p-1.5 rounded-md text-slate-500 hover:text-slate-700 hover:bg-white dark:text-[var(--bh-text-weak)] dark:hover:text-[var(--bh-primary)] dark:hover:bg-[var(--bh-surface-1)] disabled:opacity-30 disabled:hover:bg-transparent transition-all shadow-sm hover:shadow"
                   title="Undo (Ctrl+Z)"
                 >
                   <Undo className="w-4 h-4" />
                 </button>
                 <button 
                   onClick={redo}
                   disabled={!canRedo}
                   className="p-1.5 rounded-md text-slate-500 hover:text-slate-700 hover:bg-white dark:text-[var(--bh-text-weak)] dark:hover:text-[var(--bh-primary)] dark:hover:bg-[var(--bh-surface-1)] disabled:opacity-30 disabled:hover:bg-transparent transition-all shadow-sm hover:shadow"
                   title="Redo (Ctrl+Y)"
                 >
                   <Redo className="w-4 h-4" />
                 </button>
               </div>

               <div className="w-2"></div>

               {/* Desktop: Full Toolbar */}
               <div className="hidden md:flex items-center gap-1">
                  {/* File Group */}
                  <div className="flex items-center gap-1">
                    <button 
                      onClick={triggerFileUpload}
                      className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-50 dark:text-[var(--bh-text-mute)] dark:hover:text-[var(--bh-text)] dark:hover:bg-[var(--bh-surface-2)] transition-colors"
                      title="Load Scenarios"
                    >
                      <Upload className="w-4 h-4" />
                      <span className="hidden xl:inline">Load</span>
                    </button>
                    <button 
                      onClick={handleSaveState}
                      className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-50 dark:text-[var(--bh-text-mute)] dark:hover:text-[var(--bh-text)] dark:hover:bg-[var(--bh-surface-2)] transition-colors"
                      title="Save Scenarios"
                    >
                      <Download className="w-4 h-4" />
                      <span className="hidden xl:inline">Save</span>
                    </button>
                  </div>

                  <div className="h-4 w-px bg-slate-200 dark:bg-[var(--bh-border)] mx-1"></div>

                  {/* Utility Group */}
                  <button 
                    onClick={handleLoadSampleData}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-50 dark:text-[var(--bh-text-mute)] dark:hover:text-[var(--bh-text)] dark:hover:bg-[var(--bh-surface-2)] transition-colors"
                    title="Load Sample Data"
                  >
                    <FileText className="w-4 h-4" />
                    <span className="hidden xl:inline">Sample</span>
                  </button>
                  <button 
                    onClick={handleClearState}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium text-slate-600 hover:text-red-600 hover:bg-red-50 dark:text-[var(--bh-text-mute)] dark:hover:text-red-400 dark:hover:bg-red-900/20 transition-colors"
                    title="Clear All Scenarios"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span className="hidden xl:inline">Clear</span>
                  </button>
               </div>

               {/* Mobile: More Dropdown */}
               <div className="md:hidden relative" ref={menuRef}>
                  <button 
                    onClick={() => setIsMenuOpen(!isMenuOpen)}
                    className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 dark:text-[var(--bh-text-weak)] dark:hover:bg-[var(--bh-surface-2)] transition-colors"
                  >
                    <MoreVertical className="w-5 h-5" />
                  </button>

                  {/* Dropdown Menu */}
                  {isMenuOpen && (
                    <div className="absolute top-full right-0 mt-2 w-48 bg-white dark:bg-[var(--bh-surface-1)] rounded-xl shadow-xl border border-slate-200 dark:border-[var(--bh-border)] backdrop-blur-md overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-200 origin-top-right">
                      <div className="p-1 flex flex-col gap-0.5">
                        <button 
                          onClick={triggerFileUpload}
                          className="w-full text-left px-3 py-2 rounded-lg text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-50 dark:text-[var(--bh-text-mute)] dark:hover:text-[var(--bh-text)] dark:hover:bg-[var(--bh-surface-2)] transition-colors flex items-center gap-2"
                        >
                          <Upload className="w-4 h-4" /> Load
                        </button>
                        <button 
                          onClick={handleSaveState}
                          className="w-full text-left px-3 py-2 rounded-lg text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-50 dark:text-[var(--bh-text-mute)] dark:hover:text-[var(--bh-text)] dark:hover:bg-[var(--bh-surface-2)] transition-colors flex items-center gap-2"
                        >
                          <Download className="w-4 h-4" /> Save
                        </button>
                        <div className="h-px bg-slate-100 dark:bg-[var(--bh-border)] my-1"></div>
                        <button 
                          onClick={handleLoadSampleData}
                          className="w-full text-left px-3 py-2 rounded-lg text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-50 dark:text-[var(--bh-text-mute)] dark:hover:text-[var(--bh-text)] dark:hover:bg-[var(--bh-surface-2)] transition-colors flex items-center gap-2"
                        >
                          <FileText className="w-4 h-4" /> Sample Data
                        </button>
                        <button 
                          onClick={handleClearState}
                          className="w-full text-left px-3 py-2 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20 transition-colors flex items-center gap-2"
                        >
                          <Trash2 className="w-4 h-4" /> Clear All
                        </button>
                      </div>
                    </div>
                  )}
               </div>
            </div>
          </div>

          {/* Right Side: Target & Theme */}
          <div className="flex items-center gap-4 flex-shrink-0">
             <div className="hidden lg:flex flex-col items-end border-r border-slate-200 dark:border-[var(--bh-border)] pr-4">
                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider flex items-center gap-1">
                  <Target className="w-3 h-3" /> Target Depth
                </span>
                <div className="flex items-baseline gap-2">
                  <span className="font-mono font-bold text-slate-700 dark:text-slate-200 text-lg">
                    {convertDepth(params.depthIn + params.intervalToDrill, depthUnit).toLocaleString(undefined, { maximumFractionDigits: 0 })} <span className="text-sm text-slate-400">{getUnitLabel(depthUnit)}</span>
                  </span>
                  
                  {/* Unit Selector */}
                  <button 
                    onClick={toggleUnit}
                    className="flex items-center gap-0.5 text-[10px] font-bold bg-slate-100 dark:bg-[var(--bh-surface-2)] text-slate-600 dark:text-[var(--bh-text-weak)] px-1.5 py-0.5 rounded hover:bg-slate-200 dark:hover:bg-[var(--bh-border)] transition-colors"
                    title="Toggle Unit (m/ft)"
                  >
                    {depthUnit.toUpperCase()}
                    <ChevronDown className="w-2.5 h-2.5" />
                  </button>
                </div>
             </div>

              <button 
                onClick={toggleTheme}
                className="p-2 rounded-xl text-slate-500 hover:bg-slate-100 dark:text-[var(--bh-text-weak)] dark:hover:bg-[var(--bh-surface-2)] dark:hover:text-[var(--bh-primary)] transition-all hover:scale-105 active:scale-95"
                title={`Current Theme: ${theme.charAt(0).toUpperCase() + theme.slice(1)}`}
              >
                {theme === 'light' && <Sun className="w-5 h-5" />}
                {theme === 'dark' && <Moon className="w-5 h-5" />}
                {theme === 'xmas' && <Snowflake className="w-5 h-5 text-red-500" />}
              </button>
          </div>
        </div>
      </header>

      {/* Mobile Target Depth Section */}
      <div className="lg:hidden bg-white/80 dark:bg-[var(--bh-surface-1)] backdrop-blur-md border-b border-slate-200 dark:border-[var(--bh-border)] py-2 px-4 shadow-sm transition-colors duration-300">
        <div className="flex items-center justify-between">
           <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider flex items-center gap-1">
             <Target className="w-3 h-3" /> Target Depth
           </span>
           <div className="flex items-baseline gap-2">
             <span className="font-mono font-bold text-slate-700 dark:text-slate-200 text-base">
               {convertDepth(params.depthIn + params.intervalToDrill, depthUnit).toLocaleString(undefined, { maximumFractionDigits: 0 })} <span className="text-xs text-slate-400">{getUnitLabel(depthUnit)}</span>
             </span>
             
             {/* Unit Selector */}
             <button 
               onClick={toggleUnit}
               className="flex items-center gap-0.5 text-[10px] font-bold bg-slate-100 dark:bg-[var(--bh-surface-2)] text-slate-600 dark:text-[var(--bh-text-weak)] px-1.5 py-0.5 rounded hover:bg-slate-200 dark:hover:bg-[var(--bh-border)] transition-colors"
               title="Toggle Unit (m/ft)"
             >
               {depthUnit.toUpperCase()}
               <ChevronDown className="w-2.5 h-2.5" />
             </button>
           </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-2 md:pt-8 pb-8 flex-grow">
        <div className="flex flex-col md:flex-row relative items-start">
          
          {/* Unified Sidebar Container */}
          <aside 
            className={clsx(
              "flex flex-col gap-6 overflow-hidden flex-shrink-0",
              // Mobile (<850px): Full width, static position (scrolls with page)
              // Desktop (>=850px): Sidebar behavior (sticky top-24)
              "max-[849px]:w-full",
              isSidebarOpen 
                ? "min-[850px]:sticky min-[850px]:top-24 min-[850px]:w-[320px] min-[850px]:mr-8 opacity-100" 
                : "min-[850px]:w-0 min-[850px]:mr-0 min-[850px]:opacity-0 min-[850px]:pointer-events-none"
            )}
            style={{ 
              // Only apply max-height/scroll on desktop. Mobile should grow naturally.
              maxHeight: 'var(--sidebar-height)', 
              overflowY: 'var(--sidebar-overflow)',
              transition: 'all 400ms cubic-bezier(0.2, 0, 0, 1)',
              willChange: 'width, margin-right, opacity',
              ['--sidebar-height' as string]: window.innerWidth >= 850 ? 'calc(100vh - 8rem)' : 'none',
              ['--sidebar-overflow' as string]: window.innerWidth >= 850 ? 'auto' : 'visible'
            }}
          >
            {/* Wrap inner content to prevent layout jumps during width transition */}
            <div className="w-full min-[850px]:w-[310px] min-[850px]:min-w-[310px] h-full flex flex-col">
              {/* Sticky Sidebar Header - Sticky to window on mobile (below nav), sticky to container on desktop */}
              <div className="sticky top-16 min-[850px]:top-0 z-10 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md px-1 py-2 min-[850px]:py-4 mb-2 flex items-center justify-between border-b border-white/20 dark:border-slate-800/20">

                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-blue-100 dark:bg-blue-900/40 rounded-lg text-blue-600 dark:text-blue-400">
                    <Activity className="w-4 h-4" />
                  </div>
                  <h2 className="font-bold text-sm text-slate-800 dark:text-white uppercase tracking-wider">Configuration</h2>
                </div>
                <button
                  onClick={() => setIsSidebarOpen(false)}
                  className="hidden min-[850px]:block p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:text-[var(--bh-text-mute)] dark:hover:text-[var(--bh-text)] dark:hover:bg-[var(--bh-surface-2)] transition-all"
                  title="Collapse Sidebar"
                >
                  <PanelLeftClose className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-6 custom-scrollbar pr-1 pb-4 flex-1">
                <SettingsPanel params={params} setParams={setParams} depthUnit={depthUnit} />
                <BitsPanel bits={bits} setBits={setBits} onRemoveBit={handleRemoveBit} depthUnit={depthUnit} />
              </div>
            </div>
          </aside>

          {/* Main Content: Results & Charts */}
          <div className="flex-1 space-y-8 min-w-0 w-full">
            
            {/* Scenarios & KPIs & Visualizations */}
            <section className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <ScenarioManager 
                bits={bits} 
                scenarios={scenarios} 
                setScenarios={setScenarios} 
                results={results}
                params={params}
                depthUnit={depthUnit}
                compareSelections={compareSelections}
                setCompareSelections={setCompareSelections}
                isCompareMode={isCompareMode}
                setIsCompareMode={setIsCompareMode}
                isScrolled={isScrolled}
                isSidebarOpen={isSidebarOpen}
                setIsSidebarOpen={setIsSidebarOpen}
              >
                {/* Visualizations (injected as children) */}
                <div className="mt-8 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-100">
                  <SimulationCharts 
                    results={results} 
                    targetDepth={params.depthIn + params.intervalToDrill} 
                    isDark={theme === 'dark' || theme === 'xmas'}
                    bits={bits}
                    params={params}
                    depthUnit={depthUnit}
                    selectedForComparison={compareSelections}
                    isCompareMode={isCompareMode}
                  />
                </div>
              </ScenarioManager>
            </section>

          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full border-t border-slate-200 dark:border-[var(--bh-border)] py-6 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 text-sm text-slate-600 dark:text-[var(--bh-text-mute)]">
          <div className="max-w-xl">
        <div className="font-semibold text-slate-800 dark:text-[var(--bh-text)]"><a href="https://youtu.be/a4ap0R_OQIE?si=HRt_-Y2UeGuxWlBd" target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-[var(--bh-primary)] hover:underline">Open Source</a> — All Contributions Welcome</div>

        <p className="mt-2 text-xs">
          Start here: <a href="https://github.com/son-n-pham/drillcost/issues" target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-[var(--bh-primary)] hover:underline">open an issue</a>, fork the repo, or contact me via <a href="https://son-n-pham.github.io/" target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-[var(--bh-primary)] hover:underline">my site</a>.
        </p>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <a
          href="https://github.com/son-n-pham/drillcost"
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-blue-600 dark:hover:text-[var(--bh-primary)] transition-colors flex items-center gap-2"
        >
          <FileText className="w-4 h-4" />
          <span className="text-xs font-medium">Source on GitHub</span>
        </a>

        <a
          href="https://github.com/son-n-pham/drillcost/blob/main/LICENSE"
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-blue-600 dark:hover:text-[var(--bh-primary)] transition-colors text-xs font-medium"
        >
          MIT License
        </a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;