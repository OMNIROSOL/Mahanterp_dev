import React from 'react';
import { cn } from '../../utils/cn';

export type BadgeVariant = 'default' | 'primary' | 'success' | 'warning' | 'error' | 'outline';

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  className?: string;
}

const Badge: React.FC<BadgeProps> = ({ children, variant = 'default', className }) => {
  const variants = {
    default: 'bg-slate-100 text-slate-600',
    primary: 'bg-primary/10 text-primary border border-primary/20',
    success: 'bg-success text-success-foreground border border-success-foreground/10',
    warning: 'bg-warning text-warning-foreground border border-warning-foreground/10',
    error: 'bg-error text-error-foreground border border-error-foreground/10',
    outline: 'border border-slate-200 text-slate-600 bg-transparent',
  };

  return (
    <span className={cn(
      "px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-widest inline-flex items-center justify-center whitespace-nowrap font-sans",
      variants[variant],
      className
    )}>
      {children}
    </span>
  );
};

export default Badge;
