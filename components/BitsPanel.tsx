import React, { useRef, useState, useCallback, useMemo } from 'react';
import { Bit } from '../types';
import { Drill, Trash2, Plus, Edit, Check, GripVertical } from 'lucide-react';
import { DepthUnit, convertDepth, convertDepthToMeters, getUnitLabel, getSpeedLabel } from '../utils/unitUtils';
import clsx from 'clsx';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragOverlay,
  TouchSensor,
  MouseSensor,
  DropAnimation,
  defaultDropAnimationSideEffects,
  MeasuringStrategy
} from '@dnd-kit/core';
import { restrictToVerticalAxis, restrictToWindowEdges } from '@dnd-kit/modifiers';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { SortableItem, DragHandle } from './ui/SortableItem';
import { UndoToast } from './ui/UndoToast';
import NumericInput from './ui/NumericInput';

interface BitsPanelProps {
  bits: Bit[];
  setBits: (bits: Bit[]) => void;
  onRemoveBit: (id: string) => void;
  depthUnit: DepthUnit;
}

const BitsPanel: React.FC<BitsPanelProps> = ({ bits, setBits, onRemoveBit, depthUnit }) => {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [deletedBit, setDeletedBit] = useState<Bit | null>(null);
  const [undoToastVisible, setUndoToastVisible] = useState(false);

  // Sensors for DnD
  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: {
        distance: 3,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 200,
        tolerance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Dark color scheme for bits
  const colors = ['#1e40af', '#047857', '#b45309', '#b91c1c', '#6d28d9', '#0f766e', '#9333ea', '#c2410c'];

  const updateBit = (id: string, field: keyof Bit, value: any) => {
    setBits(bits.map(b => b.id === id ? { ...b, [field]: value } : b));
  };

  const addBit = () => {
    const newId = `custom-${Date.now()}`;
    const newBit: Bit = {
      id: newId,
      name: `New Bit`,
      cost: 10000,
      rop: 5,
      maxDistance: 200,
      color: colors[bits.length % colors.length],
      order: bits.length,
    };
    setBits([...bits, newBit]);
  };

  const removeBit = (id: string) => {
    if (bits.length <= 1) return;

    const bitToRemove = bits.find(b => b.id === id);
    if (bitToRemove) {
      setDeletedBit(bitToRemove);
      onRemoveBit(id);
      setUndoToastVisible(true);
    }
  };

  const undoDelete = () => {
    if (deletedBit) {
      setBits([...bits, deletedBit]);
      setDeletedBit(null);
      setUndoToastVisible(false);
    }
  };

  const handleDragStart = useCallback((event: { active: { id: string | number } }) => {
    setActiveId(String(event.active.id));
  }, []);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = bits.findIndex((item) => item.id === String(active.id));
      const newIndex = bits.findIndex((item) => item.id === String(over.id));

      if (oldIndex !== -1 && newIndex !== -1) {
        const newItems = arrayMove(bits, oldIndex, newIndex);
        const updatedItems = newItems.map((item, index) => ({ ...item as any, order: index }));
        setBits(updatedItems);
      }
    }
    setActiveId(null);
  }, [bits, setBits]);

  const handleDepthValueChange = (id: string, field: 'rop' | 'maxDistance', value: number) => {
    const metersValue = convertDepthToMeters(value, depthUnit);
    updateBit(id, field, metersValue);
  };

  const formatCost = (val: number) => val.toLocaleString();
  const parseCost = (val: string) => parseFloat(val.replace(/,/g, ''));

  const formatDepthValue = (val: number) => {
    const converted = convertDepth(val, depthUnit);
    return Number.isInteger(converted) ? converted.toString() : converted.toFixed(2);
  };
  const parseDepthValue = (val: string) => parseFloat(val);

  // Render Item Component
  const renderBitRow = (bit: Bit, isOverlay = false) => {
    return (
      <div className={clsx(
        "border border-slate-200 dark:border-[var(--bh-border)] rounded-lg bg-white dark:bg-[var(--bh-surface-0)] shadow-sm transition-all",
        isOverlay && "border-blue-500 ring-2 ring-blue-500/20"
      )}>
        {/* Header with drag handle, bit name, and delete - bit color background */}
        <div 
          className="flex items-center gap-2 px-2 py-2 rounded-t-lg"
          style={{ backgroundColor: `${bit.color}B3` }} // B3 = ~70% opacity in hex
        >
          {/* Drag Handle - no wrapper div to avoid pointer event interference */}
          {isOverlay ? (
            <div className="shrink-0 p-1 flex items-center justify-center">
              <GripVertical className="w-5 h-5 text-white/80 cursor-grabbing" />
            </div>
          ) : (
            <DragHandle className="shrink-0 text-white/80 hover:text-white z-10 relative" />
          )}

          {/* Bit Name - centered both horizontally and vertically */}
          <div className="flex-1 min-w-0 flex items-center justify-center">
            <textarea
              value={bit.name}
              onChange={(e) => updateBit(bit.id, 'name', e.target.value)}
              className="w-full bg-transparent font-bold text-sm text-white outline-none focus:text-blue-200 resize-none overflow-hidden leading-snug text-center py-0"
              placeholder="Bit Name"
              rows={1}
              onInput={(e) => {
                const target = e.target as HTMLTextAreaElement;
                target.style.height = 'auto';
                target.style.height = target.scrollHeight + 'px';
              }}
              style={{ height: 'auto' }}
            />
          </div>

          {/* Delete Button */}
          <button
            onClick={() => removeBit(bit.id)}
            className="p-1 text-white/70 hover:text-white hover:bg-white/20 rounded transition-colors shrink-0"
            title="Remove Bit"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-2">
          <div className="grid grid-cols-2 gap-2">
            {/* ROP */}
            <div>
              <label className="text-[9px] text-slate-400 dark:text-[var(--bh-text-mute)] uppercase font-bold block mb-0.5">ROP ({getSpeedLabel(depthUnit)})</label>
              <NumericInput
                value={convertDepth(bit.rop, depthUnit)}
                onChange={(val) => handleDepthValueChange(bit.id, 'rop', val)}
                formatDisplay={formatDepthValue}
                parseInput={parseDepthValue}
                className="w-full text-xs font-semibold bg-transparent outline-none text-slate-700 dark:text-[var(--bh-text)]"
              />
            </div>
            {/* Max Dist */}
            <div>
              <label className="text-[9px] text-slate-400 dark:text-[var(--bh-text-mute)] uppercase font-bold block mb-0.5">Dist ({getUnitLabel(depthUnit)})</label>
              <NumericInput
                value={convertDepth(bit.maxDistance, depthUnit)}
                onChange={(val) => handleDepthValueChange(bit.id, 'maxDistance', val)}
                formatDisplay={formatDepthValue}
                parseInput={parseDepthValue}
                className="w-full text-xs font-semibold bg-transparent outline-none text-slate-700 dark:text-[var(--bh-text)]"
              />
            </div>
            {/* Cost */}
            <div className="col-span-2">
              <label className="text-[9px] text-slate-400 dark:text-[var(--bh-text-mute)] uppercase font-bold block mb-0.5">Cost</label>
              <NumericInput
                value={bit.cost}
                onChange={(val) => updateBit(bit.id, 'cost', val)}
                formatDisplay={formatCost}
                parseInput={parseCost}
                className="w-full text-xs font-semibold bg-transparent outline-none text-slate-700 dark:text-[var(--bh-text)]"
              />
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="bg-white/40 dark:bg-[var(--bh-surface-0)]/40 backdrop-blur-sm rounded-2xl border border-slate-200 dark:border-[var(--bh-border)] overflow-hidden transition-all duration-300 shadow-sm hover:shadow-md flex flex-col h-full">
      <div className="px-3 py-3 border-b border-slate-100 dark:border-[var(--bh-border)] bg-slate-50/50 dark:bg-[var(--bh-surface-1)] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Drill className="w-4 h-4 text-slate-500 dark:text-[var(--bh-text-mute)]" />
          <h2 className="font-bold text-[11px] text-slate-800 dark:text-[var(--bh-text)] uppercase tracking-wider">Bit Options</h2>
        </div>

        <div className="flex items-center gap-2">
          {/* Mobile Edit Toggle */}


          <button
            onClick={addBit}
            className="p-1.5 bg-white dark:bg-[var(--bh-surface-2)] border border-slate-200 dark:border-[var(--bh-border)] text-blue-600 dark:text-[var(--bh-primary)] rounded hover:border-blue-300 dark:hover:border-[var(--bh-accent)] hover:text-blue-700 dark:hover:text-[var(--bh-accent)] transition-colors shadow-sm"
            title="Add Bit Type"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        measuring={{
          droppable: {
            strategy: MeasuringStrategy.Always,
          },
        }}
        modifiers={[restrictToWindowEdges]}
      >
        <div className="px-2 py-3 flex-1 overflow-y-auto">
          <SortableContext
            items={bits.map(b => b.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-2">
              {bits.map((bit) => (
                <div key={`bit-${bit.id}`}>
                  <SortableItem id={bit.id} trigger="handle">
                    {renderBitRow(bit)}
                  </SortableItem>
                </div>
              ))}
            </div>
          </SortableContext>
        </div>
        <DragOverlay dropAnimation={null}>
          {activeId ? (
            <div className="w-[280px] cursor-grabbing">
              {renderBitRow(bits.find(b => b.id === activeId)!, true)}
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      <UndoToast
        isVisible={undoToastVisible}
        message="Bit deleted"
        onUndo={undoDelete}
        onClose={() => setUndoToastVisible(false)}
      />
    </div>
  );
};

export default BitsPanel;
