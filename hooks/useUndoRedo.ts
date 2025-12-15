import { useState, useCallback } from 'react';

interface HistoryState<T> {
  past: T[];
  present: T;
  future: T[];
}

export function useUndoRedo<T>(initialState: T | (() => T), maxHistory: number = 10) {
  const [state, setState] = useState<HistoryState<T>>(() => {
    const present = typeof initialState === 'function' ? (initialState as () => T)() : initialState;
    return {
      past: [],
      present,
      future: []
    };
  });

  const canUndo = state.past.length > 0;
  const canRedo = state.future.length > 0;

  const undo = useCallback(() => {
    setState(currentState => {
      const { past, present, future } = currentState;
      if (past.length === 0) return currentState;

      const previous = past[past.length - 1];
      const newPast = past.slice(0, past.length - 1);

      return {
        past: newPast,
        present: previous,
        future: [present, ...future]
      };
    });
  }, []);

  const redo = useCallback(() => {
    setState(currentState => {
      const { past, present, future } = currentState;
      if (future.length === 0) return currentState;

      const next = future[0];
      const newFuture = future.slice(1);

      return {
        past: [...past, present],
        present: next,
        future: newFuture
      };
    });
  }, []);

  const set = useCallback((newPresent: T | ((curr: T) => T)) => {
    setState(currentState => {
      const { past, present, future } = currentState;
      
      const nextValue = typeof newPresent === 'function' 
        ? (newPresent as (curr: T) => T)(present)
        : newPresent;

      if (nextValue === present) return currentState;

      // Limit past to maxHistory
      // If we are at limit, remove the oldest (index 0)
      const newPast = [...past, present];
      if (newPast.length > maxHistory) {
         newPast.shift(); 
      }

      return {
        past: newPast,
        present: nextValue,
        future: [] // Clearing future on new change is standard behavior
      };
    });
  }, [maxHistory]);

  return [state.present, set, undo, redo, canUndo, canRedo] as const;
}
