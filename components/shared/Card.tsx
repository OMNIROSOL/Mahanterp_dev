import React from 'react';
import { cn } from '../../utils/cn';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string;
  subtitle?: string;
  headerActions?: React.ReactNode;
  noPadding?: boolean;
}

const Card: React.FC<CardProps> = ({ 
  title, 
  subtitle, 
  headerActions, 
  noPadding = false,
  className,
  children,
  ...props
}) => {
  return (
    <div 
      className={cn(
        "bg-white rounded-xl border border-[#E5E7EB] shadow-[0_2px_8px_rgba(0,0,0,0.05)] hover:shadow-md transition-all duration-300 overflow-hidden",
        className
      )}
      {...props}
    >
      {(title || subtitle || headerActions) && (
        <div className="px-6 py-4 border-b border-[#F3F4F6] flex items-center justify-between bg-white">
          <div>
            {title && <h3 className="text-lg font-bold text-[#111827] tracking-tight">{title}</h3>}
            {subtitle && <p className="text-sm text-[#6B7280] mt-0.5">{subtitle}</p>}
          </div>
          {headerActions && <div className="flex items-center gap-3">{headerActions}</div>}
        </div>
      )}

      <div className={cn("p-8", noPadding && "p-0")}>
        {children}
      </div>
    </div>
  );
};

export default Card;
