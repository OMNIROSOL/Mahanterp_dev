import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../utils/cn';

interface FloatingActionBarProps {
  isVisible: boolean;
  children: React.ReactNode;
  className?: string;
}

const FloatingActionBar: React.FC<FloatingActionBarProps> = ({ isVisible, children, className }) => {
  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: 'spring', damping: 20, stiffness: 100 }}
          className={cn(
            "fixed bottom-8 left-1/2 -translate-x-1/2 z-50 flex items-center gap-4 px-8 py-4 glass-sidebar rounded-[2rem] border-white/40 shadow-2xl min-w-[300px] justify-center",
            className
          )}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default FloatingActionBar;
