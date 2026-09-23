import React from 'react';
import { cn } from '../../utils/cn';

interface FormInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  helperText?: string;
  icon?: React.ElementType;
}

const FormInput: React.FC<FormInputProps> = ({ 
  label, 
  error, 
  helperText, 
  icon: Icon,
  className,
  id,
  ...props 
}) => {
  return (
    <div className="space-y-2 flex-1">
      <label htmlFor={id} className="block text-sm font-semibold text-slate-700">
        {label}
      </label>
      <div className="relative group">
        {Icon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors">
            <Icon size={16} strokeWidth={2} />
          </div>
        )}
        <input
          id={id}
          className={cn(
            "w-full bg-white border border-slate-300 rounded-md py-2 px-3 text-sm font-sans focus:ring-4 focus:ring-primary/5 focus:border-primary transition-all outline-none placeholder:text-slate-400",
            Icon && "pl-10",
            error ? "border-red-300 bg-red-50 focus:ring-red-500/10 focus:border-red-500" : "hover:border-slate-400",
            className
          )}
          {...props}
        />
      </div>
      {(error || helperText) && (
        <p className={cn("text-xs font-semibold px-1", error ? "text-error" : "text-slate-500")}>
          {error || helperText}
        </p>
      )}
    </div>
  );
};

export default FormInput;
