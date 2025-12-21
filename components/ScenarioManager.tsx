import React, { useState, useRef, useEffect, useCallback } from 'react';
import ReactDOM from 'react-dom';
import { Bit, ScenarioConfig, ScenarioResult, GlobalParams, BitSequenceEntry } from '../types';
import { Plus, Trash2, BarChart3, BookOpen, CheckCircle2, AlertTriangle, ChevronRight, X, GitCompareArrows, Square, CheckSquare, Layers, Sparkles, GripVertical, MessageSquare, PanelLeftOpen } from 'lucide-react';
import clsx from 'clsx';
import { DepthUnit, convertDepth, getUnitLabel, getSpeedLabel, METERS_TO_FEET } from '../utils/unitUtils';
import { getScenarioColor } from '../utils/scenarioColors';
import { optimizeBitStrategy } from '../utils/optimizer';
import { useTouchSelection, isTouchDevice } from '../hooks/useTouchInteraction';
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
  MeasuringStrategy
} from '@dnd-kit/core';
import { restrictToWindowEdges } from '@dnd-kit/modifiers';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
  verticalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { UndoToast } from './ui/UndoToast';
import { SortableItem, DragHandle } from './ui/SortableItem';
import NumericInput from './ui/NumericInput';

const hexToRgba = (hex: string, alpha: number) => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

interface ScenarioManagerProps {
  bits: Bit[];
  scenarios: ScenarioConfig[];
  setScenarios: (s: ScenarioConfig[]) => void;
  results: ScenarioResult[];
  params: GlobalParams;
  depthUnit: DepthUnit;
  compareSelections: string[];
  setCompareSelections: (selections: string[]) => void;
  isCompareMode: boolean;
  setIsCompareMode: (isCompareMode: boolean) => void;
  children?: React.ReactNode;
  isScrolled?: boolean;
  isSidebarOpen?: boolean;
  setIsSidebarOpen?: (open: boolean) => void;
}

