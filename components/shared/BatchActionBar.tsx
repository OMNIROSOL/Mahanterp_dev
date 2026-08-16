import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Printer, Copy, RefreshCw, X } from 'lucide-react';
import { cn } from '../../utils/cn';

interface BatchAction {
    icon: React.ReactNode;
    label: string;
    onClick: () => void;
}

interface BatchActionBarProps {
    selectedCount: number;
    actions: BatchAction[];
    onReset: () => void;
    isVisible: boolean;
}

const BatchActionBar: React.FC<BatchActionBarProps> = ({ 
    selectedCount, 
    actions, 
    onReset,
    isVisible 
}) => {
    return (
        <AnimatePresence>
            {isVisible && (
                <motion.div 
                    initial={{ y: -20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: -20, opacity: 0 }}
                    transition={{ type: 'spring', damping: 20, stiffness: 100 }}
                    className="w-full max-w-[1400px] mb-8"
                >
                    <div className="bg-indigo-600/95 backdrop-blur-md rounded-[28px] shadow-[0_20px_50px_-12px_rgba(79,70,229,0.25)] p-5 flex items-center justify-between border border-white/20 select-none">
                        <div className="flex items-center space-x-10 ml-4">
                            <div className="flex flex-col items-center">
                                <span className="text-[20px] font-black text-white leading-tight">{selectedCount}</span>
                                <span className="text-[10px] font-black text-indigo-200 uppercase tracking-[0.2em] mt-0.5">Selected</span>
                            </div>

                            <div className="w-[1px] h-10 bg-white/10" />

                            <div className="flex items-center space-x-8">
                                {actions.map((action, idx) => (
                                    <button
                                        key={idx}
                                        onClick={action.onClick}
                                        className="flex items-center space-x-3 text-white hover:text-indigo-100 transition-all group"
                                    >
                                        <div className="w-5 h-5 flex items-center justify-center opacity-70 group-hover:opacity-100 group-active:scale-90 transition-all">
                                            {action.icon}
                                        </div>
                                        <span className="text-[11px] font-black uppercase tracking-[0.25em]">{action.label}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        <button
                            onClick={onReset}
                            className="px-10 py-3.5 bg-white text-indigo-600 text-[11px] font-black rounded-full hover:bg-slate-50 transition-all uppercase tracking-[0.25em] shadow-xl active:scale-95"
                        >
                            Reset Mode
                        </button>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default BatchActionBar;
