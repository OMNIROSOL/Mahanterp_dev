import React from 'react';
import { cn } from '../../utils/cn';
import { LucideIcon } from 'lucide-react';

import { motion } from 'framer-motion';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'success';
  size?: 'xs' | 'sm' | 'md' | 'lg';
  icon?: LucideIcon;
  iconPosition?: 'left' | 'right';
  isLoading?: boolean;
}

const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  icon: Icon,
  iconPosition = 'left',
  isLoading = false,
  className,
  children,
  disabled,
  ...props
}) => {
  const variants = {
    primary: 'bg-primary text-white hover:bg-primary-dark shadow-sm',
    secondary: 'bg-slate-100 text-slate-700 hover:bg-slate-200',
    outline: 'bg-transparent border border-slate-300 text-slate-700 hover:bg-slate-50',
    ghost: 'bg-transparent text-slate-600 hover:bg-slate-100',
    danger: 'bg-red-600 text-white hover:bg-red-700 shadow-sm',
    success: 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm',
  };

  const sizes = {
    xs: 'px-2 py-1 text-xs gap-1.5',
    sm: 'px-3 py-1.5 text-sm gap-2',
    md: 'px-5 py-2.5 text-sm font-semibold tracking-tight gap-2',
    lg: 'px-8 py-3.5 text-base font-bold tracking-tight gap-2.5',
  };

  return (
    <motion.button
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.98 }}
      className={cn(
        'inline-flex items-center justify-center rounded-md transition-all disabled:opacity-50 disabled:pointer-events-none font-sans',
        variants[variant],
        sizes[size],
        className
      )}
      disabled={disabled || isLoading}
      {...props as any}
    >
      {isLoading ? (
        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
      ) : (
        <>
          {Icon && iconPosition === 'left' && <Icon size={size === 'sm' || size === 'xs' ? 16 : 18} strokeWidth={2.5} />}
          {children}
          {Icon && iconPosition === 'right' && <Icon size={size === 'sm' || size === 'xs' ? 16 : 18} strokeWidth={2.5} />}
        </>
      )}
    </motion.button>
  );
};

export default Button;
