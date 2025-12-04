import React, { useState, useRef, useEffect } from 'react';
import { Bit, ScenarioConfig, ScenarioResult, GlobalParams } from '../types';
import { Plus, Trash2, BarChart3, GripHorizontal, CheckCircle2, AlertTriangle, ChevronRight, X } from 'lucide-react';
import clsx from 'clsx';

interface ScenarioManagerProps {
  bits: Bit[];
  scenarios: ScenarioConfig[];
  setScenarios: (s: ScenarioConfig[]) => void;
  results: ScenarioResult[];
  params: GlobalParams;
}

const ScenarioManager: React.FC<ScenarioManagerProps> = ({ bits, scenarios, setScenarios, results, params }) => {
  const [activeTab, setActiveTab] = useState<string>(scenarios[0]?.id || '');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const addScenario = () => {
    const newId = `scen-${Date.now()}`;
    const newScen: ScenarioConfig = {
      id: newId,
      name: `Scenario ${scenarios.length + 1}`,
      bitSequence: [], // Initialize with empty sequence
    };
    setScenarios([...scenarios, newScen]);
    setActiveTab(newId);
  };

  const removeScenario = (e: React.MouseEvent, id: string) => {
    e.stopPropagation(); // Prevent triggering card selection
    if (scenarios.length <= 1) return;
    const newScens = scenarios.filter(s => s.id !== id);
    setScenarios(newScens);
    if (activeTab === id) setActiveTab(newScens[0].id);
  };

  const updateScenario = (id: string, updates: Partial<ScenarioConfig>) => {
    setScenarios(scenarios.map(s => s.id === id ? { ...s, ...updates } : s));
  };

  const addToSequence = (scenarioId: string, bitId: string) => {
    const s = scenarios.find(x => x.id === scenarioId);
    if (s) {
      updateScenario(scenarioId, { bitSequence: [...s.bitSequence, bitId] });
      setIsDropdownOpen(false);
    }
  };

  const removeFromSequence = (scenarioId: string, index: number) => {
    const s = scenarios.find(x => x.id === scenarioId);
    if (s) {
      const newSeq = [...s.bitSequence];
      newSeq.splice(index, 1);
      updateScenario(scenarioId, { bitSequence: newSeq });
    }
  };

  const activeResult = results.find(r => r.id === activeTab);
  const activeScenario = scenarios.find(s => s.id === activeTab);

  const currentSequenceCapacity = activeScenario 
    ? activeScenario.bitSequence.reduce((acc, bitId) => {
        const bit = bits.find(b => b.id === bitId);
        return acc + (bit ? bit.maxDistance : 0);
      }, 0)
    : 0;

  const isTargetReached = currentSequenceCapacity >= params.intervalToDrill;
  const progressPercent = Math.min((currentSequenceCapacity / params.intervalToDrill) * 100, 100);

  return (
    <div className="space-y-6">
      {/* Results Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {results.map((res, idx) => {
            const isBestCost = results.every(r => (r.status === 'incomplete' || r.steps.length <= 1 ? Infinity : r.totalCost) >= (res.status === 'incomplete' || res.steps.length <= 1 ? Infinity : res.totalCost)) && res.status === 'complete' && res.steps.length > 1;
            const isActive = activeTab === res.id;
            const isBlank = res.steps.length <= 1;

            return (
              <div 
                key={res.id} 
                onClick={() => setActiveTab(res.id)}
                className={clsx(
                  "cursor-pointer rounded-xl border transition-all duration-300 relative overflow-hidden group",
                  isActive 
                    ? "bg-white dark:bg-[var(--bh-surface-1)] border-blue-500 shadow-md ring-1 ring-blue-500/20 scale-[1.02]" 
                    : "bg-white dark:bg-[var(--bh-surface-0)] border-slate-200 dark:border-[var(--bh-border)] hover:border-blue-300 dark:hover:border-[var(--bh-border)] hover:shadow-sm"
                )}
              >
                <div className={clsx(
                  "absolute top-0 left-0 w-full h-1", 
                  isActive ? ['bg-blue-500', 'bg-emerald-500', 'bg-amber-500', 'bg-purple-500'][idx % 4] : "bg-transparent"
                )}></div>
                
                {/* Delete Button (visible on hover) */}
                {scenarios.length > 1 && (
                  <button
                    onClick={(e) => removeScenario(e, res.id)}
                    className="absolute top-2 right-2 p-1.5 text-slate-300 dark:text-[var(--bh-text-mute)] hover:text-red-500 dark:hover:text-[var(--bh-danger)] hover:bg-slate-100 dark:hover:bg-[var(--bh-surface-2)] rounded-md transition-all opacity-0 group-hover:opacity-100 z-10"
                    title="Remove Scenario"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
                
                <div className="p-5">
                  <div className="flex justify-between items-start mb-4 gap-3">
                     <h3 className={clsx("font-bold text-sm leading-snug flex-1 min-w-0", isActive ? "text-slate-900 dark:text-[var(--bh-text)]" : "text-slate-600 dark:text-[var(--bh-text-mute)]")}>
                        {res.name}
                     </h3>
                     <div className="flex flex-col items-end gap-1 shrink-0">
                       {isBestCost && <span className="text-[9px] font-bold bg-emerald-50 dark:bg-[var(--bh-success)]/10 text-emerald-600 dark:text-[var(--bh-success)] border border-emerald-100 dark:border-[var(--bh-success)]/20 px-2 py-0.5 rounded-full whitespace-nowrap">Low Cost</span>}
                       {!isBlank && res.status === 'incomplete' && <span className="text-[9px] font-bold bg-amber-50 dark:bg-[var(--bh-warning)]/10 text-amber-600 dark:text-[var(--bh-warning)] border border-amber-100 dark:border-[var(--bh-warning)]/20 px-2 py-0.5 rounded-full whitespace-nowrap">Incomplete</span>}
                     </div>
                  </div>
                  
                  <div className="space-y-2.5">
                     <div className="flex justify-between items-baseline">
                        <span className="text-[11px] font-semibold text-slate-400 dark:text-[var(--bh-text-mute)] uppercase">Cost/m</span>
                        {isBlank ? (
                           <span className={clsx("text-xl font-bold tracking-tight", isActive ? "text-slate-300 dark:text-[var(--bh-text-weak)]" : "text-slate-300 dark:text-[var(--bh-text-mute)]")}>N/A</span>
                        ) : (
                          <span className={clsx("text-2xl font-bold tracking-tight", isActive ? "text-slate-900 dark:text-[var(--bh-text)]" : "text-slate-700 dark:text-[var(--bh-text-weak)]")}>
                            ${res.costPerMeter.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                            <span className="text-sm font-normal text-slate-400 dark:text-[var(--bh-text-mute)]">.{(res.costPerMeter % 1).toFixed(2).substring(2)}</span>
                          </span>
                        )}
                     </div>
                     <div className="flex justify-between items-center pt-2 border-t border-slate-50 dark:border-[var(--bh-border)]">
                        <div className="flex flex-col">
                           <span className="text-[10px] text-slate-400 dark:text-[var(--bh-text-mute)]">Est. Total Cost</span>
                           <span className="text-sm font-semibold text-slate-700 dark:text-[var(--bh-text-weak)]">
                             {isBlank ? 'N/A' : `$${(res.totalCost / 1000).toFixed(1)}k`}
                           </span>
                        </div>
                        <div className="w-px h-6 bg-slate-100 dark:bg-[var(--bh-border)] mx-2"></div>
                        <div className="flex flex-col items-end">
                           <span className="text-[10px] text-slate-400 dark:text-[var(--bh-text-mute)]">Est. Total Time</span>
                           <span className="text-sm font-semibold text-slate-700 dark:text-[var(--bh-text-weak)]">
                             {isBlank ? 'N/A' : `${res.totalTime.toFixed(0)}h`}
                           </span>
                        </div>
                     </div>
                  </div>
                </div>
              </div>
            );
        })}
         <button 
          onClick={addScenario}
          className="flex flex-col items-center justify-center p-4 rounded-xl border-2 border-dashed border-slate-200 dark:border-[var(--bh-border)] text-slate-400 dark:text-[var(--bh-text-mute)] hover:text-blue-600 dark:hover:text-[var(--bh-primary)] hover:border-blue-300 dark:hover:border-[var(--bh-primary)] hover:bg-blue-50/50 dark:hover:bg-[var(--bh-surface-2)] transition-all gap-2 min-h-[140px] group"
        >
          <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-[var(--bh-surface-1)] group-hover:bg-blue-100 dark:group-hover:bg-[var(--bh-surface-2)] flex items-center justify-center transition-colors">
            <Plus className="w-5 h-5" />
          </div>
          <span className="font-semibold text-sm">New Scenario</span>
        </button>
      </div>

      {/* Editor Area */}
      {activeScenario && (
        <div className="card animate-in fade-in duration-300 overflow-hidden transition-colors duration-300">
           {/* Scenario Header */}
           <div className="px-6 py-5 border-b border-slate-100 dark:border-[var(--bh-border)] flex justify-between items-center bg-slate-50/30 dark:bg-[var(--bh-surface-1)]">
              <div className="flex items-center gap-3 w-full max-w-md">
                 <div className="p-2 bg-white dark:bg-[var(--bh-surface-0)] border border-slate-200 dark:border-[var(--bh-border)] rounded-lg shadow-sm text-slate-400 dark:text-[var(--bh-text-mute)]">
                    <GripHorizontal className="w-5 h-5" />
                 </div>
                 <div className="w-full">
                    <input 
                        className="text-lg font-bold text-slate-800 dark:text-[var(--bh-text)] bg-transparent outline-none w-full placeholder:text-slate-300 dark:placeholder:text-[var(--bh-text-mute)] focus:text-blue-700 dark:focus:text-[var(--bh-primary)] transition-colors"
                        value={activeScenario.name}
                        onChange={(e) => updateScenario(activeScenario.id, { name: e.target.value })}
                        placeholder="Scenario Name"
                    />
                 </div>
              </div>
              <button 
                onClick={(e) => removeScenario(e, activeScenario.id)}
                className="text-slate-400 dark:text-[var(--bh-text-mute)] hover:text-red-500 dark:hover:text-[var(--bh-danger)] hover:bg-red-50 dark:hover:bg-[var(--bh-surface-2)] p-2 rounded-lg transition-colors"
                title="Delete Scenario"
              >
                 <Trash2 className="w-4 h-4" />
              </button>
           </div>

           <div className="p-6">
             {/* Alerts */}
             {activeResult?.status === 'incomplete' && activeResult.steps.length > 1 && (
                <div className="mb-6 bg-amber-50 dark:bg-[var(--bh-warning)]/10 border border-amber-200 dark:border-[var(--bh-warning)]/20 rounded-lg p-4 flex items-start gap-4 shadow-sm">
                   <div className="p-2 bg-amber-100 dark:bg-[var(--bh-warning)]/20 rounded-full shrink-0">
                      <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-[var(--bh-warning)]" />
                   </div>
                   <div>
                      <h5 className="text-sm font-bold text-amber-900 dark:text-[var(--bh-warning)]">Target Not Reached</h5>
                      <p className="text-sm text-amber-700 dark:text-[var(--bh-text-weak)] mt-1 leading-relaxed">
                         Current sequence covers <span className="font-bold">{currentSequenceCapacity.toLocaleString()}m</span> of the required {params.intervalToDrill.toLocaleString()}m. 
                         You need <strong>{(params.intervalToDrill - currentSequenceCapacity).toLocaleString()}m</strong> more.
                      </p>
                   </div>
                </div>
             )}

             {/* Sequence Builder */}
             <div className="mb-8">
               <div className="flex justify-between items-end mb-4">
                 <h4 className="text-sm font-bold text-slate-700 dark:text-[var(--bh-text)] flex items-center gap-2">
                   Sequence Strategy
                 </h4>
                 <div className="flex items-center gap-3">
                    <div className="flex flex-col items-end">
                      <span className="text-[10px] text-slate-400 dark:text-[var(--bh-text-mute)] uppercase font-bold tracking-wider">Coverage</span>
                      <span className="text-xs font-mono font-medium text-slate-600 dark:text-[var(--bh-text-weak)]">
                        {currentSequenceCapacity.toLocaleString()} / {params.intervalToDrill.toLocaleString()}m
                      </span>
                    </div>
                    <div className="w-24 h-1.5 bg-slate-100 dark:bg-[var(--bh-border)] rounded-full overflow-hidden">
                       <div className="h-full bg-blue-500 dark:bg-[var(--bh-primary)] rounded-full transition-all duration-500" style={{ width: `${progressPercent}%` }} />
                    </div>
                 </div>
               </div>
               
               <div className="flex flex-wrap items-center gap-2 min-h-[80px]">
                  {activeScenario.bitSequence.length === 0 && (
                     <div className="text-sm text-slate-400 dark:text-[var(--bh-text-mute)] italic px-2">No bits added yet. Click "Next Bit" to start.</div>
                  )}

                  {activeScenario.bitSequence.map((bitId, idx) => {
                     const bit = bits.find(b => b.id === bitId);
                     if (!bit) return null;
                     return (
                        <div key={idx} className="flex items-center animate-in zoom-in-50 duration-200">
                           <div className="relative group bg-white dark:bg-[var(--bh-surface-1)] border border-slate-200 dark:border-[var(--bh-border)] hover:border-emerald-400 dark:hover:border-[var(--bh-primary)] hover:shadow-md transition-all rounded-xl p-3 pr-8 flex items-center gap-3 w-48">
                              <div className="w-1.5 h-10 rounded-full" style={{ backgroundColor: bit.color }}></div>
                              <div>
                                 <div className="font-bold text-sm text-slate-800 dark:text-[var(--bh-text)]">{bit.name}</div>
                                 <div className="text-[11px] font-medium text-slate-500 dark:text-[var(--bh-text-mute)]">Max {bit.maxDistance}m</div>
                              </div>
                              <span className="absolute -top-2 -left-2 bg-emerald-600 dark:bg-[var(--bh-primary)] text-white text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full shadow-sm ring-2 ring-white dark:ring-[var(--bh-bg)]">
                                 {idx + 1}
                              </span>
                              
                              <button 
                               onClick={() => removeFromSequence(activeScenario.id, idx)}
                               className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-slate-300 dark:text-[var(--bh-text-mute)] hover:text-red-500 dark:hover:text-[var(--bh-danger)] hover:bg-red-50 dark:hover:bg-[var(--bh-danger)]/10 rounded-md transition-colors opacity-0 group-hover:opacity-100"
                              >
                                 <X className="w-3.5 h-3.5" />
                              </button>
                           </div>
                           
                           {/* Connector or Next Button */}
                           {idx < activeScenario.bitSequence.length - 1 && (
                              <div className="w-8 flex justify-center text-slate-300 dark:text-[var(--bh-text-mute)]">
                                 <ChevronRight className="w-4 h-4" />
                              </div>
                           )}
                        </div>
                     );
                  })}
                  
                  {/* Add Button Logic */}
                  <div className="ml-2 flex items-center">
                    {!isTargetReached && activeScenario.bitSequence.length > 0 && (
                       <div className="w-8 flex justify-center text-slate-300 dark:text-slate-600 mr-2">
                          <ChevronRight className="w-4 h-4" />
                       </div>
                    )}

                    {isTargetReached ? (
                      <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 dark:bg-[var(--bh-success)]/10 text-emerald-700 dark:text-[var(--bh-success)] rounded-lg border border-emerald-200 dark:border-[var(--bh-success)]/20 text-sm font-semibold shadow-sm animate-in fade-in slide-in-from-left-2">
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Complete</span>
                      </div>
                    ) : (
                      <div className="relative" ref={dropdownRef}>
                        <button 
                            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                            className={clsx(
                              "flex items-center gap-2 text-sm font-semibold px-4 py-3 rounded-xl transition-all border shadow-sm",
                              isDropdownOpen 
                                ? "bg-blue-50 dark:bg-[var(--bh-surface-2)] text-blue-700 dark:text-[var(--bh-primary)] border-blue-200 dark:border-[var(--bh-primary)] ring-2 ring-blue-100 dark:ring-[var(--bh-primary)]/30" 
                                : "bg-white dark:bg-[var(--bh-surface-0)] text-slate-600 dark:text-[var(--bh-text-weak)] border-dashed border-slate-300 dark:border-[var(--bh-border)] hover:border-blue-300 dark:hover:border-[var(--bh-primary)] hover:text-blue-600 dark:hover:text-[var(--bh-primary)] hover:bg-blue-50/50 dark:hover:bg-[var(--bh-surface-2)]"
                            )}
                        >
                            <Plus className="w-4 h-4" /> 
                            <span>Next Bit</span>
                        </button>
                        
                        {isDropdownOpen && (
                          <div className="absolute top-full left-0 mt-2 w-56 bg-white dark:bg-[var(--bh-surface-1)] rounded-xl shadow-xl border border-slate-100 dark:border-[var(--bh-border)] p-1.5 z-20 animate-in fade-in zoom-in-95 duration-100 overflow-hidden">
                              <div className="px-2 py-1.5 text-[10px] font-bold text-slate-400 dark:text-[var(--bh-text-mute)] uppercase tracking-wider">Select Bit Type</div>
                              <div className="max-h-60 overflow-y-auto space-y-0.5">
                                {bits.map(bit => (
                                  <button
                                      key={bit.id}
                                      onClick={() => addToSequence(activeScenario.id, bit.id)}
                                      className="w-full text-left px-3 py-2 text-sm text-slate-700 dark:text-[var(--bh-text)] hover:bg-slate-50 dark:hover:bg-[var(--bh-surface-2)] hover:text-blue-700 dark:hover:text-[var(--bh-primary)] rounded-lg flex items-center gap-3 transition-colors group"
                                  >
                                      <span className="w-2 h-2 rounded-full ring-2 ring-slate-100 dark:ring-[var(--bh-border)] group-hover:ring-blue-100 dark:group-hover:ring-[var(--bh-primary)]/30 transition-shadow" style={{ backgroundColor: bit.color }}></span>
                                      <div className="flex flex-col">
                                        <span className="font-semibold">{bit.name}</span>
                                        <span className="text-[10px] text-slate-400 dark:text-[var(--bh-text-mute)]">Max {bit.maxDistance}m</span>
                                      </div>
                                  </button>
                                ))}
                              </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
               </div>
             </div>

             {/* Metrics Footer */}
             {activeResult && (
               <div className="bg-slate-50 dark:bg-[var(--bh-surface-1)] rounded-xl p-5 border border-slate-200/60 dark:border-[var(--bh-border)]">
                  <h4 className="text-xs font-bold text-slate-500 dark:text-[var(--bh-text-mute)] uppercase tracking-wider mb-4 flex items-center gap-2">
                    <BarChart3 className="w-3.5 h-3.5" />
                    Performance Breakdown
                  </h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                     <div>
                        <span className="text-[11px] font-semibold text-slate-400 dark:text-[var(--bh-text-mute)] block mb-1">Bits Consumed</span>
                        <div className="space-y-1">
                          {activeResult.bitsUsed.length > 0 ? (
                            activeResult.bitsUsed.map((b, i) => (
                              <div key={i} className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-[var(--bh-text)]">
                                <span>{b.name}</span>
                                <span className="text-slate-400 dark:text-[var(--bh-text-mute)]">x{b.count}</span>
                              </div>
                            ))
                          ) : (
                            <span className="text-sm text-slate-400 dark:text-[var(--bh-text-mute)] italic">None</span>
                          )}
                        </div>
                     </div>
                     <div>
                        <span className="text-[11px] font-semibold text-slate-400 dark:text-[var(--bh-text-mute)] block mb-1">Est. Total Time</span>
                        {activeResult.steps.length > 1 ? (
                          <>
                            <div className="flex items-baseline gap-1">
                               <span className="text-lg font-bold text-slate-800 dark:text-[var(--bh-text)]">{(activeResult.totalTime / 24).toFixed(1)}</span>
                               <span className="text-xs text-slate-500 dark:text-[var(--bh-text-mute)]">days</span>
                            </div>
                            <div className="text-[10px] text-slate-400 dark:text-[var(--bh-text-mute)] mt-1">{activeResult.totalTime.toFixed(1)} hours</div>
                          </>
                        ) : (
                          <span className="text-lg font-bold text-slate-300 dark:text-[var(--bh-text-weak)]">-</span>
                        )}
                     </div>
                     <div>
                        <span className="text-[11px] font-semibold text-slate-400 dark:text-[var(--bh-text-mute)] block mb-1">Avg ROP (Gross)</span>
                        {activeResult.steps.length > 1 ? (
                          <>
                            <div className="flex items-baseline gap-1">
                               <span className="text-lg font-bold text-slate-800 dark:text-[var(--bh-text)]">
                                 {(activeResult.totalTime > 0 ? ((activeResult.steps[activeResult.steps.length-1]?.depth - params.depthIn) / activeResult.totalTime).toFixed(1) : 0)}
                               </span>
                               <span className="text-xs text-slate-500 dark:text-[var(--bh-text-mute)]">m/hr</span>
                            </div>
                            <div className="text-[10px] text-slate-400 dark:text-[var(--bh-text-mute)] mt-1">Includes tripping</div>
                          </>
                        ) : (
                          <span className="text-lg font-bold text-slate-300 dark:text-[var(--bh-text-weak)]">-</span>
                        )}
                     </div>
                     <div>
                        <span className="text-[11px] font-semibold text-slate-400 dark:text-[var(--bh-text-mute)] block mb-1">Est. Total Cost</span>
                        {activeResult.steps.length > 1 ? (
                           <>
                             <div className="flex items-baseline gap-1">
                               <span className="text-lg font-bold text-slate-800 dark:text-[var(--bh-text)]">${(activeResult.totalCost / 1000).toFixed(1)}k</span>
                            </div>
                            <div className="text-[10px] text-slate-400 dark:text-[var(--bh-text-mute)] mt-1">Based on rig rate</div>
                           </>
                        ) : (
                           <span className="text-lg font-bold text-slate-300 dark:text-[var(--bh-text-weak)]">-</span>
                        )}
                     </div>
                  </div>
               </div>
             )}
           </div>
        </div>
      )}
    </div>
  );
};

export default ScenarioManager;