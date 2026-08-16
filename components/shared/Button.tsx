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
    primary: 'bg-[#4F46E5] text-white hover:bg-[#4338ca] shadow-sm',
    secondary: 'bg-[#F3F4F6] text-[#374151] hover:bg-[#E5E7EB]',
    outline: 'bg-transparent border border-[#D1D5DB] text-[#374151] hover:bg-[#F9FAFB]',
    ghost: 'bg-transparent text-[#4B5563] hover:bg-[#F3F4F6]',
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
