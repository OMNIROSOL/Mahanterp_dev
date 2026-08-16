import React, { useState } from 'react';
import { cn } from '../../utils/cn';
import { LucideIcon } from 'lucide-react';

interface PremiumInputProps extends React.InputHTMLAttributes<HTMLInputElement | HTMLTextAreaElement> {
  label: string;
  icon?: LucideIcon;
  error?: string;
  isTextArea?: boolean;
}

const PremiumInput: React.FC<PremiumInputProps> = ({
  label,
  icon: Icon,
  error,
  isTextArea = false,
  className,
  value,
  onFocus,
  onBlur,
  ...props
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const hasValue = value !== undefined && value !== '';

  const handleFocus = (e: any) => {
    setIsFocused(true);
    onFocus?.(e);
  };

  const handleBlur = (e: any) => {
    setIsFocused(false);
    onBlur?.(e);
  };

  const Component = isTextArea ? 'textarea' : 'input';

  return (
    <div className={cn("relative w-full group", className)}>
      <div className={cn(
        "relative transition-all duration-500 rounded-2xl border bg-white/40 backdrop-blur-sm overflow-hidden",
        isFocused 
          ? "border-primary shadow-lg shadow-primary/10 ring-4 ring-primary/5" 
          : error 
            ? "border-error/50 bg-error/5" 
            : "border-slate-200/60 hover:border-slate-300"
      )}>
        {/* Background Glow */}
        <div className={cn(
          "absolute inset-0 opacity-0 transition-opacity duration-500 pointer-events-none bg-gradient-to-tr from-primary/5 via-transparent to-transparent",
          isFocused && "opacity-100"
        )} />
        
        <label className={cn(
          "absolute left-4 transition-all duration-300 pointer-events-none font-bold uppercase tracking-widest select-none",
          (isFocused || hasValue) 
            ? "top-2 text-[9px] text-primary" 
            : "top-1/2 -translate-y-1/2 text-[11px] text-slate-400"
        )}>
          {label}
        </label>

        <div className="flex items-center">
          {Icon && (
            <div className={cn(
              "pl-4 pr-1 transition-colors duration-300",
              isFocused ? "text-primary" : "text-slate-300"
            )}>
              <Icon size={16} />
            </div>
          )}
          <Component
            {...props as any}
            value={value}
            onFocus={handleFocus}
            onBlur={handleBlur}
            className={cn(
              "w-full bg-transparent px-4 py-3 pb-2 text-sm font-bold text-slate-700 outline-none placeholder:text-transparent transition-all",
              (isFocused || hasValue) ? "pt-6" : "pt-3",
              isTextArea && "min-h-[100px] resize-none"
            )}
          />
        </div>
      </div>
      
      {error && (
        <p className="mt-1 ml-2 text-[10px] font-black text-error uppercase tracking-widest animate-in fade-in slide-in-from-top-1">
          {error}
        </p>
      )}
    </div>
  );
};

export default PremiumInput;
