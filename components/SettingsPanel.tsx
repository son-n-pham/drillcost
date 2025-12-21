import React from 'react';
import { GlobalParams } from '../types';
import { Settings, DollarSign, Clock, ArrowDownToLine, MoveVertical, RefreshCw } from 'lucide-react';
import { DepthUnit, convertDepth, convertDepthToMeters, getUnitLabel } from '../utils/unitUtils';
import NumericInput from './ui/NumericInput';

interface SettingsPanelProps {
  params: GlobalParams;
  setParams: (p: GlobalParams) => void;
  depthUnit: DepthUnit;
}

const SettingsPanel: React.FC<SettingsPanelProps> = ({ params, setParams, depthUnit }) => {
  const handleParamChange = (key: keyof GlobalParams, value: number) => {
    setParams({ ...params, [key]: value });
  };

  const handleDepthParamChange = (key: keyof GlobalParams, value: number) => {
    setParams({ ...params, [key]: convertDepthToMeters(value, depthUnit) });
  };

  // Format functions for display
  const formatCurrency = (val: number) => val.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  const formatDepth = (val: number) => {
    const converted = convertDepth(val, depthUnit);
    const rounded = Number.isInteger(converted) ? converted : parseFloat(converted.toFixed(2));
    return rounded.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  };
  const parseCurrency = (val: string) => parseFloat(val.replace(/,/g, ''));
  const parseDepth = (val: string) => parseFloat(val.replace(/,/g, ''));

  return (
    <div className="bg-white/40 dark:bg-[var(--bh-surface-0)]/40 backdrop-blur-sm rounded-2xl border border-slate-200 dark:border-[var(--bh-border)] overflow-hidden transition-all duration-300 shadow-sm hover:shadow-md">
      <div className="px-4 py-3 border-b border-slate-100 dark:border-[var(--bh-border)] bg-slate-50/50 dark:bg-[var(--bh-surface-1)] flex items-center gap-2">
        <Settings className="w-4 h-4 text-slate-500 dark:text-[var(--bh-text-mute)]" />
        <h2 className="font-bold text-[11px] text-slate-800 dark:text-[var(--bh-text)] uppercase tracking-wider">Input Parameters</h2>
      </div>

      <div className="px-3 py-5 space-y-5">
        
        {/* Operation Cost */}
        <div className="group">
          <label className="text-[11px] font-bold text-slate-500 dark:text-[var(--bh-text-weak)] uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
            <DollarSign className="w-3 h-3 text-blue-500 dark:text-[var(--bh-primary)]" /> Operation Rate
          </label>
          <div className="relative">
            <NumericInput
              value={params.operationCostPerDay}
              onChange={(val) => handleParamChange('operationCostPerDay', val)}
              formatDisplay={formatCurrency}
              parseInput={parseCurrency}
              className="input font-semibold text-sm w-full"
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
              <NumericInput
                type="number"
                value={params.tripSpeed}
                onChange={(val) => handleParamChange('tripSpeed', val)}
                className="input font-medium text-sm w-full"
                min={0}
              />
              <span className="absolute right-2 top-2.5 text-slate-400 dark:text-[var(--bh-text-mute)] text-[10px] pointer-events-none">std/hr</span>
            </div>
          </div>
          <div className="group">
            <label className="text-[11px] font-bold text-slate-500 dark:text-[var(--bh-text-weak)] uppercase tracking-wider mb-1.5 block">
               Stand Len
            </label>
            <div className="relative">
              <NumericInput
                value={convertDepth(params.standLength, depthUnit)}
                onChange={(val) => handleDepthParamChange('standLength', val)}
                formatDisplay={formatDepth}
                parseInput={parseDepth}
                className="input font-medium text-sm w-full"
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
              <NumericInput
                value={convertDepth(params.depthIn, depthUnit)}
                onChange={(val) => handleDepthParamChange('depthIn', val)}
                formatDisplay={formatDepth}
                parseInput={parseDepth}
                className="input font-medium text-sm w-full"
              />
              <span className="absolute right-3 top-2.5 text-slate-400 dark:text-[var(--bh-text-mute)] text-xs pointer-events-none">{getUnitLabel(depthUnit)}</span>
            </div>
          </div>

          <div className="group">
            <label className="text-[11px] font-bold text-slate-500 dark:text-[var(--bh-text-weak)] uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <MoveVertical className="w-3 h-3 text-indigo-500 dark:text-[var(--bh-primary)]" /> Interval
            </label>
            <div className="relative">
              <NumericInput
                value={convertDepth(params.intervalToDrill, depthUnit)}
                onChange={(val) => handleDepthParamChange('intervalToDrill', val)}
                formatDisplay={formatDepth}
                parseInput={parseDepth}
                className="input font-medium text-sm w-full"
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
            <NumericInput
              type="number"
              value={params.circulatingHours}
              onChange={(val) => handleParamChange('circulatingHours', val)}
              className="input font-medium text-sm w-full"
              min={0}
            />
            <span className="absolute right-3 top-2.5 text-slate-400 dark:text-[var(--bh-text-mute)] text-xs pointer-events-none">hrs</span>
          </div>
        </div>

      </div>
    </div>
  );
};


export default SettingsPanel;