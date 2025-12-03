import React from 'react';
import { Bit } from '../types';
import { Drill, Trash2, Plus } from 'lucide-react';

interface BitsPanelProps {
  bits: Bit[];
  setBits: (bits: Bit[]) => void;
}

const BitsPanel: React.FC<BitsPanelProps> = ({ bits, setBits }) => {
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

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)] dark:shadow-none border border-slate-100 dark:border-slate-800 overflow-hidden transition-colors duration-300">
      <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Drill className="w-4 h-4 text-slate-500 dark:text-slate-400" />
          <h2 className="font-bold text-sm text-slate-800 dark:text-slate-200 uppercase tracking-wide">Bit Options</h2>
        </div>
        <button 
          onClick={addBit}
          className="p-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-blue-600 dark:text-blue-400 rounded hover:border-blue-300 dark:hover:border-blue-500 hover:text-blue-700 dark:hover:text-blue-300 transition-colors shadow-sm"
          title="Add Bit Type"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="p-3 grid grid-cols-2 gap-2">
        {bits.map((bit) => (
          <div key={bit.id} className="p-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 relative group hover:border-blue-300 dark:hover:border-blue-600 transition-colors shadow-sm">
            <div className="absolute -top-1.5 -right-1.5 opacity-0 group-hover:opacity-100 transition-all z-10">
               <button 
                onClick={() => removeBit(bit.id)} 
                className="bg-white dark:bg-slate-700 text-red-400 hover:text-red-600 border border-slate-200 dark:border-slate-600 p-1 rounded-full shadow-sm"
               >
                 <Trash2 className="w-2.5 h-2.5" />
               </button>
            </div>
            
            <div className="flex items-center gap-1.5 mb-2">
              <div className="w-2.5 h-2.5 rounded-full ring-1 ring-slate-100 dark:ring-slate-600 shrink-0" style={{ backgroundColor: bit.color }}></div>
              <input 
                value={bit.name}
                onChange={(e) => updateBit(bit.id, 'name', e.target.value)}
                className="bg-transparent font-bold text-xs text-slate-700 dark:text-slate-200 outline-none w-full focus:text-blue-600 dark:focus:text-blue-400 transition-colors truncate"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              {/* Cost */}
              <div>
                <label className="text-[9px] text-slate-400 dark:text-slate-500 uppercase font-bold block mb-0.5">COST ($)</label>
                <div className="bg-slate-50 dark:bg-slate-900 rounded border border-slate-100 dark:border-slate-700 px-1.5 py-1">
                  <input 
                    type="text"
                    value={bit.cost.toLocaleString()}
                    onChange={(e) => handleCostChange(bit.id, e.target.value)}
                    className="w-full text-xs font-semibold bg-transparent outline-none text-slate-700 dark:text-slate-300"
                  />
                </div>
              </div>

              {/* ROP */}
              <div>
                <label className="text-[9px] text-slate-400 dark:text-slate-500 uppercase font-bold block mb-0.5">ROP (m/h)</label>
                <div className="bg-slate-50 dark:bg-slate-900 rounded border border-slate-100 dark:border-slate-700 px-1.5 py-1">
                  <input 
                    type="number"
                    value={bit.rop}
                    onChange={(e) => updateBit(bit.id, 'rop', parseFloat(e.target.value))}
                    className="w-full text-xs font-semibold bg-transparent outline-none text-slate-700 dark:text-slate-300"
                  />
                </div>
              </div>

              {/* Max Dist */}
              <div>
                <label className="text-[9px] text-slate-400 dark:text-slate-500 uppercase font-bold block mb-0.5">MAX DIST (m)</label>
                <div className="bg-slate-50 dark:bg-slate-900 rounded border border-slate-100 dark:border-slate-700 px-1.5 py-1">
                  <input 
                    type="number"
                    value={bit.maxDistance}
                    onChange={(e) => updateBit(bit.id, 'maxDistance', parseFloat(e.target.value))}
                    className="w-full text-xs font-semibold bg-transparent outline-none text-slate-700 dark:text-slate-300"
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