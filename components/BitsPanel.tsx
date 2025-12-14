import React, { useRef, useState, useCallback } from 'react';
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
  defaultDropAnimationSideEffects
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { SortableItem, DragHandle } from './ui/SortableItem';
import { UndoToast } from './ui/UndoToast';

interface BitsPanelProps {
  bits: Bit[];
  setBits: (bits: Bit[]) => void;
  depthUnit: DepthUnit;
}

const BitsPanel: React.FC<BitsPanelProps> = ({ bits, setBits, depthUnit }) => {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [deletedBit, setDeletedBit] = useState<Bit | null>(null);
  const [undoToastVisible, setUndoToastVisible] = useState(false);

  // Sensors for DnD
  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: {
        distance: 10,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 250,
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
    // if (bits.length <= 1) return; // Allow deleting all? Maybe better to keep one? User said "moved, activated, deleted seamlessly". Let's allow deleting all but maybe show empty state.
    // Actually existing logic prevented deleting last one.
    if (bits.length <= 1) {
      // Maybe shake or show warning?
      return;
    }

    const bitToRemove = bits.find(b => b.id === id);
    if (bitToRemove) {
      setDeletedBit(bitToRemove);
      setBits(bits.filter(b => b.id !== id));
      setUndoToastVisible(true);
    }
  };

  const undoDelete = () => {
    if (deletedBit) {
      // Re-insert at original order or append? 
      // Original order logic is tricky if others moved. 
      // Simple approach: append or try to respect `order` if manageable. 
      // For now, let's just append to end or start, or we need to track index.
      // Re-adding it back:
      setBits([...bits, deletedBit]);
      setDeletedBit(null);
      setUndoToastVisible(false);
    }
  };

  const handleDragStart = (event: any) => {
    setActiveId(event.active.id);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setBits((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);

        // Update order field if we want to persist it cleanly (optional)
        const newItems = arrayMove(items, oldIndex, newIndex);
        return newItems.map((item, index) => ({ ...item, order: index }));
      });
    }
    setActiveId(null);
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

  // Render Item Component
  const renderBitRow = (bit: Bit, isOverlay = false) => {
    return (
      <div className={clsx(
        "border border-slate-200 dark:border-[var(--bh-border)] rounded-lg bg-white dark:bg-[var(--bh-surface-0)] shadow-sm transition-all overflow-hidden",
        isOverlay && "border-blue-500 ring-2 ring-blue-500/20"
      )}>
        {/* Header with drag handle, bit name, and delete - bit color background */}
        <div 
          className="flex items-center gap-2 px-2 py-2"
          style={{ backgroundColor: bit.color, opacity: 0.7 }}
        >
          {/* Drag Handle */}
          <div className={clsx(
            "hidden md:flex shrink-0",
            isEditMode && "flex",
            !isEditMode && "md:flex hidden"
          )}>
            {isOverlay ? (
              <GripVertical className="w-4 h-4 text-white/80 cursor-grabbing" />
            ) : (
              <DragHandle className="text-white/80 hover:text-white p-0" />
            )}
          </div>

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
            className={clsx(
              "p-1 text-white/70 hover:text-white hover:bg-white/20 rounded transition-colors shrink-0",
              "hidden md:block",
              isEditMode && "block",
              !isEditMode && "md:block hidden"
            )}
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
              <input
                type="number"
                value={getDisplayValue(bit.rop)}
                onChange={(e) => handleDepthValueChange(bit.id, 'rop', e.target.value)}
                className="w-full text-xs font-semibold bg-transparent outline-none text-slate-700 dark:text-[var(--bh-text)]"
              />
            </div>
            {/* Max Dist */}
            <div>
              <label className="text-[9px] text-slate-400 dark:text-[var(--bh-text-mute)] uppercase font-bold block mb-0.5">Dist ({getUnitLabel(depthUnit)})</label>
              <input
                type="number"
                value={getDisplayValue(bit.maxDistance)}
                onChange={(e) => handleDepthValueChange(bit.id, 'maxDistance', e.target.value)}
                className="w-full text-xs font-semibold bg-transparent outline-none text-slate-700 dark:text-[var(--bh-text)]"
              />
            </div>
            {/* Cost */}
            <div className="col-span-2">
              <label className="text-[9px] text-slate-400 dark:text-[var(--bh-text-mute)] uppercase font-bold block mb-0.5">Cost</label>
              <input
                type="text"
                value={bit.cost.toLocaleString()}
                onChange={(e) => handleCostChange(bit.id, e.target.value)}
                className="w-full text-xs font-semibold bg-transparent outline-none text-slate-700 dark:text-[var(--bh-text)]"
              />
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="card h-full flex flex-col">
      <div className="px-4 py-3 border-b border-slate-100 dark:border-[var(--bh-border)] bg-slate-50/50 dark:bg-[var(--bh-surface-1)] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Drill className="w-4 h-4 text-slate-500 dark:text-[var(--bh-text-mute)]" />
          <h2 className="font-bold text-sm text-slate-800 dark:text-[var(--bh-text)] uppercase tracking-wide">Bit Options</h2>
        </div>

        <div className="flex items-center gap-2">
          {/* Mobile Edit Toggle */}
          <button
            onClick={() => setIsEditMode(!isEditMode)}
            className="md:hidden p-1.5 text-slate-500 hover:text-blue-600 dark:text-[var(--bh-text-weak)] dark:hover:text-[var(--bh-primary)] rounded transition-colors"
          >
            {isEditMode ? <Check className="w-4 h-4" /> : <Edit className="w-4 h-4" />}
          </button>

          <button
            onClick={addBit}
            className="p-1.5 bg-white dark:bg-[var(--bh-surface-2)] border border-slate-200 dark:border-[var(--bh-border)] text-blue-600 dark:text-[var(--bh-primary)] rounded hover:border-blue-300 dark:hover:border-[var(--bh-accent)] hover:text-blue-700 dark:hover:text-[var(--bh-accent)] transition-colors shadow-sm"
            title="Add Bit Type"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="p-3 flex-1 overflow-y-auto">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={bits.map(b => b.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-2">
              {bits.map((bit) => (
                <SortableItem key={bit.id} id={bit.id}>
                  {renderBitRow(bit)}
                </SortableItem>
              ))}
            </div>
          </SortableContext>
          <DragOverlay dropAnimation={null}>
            {activeId ? renderBitRow(bits.find(b => b.id === activeId)!, true) : null}
          </DragOverlay>
        </DndContext>
      </div>

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