import React from 'react';

interface KPICardProps {
  title: string;
  value: string | number;
  icon: string;
  color?: 'primary' | 'success' | 'warning' | 'danger' | 'secondary';
  trend?: {
    value: number;
    direction: 'up' | 'down';
  };
  subtext?: string;
  onClick?: () => void;
}

const colorMap = {
  primary: 'bg-primary text-white',
  success: 'bg-success text-white',
  warning: 'bg-warning text-white',
  danger: 'bg-danger text-white',
  secondary: 'bg-secondary text-white',
};

const lightColorMap = {
  primary: 'bg-primary-50 text-primary',
  success: 'bg-green-50 text-green-700',
  warning: 'bg-yellow-50 text-yellow-700',
  danger: 'bg-red-50 text-red-700',
  secondary: 'bg-blue-50 text-blue-700',
};

const KPICard: React.FC<KPICardProps> = ({
  title,
  value,
  icon,
  color = 'primary',
  trend,
  subtext,
  onClick,
}) => {
  return (
    <div
      className={`bg-surface border border-border rounded-2xl p-6 transition-all duration-300 hover:shadow-lg hover:border-primary-200 ${onClick ? 'cursor-pointer' : ''}`}
      onClick={onClick}
    >
      <div className="flex justify-between items-start mb-4">
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${lightColorMap[color]} shadow-lg shadow-black/5`}>
          <i className={`fas ${icon} text-lg`}></i>
        </div>
        {trend && (
          <div className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold ${trend.direction === 'up' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
            <i className={`fas fa-arrow-${trend.direction === 'up' ? 'up' : 'down'}`}></i>
            {Math.abs(trend.value)}%
          </div>
        )}
      </div>

      <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">{title}</p>
      <p className="text-3xl font-bold text-text-main mb-2">{value}</p>
      
      {subtext && (
        <p className="text-sm text-text-secondary flex items-center gap-1.5">
          <span className="w-1 h-1 rounded-full bg-text-muted"></span>
          {subtext}
        </p>
      )}
    </div>
  );
};

export default KPICard;
