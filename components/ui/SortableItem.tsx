import React, { createContext, useContext } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';
import clsx from 'clsx';
import { twMerge } from 'tailwind-merge';

interface SortableItemContextProps {
    attributes: Record<string, any> | undefined;
    listeners: Record<string, any> | undefined;
    isDragging: boolean;
    setActivatorNodeRef: (element: HTMLElement | null) => void;
}

const SortableItemContext = createContext<SortableItemContextProps | undefined>(undefined);

interface SortableItemProps {
    id: string;
    children: React.ReactNode;
    className?: string;
    style?: React.CSSProperties;
    trigger?: 'item' | 'handle';
    disabled?: boolean;
}

export function SortableItem({ id, children, className, style: propStyle, trigger = 'handle', disabled = false }: SortableItemProps) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
        setActivatorNodeRef,
    } = useSortable({ id, disabled });

    const style = {
        transform: CSS.Translate.toString(transform),
        transition,
        zIndex: isDragging ? 999 : undefined,
        ...propStyle,
    };

    return (
        <SortableItemContext.Provider value={{ attributes, listeners, isDragging, setActivatorNodeRef }}>
            <div
                ref={setNodeRef}
                style={style}
                {...(trigger === 'item' ? { ...(attributes || {}), ...(listeners || {}) } : {})}
                className={twMerge(
                    clsx('relative', isDragging && 'opacity-50'),
                    className
                )}
            >
                {children}
            </div>
        </SortableItemContext.Provider>
    );
}

export function DragHandle({ className, style }: { className?: string; style?: React.CSSProperties }) {
    const context = useContext(SortableItemContext);
    if (!context) {
        throw new Error('DragHandle must be used within a SortableItem');
    }

    const { attributes, listeners, setActivatorNodeRef, isDragging } = context;

    return (
        <div
            ref={setActivatorNodeRef}
            {...(attributes || {})}
            {...(listeners || {})}
            style={style}
            className={twMerge(
                'relative cursor-grab flex items-center justify-center p-0 text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 touch-none active:cursor-grabbing after:absolute after:-inset-6 after:content-[""]',
                isDragging && 'cursor-grabbing text-blue-500',
                className
            )}
        >
            <GripVertical className="w-5 h-5" />
        </div>
    );
}
