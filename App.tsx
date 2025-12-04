import React, { useState, useMemo, useEffect, useRef } from 'react';
import { GlobalParams, Bit, ScenarioConfig } from './types';
import { INITIAL_GLOBAL_PARAMS, INITIAL_BITS, INITIAL_SCENARIOS } from './constants';
import { runSimulation } from './utils/simulation';
import SettingsPanel from './components/SettingsPanel';
import BitsPanel from './components/BitsPanel';
import ScenarioManager from './components/ScenarioManager';
import SimulationCharts from './components/SimulationCharts';
import { Activity, Layers, Target, Moon, Sun, Download, Upload, Trash2, FileText } from 'lucide-react';
import { SAMPLE_PARAMS, SAMPLE_BITS, SAMPLE_SCENARIOS } from './sampleData';
import clsx from 'clsx';

const App: React.FC = () => {
  const [params, setParams] = useState<GlobalParams>(INITIAL_GLOBAL_PARAMS);
  const [bits, setBits] = useState<Bit[]>(INITIAL_BITS);
  const [scenarios, setScenarios] = useState<ScenarioConfig[]>(INITIAL_SCENARIOS);
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Apply theme class to html element
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  // Memoize results to avoid recalculating on every render unless inputs change
  const results = useMemo(() => {
    return scenarios.map(scenario => runSimulation(params, bits, scenario));
  }, [params, bits, scenarios]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  const handleSaveState = () => {
    const state = {
      params,
      bits,
      scenarios,
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

  return (
    <div className="min-h-screen bg-slate-50/50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans pb-12 selection:bg-blue-100 selection:text-blue-900 dark:selection:bg-blue-900 dark:selection:text-blue-100 transition-colors duration-300">
      {/* Hidden File Input */}
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleLoadState} 
        accept=".json" 
        className="hidden" 
      />

      {/* Header */}
      <header className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 sticky top-0 z-20 shadow-sm transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-blue-600 to-indigo-600 p-2 rounded-lg text-white shadow-md shadow-blue-200 dark:shadow-none">
               <Activity className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight leading-none">DrillCost Pro</h1>
              <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide mt-0.5">Scenario Analysis</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
             <div className="hidden sm:flex flex-col items-end mr-4">
                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider flex items-center gap-1">
                  <Target className="w-3 h-3" /> Target Depth
                </span>
                <span className="font-mono font-bold text-slate-700 dark:text-slate-200 text-lg">
                  {(params.depthIn + params.intervalToDrill).toLocaleString()} <span className="text-sm text-slate-400">m</span>
                </span>
             </div>
             
             <div className="h-8 w-px bg-slate-200 dark:bg-slate-800 hidden sm:block"></div>

             <div className="flex items-center gap-2">
                <button 
                  onClick={triggerFileUpload}
                  className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-blue-400 transition-colors flex items-center gap-2 group"
                  title="Load Scenarios"
                >
                  <Upload className="w-5 h-5 group-hover:scale-110 transition-transform" />
                  <span className="text-xs font-semibold hidden md:block">Load</span>
                </button>
                <button 
                  onClick={handleSaveState}
                  className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-blue-400 transition-colors flex items-center gap-2 group"
                  title="Save Scenarios"
                >
                  <Download className="w-5 h-5 group-hover:scale-110 transition-transform" />
                  <span className="text-xs font-semibold hidden md:block">Save</span>
                </button>
                <button 
                  onClick={handleClearState}
                  className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-red-400 transition-colors flex items-center gap-2 group"
                  title="Clear All Scenarios"
                >
                  <Trash2 className="w-5 h-5 group-hover:scale-110 transition-transform" />
                  <span className="text-xs font-semibold hidden md:block">Clear</span>
                </button>
                <button 
                  onClick={handleLoadSampleData}
                  className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-emerald-400 transition-colors flex items-center gap-2 group"
                  title="Load Sample Data"
                >
                  <FileText className="w-5 h-5 group-hover:scale-110 transition-transform" />
                  <span className="text-xs font-semibold hidden md:block">Sample</span>
                </button>
             </div>

             <div className="h-8 w-px bg-slate-200 dark:bg-slate-800"></div>

             <button 
              onClick={toggleTheme}
              className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-blue-400 transition-colors"
              title={`Switch to ${theme === 'light' ? 'Dark' : 'Light'} Mode`}
             >
               {theme === 'dark' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
             </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Left Sidebar: Controls */}
          <div className="lg:col-span-3 flex flex-col gap-6">
            <SettingsPanel params={params} setParams={setParams} />
            <BitsPanel bits={bits} setBits={setBits} />
          </div>

          {/* Main Content: Results & Charts */}
          <div className="lg:col-span-9 space-y-8">
            
            {/* Scenarios & KPIs */}
            <section className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="flex items-center justify-between mb-4">
                 <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-slate-100 dark:bg-slate-800 rounded-md text-slate-600 dark:text-slate-300">
                      <Layers className="w-4 h-4" />
                    </div>
                    <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">Scenarios</h2>
                 </div>
                 <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-2.5 py-1 rounded-full shadow-sm">
                    {scenarios.length} Active
                 </span>
              </div>
              <ScenarioManager 
                bits={bits} 
                scenarios={scenarios} 
                setScenarios={setScenarios} 
                results={results}
                params={params}
              />
            </section>

            {/* Visualizations */}
            <section className="animate-in fade-in slide-in-from-bottom-4 duration-700 delay-100">
               <SimulationCharts 
                results={results} 
                targetDepth={params.depthIn + params.intervalToDrill} 
                isDark={theme === 'dark'}
               />
            </section>

          </div>
        </div>
      </main>
    </div>
  );
};

export default App;