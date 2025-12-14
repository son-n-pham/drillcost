import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { RotateCcw, X } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

interface UndoToastProps {
    isVisible: boolean;
    message: string;
    onUndo: () => void;
    onClose: () => void; // Triggered when timer ends or X clicked
    duration?: number; // ms, default 5000
}

export const UndoToast: React.FC<UndoToastProps> = ({
    isVisible,
    message,
    onUndo,
    onClose,
    duration = 5000,
}) => {
    const [progress, setProgress] = useState(100);

    useEffect(() => {
        if (isVisible) {
            setProgress(100);
            const interval = setInterval(() => {
                setProgress((prev) => Math.max(0, prev - (100 / (duration / 100))));
            }, 100);

            const timer = setTimeout(() => {
                onClose();
            }, duration);

            return () => {
                clearInterval(interval);
                clearTimeout(timer);
            };
        }
    }, [isVisible, duration, onClose]);

    return createPortal(
        <AnimatePresence>
            {isVisible && (
                <motion.div
                    initial={{ opacity: 0, y: 50 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 20 }}
                    className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[10000] flex flex-col items-center gap-2"
                >
                    <div className="bg-slate-900 dark:bg-slate-800 text-white rounded-lg shadow-xl border border-slate-700 dark:border-slate-600 flex items-center p-1 pr-2 gap-3 min-w-[300px] overflow-hidden relative">
                        {/* Progress Bar background */}
                        <div
                            className="absolute bottom-0 left-0 h-0.5 bg-blue-500/50"
                            style={{ width: `${progress}%`, transition: 'width 0.1s linear' }}
                        />

                        <div className="pl-3 py-2 text-sm font-medium flex-grow">
                            {message}
                        </div>

                        <button
                            onClick={onUndo}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 rounded text-xs font-bold transition-colors"
                        >
                            <RotateCcw className="w-3.5 h-3.5" />
                            UNDO
                        </button>

                        <button
                            onClick={onClose}
                            className="p-1 text-slate-400 hover:text-white transition-colors"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>,
        document.body
    );
};