const ScenarioManager: React.FC<ScenarioManagerProps> = ({ bits, scenarios, setScenarios, results, params, depthUnit, compareSelections, setCompareSelections, isCompareMode, setIsCompareMode, children, isScrolled = false, isSidebarOpen = true, setIsSidebarOpen }) => {
  const [activeTab, setActiveTab] = useState<string>(scenarios[0]?.id || '');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState<'bottom' | 'top'>('bottom');
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dropdownContentRef = useRef<HTMLDivElement>(null);
  // Use compareSelections from props instead of local state
  const selectedForComparison = compareSelections;
  const setSelectedForComparison = setCompareSelections;
  const [diffType, setDiffType] = useState<'percentage' | 'absolute'>('percentage');
  const [isOptimizing, setIsOptimizing] = useState(false);

  // Mobile Edit Mode
  const [isEditMode, setIsEditMode] = useState(false);
  const [activeDragId, setActiveDragId] = useState<string | null>(null);

  // Undo Toast
  const [toast, setToast] = useState<{ message: string; onUndo: () => void } | null>(null);

  // Scenario Detail Zoom State
  const [isScenarioZoomed, setIsScenarioZoomed] = useState(false);
  const zoomModalRef = useRef<HTMLDivElement>(null);
  const [scenarioToDelete, setScenarioToDelete] = useState<string | null>(null);

  const handleUndo = useCallback(() => {
    if (toast) {
      toast.onUndo();
      setToast(null);
    }
  }, [toast]);

  // Scenario Zoom Modal handlers
  const closeZoomModal = useCallback(() => {
    setIsScenarioZoomed(false);
  }, []);

  const handleModalBackdropClick = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      closeZoomModal();
    }
  }, [closeZoomModal]);

  // Handle escape key to close zoom modal
  useEffect(() => {
    const handleEscKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isScenarioZoomed) {
        closeZoomModal();
      }
    };
    document.addEventListener('keydown', handleEscKey);
    
    // Lock body scroll when zoomed
    if (isScenarioZoomed) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.removeEventListener('keydown', handleEscKey);
      document.body.style.overflow = '';
    };
  }, [isScenarioZoomed, closeZoomModal]);

  // Touch support: track which items are "selected" to show delete button
  const touchCardSelection = useTouchSelection<string | null>(null);
  const touchBitSelection = useTouchSelection<number | null>(null);
  const isTouch = isTouchDevice();

  // Dnd Sensors
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 10 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  // Custom modifier to compensate for scroll position inside the zoomed modal
  // This fixes the drag overlay offset issue when inside a scrollable portal container
  const scrollCompensationModifier = useCallback(
    ({ transform }: { transform: { x: number; y: number; scaleX: number; scaleY: number } }) => {
      if (isScenarioZoomed && zoomModalRef.current) {
        const scrollTop = zoomModalRef.current.scrollTop;
        const scrollLeft = zoomModalRef.current.scrollLeft;
        
        return {
          ...transform,
          x: transform.x - scrollLeft,
          y: transform.y - scrollTop,
        };
      }
      return transform;
    },
    [isScenarioZoomed]
  );

  const stickyHeaderRef = useRef<HTMLDivElement>(null);
  const detailsRef = useRef<HTMLDivElement>(null);
  const isFirstRun = useRef(true);
  const [stickyOffset, setStickyOffset] = useState(280); // Default fallback

  useEffect(() => {
    const updateOffset = () => {
      if (stickyHeaderRef.current) {
        // top-16 is 4rem = 64px
        // logic: 64px (sticky top) + container height
        const height = stickyHeaderRef.current.offsetHeight;
        setStickyOffset(height + 64);
      }
    };

    // Update initially and on resize/changes
    updateOffset();
    const resizeObserver = new ResizeObserver(updateOffset);
    if (stickyHeaderRef.current) {
      resizeObserver.observe(stickyHeaderRef.current);
    }

    return () => resizeObserver.disconnect();
  }, [scenarios.length, isScrolled, isCompareMode]); // Re-calculate when layout shifting props change

  // Scroll to details when active scenario changes
  useEffect(() => {
    if (isFirstRun.current) {
      isFirstRun.current = false;
      return;
    }

    if (!isCompareMode && activeTab && detailsRef.current) {
      // Check if we are on desktop (md breakpoint is usually 768px)
      const isDesktop = window.matchMedia('(min-width: 768px)').matches;

      // App Header is 64px (h-16)
      const headerHeight = 64;

      // On desktop, the scenario cards container is sticky.
      // On mobile, it is not sticky.
      const stickyHeight = isDesktop && stickyHeaderRef.current
        ? stickyHeaderRef.current.offsetHeight
        : 0;

      // Calculate total offset
      const totalOffset = headerHeight + stickyHeight + 20; // +20 for some breathing room

      detailsRef.current.style.scrollMarginTop = `${totalOffset}px`;
      detailsRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [activeTab, isCompareMode]);

  // Clean up stale selections when entering compare mode or when scenarios change
  useEffect(() => {
    if (isCompareMode) {
      const validScenarioIds = new Set(scenarios.map(s => s.id));
      const validSelections = selectedForComparison.filter(id => validScenarioIds.has(id));
      if (validSelections.length !== selectedForComparison.length) {
        setSelectedForComparison(validSelections);
      }
    }
  }, [isCompareMode, scenarios, selectedForComparison, setSelectedForComparison]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        (dropdownRef.current && dropdownRef.current.contains(target)) ||
        (dropdownContentRef.current && dropdownContentRef.current.contains(target))
      ) {
        return;
      }
      setIsDropdownOpen(false);
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
    const prevScenarios = [...scenarios];
    const newScens = scenarios.filter(s => s.id !== id);
    setScenarios(newScens);
    if (activeTab === id) setActiveTab(newScens[0]?.id || '');

    setToast({
      message: 'Scenario deleted',
      onUndo: () => {
        setScenarios(prevScenarios);
        setActiveTab(id);
      }
    });
  };

  const updateScenario = (id: string, updates: Partial<ScenarioConfig>) => {
    setScenarios(scenarios.map(s => s.id === id ? { ...s, ...updates } : s));
  };

  const addToSequence = (scenarioId: string, bitId: string, isRerun?: boolean, maxOverride?: number) => {
  const s = scenarios.find(x => x.id === scenarioId);
  const bit = bits.find(b => b.id === bitId);
  if (s && bit) {
    const newEntry: BitSequenceEntry = {
      bitId: bitId,
      actualDistance: maxOverride ?? bit.maxDistance,
      comment: '',
      isRerun: isRerun,
      maxDistanceOverride: maxOverride
    };
    updateScenario(scenarioId, { bitSequence: [...s.bitSequence, newEntry] });
    setIsDropdownOpen(false);
  }
};

  const updateDropdownPosition = useCallback(() => {
    if (isDropdownOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const dropdownHeight = 320; // Approximate max height of dropdown

      const newPosition = (spaceBelow < dropdownHeight && rect.top > dropdownHeight) ? 'top' : 'bottom';
      setDropdownPosition(newPosition);

      // Width calculation: use button width if it's large, otherwise default to 256px
      const width = Math.max(rect.width, 256);

      setDropdownStyle({
        position: 'fixed',
        top: newPosition === 'top' ? rect.top - 8 : rect.bottom + 8,
        left: rect.left,
        width: `${width}px`,
        transform: newPosition === 'top' ? 'translateY(-100%)' : 'none',
        zIndex: 9999,
      });
    }
  }, [isDropdownOpen]);

  useEffect(() => {
    if (isDropdownOpen) {
      updateDropdownPosition();
      // Use capture phase for scroll to catch scrolls from the modal too
      window.addEventListener('scroll', updateDropdownPosition, true);
      window.addEventListener('resize', updateDropdownPosition);
      return () => {
        window.removeEventListener('scroll', updateDropdownPosition, true);
        window.removeEventListener('resize', updateDropdownPosition);
      };
    }
  }, [isDropdownOpen, updateDropdownPosition]);

  const toggleDropdown = () => {
    setIsDropdownOpen(!isDropdownOpen);
  };

  const removeFromSequence = (scenarioId: string, index: number) => {
    const s = scenarios.find(x => x.id === scenarioId);
    if (s) {
      const prevSeq = [...s.bitSequence];
      const newSeq = [...s.bitSequence];
      newSeq.splice(index, 1);
      updateScenario(scenarioId, { bitSequence: newSeq });

      setToast({
        message: 'Bit removed from sequence',
        onUndo: () => {
          updateScenario(scenarioId, { bitSequence: prevSeq });
        }
      });
    }
  };

  // Handler for updating a sequence entry's actual distance or comment
  const updateSequenceEntry = (scenarioId: string, index: number, updates: Partial<BitSequenceEntry>) => {
    const s = scenarios.find(x => x.id === scenarioId);
    if (s) {
      const newSeq = [...s.bitSequence];
      newSeq[index] = { ...newSeq[index], ...updates };
      updateScenario(scenarioId, { bitSequence: newSeq });
    }
  };

  const activeResult = results.find(r => r.id === activeTab);
  const activeScenario = scenarios.find(s => s.id === activeTab);

  const toggleCompareSelection = (id: string) => {
    setSelectedForComparison(prev => {
      if (prev.includes(id)) {
        return prev.filter(x => x !== id);
      }
      if (prev.length < 2) {
        return [...prev, id];
      }
      // Replace the oldest selection with the new one
      return [prev[1], id];
    });
  };

  const currentSequenceCapacity = activeScenario
    ? activeScenario.bitSequence.reduce((acc, entry) => {
      return acc + (entry.actualDistance ?? 0);
    }, 0)
    : 0;

  const isTargetReached = currentSequenceCapacity >= params.intervalToDrill;
  const progressPercent = Math.min((currentSequenceCapacity / params.intervalToDrill) * 100, 100);

  // Helper for display values
  const displayDepth = (val: number) => convertDepth(val, depthUnit).toLocaleString(undefined, { maximumFractionDigits: 0 });
  const displayCostPerUnit = (costPerMeter: number) => {
    const val = depthUnit === 'm' ? costPerMeter : costPerMeter / METERS_TO_FEET;
    return val;
  };

  const exitCompareMode = () => {
    setIsCompareMode(false);
    // Preserve selections so they're available when re-entering compare mode
  };

  const handleAutoOptimize = () => {
    if (bits.length === 0) return;

    setIsOptimizing(true);

    // Use setTimeout to allow UI to update before running optimization
    setTimeout(() => {
      try {
        const result = optimizeBitStrategy(params, bits);

        if (result && result.bitSequence.length > 0) {
          const newId = `scen-opt-${Date.now()}`;
          const newScenario: ScenarioConfig = {
            id: newId,
            name: `Optimized Strategy ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`,
            bitSequence: result.bitSequence,
          };
          setScenarios(prev => [...prev, newScenario]);
          setActiveTab(newId);
        }
      } finally {
        setIsOptimizing(false);
      }
    }, 50);
  };

  // Dnd Handlers
  const handleDragStart = useCallback((event: { active: { id: string | number } }) => {
    setActiveDragId(String(event.active.id));
  }, []);

  const handleScenarioDragEnd = useCallback((event: DragEndEvent) => {
    setActiveDragId(null);
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = scenarios.findIndex(s => s.id === active.id);
      const newIndex = scenarios.findIndex(s => s.id === over.id);
      setScenarios(arrayMove(scenarios, oldIndex, newIndex));
    }
  }, [scenarios, setScenarios]);

  const handleBitSequenceDragEnd = useCallback((event: DragEndEvent) => {
    setActiveDragId(null);
    if (!activeScenario) return;
    const { active, over } = event;

    if (over && active.id !== over.id) {
      // IDs are suffixed with index or unique? 
      // In the render loop, bitId is just the ID string. This is problematic if multiple bits of same type exist!
      // The render key was `${bitId}-${idx}`.
      // We MUST use unique IDs for Sortable items.
      // `active.id` will be the unique key. 

      // Wait, `arrayMove` needs indices.
      // I should set the SortableItem id to be the index or a unique string represented by index?
      // Actually, dnd-kit recommends unique IDs. 
      // Since `bitSequence` is an array of strings (IDs) and can have duplicates, using the bit ID as the sortable ID is WRONG.
      // I must use a unique identifier for each position.
      // I can use `${bitId}-${index}` as the ID.

      const oldId = String(active.id);
      const newId = String(over.id);

      // Extract indices from IDs if I use `${bitId}-${index}` strategy.
      // Or better: just use the `index` as the ID? dnd-kit supports number IDs.
      // But `useSortable({id: ...})` expects strings usually or unique numbers.
      // If I use index as ID, it might be tricky during reorder.
      // Best practice: Wrap the `bit sequence` items in objects with unique IDs, OR generate unique IDs on the fly.
      // Since I can't easily change the data structure of `bitSequence` (array of strings) globally right now without breaking things,
      // I will use `${bitId}-${index}` as the Sortable ID.

      const oldIndex = parseInt(oldId.split('::').pop() || '-1');
      const newIndex = parseInt(newId.split('::').pop() || '-1');

      if (oldIndex !== -1 && newIndex !== -1) {
        const newSeq = arrayMove(activeScenario.bitSequence, oldIndex, newIndex) as BitSequenceEntry[];
        updateScenario(activeScenario.id, { bitSequence: newSeq });
      }
    }
  }, [activeScenario, updateScenario]);


  const comparisonResults = selectedForComparison
    .map(id => results.find(r => r.id === id))
    .filter((r): r is ScenarioResult => !!r);

  const renderSequenceItem = (bit: Bit, entry: BitSequenceEntry, idx: number, isOverlay = false) => {
    const hasComment = entry.comment && entry.comment.trim().length > 0;
    const isActualDistReduced = entry.actualDistance < bit.maxDistance;
    const isActualROPMonitored = entry.actualROP !== undefined && entry.actualROP !== bit.rop;
    
    const effectiveMaxDistance = entry.maxDistanceOverride ?? bit.maxDistance;
    
    return (
      <div className="w-full flex items-center">
        <div className={clsx(
          "relative group border transition-all rounded-lg p-2 pr-7 flex flex-col gap-1 flex-1 min-w-0 bg-white dark:bg-[var(--bh-surface-0)]",
          isOverlay 
            ? "border-blue-500 shadow-2xl ring-2 ring-blue-500/20 cursor-grabbing opacity-90"
            : `border-slate-200 dark:border-[var(--bh-border)] hover:border-emerald-400 dark:hover:border-[var(--bh-primary)] hover:shadow-md ${touchBitSelection.isSelected(idx) ? "ring-2 ring-blue-400" : ""}`
        )}>
          {/* Top row: drag handle + bit name */}
          <div className="flex items-center gap-2">
            {isOverlay ? (
             <div className="p-4 flex items-center justify-center">
               <GripVertical className="flex-shrink-0 w-5 h-5" style={{ color: bit.color }} />
             </div>
            ) : (
              <DragHandle className="flex-shrink-0" style={{ color: bit.color }} />
            )}
            
            <div className="min-w-0 flex-1 flex items-center gap-1.5">
              <div className="font-bold text-xs text-slate-800 dark:text-[var(--bh-text)] truncate" title={bit.name}>{bit.name}</div>
              {entry.isRerun && (
                <span className="text-[8px] font-bold bg-amber-500 text-white px-1 py-0.5 rounded uppercase leading-none shrink-0">Rerun</span>
              )}
            </div>
            
            {/* Comment indicator */}
            {hasComment && (
              <div className="flex-shrink-0 text-amber-500 dark:text-amber-400" title={entry.comment}>
                <MessageSquare className="w-3 h-3" />
              </div>
            )}
          </div>
          
          {/* Actual distance & ROP inputs - wrap to two lines if container is narrow */}
          {!isOverlay && (
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 pl-8 mt-0.5">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] text-slate-405 dark:text-[var(--bh-text-mute)] font-medium">Dist:</span>
                <div className="flex items-center">
                  <NumericInput
                    type="number"
                    min={1}
                    max={Math.round(convertDepth(effectiveMaxDistance, depthUnit))}
                    value={Math.round(convertDepth(entry.actualDistance, depthUnit))}
                    onChange={(val) => {
                      const metersVal = depthUnit === 'ft' ? val / METERS_TO_FEET : val;
                      const clampedVal = Math.max(1, Math.min(metersVal, effectiveMaxDistance));
                      updateSequenceEntry(activeScenario!.id, idx, { actualDistance: clampedVal });
                    }}
                    className={clsx(
                      "w-12 text-[10px] font-bold bg-white dark:bg-slate-800 border-y border-l rounded-l px-1 py-0.5 outline-none text-center transition-colors",
                      isActualDistReduced 
                        ? "border-amber-300 dark:border-amber-500/50 text-amber-700 dark:text-amber-400"
                        : "border-slate-200 dark:border-[var(--bh-border)] text-slate-700 dark:text-[var(--bh-text)]"
                    )}
                  />
                  <div className={clsx(
                    "flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-bold border rounded-r bg-slate-50 dark:bg-slate-900/50",
                    isActualDistReduced ? "border-amber-300 dark:border-amber-500/50 text-amber-600" : "border-slate-200 dark:border-[var(--bh-border)] text-slate-400"
                  )}>
                    <span className="opacity-50">/</span>
                    <span>{displayDepth(effectiveMaxDistance)}</span>
                    <span className="text-[8px] font-normal opacity-70 uppercase tracking-tighter">{getUnitLabel(depthUnit)}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <span className="text-[10px] text-slate-405 dark:text-[var(--bh-text-mute)] font-medium">ROP:</span>
                <div className="flex items-center">
                  <NumericInput
                    type="number"
                    min={0.1}
                    max={1000}
                    value={entry.actualROP ?? bit.rop}
                    onChange={(val) => {
                      updateSequenceEntry(activeScenario!.id, idx, { actualROP: val });
                    }}
                    className={clsx(
                      "w-12 text-[10px] font-bold bg-white dark:bg-slate-800 border-y border-l rounded-l px-1 py-0.5 outline-none text-center transition-colors",
                      isActualROPMonitored
                        ? "border-blue-300 dark:border-blue-500/50 text-blue-700 dark:text-blue-400"
                        : "border-slate-200 dark:border-[var(--bh-border)] text-slate-700 dark:text-[var(--bh-text)]"
                    )}
                  />
                  <div className={clsx(
                    "px-1.5 py-0.5 text-[10px] font-bold border rounded-r bg-slate-50 dark:bg-slate-900/50",
                    isActualROPMonitored ? "border-blue-300 dark:border-blue-500/50 text-blue-600" : "border-slate-200 dark:border-[var(--bh-border)] text-slate-400"
                  )}>
                    <span className="text-[8px] font-normal opacity-70 uppercase tracking-tighter">{getSpeedLabel(depthUnit)}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {/* Comment input - shown when actual distance is reduced */}
          {!isOverlay && isActualDistReduced && (
            <div className="pl-8">
              <input
                type="text"
                value={entry.comment || ''}
                placeholder="Reason for reduced distance..."
                onChange={(e) => {
                  e.stopPropagation();
                  updateSequenceEntry(activeScenario!.id, idx, { comment: e.target.value });
                }}
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => e.stopPropagation()}
                className="w-full text-[10px] bg-transparent border border-dashed border-amber-200 dark:border-amber-500/30 rounded px-1.5 py-0.5 outline-none text-slate-600 dark:text-[var(--bh-text-weak)] placeholder:text-slate-300 dark:placeholder:text-[var(--bh-text-mute)] focus:border-amber-400 dark:focus:border-amber-400"
              />
            </div>
          )}
          
          <span 
            className="absolute -top-1.5 -left-1.5 text-white text-[9px] font-bold w-4 h-4 flex items-center justify-center rounded-full shadow-sm ring-1 ring-white dark:ring-[var(--bh-bg)]"
            style={{ backgroundColor: bit.color }}
          >
            {idx + 1}
          </span>

          {!isOverlay && (
            <button
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => { e.stopPropagation(); removeFromSequence(activeScenario!.id, idx); }}
              className={clsx(
                "absolute right-1 top-2 p-1 text-slate-300 dark:text-[var(--bh-text-mute)] hover:text-red-500 dark:hover:text-[var(--bh-danger)] hover:bg-red-50 dark:hover:bg-[var(--bh-danger)]/10 rounded-md transition-colors"
              )}
            >
              <Trash2 className="w-3 h-3" />
            </button>
          )}
        </div>

        <div className="flex-shrink-0 w-8 flex justify-center text-slate-300 dark:text-[var(--bh-text-mute)]">
          {!isOverlay && <ChevronRight className="w-4 h-4" />}
        </div>
      </div>
    );
  };

  // Helper to render the inner editor content (shared between inline and portal)
  const renderEditorContent = (isZoomed: boolean) => {
    if (!activeScenario) return null;

    return (
      <>
        {/* Zoom indicator - Only show when NOT zoomed */}
        {!isZoomed && (
          <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10 pointer-events-none">
            <div className="p-1.5 rounded-lg bg-slate-100 dark:bg-[var(--bh-surface-2)] text-slate-600 dark:text-[var(--bh-text-weak)]">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 3 21 3 21 9"></polyline>
                <polyline points="9 21 3 21 3 15"></polyline>
                <line x1="21" y1="3" x2="14" y2="10"></line>
                <line x1="3" y1="21" x2="10" y2="14"></line>
              </svg>
            </div>
          </div>
        )}
        {/* Colored accent bar matching the selected scenario */}
        <div
          className="absolute top-0 left-0 w-full h-1"
          style={{ backgroundColor: getScenarioColor(scenarios.findIndex(s => s.id === activeTab)) }}
        ></div>
        {/* Scenario Header */}
        <div className={clsx("px-6 py-5 border-b border-slate-100 dark:border-[var(--bh-border)] flex justify-between items-center bg-slate-50/30 dark:bg-[var(--bh-surface-1)]", isZoomed && "sticky top-0 z-30 backdrop-blur-sm bg-white/80 dark:bg-[var(--bh-surface-0)]/80")}>
          <div className="flex items-center gap-3 w-full max-w-md">
            <div className="p-2 bg-white dark:bg-[var(--bh-surface-0)] border border-slate-200 dark:border-[var(--bh-border)] rounded-lg shadow-sm text-slate-400 dark:text-[var(--bh-text-mute)]">
              <BookOpen className="w-5 h-5" />
            </div>
            <div className="w-full" onClick={(e) => e.stopPropagation()}>
              <input
                className="text-lg font-bold text-slate-800 dark:text-[var(--bh-text)] bg-transparent outline-none w-full placeholder:text-slate-300 dark:placeholder:text-[var(--bh-text-mute)] focus:text-blue-700 dark:focus:text-[var(--bh-primary)] transition-colors"
                value={activeScenario.name}
                onChange={(e) => updateScenario(activeScenario.id, { name: e.target.value })}
                placeholder="Scenario Name"
              />
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={(e) => { 
                 e.stopPropagation(); 
                 setScenarioToDelete(activeScenario.id);
              }}
              className="text-slate-400 dark:text-[var(--bh-text-mute)] hover:text-red-500 dark:hover:text-[var(--bh-danger)] hover:bg-red-50 dark:hover:bg-[var(--bh-surface-2)] p-2 rounded-lg transition-colors group"
              title="Delete Scenario"
            >
              <Trash2 className="w-4 h-4 group-hover:stroke-red-500" />
            </button>
            
            {isZoomed && (
              <>
                <div className="w-px h-6 bg-slate-200 dark:bg-[var(--bh-border)] mx-2" />
                <button
                  onClick={(e) => { e.stopPropagation(); closeZoomModal(); }}
                  className="text-slate-400 dark:text-[var(--bh-text-mute)] hover:text-slate-600 dark:hover:text-[var(--bh-text)] hover:bg-slate-100 dark:hover:bg-[var(--bh-surface-2)] p-2 rounded-lg transition-colors"
                  title="Close Zoom"
                >
                  <X className="w-5 h-5" />
                </button>
              </>
            )}
          </div>
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
                  Current sequence covers <span className="font-bold">{displayDepth(currentSequenceCapacity)}{getUnitLabel(depthUnit)}</span> of the required {displayDepth(params.intervalToDrill)}{getUnitLabel(depthUnit)}.
                  You need <strong>{displayDepth(params.intervalToDrill - currentSequenceCapacity)}{getUnitLabel(depthUnit)}</strong> more.
                </p>
              </div>
            </div>
          )}

          {/* Sequence Builder */}
          <div className="mb-8">
            <div className="flex flex-col sm:flex-row sm:justify-between items-start sm:items-end gap-3 sm:gap-0 mb-4">
              <h4 className="text-sm font-bold text-slate-700 dark:text-[var(--bh-text)] flex items-center gap-2">
                Sequence Strategy
              </h4>
              <div className="flex items-center gap-3 w-full sm:w-auto sm:justify-end">
                <div className="flex flex-col items-start sm:items-end">
                  <span className="text-[10px] text-slate-400 dark:text-[var(--bh-text-mute)] uppercase font-bold tracking-wider">Coverage</span>
                  <span className="text-xs font-mono font-medium text-slate-600 dark:text-[var(--bh-text-weak)]">
                    {displayDepth(currentSequenceCapacity)} / {displayDepth(params.intervalToDrill)}{getUnitLabel(depthUnit)}
                  </span>
                </div>
                <div className="w-32 sm:w-24 h-1.5 bg-slate-100 dark:bg-[var(--bh-border)] rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500 dark:bg-[var(--bh-primary)] rounded-full transition-all duration-500" style={{ width: `${progressPercent}%` }} />
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-stretch">
              {activeScenario.bitSequence.length === 0 && (
                <div className="w-full text-sm text-slate-400 dark:text-[var(--bh-text-mute)] italic px-2 mb-2">No bits added yet. Click "Next Bit" to start.</div>
              )}

              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragStart={handleDragStart}
                onDragEnd={handleBitSequenceDragEnd}
                measuring={{
                  droppable: {
                    strategy: MeasuringStrategy.Always,
                  },
                }}
                modifiers={[restrictToWindowEdges]}
              >
                <SortableContext
                  items={activeScenario.bitSequence.map((entry, i) => `${entry.bitId}::${i}`)}
                  strategy={rectSortingStrategy}
                >
                  {activeScenario.bitSequence.map((entry, idx) => {
                    const bit = bits.find(b => b.id === entry.bitId);
                    if (!bit) return null;
                    const uniqueId = `${entry.bitId}::${idx}`;

                    return (
                      <div 
                        key={uniqueId} 
                        className={clsx(
                          "mb-2 pr-1",
                          // Only go to 4 per row on XL screens when sidebar is collapsed
                          isSidebarOpen ? "w-full md:w-1/2 lg:w-1/3" : "w-full md:w-1/2 lg:w-1/3 xl:w-1/4"
                        )}
                      >
                        <SortableItem
                          id={uniqueId}
                          trigger="handle"
                        >
                          {renderSequenceItem(bit, entry, idx)}
                        </SortableItem>
                      </div>
                    );
                  })}
                </SortableContext>
                <DragOverlay dropAnimation={null} modifiers={[scrollCompensationModifier]}>
                  {activeDragId && activeDragId.includes('::') ? (() => {
                    const [bitId, idxStr] = activeDragId.split('::');
                    const idx = parseInt(idxStr, 10);
                    const bit = bits.find(b => b.id === bitId);
                    const entry = activeScenario?.bitSequence[idx];
                    if (!bit || !entry) return null;
                    
                    return (
                      <div className="w-72 cursor-grabbing">
                        <div className="w-full">
                           {renderSequenceItem(bit, entry, idx, true)}
                        </div>
                      </div>
                    );
                  })() : null}
                </DragOverlay>
              </DndContext>

              {/* Next/Complete Button - sits after the last bit, wraps if needed */}
              <div className="flex items-center mb-2">
                {/* Small spacer if it lands on a new line? No, flex gap handles spacing generally, but we need consistency. 
                    Since bits have 'w-full pr-1', the button should just plop in. 
                */}
                
                {isTargetReached ? (
                  <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 dark:bg-[var(--bh-success)]/10 text-emerald-700 dark:text-[var(--bh-success)] rounded-lg border border-emerald-200 dark:border-[var(--bh-success)]/20 text-sm font-semibold shadow-sm animate-in fade-in slide-in-from-left-2 h-[50px]">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Complete</span>
                  </div>
                ) : (
                  <div className="relative" ref={dropdownRef}>
                    <button
                      ref={buttonRef}
                      onClick={(e) => { e.stopPropagation(); toggleDropdown(); }}
                      className={clsx(
                        "flex items-center gap-2 text-sm font-semibold px-4 py-3 rounded-xl transition-all border shadow-sm h-[50px]",
                        isDropdownOpen
                          ? "bg-blue-50 dark:bg-[var(--bh-surface-2)] text-blue-700 dark:text-[var(--bh-primary)] border-blue-200 dark:border-[var(--bh-primary)] ring-2 ring-blue-100 dark:ring-[var(--bh-primary)]/30"
                          : "bg-white dark:bg-[var(--bh-surface-0)] text-slate-600 dark:text-[var(--bh-text-weak)] border-dashed border-slate-300 dark:border-[var(--bh-border)] hover:border-blue-300 dark:hover:border-[var(--bh-primary)] hover:text-blue-600 dark:hover:text-[var(--bh-primary)] hover:bg-blue-50/50 dark:hover:bg-[var(--bh-surface-2)]"
                      )}
                    >
                      <Plus className="w-4 h-4" />
                      <span>Next Bit</span>
                    </button>

                    {isDropdownOpen && ReactDOM.createPortal(
                      (() => {
                        // Find used bits that have remaining capacity
                        const usedBitsWithRemaining = activeScenario.bitSequence
                          .map((entry, idx) => {
                            const bit = bits.find(b => b.id === entry.bitId);
                            if (!bit) return null;
                            const remaining = bit.maxDistance - entry.actualDistance;
                            if (remaining > 0) {
                              return { entry, bit, idx, remaining };
                            }
                            return null;
                          })
                          .filter((item): item is { entry: BitSequenceEntry; bit: Bit; idx: number; remaining: number } => item !== null);

                        return (
                          <div
                            ref={dropdownContentRef}
                            style={dropdownStyle}
                            className={clsx(
                              "bg-white dark:bg-[var(--bh-surface-1)] rounded-xl shadow-xl border border-slate-100 dark:border-[var(--bh-border)] p-1.5 animate-in fade-in zoom-in-95 duration-100 overflow-hidden"
                            )}
                          >
                            <div className="max-h-64 overflow-y-auto w-full custom-scrollbar">
                              {/* New Bits Section */}
                              <div className="px-2 py-1.5 text-[10px] font-bold text-slate-400 dark:text-[var(--bh-text-mute)] uppercase tracking-wider">New Bit</div>
                              <div className="space-y-0.5">
                                {bits.map(bit => (
                                  <button
                                    key={bit.id}
                                    onClick={(e) => { e.stopPropagation(); addToSequence(activeScenario.id, bit.id); }}
                                    className="w-full text-left px-3 py-2 text-sm text-slate-700 dark:text-[var(--bh-text)] hover:bg-slate-50 dark:hover:bg-[var(--bh-surface-2)] hover:text-blue-700 dark:hover:text-[var(--bh-primary)] rounded-lg flex items-center gap-3 transition-colors group"
                                  >
                                    <span className="w-2 h-2 rounded-full ring-2 ring-slate-100 dark:ring-[var(--bh-border)] group-hover:ring-blue-100 dark:group-hover:ring-[var(--bh-primary)]/30 transition-shadow" style={{ backgroundColor: bit.color }}></span>
                                    <div className="flex flex-col">
                                      <span className="font-semibold">{bit.name}</span>
                                      <span className="text-[10px] text-slate-400 dark:text-[var(--bh-text-mute)]">Max {displayDepth(bit.maxDistance)}{getUnitLabel(depthUnit)}</span>
                                    </div>
                                  </button>
                                ))}
                              </div>

                              {/* Used Bits Section - only show if there are bits with remaining capacity */}
                              {usedBitsWithRemaining.length > 0 && (
                                <>
                                  <div className="h-px bg-slate-100 dark:bg-[var(--bh-border)] my-1.5"></div>
                                  <div className="px-2 py-1.5 text-[10px] font-bold text-amber-500 dark:text-amber-400 uppercase tracking-wider flex items-center gap-1">
                                    <span>Continue Used Bit</span>
                                  </div>
                                  <div className="space-y-0.5">
                                    {usedBitsWithRemaining.map(({ bit, idx, remaining }) => (
                                      <button
                                        key={`used-${idx}`}
                                        onClick={(e) => { e.stopPropagation(); addToSequence(activeScenario.id, bit.id, true, remaining); }}
                                        className="w-full text-left px-3 py-2 text-sm text-slate-700 dark:text-[var(--bh-text)] hover:bg-amber-50 dark:hover:bg-amber-500/10 hover:text-amber-700 dark:hover:text-amber-400 rounded-lg flex items-center gap-3 transition-colors group"
                                      >
                                        <span className="w-2 h-2 rounded-full ring-2 ring-amber-200 dark:ring-amber-500/30 transition-shadow" style={{ backgroundColor: bit.color }}></span>
                                        <div className="flex flex-col flex-1">
                                          <div className="flex items-center gap-1.5">
                                            <span className="font-semibold">{bit.name}</span>
                                            <span className="text-[9px] font-bold bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 px-1 py-0.5 rounded">#{idx + 1}</span>
                                            <span className="text-[9px] font-bold bg-amber-500 text-white px-1 py-0.5 rounded uppercase leading-none">Rerun</span>
                                          </div>
                                          <span className="text-[10px] text-amber-600 dark:text-amber-400">{displayDepth(remaining)}{getUnitLabel(depthUnit)} left</span>
                                        </div>
                                      </button>
                                    ))}
                                  </div>
                                </>
                              )}
                            </div>
                          </div>
                        );
                      })(),
                      document.body
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
              <div className="grid grid-cols-2 md:grid-cols-4 gap-10">
                <div>
                  <span className="text-[11px] font-semibold text-slate-400 dark:text-[var(--bh-text-mute)] block mb-3">Bits Consumed</span>
                  <div className="space-y-3">
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
                  <span className="text-[11px] font-semibold text-slate-400 dark:text-[var(--bh-text-mute)] block mb-3">Est. Total Time</span>
                  {activeResult.steps.length > 1 ? (
                    <>
                      <div className="flex items-baseline gap-1">
                        <span className="text-lg font-bold text-slate-800 dark:text-[var(--bh-text)]">{(activeResult.totalTime / 24).toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}</span>
                        <span className="text-xs text-slate-500 dark:text-[var(--bh-text-mute)]">days</span>
                      </div>
                      <div className="text-[10px] text-slate-400 dark:text-[var(--bh-text-mute)] mt-1">{activeResult.totalTime.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })} hours</div>
                    </>
                  ) : (
                    <span className="text-lg font-bold text-slate-300 dark:text-[var(--bh-text-weak)]">-</span>
                  )}
                </div>
                <div>
                  <span className="text-[11px] font-semibold text-slate-400 dark:text-[var(--bh-text-mute)] block mb-3">Avg ROP (Gross)</span>
                  {activeResult.steps.length > 1 ? (
                    <>
                      <div className="flex items-baseline gap-1">
                        <span className="text-lg font-bold text-slate-800 dark:text-[var(--bh-text)]">
                          {(activeResult.totalTime > 0 ? convertDepth(((activeResult.steps[activeResult.steps.length - 1]?.depth - params.depthIn) / activeResult.totalTime), depthUnit).toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 }) : 0)}
                        </span>
                        <span className="text-xs text-slate-500 dark:text-[var(--bh-text-mute)]">{getSpeedLabel(depthUnit)}</span>
                      </div>
                      <div className="text-[10px] text-slate-400 dark:text-[var(--bh-text-mute)] mt-1">Includes tripping</div>
                    </>
                  ) : (
                    <span className="text-lg font-bold text-slate-300 dark:text-[var(--bh-text-weak)]">-</span>
                  )}
                </div>
                <div>
                  <span className="text-[11px] font-semibold text-slate-400 dark:text-[var(--bh-text-mute)] block mb-3">Est. Total Cost</span>
                  {activeResult.steps.length > 1 ? (
                    <>
                      <div className="flex items-baseline gap-1">
                        <span className="text-lg font-bold text-slate-800 dark:text-[var(--bh-text)]">${(activeResult.totalCost / 1000).toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}k</span>
                      </div>
                      <div className="text-[10px] text-slate-400 dark:text-[var(--bh-text-mute)] mt-1">Based on Operation Rate</div>
                    </>
                  ) : (
                    <span className="text-lg font-bold text-slate-300 dark:text-[var(--bh-text-weak)]">-</span>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </>
    );
  };

  // Wrapper to render the editor with proper positioning (shared between inline and portal)
  const renderEditor = (isZoomed: boolean) => {
    if (!activeScenario) return null;

    if (isZoomed) {
      // Zoomed view: Use flexbox centering on backdrop to avoid CSS transforms that break dnd-kit positioning
      return (
        <div 
          className="fixed inset-0 z-[9998] bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300 flex items-center justify-center p-4"
          onClick={closeZoomModal}
        >
          <div
            ref={zoomModalRef}
            className="relative w-[95vw] sm:w-[90vw] md:w-full md:max-w-5xl h-auto max-h-[90vh] bg-white dark:bg-[var(--bh-surface-0)] overflow-y-auto cursor-default shadow-2xl rounded-2xl border border-slate-200 dark:border-[var(--bh-border)] animate-in fade-in duration-300 group"
            onClick={(e) => e.stopPropagation()}
          >
            {renderEditorContent(true)}
          </div>
        </div>
      );
    }

    // Non-zoomed view: Inline editor
    return (
      <div
        ref={detailsRef}
        className="relative overflow-hidden card cursor-pointer hover:shadow-lg rounded-xl border border-slate-200 dark:border-[var(--bh-border)] bg-white dark:bg-[var(--bh-surface-0)] animate-in fade-in duration-300 transition-all duration-300 group"
        onClick={() => setIsScenarioZoomed(true)}
      >
        {renderEditorContent(false)}
      </div>
    );
  };


  return (
    <div className="space-y-6">
      {/* Sticky Container for Header + Stats */}
      <div 
        ref={stickyHeaderRef} 
        className={clsx(
          "min-[850px]:sticky top-16 min-[850px]:top-20 z-40 transition-all duration-300 mb-6",
          isScrolled 
            ? "bg-white/95 dark:bg-slate-900/95 backdrop-blur-md pb-6 pt-4 border-b border-slate-200 dark:border-[var(--bh-border)] shadow-lg rounded-b-2xl px-1" 
            : "bg-white/40 dark:bg-slate-900/40 pb-4 pt-4 border-b border-transparent"
        )}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          {/* Left: Title & Count */}
          <div className="flex items-center gap-3">
            {!isSidebarOpen && setIsSidebarOpen && (
              <button
                onClick={() => setIsSidebarOpen(true)}
                className="hidden min-[850px]:block p-1.5 bg-white dark:bg-[var(--bh-surface-1)] border border-slate-200 dark:border-[var(--bh-border)] rounded-lg shadow-sm text-blue-600 dark:text-[var(--bh-primary)] hover:bg-slate-50 dark:hover:bg-[var(--bh-surface-2)] transition-all shrink-0 animate-in fade-in slide-in-from-left-2 duration-300"
                title="Expand Configuration"
              >
                <PanelLeftOpen className="w-5 h-5" />
              </button>
            )}
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-slate-100 dark:bg-[var(--bh-surface-2)] rounded-md text-slate-600 dark:text-[var(--bh-text-mute)]">
                <Layers className="w-4 h-4" />
              </div>
              <h2 className="text-lg font-bold text-slate-800 dark:text-[var(--bh-text)]">Scenarios</h2>
            </div>
            <span className="text-xs font-semibold text-slate-500 dark:text-[var(--bh-text-mute)] bg-white dark:bg-[var(--bh-surface-1)] border border-slate-200 dark:border-[var(--bh-border)] px-2.5 py-1 rounded-full shadow-sm">
              {scenarios.length} Active
            </span>
          </div>

          {/* Right: Auto-Optimize & Compare Controls */}
          <div className="flex items-center gap-3 self-end sm:self-auto">
            {/* Auto-Optimize Button */}
            {bits.length > 0 && !isCompareMode && (
              <button
                onClick={handleAutoOptimize}
                disabled={isOptimizing}
                className={clsx(
                  "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold transition-all",
                  isOptimizing
                    ? "bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 cursor-wait"
                    : "bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-500/10 dark:to-orange-500/10 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-500/30 hover:border-amber-400 dark:hover:border-amber-400 hover:shadow-md hover:shadow-amber-100 dark:hover:shadow-amber-900/20"
                )}
                title="Automatically find the lowest cost bit strategy"
              >
                <Sparkles className={clsx("w-4 h-4", isOptimizing && "animate-pulse")} />
                {isOptimizing ? 'Optimizing...' : 'Auto-Optimize'}
              </button>
            )}

            {/* Compare Controls */}
            {scenarios.length >= 2 && (
              <>
                {isCompareMode && selectedForComparison.length === 2 && (
                  <span className="text-sm font-medium text-emerald-600 dark:text-[var(--bh-success)] animate-in fade-in">
                    2 scenarios selected
                  </span>
                )}
                {isCompareMode && selectedForComparison.length < 2 && (
                  <span className="text-sm text-slate-500 dark:text-[var(--bh-text-mute)]">
                    Select {2 - selectedForComparison.length} more scenario{selectedForComparison.length === 1 ? '' : 's'}
                  </span>
                )}
                <button
                  onClick={() => isCompareMode ? exitCompareMode() : setIsCompareMode(true)}
                  className={clsx(
                    "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold transition-all",
                    isCompareMode
                      ? "bg-blue-500 dark:bg-[var(--bh-primary)] text-white shadow-md"
                      : "bg-white dark:bg-[var(--bh-surface-1)] text-slate-600 dark:text-[var(--bh-text-weak)] border border-slate-200 dark:border-[var(--bh-border)] hover:border-blue-300 dark:hover:border-[var(--bh-primary)] hover:text-blue-600 dark:hover:text-[var(--bh-primary)]"
                  )}
                >
                  <GitCompareArrows className="w-4 h-4" />
                  {isCompareMode ? 'Exit Compare' : 'Compare'}
                </button>
              </>
            )}
          </div>
        </div>

        {/* Results Summary Cards Grid relocated inside sticky container */}
        <div className={clsx(
          "grid gap-4 transition-all duration-300 ease-in-out mt-6",
          "grid-cols-1 md:grid-cols-2",
          isSidebarOpen ? "min-[850px]:!grid-cols-3" : "min-[850px]:!grid-cols-4"
        )}>
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleScenarioDragEnd}
          >
            <SortableContext
              items={scenarios.map(s => s.id)}
              strategy={rectSortingStrategy}
            >
              {results.map((res, idx) => {
                const isBestCost = results.every(r => (r.status === 'incomplete' || r.steps.length <= 1 ? Infinity : r.totalCost) >= (res.status === 'incomplete' || res.steps.length <= 1 ? Infinity : res.totalCost)) && res.status === 'complete' && res.steps.length > 1;
                const isActive = activeTab === res.id;
                const isBlank = res.steps.length <= 1;
                const costPerUnit = displayCostPerUnit(res.costPerMeter);
                const isSelectedForCompare = selectedForComparison.includes(res.id);

                return (
                  <SortableItem
                    key={res.id}
                    id={res.id}
                    className="h-full"
                    trigger="handle"
                  >
                    <div
                      onClick={(e) => {
                        // Prevent click if dragging (handled by sensors potentially, but good to be safe)
                        // On touch-only devices (no hover), let touch handlers manage selection/activation
                        // On hybrid devices (touch + mouse), allow click to activate immediately
                        if (isTouch && window.matchMedia && !window.matchMedia('(hover: hover)').matches) {
                          // With dnd-kit, the click event might fire after drag. 
                          // We need to distinguish tap from drag? dnd-kit sensors handle this.
                          // So we can simpler: just handle click.
                        }
                        isCompareMode ? toggleCompareSelection(res.id) : setActiveTab(activeTab === res.id ? '' : res.id);
                      }}
                      className={clsx(
                        "cursor-pointer rounded-xl border transition-all duration-300 relative overflow-hidden group h-full bg-white dark:bg-[var(--bh-surface-0)] flex flex-col", // Ensure bg is set
                        isCompareMode && isSelectedForCompare
                          ? "bg-blue-50 dark:bg-[var(--bh-primary)]/10 border-blue-500 shadow-md ring-2 ring-blue-500/30"
                          : isActive && !isCompareMode
                            ? "bg-white dark:bg-[var(--bh-surface-1)] border-blue-500 shadow-md ring-1 ring-blue-500/20 scale-[1.02]"
                            : "border-slate-200 dark:border-[var(--bh-border)] hover:border-blue-300 dark:hover:border-[var(--bh-border)] hover:shadow-sm",
                        touchCardSelection.isSelected(res.id) && "ring-2 ring-blue-400"
                      )}
                    >
                      {/* Header */}
                      <div
                        className="flex items-center justify-between px-2 py-1.5 transition-colors duration-200"
                        style={{
                          backgroundColor: (isActive && !isCompareMode) || (isCompareMode && isSelectedForCompare)
                            ? hexToRgba(getScenarioColor(idx), 0.7)
                            : hexToRgba(getScenarioColor(idx), 0.1)
                        }}
                      >
                        {/* Left: Drag or Checkbox */}
                        <div className="flex-shrink-0 w-6 flex justify-center">
                          {isCompareMode ? (
                             isSelectedForCompare ? (
                               <CheckSquare className="w-4 h-4 text-blue-500 dark:text-[var(--bh-primary)]" />
                             ) : (
                               <Square className="w-4 h-4 text-slate-300 dark:text-[var(--bh-text-mute)] group-hover:text-blue-400" />
                             )
                          ) : (
                             <DragHandle className={clsx("p-1 rounded w-5 h-5", isActive ? "text-slate-800/70 hover:text-slate-900" : "text-slate-400 hover:text-slate-600")} />
                          )}
                        </div>

                        {/* Middle: Name & Indicators */}
                        <div className="flex-1 px-1 min-w-0 text-center flex items-center justify-center gap-1.5">
                           {/* Status Icons */}
                           {res.status === 'incomplete' && (
                            <div className="relative group/tooltip">
                              <AlertTriangle className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400 shrink-0" />
                            </div>
                           )}
                           {isBestCost && (
                            <div className="relative group/tooltip">
                              <Sparkles className="w-4 h-4 text-yellow-500 dark:text-yellow-400 shrink-0 fill-yellow-500/20 dark:fill-yellow-400/20 animate-pulse drop-shadow-sm" />
                            </div>
                           )}
                           
                          <h3 className={clsx(
                            "font-bold text-xs truncate leading-snug",
                            isActive ? "text-slate-900" : "text-slate-600 dark:text-[var(--bh-text-mute)]"
                          )}>
                            {res.name}
                          </h3>
                        </div>

                        {/* Right: Delete */}
                        <div className="flex-shrink-0 w-6 flex justify-center">
                          {!isCompareMode && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                removeScenario(e, res.id);
                              }}
                              className={clsx(
                                "p-1 rounded-md transition-all",
                                isActive ? "text-slate-800 hover:text-red-700 hover:bg-white/20" : "text-slate-400 dark:text-slate-500 hover:text-red-600 hover:bg-slate-100"
                              )}
                              title="Remove Scenario"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Body */}
                      <div className="flex-1 flex flex-col items-center justify-center p-1.5 min-h-[50px]">
                         <span className="text-[10px] font-semibold text-slate-400 dark:text-[var(--bh-text-mute)] uppercase">Cost/{getUnitLabel(depthUnit)}</span>
                         {isBlank ? (
                            <span className="text-lg font-bold text-slate-300 dark:text-[var(--bh-text-mute)]">N/A</span>
                         ) : (
                            <span className={clsx("font-bold tracking-tight text-xl", isActive ? "text-slate-900 dark:text-[var(--bh-text)]" : "text-slate-700 dark:text-[var(--bh-text-weak)]")}>
                              ${costPerUnit.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                            </span>
                         )}
                      </div>
                    </div>
                  </SortableItem>
                );
              })}
            </SortableContext>
            <DragOverlay dropAnimation={null}>
              {activeDragId && !activeDragId.includes('::') ? (() => {
                const s = scenarios.find(i => i.id === activeDragId);
                if (!s) return null;
                return (
                  <div className="bg-white dark:bg-[var(--bh-surface-0)] rounded-xl border border-blue-500 shadow-2xl p-4 w-[280px] h-[100px] overflow-hidden relative cursor-grabbing opacity-90 ring-2 ring-blue-500/20">
                    <div className="absolute top-2 left-2 z-20"><GripVertical className="p-1 w-5 h-5 text-blue-500" /></div>
                    <div className="pl-8 pt-1">
                      <div className="font-bold text-sm mb-1">{s.name}</div>
                      <div className="text-xs text-slate-500 dark:text-[var(--bh-text-mute)]">{s.bitSequence.length} bits configured</div>
                    </div>
                  </div>
                );
              })() : null}
            </DragOverlay>
          </DndContext>
          <button
            onClick={addScenario}
            className={clsx(
              "flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-200 dark:border-[var(--bh-border)] text-slate-400 dark:text-[var(--bh-text-mute)] hover:text-blue-600 dark:hover:text-[var(--bh-primary)] hover:border-blue-300 dark:hover:border-[var(--bh-primary)] hover:bg-blue-50/50 dark:hover:bg-[var(--bh-surface-2)] transition-all gap-1 group",
              "p-2 min-h-[85px] w-full"
            )}
          >
            <div className={clsx("rounded-full bg-slate-100 dark:bg-[var(--bh-surface-1)] group-hover:bg-blue-100 dark:group-hover:bg-[var(--bh-surface-2)] flex items-center justify-center transition-colors", "w-8 h-8")}>
              <Plus className={clsx("w-4 h-4")} />
            </div>
            <span className="font-semibold text-xs">New Scenario</span>
          </button>
        </div>
      </div>

      {/* Comparison Panel */}
      {isCompareMode && comparisonResults.length === 2 && (
        <div className="card animate-in fade-in slide-in-from-bottom-2 duration-300 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 dark:border-[var(--bh-border)] bg-gradient-to-r from-blue-50 to-slate-50 dark:from-[var(--bh-primary)]/10 dark:to-[var(--bh-surface-1)] flex justify-between items-center">
            <h3 className="text-lg font-bold text-slate-800 dark:text-[var(--bh-text)] flex items-center gap-2">
              <GitCompareArrows className="w-5 h-5 text-blue-500 dark:text-[var(--bh-primary)]" />
              Scenario Comparison
            </h3>
            <div className="flex bg-slate-100 dark:bg-[var(--bh-surface-2)] p-1 rounded-lg">
              <button
                onClick={() => setDiffType('percentage')}
                className={clsx(
                  "px-3 py-1 text-xs font-bold rounded-md transition-all",
                  diffType === 'percentage'
                    ? "bg-white dark:bg-[var(--bh-surface-0)] text-blue-600 dark:text-[var(--bh-primary)] shadow-sm"
                    : "text-slate-500 dark:text-[var(--bh-text-mute)] hover:text-slate-700 dark:hover:text-[var(--bh-text)]"
                )}
              >
                %
              </button>
              <button
                onClick={() => setDiffType('absolute')}
                className={clsx(
                  "px-3 py-1 text-xs font-bold rounded-md transition-all",
                  diffType === 'absolute'
                    ? "bg-white dark:bg-[var(--bh-surface-0)] text-blue-600 dark:text-[var(--bh-primary)] shadow-sm"
                    : "text-slate-500 dark:text-[var(--bh-text-mute)] hover:text-slate-700 dark:hover:text-[var(--bh-text)]"
                )}
              >
                #
              </button>
            </div>
          </div>
          <div className="p-6">
            {/* Comparison Table */}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-[var(--bh-border)]">
                    <th className="sticky left-0 z-30 bg-white dark:bg-[var(--bh-surface-0)] shadow-[1px_0_0_0_#e2e8f0] dark:shadow-[1px_0_0_0_var(--bh-border)] text-left py-3 px-4 text-xs font-bold text-slate-500 dark:text-[var(--bh-text-mute)] uppercase tracking-wider md:transition-[top] md:duration-300" style={{ top: 0 }}>
                      <span className="md:hidden">Metric</span>
                      <span className="hidden md:block" style={{ position: 'sticky', top: stickyOffset }}>Metric</span>
                    </th>
                    <th className="sticky top-0 z-20 bg-white dark:bg-[var(--bh-surface-0)] text-center py-3 px-4 text-xs font-bold uppercase tracking-wider md:transition-[top] md:duration-300" style={{ color: getScenarioColor(results.findIndex(r => r.id === comparisonResults[0].id)) }}>
                      <span className="md:hidden">{comparisonResults[0].name}</span>
                      <span className="hidden md:block" style={{ position: 'sticky', top: stickyOffset }}>{comparisonResults[0].name}</span>
                    </th>
                    <th className="sticky top-0 z-20 bg-white dark:bg-[var(--bh-surface-0)] text-center py-3 px-4 text-xs font-bold uppercase tracking-wider md:transition-[top] md:duration-300" style={{ color: getScenarioColor(results.findIndex(r => r.id === comparisonResults[1].id)) }}>
                      <span className="md:hidden">{comparisonResults[1].name}</span>
                      <span className="hidden md:block" style={{ position: 'sticky', top: stickyOffset }}>{comparisonResults[1].name}</span>
                    </th>
                    <th className="sticky top-0 z-20 bg-white dark:bg-[var(--bh-surface-0)] text-center py-3 px-4 text-xs font-bold text-slate-500 dark:text-[var(--bh-text-mute)] uppercase tracking-wider md:transition-[top] md:duration-300">
                      <span className="md:hidden">Difference</span>
                      <span className="hidden md:block" style={{ position: 'sticky', top: stickyOffset }}>Difference</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-[var(--bh-border)]">
                  {/* Cost Per Meter */}
                  <tr className="group hover:bg-slate-50/50 dark:hover:bg-[var(--bh-surface-2)]">
                    <td className="sticky left-0 z-10 bg-white dark:bg-[var(--bh-surface-0)] group-hover:bg-slate-50/50 dark:group-hover:bg-[var(--bh-surface-2)] shadow-[1px_0_0_0_#e2e8f0] dark:shadow-[1px_0_0_0_var(--bh-border)] py-4 px-4 text-sm font-semibold text-slate-700 dark:text-[var(--bh-text)]">Cost per {getUnitLabel(depthUnit)}</td>
                    <td className="py-4 px-4 text-center font-mono text-lg font-bold text-slate-900 dark:text-[var(--bh-text)]">
                      ${displayCostPerUnit(comparisonResults[0].costPerMeter).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                    </td>
                    <td className="py-4 px-4 text-center font-mono text-lg font-bold text-slate-900 dark:text-[var(--bh-text)]">
                      ${displayCostPerUnit(comparisonResults[1].costPerMeter).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                    </td>
                    <td className="py-4 px-4 text-center">
                      {(() => {
                        const diff = displayCostPerUnit(comparisonResults[1].costPerMeter) - displayCostPerUnit(comparisonResults[0].costPerMeter);
                        const percent = (diff / displayCostPerUnit(comparisonResults[0].costPerMeter)) * 100;
                        return (
                          <span className={clsx(
                            "text-sm font-bold",
                            diff < 0 ? "text-emerald-600 dark:text-emerald-400" : diff > 0 ? "text-red-600 dark:text-red-400" : "text-slate-400"
                          )}>
                            {diff > 0 ? '+' : ''}
                            {diffType === 'percentage'
                              ? `${percent.toFixed(1)}%`
                              : `$${diff.toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
                          </span>
                        );
                      })()}
                    </td>
                  </tr>
                  {/* Total Cost */}
                  <tr className="group hover:bg-slate-50/50 dark:hover:bg-[var(--bh-surface-2)]">
                    <td className="sticky left-0 z-10 bg-white dark:bg-[var(--bh-surface-0)] group-hover:bg-slate-50/50 dark:group-hover:bg-[var(--bh-surface-2)] shadow-[1px_0_0_0_#e2e8f0] dark:shadow-[1px_0_0_0_var(--bh-border)] py-4 px-4 text-sm font-semibold text-slate-700 dark:text-[var(--bh-text)]">Total Cost</td>
                    <td className="py-4 px-4 text-center font-mono text-lg font-bold text-slate-900 dark:text-[var(--bh-text)]">
                      ${(comparisonResults[0].totalCost / 1000).toFixed(1)}k
                    </td>
                    <td className="py-4 px-4 text-center font-mono text-lg font-bold text-slate-900 dark:text-[var(--bh-text)]">
                      ${(comparisonResults[1].totalCost / 1000).toFixed(1)}k
                    </td>
                    <td className="py-4 px-4 text-center">
                      {(() => {
                        const diff = comparisonResults[1].totalCost - comparisonResults[0].totalCost;
                        const percent = (diff / comparisonResults[0].totalCost) * 100;
                        return (
                          <span className={clsx(
                            "text-sm font-bold",
                            diff < 0 ? "text-emerald-600 dark:text-emerald-400" : diff > 0 ? "text-red-600 dark:text-red-400" : "text-slate-400"
                          )}>
                            {diff > 0 ? '+' : ''}
                            {diffType === 'percentage'
                              ? `${percent.toFixed(1)}%`
                              : `$${(diff / 1000).toFixed(1)}k`}
                          </span>
                        );
                      })()}
                    </td>
                  </tr>
                  {/* Total Time */}
                  <tr className="group hover:bg-slate-50/50 dark:hover:bg-[var(--bh-surface-2)]">
                    <td className="sticky left-0 z-10 bg-white dark:bg-[var(--bh-surface-0)] group-hover:bg-slate-50/50 dark:group-hover:bg-[var(--bh-surface-2)] shadow-[1px_0_0_0_#e2e8f0] dark:shadow-[1px_0_0_0_var(--bh-border)] py-4 px-4 text-sm font-semibold text-slate-700 dark:text-[var(--bh-text)]">Total Time</td>
                    <td className="py-4 px-4 text-center font-mono text-lg font-bold text-slate-900 dark:text-[var(--bh-text)]">
                      {comparisonResults[0].totalTime.toFixed(1)}h
                    </td>
                    <td className="py-4 px-4 text-center font-mono text-lg font-bold text-slate-900 dark:text-[var(--bh-text)]">
                      {comparisonResults[1].totalTime.toFixed(1)}h
                    </td>
                    <td className="py-4 px-4 text-center">
                      {(() => {
                        const diff = comparisonResults[1].totalTime - comparisonResults[0].totalTime;
                        const percent = (diff / comparisonResults[0].totalTime) * 100;
                        return (
                          <span className={clsx(
                            "text-sm font-bold",
                            diff < 0 ? "text-emerald-600 dark:text-emerald-400" : diff > 0 ? "text-red-600 dark:text-red-400" : "text-slate-400"
                          )}>
                            {diff > 0 ? '+' : ''}
                            {diffType === 'percentage'
                              ? `${percent.toFixed(1)}%`
                              : `${diff.toFixed(1)}h`}
                          </span>
                        );
                      })()}
                    </td>
                  </tr>
                  {/* Days to Complete */}
                  <tr className="group hover:bg-slate-50/50 dark:hover:bg-[var(--bh-surface-2)]">
                    <td className="sticky left-0 z-10 bg-white dark:bg-[var(--bh-surface-0)] group-hover:bg-slate-50/50 dark:group-hover:bg-[var(--bh-surface-2)] shadow-[1px_0_0_0_#e2e8f0] dark:shadow-[1px_0_0_0_var(--bh-border)] py-4 px-4 text-sm font-semibold text-slate-700 dark:text-[var(--bh-text)]">Days to Complete</td>
                    <td className="py-4 px-4 text-center font-mono text-lg font-bold text-slate-900 dark:text-[var(--bh-text)]">
                      {(comparisonResults[0].totalTime / 24).toFixed(1)}
                    </td>
                    <td className="py-4 px-4 text-center font-mono text-lg font-bold text-slate-900 dark:text-[var(--bh-text)]">
                      {(comparisonResults[1].totalTime / 24).toFixed(1)}
                    </td>
                    <td className="py-4 px-4 text-center">
                      {(() => {
                        const diff = comparisonResults[1].totalTime - comparisonResults[0].totalTime;
                        const diffDays = diff / 24;
                        const percent = (diff / comparisonResults[0].totalTime) * 100;
                        return (
                          <span className={clsx(
                            "text-sm font-bold",
                            diff < 0 ? "text-emerald-600 dark:text-emerald-400" : diff > 0 ? "text-red-600 dark:text-red-400" : "text-slate-400"
                          )}>
                            {diffDays > 0 ? '+' : ''}
                            {diffType === 'percentage'
                              ? `${percent.toFixed(1)}%`
                              : `${diffDays.toFixed(1)} days`}
                          </span>
                        );
                      })()}
                    </td>
                  </tr>
                  {/* Total Bit Cost */}
                  <tr className="group hover:bg-slate-50/50 dark:hover:bg-[var(--bh-surface-2)]">
                    <td className="sticky left-0 z-10 bg-white dark:bg-[var(--bh-surface-0)] group-hover:bg-slate-50/50 dark:group-hover:bg-[var(--bh-surface-2)] shadow-[1px_0_0_0_#e2e8f0] dark:shadow-[1px_0_0_0_var(--bh-border)] py-4 px-4 text-sm font-semibold text-slate-700 dark:text-[var(--bh-text)]">Total Bit Cost</td>
                    <td className="py-4 px-4 text-center font-mono text-lg font-bold text-slate-900 dark:text-[var(--bh-text)]">
                      {(() => {
                        const cost1 = comparisonResults[0].bitsUsed.reduce((acc, u) => {
                          const bit = bits.find(b => b.name === u.name);
                          return acc + (bit ? bit.cost * u.count : 0);
                        }, 0);
                        return `$${(cost1 / 1000).toFixed(1)}k`;
                      })()}
                    </td>
                    <td className="py-4 px-4 text-center font-mono text-lg font-bold text-slate-900 dark:text-[var(--bh-text)]">
                      {(() => {
                        const cost2 = comparisonResults[1].bitsUsed.reduce((acc, u) => {
                          const bit = bits.find(b => b.name === u.name);
                          return acc + (bit ? bit.cost * u.count : 0);
                        }, 0);
                        return `$${(cost2 / 1000).toFixed(1)}k`;
                      })()}
                    </td>
                    <td className="py-4 px-4 text-center">
                      {(() => {
                        const cost1 = comparisonResults[0].bitsUsed.reduce((acc, u) => {
                          const bit = bits.find(b => b.name === u.name);
                          return acc + (bit ? bit.cost * u.count : 0);
                        }, 0);
                        const cost2 = comparisonResults[1].bitsUsed.reduce((acc, u) => {
                          const bit = bits.find(b => b.name === u.name);
                          return acc + (bit ? bit.cost * u.count : 0);
                        }, 0);
                        const diff = cost2 - cost1;
                        const percent = cost1 > 0 ? (diff / cost1) * 100 : 0;
                        return (
                          <span className={clsx(
                            "text-sm font-bold",
                            diff < 0 ? "text-emerald-600 dark:text-emerald-400" : diff > 0 ? "text-red-600 dark:text-red-400" : "text-slate-400"
                          )}>
                            {diff > 0 ? '+' : ''}
                            {diffType === 'percentage'
                              ? `${percent.toFixed(1)}%`
                              : `$${(diff / 1000).toFixed(1)}k`}
                          </span>
                        );
                      })()}
                    </td>
                  </tr>
                  {/* Number of Bits */}
                  <tr className="group hover:bg-slate-50/50 dark:hover:bg-[var(--bh-surface-2)]">
                    <td className="sticky left-0 z-10 bg-white dark:bg-[var(--bh-surface-0)] group-hover:bg-slate-50/50 dark:group-hover:bg-[var(--bh-surface-2)] shadow-[1px_0_0_0_#e2e8f0] dark:shadow-[1px_0_0_0_var(--bh-border)] py-4 px-4 text-sm font-semibold text-slate-700 dark:text-[var(--bh-text)]">Bits Used</td>
                    <td className="py-4 px-4 text-center">
                      <div className="flex flex-col items-center gap-1">
                        {comparisonResults[0].bitsUsed.map((b, i) => (
                          <span key={i} className="text-sm font-medium text-slate-700 dark:text-[var(--bh-text)]">{b.name} x{b.count}</span>
                        ))}
                      </div>
                    </td>
                    <td className="py-4 px-4 text-center">
                      <div className="flex flex-col items-center gap-1">
                        {comparisonResults[1].bitsUsed.map((b, i) => (
                          <span key={i} className="text-sm font-medium text-slate-700 dark:text-[var(--bh-text)]">{b.name} x{b.count}</span>
                        ))}
                      </div>
                    </td>
                    <td className="py-4 px-4 text-center">
                      {(() => {
                        const total1 = comparisonResults[0].bitsUsed.reduce((acc, b) => acc + b.count, 0);
                        const total2 = comparisonResults[1].bitsUsed.reduce((acc, b) => acc + b.count, 0);
                        const diff = total2 - total1;
                        const percent = total1 > 0 ? (diff / total1) * 100 : 0;
                        return (
                          <span className={clsx(
                            "text-sm font-bold",
                            diff < 0 ? "text-emerald-600 dark:text-emerald-400" : diff > 0 ? "text-red-600 dark:text-red-400" : "text-slate-400"
                          )}>
                            {diff > 0 ? '+' : ''}
                            {diffType === 'percentage'
                              ? `${percent.toFixed(0)}%`
                              : `${diff} bits`}
                          </span>
                        );
                      })()}
                    </td>
                  </tr>
                  {/* Status */}
                  <tr className="group hover:bg-slate-50/50 dark:hover:bg-[var(--bh-surface-2)]">
                    <td className="sticky left-0 z-10 bg-white dark:bg-[var(--bh-surface-0)] group-hover:bg-slate-50/50 dark:group-hover:bg-[var(--bh-surface-2)] shadow-[1px_0_0_0_#e2e8f0] dark:shadow-[1px_0_0_0_var(--bh-border)] py-4 px-4 text-sm font-semibold text-slate-700 dark:text-[var(--bh-text)]">Status</td>
                    <td className="py-4 px-4 text-center">
                      <span className={clsx(
                        "px-2 py-1 text-xs font-bold rounded-full",
                        comparisonResults[0].status === 'complete'
                          ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                          : "bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400"
                      )}>
                        {comparisonResults[0].status === 'complete' ? 'Complete' : 'Incomplete'}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-center">
                      <span className={clsx(
                        "px-2 py-1 text-xs font-bold rounded-full",
                        comparisonResults[1].status === 'complete'
                          ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                          : "bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400"
                      )}>
                        {comparisonResults[1].status === 'complete' ? 'Complete' : 'Incomplete'}
                      </span>
                    </td>
                    <td className="py-4 px-4"></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Editor Area */}
      {/* Editor Area */}
      {/* If NOT zoomed, render normally. If zoomed, the Portal will handle it below. */}
      {activeScenario && !isCompareMode && !isScenarioZoomed && renderEditor(false)}

      {/* Portal for Zoom */}
      {isScenarioZoomed && activeScenario && ReactDOM.createPortal(renderEditor(true), document.body)}


      {/* Content injected from parent (Charts) */}
      {children}

      {/* Custom Delete Confirmation Modal */}
      {scenarioToDelete && ReactDOM.createPortal(
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setScenarioToDelete(null)}>
          <div 
             className="bg-white dark:bg-[var(--bh-surface-0)] rounded-2xl shadow-2xl border border-slate-200 dark:border-[var(--bh-border)] w-full max-w-md p-6 animate-in zoom-in-95 duration-200"
             onClick={(e) => e.stopPropagation()}
          >
            <div className="flex flex-col items-center text-center gap-4">
              <div className="p-3 bg-red-100 dark:bg-red-500/10 rounded-full text-red-600 dark:text-red-500">
                <AlertTriangle className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-[var(--bh-text)]">Delete Scenario?</h3>
                <p className="text-sm text-slate-500 dark:text-[var(--bh-text-mute)] mt-1">
                  Are you sure you want to delete this scenario? This action can still be undone later.
                </p>
              </div>
              <div className="flex w-full gap-3 mt-2">
                 <button 
                   onClick={() => setScenarioToDelete(null)}
                   className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-[var(--bh-border)] text-slate-600 dark:text-[var(--bh-text-weak)] font-semibold hover:bg-slate-50 dark:hover:bg-[var(--bh-surface-2)] transition-colors"
                 >
                   Cancel
                 </button>
                 <button 
                   onClick={(e) => {
                     // Perform deletion
                     const syntheticEvent = { stopPropagation: () => {} } as React.MouseEvent; // Hack to reusing existing signature if needed, or just call logic
                     // Actually calling removeScenario requires the event for stopPropagation, which is fine.
                     removeScenario(e, scenarioToDelete); 
                     setScenarioToDelete(null);
                     if (isScenarioZoomed) closeZoomModal();
                   }}
                   className="flex-1 px-4 py-2.5 rounded-xl bg-red-600 text-white font-semibold hover:bg-red-700 shadow-md shadow-red-200 dark:shadow-none transition-all"
                 >
                   Delete
                 </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      <UndoToast
        message={toast?.message || ''}
        isVisible={!!toast}
        onUndo={handleUndo}
        onClose={() => setToast(null)}
      />
    </div>
  );
};




export default ScenarioManager;