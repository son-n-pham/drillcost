import React, { useState, useMemo, useEffect, useRef } from 'react';
import { GlobalParams, Bit, ScenarioConfig } from './types';
import { INITIAL_GLOBAL_PARAMS, INITIAL_BITS, INITIAL_SCENARIOS } from './constants';
import { runSimulation } from './utils/simulation';
import SettingsPanel from './components/SettingsPanel';
import BitsPanel from './components/BitsPanel';
import ScenarioManager from './components/ScenarioManager';
import SimulationCharts from './components/SimulationCharts';
import SnowEffect from './components/SnowEffect';
import { Activity, Layers, Target, Moon, Sun, Download, Upload, Trash2, FileText, ChevronDown, Snowflake } from 'lucide-react';
import { SAMPLE_PARAMS, SAMPLE_BITS, SAMPLE_SCENARIOS } from './sampleData';
import clsx from 'clsx';
import logoIcon from './img/logo_SonPham.png';
import { DepthUnit, convertDepth, getUnitLabel } from './utils/unitUtils';

const STORAGE_KEY = 'drillcost-pro-state';

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

const App: React.FC = () => {
  // Initialize state from localStorage if available, otherwise use defaults
  // Using lazy initialization to only load from localStorage once on mount
  const [params, setParams] = useState<GlobalParams>(() => {
    const saved = loadSavedState();
    return saved?.params ?? INITIAL_GLOBAL_PARAMS;
  });
  const [bits, setBits] = useState<Bit[]>(() => {
    const saved = loadSavedState();
    return saved?.bits ?? INITIAL_BITS;
  });
  const [scenarios, setScenarios] = useState<ScenarioConfig[]>(() => {
    const saved = loadSavedState();
    return saved?.scenarios ?? INITIAL_SCENARIOS;
  });
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
  const fileInputRef = useRef<HTMLInputElement>(null);
  
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
  };

  const handleLoadState = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const state = JSON.parse(content);
        
        if (state.params) setParams(state.params);
        if (state.bits) setBits(state.bits);
        if (state.scenarios) setScenarios(state.scenarios);
        if (state.depthUnit) setDepthUnit(state.depthUnit);
        if (state.compareSelections) setCompareSelections(state.compareSelections);
        if (state.isCompareMode !== undefined) setIsCompareMode(state.isCompareMode);
        
      } catch (error) {
        console.error('Failed to parse state file', error);
        alert('Invalid file format. Please upload a valid DrillCost Pro JSON file.');
      }
    };
    reader.readAsText(file);
    // Reset input so same file can be selected again if needed
    event.target.value = '';
  };

  const triggerFileUpload = () => {
    fileInputRef.current?.click();
  };

  const handleClearState = () => {
    setParams({
      operationCostPerDay: 0,
      tripSpeed: 0,
      standLength: 0,
      depthIn: 0,
      intervalToDrill: 0,
      circulatingHours: 0,
    });
    setBits([]);
    setScenarios([]);
    try {
      localStorage.clear();
    } catch (e) {
      console.warn('Failed to clear localStorage', e);
    }
  };

  const handleLoadSampleData = () => {
    setParams(SAMPLE_PARAMS);
    setBits(SAMPLE_BITS);
    setScenarios(SAMPLE_SCENARIOS);
  };

  const toggleUnit = () => {
    setDepthUnit(prev => prev === 'm' ? 'ft' : 'm');
  };

  return (
    <div className="min-h-screen bg-slate-50/50 dark:bg-[var(--bh-bg)] text-slate-900 dark:text-[var(--bh-text)] font-sans pb-12 selection:bg-blue-100 selection:text-blue-900 dark:selection:bg-blue-900 dark:selection:text-blue-100 transition-colors duration-300">
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
      <header className="bg-white/80 dark:bg-[var(--bh-surface-1)] backdrop-blur-md border-b border-slate-200 dark:border-[var(--bh-border)] sticky top-0 z-20 shadow-sm transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-3">
            <img 
              src={logoIcon}
              alt="DrillCost Pro Logo" 
              className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg shadow-md shadow-blue-200 dark:shadow-none transition-all"
            />
            <div>
              <h1 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-[var(--bh-text)] tracking-tight leading-none transition-all">DrillCost Pro</h1>
              <p className="text-[10px] sm:text-[11px] font-medium text-slate-500 dark:text-[var(--bh-text-mute)] uppercase tracking-wide mt-0.5 transition-all">Scenario Analysis</p>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-4">
             <div className="hidden sm:flex flex-col items-end mr-4">
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
             
             <div className="h-8 w-px bg-slate-200 dark:bg-[var(--bh-border)] hidden sm:block"></div>

             <div className="flex items-center gap-1 sm:gap-2">
                <button 
                  onClick={triggerFileUpload}
                  className="p-1.5 sm:p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:text-[var(--bh-text-weak)] dark:hover:bg-[var(--bh-surface-2)] dark:hover:text-[var(--bh-primary)] transition-colors flex items-center gap-2 group"
                  title="Load Scenarios"
                >
                  <Upload className="w-5 h-5 group-hover:scale-110 transition-transform" />
                  <span className="text-xs font-semibold hidden md:block">Load</span>
                </button>
                <button 
                  onClick={handleSaveState}
                  className="p-1.5 sm:p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:text-[var(--bh-text-weak)] dark:hover:bg-[var(--bh-surface-2)] dark:hover:text-[var(--bh-primary)] transition-colors flex items-center gap-2 group"
                  title="Save Scenarios"
                >
                  <Download className="w-5 h-5 group-hover:scale-110 transition-transform" />
                  <span className="text-xs font-semibold hidden md:block">Save</span>
                </button>
                <button 
                  onClick={handleClearState}
                  className="p-1.5 sm:p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:text-[var(--bh-text-weak)] dark:hover:bg-[var(--bh-surface-2)] dark:hover:text-[var(--bh-danger)] transition-colors flex items-center gap-2 group"
                  title="Clear All Scenarios"
                >
                  <Trash2 className="w-5 h-5 group-hover:scale-110 transition-transform" />
                  <span className="text-xs font-semibold hidden md:block">Clear</span>
                </button>
                <button 
                  onClick={handleLoadSampleData}
                  className="p-1.5 sm:p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:text-[var(--bh-text-weak)] dark:hover:bg-[var(--bh-surface-2)] dark:hover:text-[var(--bh-accent)] transition-colors flex items-center gap-2 group"
                  title="Load Sample Data"
                >
                  <FileText className="w-5 h-5 group-hover:scale-110 transition-transform" />
                  <span className="text-xs font-semibold hidden md:block">Sample</span>
                </button>
             </div>

             <div className="h-8 w-px bg-slate-200 dark:bg-[var(--bh-border)] hidden sm:block"></div>

              <button 
                onClick={toggleTheme}
                className="p-1.5 sm:p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:text-[var(--bh-text-weak)] dark:hover:bg-[var(--bh-surface-2)] dark:hover:text-[var(--bh-primary)] transition-colors"
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
      <div className="sm:hidden bg-white/80 dark:bg-[var(--bh-surface-1)] backdrop-blur-md border-b border-slate-200 dark:border-[var(--bh-border)] py-2 px-4 shadow-sm transition-colors duration-300">
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

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Left Sidebar: Controls */}
          <div className="lg:col-span-3 flex flex-col gap-6">
            <SettingsPanel params={params} setParams={setParams} depthUnit={depthUnit} />
            <BitsPanel bits={bits} setBits={setBits} depthUnit={depthUnit} />
          </div>

          {/* Main Content: Results & Charts */}
          <div className="lg:col-span-9 space-y-8">
            
            {/* Scenarios & KPIs */}
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
              />
            </section>

            {/* Visualizations */}
            <section className="animate-in fade-in slide-in-from-bottom-4 duration-700 delay-100">
               <SimulationCharts 
                results={results} 
                targetDepth={params.depthIn + params.intervalToDrill} 
                isDark={theme === 'dark'}
                bits={bits}
                params={params}
                depthUnit={depthUnit}
                selectedForComparison={compareSelections}
                isCompareMode={isCompareMode}
               />
            </section>

          </div>
        </div>
      </main>
    </div>
  );
};

export default App;