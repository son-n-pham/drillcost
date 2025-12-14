import React from 'react';
import { GlobalParams } from '../types';
import { Settings, DollarSign, Clock, ArrowDownToLine, MoveVertical, RefreshCw } from 'lucide-react';
import { DepthUnit, convertDepth, convertDepthToMeters, getUnitLabel } from '../utils/unitUtils';

interface SettingsPanelProps {
  params: GlobalParams;
  setParams: (p: GlobalParams) => void;
  depthUnit: DepthUnit;
}

const SettingsPanel: React.FC<SettingsPanelProps> = ({ params, setParams, depthUnit }) => {
  const handleChange = (key: keyof GlobalParams, value: string) => {
    // Remove commas from formatted numbers before parsing
    const cleanValue = value.replace(/,/g, '');
    const numVal = parseFloat(cleanValue);
    const finalValue = isNaN(numVal) ? 0 : numVal;

    // specific fields need conversion back to meters
    if (['standLength', 'depthIn', 'intervalToDrill'].includes(key)) {
        setParams({ ...params, [key]: convertDepthToMeters(finalValue, depthUnit) });
    } else {
        setParams({ ...params, [key]: finalValue });
    }
  };

  // Helper to get display value with formatting
  const getDisplayValue = (key: keyof GlobalParams) => {
    const val = params[key];
    if (['standLength', 'depthIn', 'intervalToDrill'].includes(key)) {
        // Round to 2 decimals for display to avoid long floats
        const converted = convertDepth(val, depthUnit);
        const rounded = Number.isInteger(converted) ? converted : parseFloat(converted.toFixed(2));
        return rounded.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
    }
    if (key === 'operationCostPerDay') {
        return val.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
    }
    return val;
  };

  return (
    <div className="card transition-colors duration-300">
      <div className="px-3 py-4 border-b border-slate-100 dark:border-[var(--bh-border)] bg-slate-50/50 dark:bg-[var(--bh-surface-1)] flex items-center gap-2">
        <Settings className="w-4 h-4 text-slate-500 dark:text-[var(--bh-text-mute)]" />
        <h2 className="font-bold text-sm text-slate-800 dark:text-[var(--bh-text)] uppercase tracking-wide">Input Parameters</h2>
      </div>

      <div className="px-3 py-5 space-y-5">
        
        {/* Operation Cost */}
        <div className="group">
          <label className="text-[11px] font-bold text-slate-500 dark:text-[var(--bh-text-weak)] uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
            <DollarSign className="w-3 h-3 text-blue-500 dark:text-[var(--bh-primary)]" /> Operation Rate
          </label>
          <div className="relative">
            <input
              type="text"
              value={getDisplayValue('operationCostPerDay')}
              onChange={(e) => handleChange('operationCostPerDay', e.target.value)}
              className="input font-semibold text-sm"
            />
            <span className="absolute right-3 top-2.5 text-slate-400 dark:text-slate-500 text-xs font-medium pointer-events-none">$/day</span>
          </div>
        </div>

        {/* Trip Speed Group */}
        <div className="grid grid-cols-2 gap-3">
          <div className="group">
            <label className="text-[11px] font-bold text-slate-500 dark:text-[var(--bh-text-weak)] uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <Clock className="w-3 h-3 text-emerald-500 dark:text-[var(--bh-accent)]" /> Trip Speed
            </label>
            <div className="relative">
              <input
                type="number"
                value={params.tripSpeed}
                onChange={(e) => handleChange('tripSpeed', e.target.value)}
                className="input font-medium text-sm"
              />
              <span className="absolute right-2 top-2.5 text-slate-400 dark:text-[var(--bh-text-mute)] text-[10px] pointer-events-none">std/hr</span>
            </div>
          </div>
          <div className="group">
            <label className="text-[11px] font-bold text-slate-500 dark:text-[var(--bh-text-weak)] uppercase tracking-wider mb-1.5 block">
               Stand Len
            </label>
            <div className="relative">
              <input
                type="text"
                value={getDisplayValue('standLength')}
                onChange={(e) => handleChange('standLength', e.target.value)}
                className="input font-medium text-sm"
              />
              <span className="absolute right-3 top-2.5 text-slate-400 dark:text-[var(--bh-text-mute)] text-[10px] pointer-events-none">{getUnitLabel(depthUnit)}</span>
            </div>
          </div>
        </div>

        <div className="h-px bg-slate-100 dark:bg-[var(--bh-border)] my-2" />

        {/* Depths Group */}
        <div className="space-y-4">
          <div className="group">
            <label className="text-[11px] font-bold text-slate-500 dark:text-[var(--bh-text-weak)] uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <ArrowDownToLine className="w-3 h-3 text-indigo-500 dark:text-[var(--bh-primary)]" /> Depth In
            </label>
            <div className="relative">
              <input
                type="text"
                value={getDisplayValue('depthIn')}
                onChange={(e) => handleChange('depthIn', e.target.value)}
                className="input font-medium text-sm"
              />
              <span className="absolute right-3 top-2.5 text-slate-400 dark:text-[var(--bh-text-mute)] text-xs pointer-events-none">{getUnitLabel(depthUnit)}</span>
            </div>
          </div>

          <div className="group">
            <label className="text-[11px] font-bold text-slate-500 dark:text-[var(--bh-text-weak)] uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <MoveVertical className="w-3 h-3 text-indigo-500 dark:text-[var(--bh-primary)]" /> Interval
            </label>
            <div className="relative">
              <input
                type="text"
                value={getDisplayValue('intervalToDrill')}
                onChange={(e) => handleChange('intervalToDrill', e.target.value)}
                className="input font-medium text-sm"
              />
              <span className="absolute right-3 top-2.5 text-slate-400 dark:text-[var(--bh-text-mute)] text-xs pointer-events-none">{getUnitLabel(depthUnit)}</span>
            </div>
          </div>
        </div>

        <div className="h-px bg-slate-100 dark:bg-[var(--bh-border)] my-2" />

        {/* Circulating Time */}
        <div className="group">
          <div className="flex justify-between items-center mb-1.5">
            <label className="text-[11px] font-bold text-slate-500 dark:text-[var(--bh-text-weak)] uppercase tracking-wider flex items-center gap-1.5">
              <RefreshCw className="w-3 h-3 text-amber-500 dark:text-[var(--bh-warning)]" /> Circ. Time
            </label>
            <span className="text-[10px] text-slate-400 dark:text-[var(--bh-text-mute)]">Inc. bit/BHA</span>
          </div>
          <div className="relative">
            <input
              type="number"
              value={params.circulatingHours}
              onChange={(e) => handleChange('circulatingHours', e.target.value)}
              className="input font-medium text-sm"
            />
            <span className="absolute right-3 top-2.5 text-slate-400 dark:text-[var(--bh-text-mute)] text-xs pointer-events-none">hrs</span>
          </div>
        </div>

      </div>
    </div>
  );
};

export default SettingsPanel;