import React from 'react';
import { Bit } from '../types';
import { Drill, Trash2, Plus } from 'lucide-react';
import { DepthUnit, convertDepth, convertDepthToMeters, getUnitLabel, getSpeedLabel } from '../utils/unitUtils';

interface BitsPanelProps {
  bits: Bit[];
  setBits: (bits: Bit[]) => void;
  depthUnit: DepthUnit;
}

const BitsPanel: React.FC<BitsPanelProps> = ({ bits, setBits, depthUnit }) => {
  const updateBit = (id: string, field: keyof Bit, value: any) => {
    setBits(bits.map(b => b.id === id ? { ...b, [field]: value } : b));
  };

  const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

  const addBit = () => {
    const newId = `custom-${Date.now()}`;
    const newBit: Bit = {
      id: newId,
      name: `New Bit`,
      cost: 10000,
      rop: 5,
      maxDistance: 200,
      color: colors[bits.length % colors.length],
    };
    setBits([...bits, newBit]);
  };

  const removeBit = (id: string) => {
    if (bits.length <= 1) return; 
    setBits(bits.filter(b => b.id !== id));
  };

  const handleCostChange = (id: string, value: string) => {
    const cleanValue = value.replace(/,/g, '');
    if (cleanValue === '') {
        updateBit(id, 'cost', 0);
        return;
    }
    const numValue = parseFloat(cleanValue);
    if (!isNaN(numValue)) {
        updateBit(id, 'cost', numValue);
    }
  };

  const handleDepthValueChange = (id: string, field: 'rop' | 'maxDistance', value: string) => {
    const numValue = parseFloat(value);
    if (!isNaN(numValue)) {
        const metersValue = convertDepthToMeters(numValue, depthUnit);
        updateBit(id, field, metersValue);
    }
  };

  const getDisplayValue = (val: number) => {
    const converted = convertDepth(val, depthUnit);
    return Number.isInteger(converted) ? converted : parseFloat(converted.toFixed(2));
  };

  return (
    <div className="card transition-colors duration-300">
      <div className="px-4 py-3 border-b border-slate-100 dark:border-[var(--bh-border)] bg-slate-50/50 dark:bg-[var(--bh-surface-1)] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Drill className="w-4 h-4 text-slate-500 dark:text-[var(--bh-text-mute)]" />
          <h2 className="font-bold text-sm text-slate-800 dark:text-[var(--bh-text)] uppercase tracking-wide">Bit Options</h2>
        </div>
        <button 
          onClick={addBit}
          className="p-1 bg-white dark:bg-[var(--bh-surface-2)] border border-slate-200 dark:border-[var(--bh-border)] text-blue-600 dark:text-[var(--bh-primary)] rounded hover:border-blue-300 dark:hover:border-[var(--bh-accent)] hover:text-blue-700 dark:hover:text-[var(--bh-accent)] transition-colors shadow-sm"
          title="Add Bit Type"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="p-3 grid grid-cols-2 md:grid-cols-1 xl:grid-cols-2 gap-2">
        {bits.map((bit) => (
          <div key={bit.id} className="p-2 border border-slate-200 dark:border-[var(--bh-border)] rounded-lg bg-white dark:bg-[var(--bh-surface-0)] relative group hover:border-blue-300 dark:hover:border-[var(--bh-primary)] transition-colors shadow-sm">
            <div className="absolute -top-1.5 -right-1.5 opacity-0 group-hover:opacity-100 transition-all z-10">
               <button 
                onClick={() => removeBit(bit.id)} 
                className="bg-white dark:bg-[var(--bh-surface-2)] text-red-400 hover:text-red-600 border border-slate-200 dark:border-[var(--bh-border)] p-1 rounded-full shadow-sm"
               >
                 <Trash2 className="w-2.5 h-2.5" />
               </button>
            </div>
            
            <div className="flex items-center gap-1.5 mb-2">
              <div className="w-2.5 h-2.5 rounded-full ring-1 ring-slate-100 dark:ring-slate-600 shrink-0" style={{ backgroundColor: bit.color }}></div>
              <div className={`w-full ${bit.name.length > 10 ? 'fast-tooltip-below' : ''}`} data-tooltip={bit.name}>
                <input 
                  value={bit.name}
                  onChange={(e) => updateBit(bit.id, 'name', e.target.value)}
                  className="bg-transparent font-bold text-xs text-slate-700 dark:text-[var(--bh-text)] outline-none w-full focus:text-blue-600 dark:focus:text-[var(--bh-primary)] transition-colors truncate"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              {/* Cost */}
              <div>
                <label className="text-[9px] text-slate-400 dark:text-[var(--bh-text-mute)] uppercase font-bold block mb-0.5">COST ($)</label>
                <div className="bg-slate-50 dark:bg-[var(--bh-surface-1)] rounded border border-slate-100 dark:border-[var(--bh-border)] px-1.5 py-1">
                  <input 
                    type="text"
                    value={bit.cost.toLocaleString()}
                    onChange={(e) => handleCostChange(bit.id, e.target.value)}
                    className="w-full text-xs font-semibold bg-transparent outline-none text-slate-700 dark:text-[var(--bh-text)]"
                  />
                </div>
              </div>

              {/* ROP */}
              <div>
                <label className="text-[9px] text-slate-400 dark:text-[var(--bh-text-mute)] uppercase font-bold block mb-0.5">ROP ({getSpeedLabel(depthUnit)})</label>
                <div className="bg-slate-50 dark:bg-[var(--bh-surface-1)] rounded border border-slate-100 dark:border-[var(--bh-border)] px-1.5 py-1">
                  <input 
                    type="number"
                    value={getDisplayValue(bit.rop)}
                    onChange={(e) => handleDepthValueChange(bit.id, 'rop', e.target.value)}
                    className="w-full text-xs font-semibold bg-transparent outline-none text-slate-700 dark:text-[var(--bh-text)]"
                  />
                </div>
              </div>

              {/* Max Dist */}
              <div>
                <label className="text-[9px] text-slate-400 dark:text-[var(--bh-text-mute)] uppercase font-bold block mb-0.5">MAX DIST ({getUnitLabel(depthUnit)})</label>
                <div className="bg-slate-50 dark:bg-[var(--bh-surface-1)] rounded border border-slate-100 dark:border-[var(--bh-border)] px-1.5 py-1">
                  <input 
                    type="number"
                    value={getDisplayValue(bit.maxDistance)}
                    onChange={(e) => handleDepthValueChange(bit.id, 'maxDistance', e.target.value)}
                    className="w-full text-xs font-semibold bg-transparent outline-none text-slate-700 dark:text-[var(--bh-text)]"
                  />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default BitsPanel;