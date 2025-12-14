import React, { useRef, useCallback, useState } from 'react';

interface TouchPosition {
    x: number;
    y: number;
}

interface UseTouchInteractionProps {
    onTap?: () => void;
    onDragStart?: () => void;
    onDragMove?: (deltaY: number, currentY: number) => void;
    onDragEnd?: () => void;
    disabled?: boolean;
    dragThreshold?: number; // pixels to move before drag starts
    tapDuration?: number; // max ms for a tap
}

interface UseTouchInteractionReturn {
    handlers: {
        onTouchStart: (e: React.TouchEvent) => void;
        onTouchMove: (e: React.TouchEvent) => void;
        onTouchEnd: (e: React.TouchEvent) => void;
    };
    isDragging: boolean;
    dragOffset: number;
}

/**
 * Custom hook for handling touch interactions that distinguishes between:
 * - Quick tap (< tapDuration ms, minimal movement) → triggers onTap
 * - Touch and drag (movement > dragThreshold) → triggers drag callbacks
 * 
 * This enables both "tap to show delete" and "drag to reorder" on touch devices.
 */
export function useTouchInteraction({
    onTap,
    onDragStart,
    onDragMove,
    onDragEnd,
    disabled = false,
    dragThreshold = 10,
    tapDuration = 200,
}: UseTouchInteractionProps): UseTouchInteractionReturn {
    const [isDragging, setIsDragging] = useState(false);
    const [dragOffset, setDragOffset] = useState(0);

    const touchStartTime = useRef<number>(0);
    const touchStartPos = useRef<TouchPosition>({ x: 0, y: 0 });
    const hasMoved = useRef(false);
    const dragStarted = useRef(false);

    const handleTouchStart = useCallback((e: React.TouchEvent) => {
        if (disabled) return;

        const touch = e.touches[0];
        touchStartTime.current = Date.now();
        touchStartPos.current = { x: touch.clientX, y: touch.clientY };
        hasMoved.current = false;
        dragStarted.current = false;
        setDragOffset(0);
    }, [disabled]);

    const handleTouchMove = useCallback((e: React.TouchEvent) => {
        if (disabled) return;

        const touch = e.touches[0];
        const deltaX = touch.clientX - touchStartPos.current.x;
        const deltaY = touch.clientY - touchStartPos.current.y;
        const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

        if (distance > dragThreshold) {
            hasMoved.current = true;

            if (!dragStarted.current) {
                dragStarted.current = true;
                setIsDragging(true);
                onDragStart?.();

                // Haptic feedback if available
                if (navigator.vibrate) {
                    navigator.vibrate(50);
                }
            }

            // Primary axis is vertical for list reordering
            setDragOffset(deltaY);
            onDragMove?.(deltaY, touch.clientY);
        }
    }, [disabled, dragThreshold, onDragStart, onDragMove]);

    const handleTouchEnd = useCallback((e: React.TouchEvent) => {
        if (disabled) return;

        const touchDuration = Date.now() - touchStartTime.current;

        if (dragStarted.current) {
            // Was a drag operation
            setIsDragging(false);
            setDragOffset(0);
            onDragEnd?.();
        } else if (!hasMoved.current && touchDuration < tapDuration) {
            // Was a quick tap
            onTap?.();
        }

        // Reset refs
        dragStarted.current = false;
        hasMoved.current = false;
    }, [disabled, tapDuration, onTap, onDragEnd]);

    return {
        handlers: {
            onTouchStart: handleTouchStart,
            onTouchMove: handleTouchMove,
            onTouchEnd: handleTouchEnd,
        },
        isDragging,
        dragOffset,
    };
}

/**
 * Hook to manage which item is currently "selected" for showing actions (like delete)
 * on touch devices. Clicking outside clears the selection.
 */
export function useTouchSelection<T extends string | number | null>(initialValue: T = null as T) {
    const [selectedId, setSelectedId] = useState<T>(initialValue);

    const select = useCallback((id: T) => {
        setSelectedId(prev => prev === id ? initialValue : id);
    }, [initialValue]);

    const clear = useCallback(() => {
        setSelectedId(initialValue);
    }, [initialValue]);

    const isSelected = useCallback((id: T) => {
        return selectedId === id;
    }, [selectedId]);

    return {
        selectedId,
        select,
        clear,
        isSelected,
    };
}

/**
 * Detects if the current device primarily uses touch input
 */
export function isTouchDevice(): boolean {
    if (typeof window === 'undefined') return false;
    return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
}
