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
      <label htmlFor={id} className="block text-sm font-semibold text-[#374151]">
        {label}
      </label>
      <div className="relative group">
        {Icon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9CA3AF] group-focus-within:text-[#4F46E5] transition-colors">
            <Icon size={16} strokeWidth={2} />
          </div>
        )}
        <input
          id={id}
          className={cn(
            "w-full bg-white border border-[#D1D5DB] rounded-md py-2 px-3 text-sm font-sans focus:ring-4 focus:ring-[#4F46E5]/5 focus:border-[#4F46E5] transition-all outline-none placeholder:text-[#9CA3AF]",
            Icon && "pl-10",
            error ? "border-red-300 bg-red-50 focus:ring-red-500/10 focus:border-red-500" : "hover:border-[#9CA3AF]",
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
