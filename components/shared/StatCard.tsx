import React from 'react';
import Badge from './Badge';

interface StatCardProps {
  label: string;
  value: string | number;
  icon: string;
  trend?: {
    value: number;
    direction: 'up' | 'down';
  };
  color?: 'primary' | 'success' | 'warning' | 'danger';
}

const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  icon,
  trend,
  color = 'primary',
}) => {
  const colorMap = {
    primary: 'bg-primary-50 text-primary',
    success: 'bg-green-50 text-green-700',
    warning: 'bg-yellow-50 text-yellow-700',
    danger: 'bg-red-50 text-red-700',
  };

  return (
    <Card variant="default" className="p-6">
      <div className="flex justify-between items-start mb-4">
        <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${colorMap[color]}`}>
          <i className={`fas ${icon} text-lg`}></i>
        </div>
        {trend && (
          <Badge
            variant={trend.direction === 'up' ? 'success' : 'danger'}
            size="sm"
          >
            <i className={`fas fa-arrow-${trend.direction === 'up' ? 'up' : 'down'} mr-1`}></i>
            {Math.abs(trend.value)}%
          </Badge>
        )}
      </div>
      <p className="text-xs font-semibold text-text-muted uppercase tracking-wide mb-1">
        {label}
      </p>
      <p className="text-2xl font-bold text-text-main">{value}</p>
    </Card>
  );
};

// Helper import Card
import Card from './Card';

export default StatCard;
