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

  const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

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
      isActive: true,
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
    const isActive = bit.isActive ?? true; // Default to true if undefined

    // In edit mode (mobile), we show handles/delete.
    // On desktop, we always show handles/delete? 
    // Plan said: 
    // Desktop: Handle | Content | Controls (Toggle, Trash)
    // Mobile Normal: Content | Toggle
    // Mobile Edit: Handle | Content | Trash

    // We can use CSS media queries or just use `isEditMode` which is toggled on mobile.
    // Let's assume on desktop `isEditMode` is irrelevant or always effectively "sortable".
    // Actually, making "Edit Mode" only relevant for mobile is cleaner.

    return (
      <div className={clsx(
        "flex items-center gap-2 p-2 border border-slate-200 dark:border-[var(--bh-border)] rounded-lg bg-white dark:bg-[var(--bh-surface-0)] shadow-sm transition-all",
        !isOverlay && !isActive && "opacity-60 grayscale",
        isOverlay && "border-blue-500 ring-2 ring-blue-500/20"
      )}>
        {/* Drag Handle - Visible on Desktop OR (Mobile + EditMode) */}
        <div className={clsx("hidden md:block", isEditMode && "block", !isEditMode && "md:block hidden")}>
          {isOverlay ? (
            <GripVertical className="w-5 h-5 text-slate-400 cursor-grabbing" />
          ) : (
            <DragHandle />
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 grid grid-cols-1 gap-1.5">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: bit.color }}></div>
            <input
              value={bit.name}
              onChange={(e) => updateBit(bit.id, 'name', e.target.value)}
              className="bg-transparent font-bold text-sm text-slate-800 dark:text-[var(--bh-text)] outline-none w-full focus:text-blue-600 dark:focus:text-[var(--bh-primary)] truncate"
              placeholder="Bit Name"
            />
          </div>

          <div className="grid grid-cols-3 gap-2">
            {/* Cost */}
            <div>
              <label className="text-[9px] text-slate-400 dark:text-[var(--bh-text-mute)] uppercase font-bold block">Cost</label>
              <input
                type="text"
                value={bit.cost.toLocaleString()}
                onChange={(e) => handleCostChange(bit.id, e.target.value)}
                className="w-full text-xs font-semibold bg-transparent outline-none text-slate-700 dark:text-[var(--bh-text)]"
              />
            </div>
            {/* ROP */}
            <div>
              <label className="text-[9px] text-slate-400 dark:text-[var(--bh-text-mute)] uppercase font-bold block">ROP ({getSpeedLabel(depthUnit)})</label>
              <input
                type="number"
                value={getDisplayValue(bit.rop)}
                onChange={(e) => handleDepthValueChange(bit.id, 'rop', e.target.value)}
                className="w-full text-xs font-semibold bg-transparent outline-none text-slate-700 dark:text-[var(--bh-text)]"
              />
            </div>
            {/* Max Dist */}
            <div>
              <label className="text-[9px] text-slate-400 dark:text-[var(--bh-text-mute)] uppercase font-bold block">Dist ({getUnitLabel(depthUnit)})</label>
              <input
                type="number"
                value={getDisplayValue(bit.maxDistance)}
                onChange={(e) => handleDepthValueChange(bit.id, 'maxDistance', e.target.value)}
                className="w-full text-xs font-semibold bg-transparent outline-none text-slate-700 dark:text-[var(--bh-text)]"
              />
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-1">
          {/* Toggle Switch - Hidden in Edit Mode on Mobile? Plan said "View 2 (Edit Mode): ... Hide Toggle" */}
          <div className={clsx(isEditMode ? "hidden" : "block")}>
            <button
              onClick={() => updateBit(bit.id, 'isActive', !isActive)}
              className={clsx(
                "w-8 h-4 rounded-full relative transition-colors duration-200 ease-in-out font-sans",
                isActive ? "bg-blue-500" : "bg-slate-300 dark:bg-slate-600"
              )}
              title={isActive ? "Deactivate" : "Activate"}
            >
              <span className={clsx(
                "absolute top-0.5 left-0.5 w-3 h-3 bg-white rounded-full shadow-sm transform transition-transform duration-200 ease-in-out",
                isActive ? "translate-x-4" : "translate-x-0"
              )} />
            </button>
          </div>

          {/* Delete Button - Visible on Desktop OR (Mobile + EditMode) */}
          <div className={clsx("hidden md:block", isEditMode && "block", !isEditMode && "md:block hidden")}>
            <button
              onClick={() => removeBit(bit.id)}
              className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
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